const wowControl = require('./wow-control.js');
const fs = require('fs');

const BG_STATUS_INIT = 0;
const BG_STATUS_READY = 1;
const BG_STATUS_RUN_TO_GATE = 2;
const BG_STATUS_AT_GATE = 3;
const BG_STATUS_DEAD = 20;
const BG_STATUS_GRAVEYARD = 25;
const BG_STATUS_READY_FOR_GAME = 35;
const BG_STATUS_LOOPING = 40;

class wowBattleground {
  constructor( zoneID, client ) {
    this.status = BG_STATUS_INIT;
    this.client = client;
    this.zoneID = zoneID;
    this.controller = new wowControl( () => {
      return client.getMemory();
    } );

    this.waypointSet = {
      currentWaypoint: 0,
      maxWaypoint: 0,
      set: [],
      active: false,
      callback: false
    };

    //Setup zone.
    this.waypoints = {
      'gate': [],
      'loop': []
    };
    this.currentWaypoint = 0;
    this.maxPoints = 0;

    //Preload them from the disk.
    this.preloadWaypoints();

    console.log('Ready, preloaded waypoints');
    console.log( this.waypoints );
    this.status = BG_STATUS_READY;

  }

  preloadWaypoints() {

    //Try and load way points.
    try {
      var gateWayPoints = fs.readFileSync( 'waypoints/' + this.zoneID + '/init.json' );
      gateWayPoints = JSON.parse( gateWayPoints );
    } catch(e) {
      console.error(e);
      process.exit(1);
    }

    try {
      var loopWayPoints = fs.readFileSync( 'waypoints/' + this.zoneID + '/loop.json' );
      loopWayPoints = JSON.parse( loopWayPoints );
    } catch(e) {
      console.error(e);
      process.exit(1);
    }

    this.waypoints.gate = gateWayPoints;
    this.waypoints.loop = loopWayPoints;

  }

  main() {

    var p = this.client.getMemory();

    //Check status for local interrupts.
    this.interruptSignal(p);

    //Main loop.
    switch ( this.status ) {

      case BG_STATUS_READY:
        //Start of battleground.
        this.beginPathSet( this.waypoints.gate, () => {
          this.status = BG_STATUS_AT_GATE;
        } );
        this.status = BG_STATUS_RUN_TO_GATE;

        break;

      case BG_STATUS_RUN_TO_GATE:
        console.log('running to gate');
        break;

      case BG_STATUS_AT_GATE:
        console.log('At gate!');
        //Buff.

        this.status = BG_STATUS_READY_FOR_GAME;

      case BG_STATUS_READY_FOR_GAME:
        console.log('Begin looping');
        this.beginPathSet( this.waypoints.loop, () => {
          this.status = BG_STATUS_AT_GATE;
        }, false );
        this.status = BG_STATUS_LOOPING;
        break;

      case BG_STATUS_LOOPING:
        //Looping!
        break;

      case BG_STATUS_DEAD:
        //Monitor to see if we are alive yet.
        this.awaitRes(p);
        break;

      case BG_STATUS_GRAVEYARD:
        //Find closest waypoint and loop.
        console.log('Restarting loop from closest waypoint.');
        this.beginPathSet( this.waypoints.loop, () => {
          this.status = BG_STATUS_AT_GATE;
        }, true );
        this.status = BG_STATUS_LOOPING;

        break;

    }

  }

  awaitRes(p) {

    var php = Math.ceil( (p.playerHealth / p.playerHealth) * 100 );
    if ( php >= 50 ) {
      //We are alive!.
      this.status = BG_STATUS_GRAVEYARD;
    }

  }

  interruptSignal(p) {

    //If we are newly "dead"
    if ( this.status !== BG_STATUS_DEAD ) {
      if ( parseInt(p.playerHealth) === 0 ) {
        this.interruptStatus(BG_STATUS_DEAD);
        return;
      }
    }

  }

  /**
   * Updates this.status to newStatus and performs any necessary
   * actions on the interrupt
   * @param {int} newStatus - The new status
   * @return {void}
   */
  interruptStatus(newStatus) {

    switch ( newStatus ) {
      case BG_STATUS_DEAD:
        //Stop running?
        console.log('We are dead.')
        this.cancelPathSet();
        this.status = BG_STATUS_DEAD;
        break;
    }

    this.status = newStatus;

  }

  /**
   * Begins walking along a set of waypoints
   * @param {array} waypoints - The array of waypoints to walk
   * @param {callback} callback - The callback function to execute when we arrive
   * @return {void}
   */
  beginPathSet( waypoints, callback, closest ) {

    "use strict";

    if ( typeof closest === "undefined" ) {
      var closest = false;
    }

    if ( this.waypointSet.active === true ) {
      console.error('Cannot begin path set while another is still active');
      return;
    }

    this.waypointSet = {
      currentWaypoint: 0,
      maxWaypoint: waypoints.length,
      set: waypoints,
      active: true,
      callback: callback
    };

    if ( closest === true ) {
      //Find the closest waypoint to current location.
      var closestIndex = 0;
      var shortestedValue = 999999;
      var p = this.client.getMemory();

      for ( var xi=0; xi<waypoints.length; xi++ ) {
        let wp = waypoints[xi];
        let d = this.controller.calculateDistance( p.playerY, p.playerX, wp.y, wp.x );
        if ( d < shortestedValue ) {
          shortestedValue = d;
          closestIndex = xi;
          console.log('Found closest waypoint with index ' + closestIndex + ' at a distance of ' + d );
        }
      }

      this.waypointSet.currentWaypoint = closestIndex;
    }

    //Begin monitoring the set.
    this.monitorActivePathSet();

  }

  cancelPathSet() {

    if ( this.waypointSet.callback ) {
      this.waypointSet.callback();
    }
    this.waypointSet.currentWaypoint = 0;
    this.waypointSet.maxWaypoint = 0;
    this.waypointSet.set = [];
    this.waypointSet.active = false;
    this.waypointSet.callback = false;

    //Cancel any movements.
    this.controller.cancelAll();

  }

  monitorActivePathSet() {

    var _this = this;

    if ( this.waypointSet.currentWaypoint >= this.waypointSet.maxWaypoint ) {
      //End!
      console.log('Reached end of waypoints');
      if ( this.waypointSet.callback ) {
        this.waypointSet.callback();
      }

      this.waypointSet.currentWaypoint = 0;
      this.waypointSet.maxWaypoint = 0;
      this.waypointSet.set = [];
      this.waypointSet.active = false;
      this.waypointSet.callback = false;
      return;
    }

    var cp = this.waypointSet.set[this.waypointSet.currentWaypoint];

    this.controller.walkTo( cp.x, cp.y, () => {
      _this.waypointSet.currentWaypoint += 1
      _this.monitorActivePathSet();
    });

  }

}

module.exports = wowBattleground;

/*
var controller = new wowControl( () => {
  return client.getMemory();
} );


var currentPoint = 0;
var maxPoints = points.length;

var autoWalkToPoint = ( i ) => {

  console.log('point ' + i);
  if ( i >= maxPoints ) {
    console.log('done');
    process.exit(0);
  }

  var cp = points[i];
  controller.walkTo( cp.x, cp.y, () => {
    autoWalkToPoint( i + 1 );
  } )

};

setTimeout(() => {
    autoWalkToPoint( 0 );
},1000);*/
