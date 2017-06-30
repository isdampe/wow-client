const wowMemClient = require('./lib/mem-client.js');
const wowInput = require('./lib/wow-input.js');
const wowZone = require('./lib/wow-zone.js');
const wowBattleground = require('./lib/wow-battleground.js');
const telnetSrv = require('./lib/telnet.js');

const STATUS_DETECT = 0;
const STATUS_DC = 5;
const STATUS_QUEUE = 10;
const STATUS_AWAITING_QUEUE_ACTION = 20;
const STATUS_AWAITING_BG = 30;
const STATUS_ARRIVED_IN_BG = 40;
const STATUS_BG_ACTIVE = 50;

var client = new wowMemClient( 'localhost', 8888 ), 
    control = new wowInput({}),
    zone = new wowZone();
var dcTime = false, player = {}, status = 0, interrupt = false, bgClass,
    bgKeyPressFn;

function main() {

  var p = client.getMemory();
  if ( typeof p !== 'undefined' ) player = p;

  //Check for interrupts.
  interruptSignal(p);

  //Dispatch  our events.
  switch ( status ) {

    case STATUS_DETECT:

      //Detect state.
      if ( parseInt(p.isConnected) < 1 ) {
        //Game is not connected.
        console.log('Disconnected from server');
//        dcTime = new Date();
  //      status = STATUS_DC;
      }  else {
        //Game is connected.
        status = STATUS_QUEUE;
      }

      break;

    case STATUS_DC:

      //Is there an internet connection?

      //If there is, relaunch wow and login.

      //If not, sleep and try again.
      console.log('No dc method exists');
      console.log('Disconnected at ' + dcTime);

      //Don't hammer the CPU
      setTimeout(() => {
        //Recurse
        main();
      }, 2500);
      return;

      break;

    case STATUS_QUEUE:

      //Need to queue.
      control.allKeysUp();

      status = STATUS_AWAITING_QUEUE_ACTION;
      console.log('Queing for BG');
      
      control.queueForBg(() => {
        console.log('Waiting for BG to pop.');
        status = STATUS_AWAITING_BG;
        bgKeyPressFn = setInterval(() => {
          control.tryEnterBg();
        }, (Math.floor(Math.random() * 3) + 6) * 1000  );
      });
      break;

    case STATUS_AWAITING_QUEUE_ACTION:
      //Awaiting queue action
      break;

    case STATUS_AWAITING_BG:

      //Waiting for BG to pop.
      if ( zone.isBattleGround(p.gameZone) ) {
        console.log('Entered BG');
        clearInterval(bgKeyPressFn);
        status = STATUS_ARRIVED_IN_BG;
      }
      break;

    case STATUS_ARRIVED_IN_BG:
      //Just arrived in battleground.
      //Setup the BG.
      bgClass = new wowBattleground( p.gameZone, client );
      status = STATUS_BG_ACTIVE;

      break;

    case STATUS_BG_ACTIVE:
      //Pass over the functions to wowBattleground.
      bgClass.main();
      break;


  }

  setTimeout(() => {
    //Recurse
    main();
  }, 25);

}

/**
 * Emits an interrupt signal where required.
 */
function interruptSignal(p) {

  if ( status >= STATUS_ARRIVED_IN_BG ) {
    //Have we left the battleground unexpendantly?
    if (! zone.isBattleGround(p.gameZone) ) {
      console.error('Unexpectadly left battleground.');
      console.error('Switching back to status 1.')
      status = STATUS_DETECT;
      if ( typeof bgClass !== 'undefined' ) {
        bgClass.onCancel();
      }
    }
  }

}

function translateStatus( status ) {

  switch ( status ) {

    case STATUS_DETECT:
      return "Detecting";
      break;
    case STATUS_DC:
      return "Disconnected";
      break;
    case STATUS_QUEUE:
      return "Queing";
      break;
    case STATUS_AWAITING_QUEUE_ACTION:
      return "Awaiting queue action";
      break;
    case STATUS_AWAITING_BG:
      return "Awaiting BG pop";
      break;
    case STATUS_ARRIVED_IN_BG:
      return "Arrived in BG";
      break;
    case STATUS_BG_ACTIVE:
      return "BG Active";
      break;
  }

  return "Unknown";

}

function setupTelnet() {
  var srv = new telnetSrv('0.0.0.0', 9001, () => {
    var p = client.getMemory();
    var buff = "";
    buff += "Connected: " + ( parseInt(p.isConnected) > 0 ? "Yes" : "No" ) + "\n";
    buff += "Status: " + translateStatus(status) + "\n";
    buff += "Zone: " + p.gameZone;
    return buff;
  });
}

status = STATUS_DETECT;

setTimeout(() => {
  setupTelnet();
  main();
  setInterval(() => {
    console.log( client.getMemory() );
  }, 5000);
}, 2500);
