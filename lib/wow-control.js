const robot = require('robotjs');

const WC_STATUS_UNSTICK = -1;
const WC_STATUS_WAITING = 0;
const WC_STATUS_MOVING = 1;
const WC_STATUS_STATIONARY_ROTATING = 2;
const WC_KEY_PRESS = 'down';
const WC_KEY_RELEASE = 'up';
const WC_FUZZY_ROT = 0.1;
const WC_FUZZY_WP = 6;
const WC_WATCH_TIME = 25;

class wowControl {

  constructor( getMemory ) {
    this.getMemory = getMemory;
    this.status = 0;
    this.currentWaypoint = {};
    this.lastPosition = {
      x: 0,
      y: 0,
      time: 0
    };
    this.currentBearing = 0;
    this.currentDistance = 0;
    this.isTurning = false;
    this.cancelled = false;
    this.stuckRegister = 0;
    this.lastStuckDirection = 0;
    this.lastRotateFix = 0;
  }

  sleep( ms ) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  avoidObstacles(callback) {

    var _this = this;

    this.status = WC_STATUS_UNSTICK;

    var keyDirection = ( this.lastStuckDirection === 0 ? 'e' : 'q' );
    if ( this.lastStuckDirection < 1 ) {
      this.lastStuckDirection = 1;
    } else {
      this.lastStuckDirection = 0;
    }

    console.log('Trying to unstick')

    robot.keyToggle('down', WC_KEY_PRESS);

    setTimeout(() => {
      robot.keyToggle('down', WC_KEY_RELEASE);
      robot.keyToggle(keyDirection, WC_KEY_PRESS);

      setTimeout(() => {
        robot.keyToggle(keyDirection, WC_KEY_RELEASE);

        setTimeout( () => {
          robot.keyTap('space');
        }, 500 );

        //Reset the register and status.
        _this.status = WC_STATUS_WAITING;
        _this.stuckRegister = 0;

        callback();

      }, 1000);
    }, 1000);


  }

  walkTo( x, y, callback, args, sigInterruptCheck ) {

    var defaultArgs = {
      stuckCheck: true,
      bearingCheck: true,
      fuzzyOffset: WC_FUZZY_WP,
      rotationCheck: false
    };

    if ( typeof sigInterruptCheck !== 'function' ) {
      sigInterruptCheck = false;
    }

    if ( typeof args !== 'undefined' ) {
      for ( var key in args ) {
        if ( args.hasOwnProperty(key) ) {
          defaultArgs[key] = args[key];
        }
      }
      args = defaultArgs;
    }
    args = defaultArgs;

    var _this = this;
    var player = this.getMemory();
    var now = new Date().getTime();

    if ( this.stuckRegister >= 5 ) {
      this.cancelWaypoint(() => {
        this.avoidObstacles(() => {
          _this.walkTo(x, y, callback, args, sigInterruptCheck);
        });
      });
      return;
    }

    //Begin moving.
    if ( this.status === WC_STATUS_WAITING ) {

      this.stuckRegister = 0;
      this.currentBearing = this.calculateBearing( player.playerY, player.playerX, y, x );
      this.currentDistance = this.calculateDistance( player.playerY, player.playerX, y, x );

      //Set waypoint.
      this.currentWaypoint = {
        x: x,
        y: y,
        time: now,
        distance: this.currentDistance
      };

      console.log('Moving to ' + x + ',' + y + ' on bearing ' + this.currentBearing);

      var rd = Math.abs(this.currentBearing - player.playerRotation);

      //if ( rd <= 1 ) {

      if ( this.currentDistance > 30 && rd < 2.5 ) {
        //Skip waiting for rotation, just run and rotate.
        this.rotateTo(this.currentBearing);
        robot.keyToggle('up',WC_KEY_PRESS);
        _this.status = WC_STATUS_MOVING;
        _this.walkTo( x, y, callback, args, sigInterruptCheck );
      } else {
        this.rotateTo(this.currentBearing, () => {
          robot.keyToggle('up',WC_KEY_PRESS);
          _this.status = WC_STATUS_MOVING;
          _this.walkTo( x, y, callback, args, sigInterruptCheck );
        });
      }


    } else {

      if ( x !== this.currentWaypoint.x || y !== this.currentWaypoint.y ) {
        console.log('Cannot start new waypoint while moving.');
        return;
      }

      //Monitor progress towards waypoint.
      var distance = this.calculateDistance( player.playerY, player.playerX, y, x );
      if ( distance <= args.fuzzyOffset ) {
        robot.keyToggle('up',WC_KEY_RELEASE);
        this.status = WC_STATUS_WAITING;
        callback();
        return;
      }

      //Are we moving?
      if ( args.stuckCheck ) {
        var td = now - this.lastPosition.time;
        if ( td >= 500 ) {
          var lwp_distance = this.calculateDistance( player.playerY, player.playerX, this.lastPosition.y, this.lastPosition.x );
          if ( lwp_distance < 1 ) {
            this.stuckRegister += 1;
          }
        }
      }

      //Are we going the wrong way?
      if ( args.bearingCheck ) {
        var ts = now - this.currentWaypoint.time;
        var cd = this.currentWaypoint.distance - distance;
        if ( cd <= -5 ) {
          console.log('Feels like we are going the wrong way');
          this.cancelWaypoint(() => {
            _this.walkTo( x, y, callback, args, sigInterruptCheck );
          });
          return;
        }
      }

      //How far off is the rotation?
      if ( args.rotationCheck ) {
        var td = now - this.lastRotateFix;
        if ( td >= 1500 ) {
          var bearing = this.calculateBearing( player.playerY, player.playerX, y, x );
          var diff = Math.abs(bearing - player.playerRotation);
          
          if ( diff >= WC_FUZZY_ROT ) {
            this.lastRotateFix = now;
            this.rotateTo(bearing);
          }
        }
      }

      if ( sigInterruptCheck ) {
        sigInterruptCheck( player );
      }

      //Recurse.
      setTimeout(() => {
        //Only recurse if we are active.
        if ( this.cancelled !== true ) {
          _this.walkTo( x, y, callback, args, sigInterruptCheck );
        }
      }, WC_WATCH_TIME);

    }

    var td = now - this.lastPosition.time;
    if ( td >= 500 ) {
      this.lastPosition = {
        x: player.playerX,
        y: player.playerY,
        time: now
      };
    }

  }

  cancelWaypoint( callback ) {
    this.status = WC_STATUS_WAITING;
    this.releaseNavKeys();
    setTimeout(() => {
      callback();
    }, 250);
  }

  rotateTo( rotation, callback ) {

    //Rotate until we are close to rotation, then run "callback".
    var player = this.getMemory();
    var _this = this;

    //Left or right?
    var rda;

    if ( rotation > player.playerRotation ) {
      rda = rotation - player.playerRotation;
    } else {
      rda = player.playerRotation + rotation;
    }

    if (! this.isTurning ) {
      console.log(rda + ":" + (2 * Math.PI));
      if ( rda < Math.PI ) {
        console.log('left');
        robot.keyToggle('left', WC_KEY_PRESS);
      } else {
        console.log('right');
        robot.keyToggle('right', WC_KEY_PRESS);
      }
    }

    this.isTurning = true;

    var lr = rotation - WC_FUZZY_ROT;
    var ur = rotation + WC_FUZZY_ROT;
    if ( player.playerRotation >= lr && player.playerRotation <= ur ) {
      this.isTurning = false;
      robot.keyToggle('left', WC_KEY_RELEASE);
      robot.keyToggle('right', WC_KEY_RELEASE);
      if ( typeof callback !== 'undefined' ) {
        callback();
      }
      return;
    }

    //If we are not facing the right, recurse until we are...
    setTimeout(() => {
      //Only recurse if we are active.
      if ( _this.cancelled !== true ) {
        _this.rotateTo( rotation, callback );
      } else {
				robot.keyToggle('left', WC_KEY_RELEASE);
				robot.keyToggle('right', WC_KEY_RELEASE);
			}
    }, WC_WATCH_TIME);

  }

  cancelAll() {

    console.log('Cancelling active control movement');

    //Key up.
    this.releaseNavKeys();

    this.status = 0;
    this.currentWaypoint = {};
    this.currentBearing = 0;
    this.currentDistance = 0;
    this.isTurning = false;
    this.cancelled = true;

  }

  releaseNavKeys() {
    robot.keyToggle('left', WC_KEY_RELEASE);
    robot.keyToggle('right', WC_KEY_RELEASE);
    robot.keyToggle('up', WC_KEY_RELEASE);
    robot.keyToggle('down', WC_KEY_RELEASE);
  }

  calculateBearing( playerY, playerX, waypointY, waypointX ) {

    var relativeX, relativeY;
    relativeY = waypointY - playerY;
    relativeX = waypointX - playerX;

    var result = Math.atan2(relativeY, relativeX);
    //If resulting angle is zero, reverse it...
    if ( result < 0 ) {
      //As 2pi = 180 degrees,
      result += 2 * Math.PI;
    }

    return result;

  }

  calculateDistance( playerY, playerX, waypointY, waypointX ) {
    var xLen, yLen;

    if ( waypointX > playerX ) {
      xLen = waypointX - playerX;
    } else {
      xLen = playerX - waypointX;
    }
    if ( waypointY > playerY ) {
      yLen = waypointY - playerY;
    } else {
      yLen = playerY - waypointY;
    }

    return Math.round( Math.sqrt( (xLen * xLen) + (yLen * yLen) ) );

  }

}
module.exports = wowControl;
