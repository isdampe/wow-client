const wowControl = require('./wow-control.js');
const wowInput = require('./wow-input.js');
const wowCombat = require('./wow-combat.js');
const fs = require('fs');

const BG_STATUS_INIT = 0;
const BG_STATUS_READY = 1;
const BG_STATUS_RUN_TO_GATE = 2;
const BG_STATUS_AT_GATE = 3;
const BG_STATUS_DEAD = 20;
const BG_STATUS_GRAVEYARD = 25;
const BG_STATUS_LEAVING_GRAVEYARD = 26;
const BG_STATUS_READY_FOR_GAME = 35;
const BG_STATUS_LOOPING = 40;
const BG_STATUS_RESUME_LOOP = 41;
const BG_STATUS_COMBAT = 45;

class wowBattleground {
  constructor( zoneID, client ) {
    this.status = BG_STATUS_INIT;
    this.client = client;
    this.zoneID = zoneID;
    this.control = new wowInput({});
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
    //console.log( this.waypoints );
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

    try {
      var graveyardWayPoints = fs.readFileSync( 'waypoints/' + this.zoneID + '/graveyard.json' );
      graveyardWayPoints = JSON.parse( graveyardWayPoints );
    } catch(e) {
      console.error(e);
      process.exit(1);
    }

    this.waypoints.gate = gateWayPoints;
    this.waypoints.loop = loopWayPoints;
    this.waypoints.graveyard = graveyardWayPoints;

  }

  main() {

    var p = this.client.getMemory();

    //Check status for local interrupts.
    this.interruptSignal(p);

    //Main loop.
    switch ( this.status ) {

      case BG_STATUS_READY:

        //Start of battleground.
        this.control.activateWindow();
        this.beginPathSet( this.waypoints.gate, () => {
          this.status = BG_STATUS_AT_GATE;
        }, false );
        console.log('Running to gate');
        this.status = BG_STATUS_RUN_TO_GATE;

        break;

      case BG_STATUS_RUN_TO_GATE:
        break;

      case BG_STATUS_AT_GATE:
        console.log('At gate');

        //Buff.

        this.status = BG_STATUS_READY_FOR_GAME;
        break;

      case BG_STATUS_READY_FOR_GAME:

        console.log('Beginning main loop');
        this.control.activateWindow();
        this.beginPathSet( this.waypoints.loop, () => {
          this.status = BG_STATUS_AT_GATE;
        }, false );
        this.status = BG_STATUS_LOOPING;
        break;

      case BG_STATUS_LOOPING:
        //Looping!
        this.checkForCombat();
        break;

      case BG_STATUS_DEAD:
        //Monitor to see if we are alive yet.
        //console.log('Awaiting res');
        this.awaitRes(p);
        break;

      case BG_STATUS_GRAVEYARD:

        //Find closest waypoint and loop.
        console.log('Returning to main loop from graveyard');
        this.control.activateWindow();
        this.beginPathSet( this.waypoints.graveyard, () => {
          this.status = BG_STATUS_RESUME_LOOP;
        }, true );
        this.status = BG_STATUS_LEAVING_GRAVEYARD;

        break;

      case BG_STATUS_LEAVING_GRAVEYARD:
        //Do nothing...
      break;

      case BG_STATUS_COMBAT:
        //Do nothing...
      break;

      case BG_STATUS_RESUME_LOOP:

        console.log('Resuming loop from closest waypoint');
        this.control.activateWindow();
        this.beginPathSet( this.waypoints.loop, () => {
          this.status = BG_STATUS_AT_GATE;
        }, true );
        this.status = BG_STATUS_LOOPING;

      break;

    }

  }

  awaitRes(p) {

    if ( p.playerHealth > 1 ) {
      //We are alive!.
      console.log('We have been resurrected.');
      this.status = BG_STATUS_GRAVEYARD;
    }

  }

  interruptSignal(p) {

    //If we are newly "dead"
    if ( this.status !== BG_STATUS_DEAD ) {
      if ( parseInt(p.playerHealth) <= 1 ) {
        this.interruptStatus(BG_STATUS_DEAD);
        return;
      }
    }

  }

  checkForCombat() {

    var _this = this;

    var p = this.client.getMemory();
    if ( parseInt(p.playerTarget) > 0 ) {
      let d = this.controller.calculateDistance( p.playerY, p.playerX, p.targetY, p.targetX );
      if ( d <= 30 ) {

        this.interruptStatus(BG_STATUS_COMBAT);
        console.log('Entering combat!');

        var combat = new wowCombat(() => {
          return _this.client.getMemory();
        }, () => {
          console.log('Combat end!');
          this.status = BG_STATUS_RESUME_LOOP;
          combat = null;
        });

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

    var _this = this;

    switch ( newStatus ) {
      case BG_STATUS_DEAD:
        //Stop running?
        console.log('Death detected.')
        this.cancelPathSet();
        this.status = BG_STATUS_DEAD;
        //Release.
        setTimeout(() => {
          _this.control.releaseSpirit();
        },1000);
        break;
      case BG_STATUS_COMBAT:
        this.cancelPathSet();
        this.status = BG_STATUS_COMBAT;
      break;
    }

    this.status = newStatus;

  }

  onCancel() {
    this.cancelPathSet();
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

      //Finds the closest waypoint to current x,y position.
      for ( var xi=0; xi<waypoints.length; xi++ ) {
        let wp = waypoints[xi];
        let d = this.controller.calculateDistance( p.playerY, p.playerX, wp.y, wp.x );
        if ( d < shortestedValue ) {
          shortestedValue = d;
          closestIndex = xi;
        }
      }

      this.waypointSet.currentWaypoint = closestIndex;
    }

    //Begin monitoring the set.
    this.monitorActivePathSet();

  }

  cancelPathSet() {

    var _this = this;

    this.waypointSet.currentWaypoint = 0;
    this.waypointSet.maxWaypoint = 0;
    this.waypointSet.set = [];
    this.waypointSet.active = false;
    this.waypointSet.callback = false;

    //Cancel any movements.
    this.controller.cancelAll();
    //Reset the controller.
    this.controller = new wowControl( () => {
      return _this.client.getMemory();
    } );

  }

  monitorActivePathSet() {

    var _this = this;

    if ( this.waypointSet.currentWaypoint >= this.waypointSet.maxWaypoint ) {
      //End!

      console.log('Reached end of waypoint set');
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

    var args = {
      stuckCheck: true,
      bearingCheck: true
    };

    if ( this.status == BG_STATUS_RUN_TO_GATE || this.status == BG_STATUS_READY ) {
      console.log('No stuck check as we run to gate');
      args.stuckCheck = false; //Don't try to unstick at BG gate.
      args.rotationCheck = true; //Do auto-correct rotation though.
    }
    this.controller.walkTo( cp.x, cp.y, () => {
      _this.waypointSet.currentWaypoint += 1
      _this.monitorActivePathSet();
    }, args);

  }

}

module.exports = wowBattleground;
