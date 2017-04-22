const robot = require('robotjs');
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
    this.currentBearing = 0;
    this.currentDistance = 0;
    this.isTurning = false;
  }

  walkTo( x, y, callback ) {

    var _this = this;
    var player = this.getMemory();

    //Begin moving.
    if ( this.status === WC_STATUS_WAITING ) {

      //Set waypoint.
      this.currentWaypoint = {
        x: x,
        y: y
      };

      this.currentBearing = this.calculateBearing( player.playerY, player.playerX, y, x );
      this.currentDistance = this.calculateDistance( player.playerY, player.playerX, y, x );

      console.log('Moving to ' + x + ',' + y + ' on bearing ' + this.currentBearing);

      var rd = Math.abs(this.currentBearing - player.playerRotation);
      console.log(this.currentDistance);
      //if ( rd <= 1 ) {
      if ( this.currentDistance > 30 && rd < 1.5 ) {
        //Skip waiting for rotation, just run and rotate.
        this.rotateTo(this.currentBearing);
        robot.keyToggle('up',WC_KEY_PRESS);
        _this.status = WC_STATUS_MOVING;
        _this.walkTo( x, y, callback );
      } else {
        this.rotateTo(this.currentBearing, () => {
          robot.keyToggle('up',WC_KEY_PRESS);
          _this.status = WC_STATUS_MOVING;
          _this.walkTo( x, y, callback );
        });
      }

    } else {

      if ( x !== this.currentWaypoint.x || y !== this.currentWaypoint.y ) {
        console.log('Cannot start new waypoint while moving.');
        return;
      }

      //Monitor progress towards waypoint.
      var distance = this.calculateDistance( player.playerY, player.playerX, y, x );
      if ( distance <= WC_FUZZY_WP ) {
        robot.keyToggle('up',WC_KEY_RELEASE);
        this.status = WC_STATUS_WAITING;
        callback();
        return;
      }

      //Recurse.
      setTimeout(() => {
        _this.walkTo( x, y, callback );
      }, WC_WATCH_TIME);


    }

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
      _this.rotateTo( rotation, callback );
    }, WC_WATCH_TIME);

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
