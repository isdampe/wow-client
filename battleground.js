const wowMemClient = require('./lib/mem-client.js');
const wowInput = require('./lib/wow-input.js');
const wowZone = require('./lib/wow-zone.js');
const wowBattleground = require('./lib/wow-battleground.js');

var client = new wowMemClient( 'localhost', 8888 );
var control = new wowInput({});
var zone = new wowZone();

var player = {};
var status = 0;
var interrupt = false;
var bgClass;
var bgKeyPressFn;

function main() {

  var p = client.getMemory();
  //console.log(p)
  if ( typeof p !== 'undefined' ) player = p;

  //Check for interrupts.
  interruptSignal(p);

  //Dispatch  our events.
  switch ( status ) {

    case 1:
      //Need to queue.
      control.allKeysUp();
      status = 2;
      console.log('Queing for BG');
      control.queueForBg(() => {
        console.log('Waiting for BG to pop.');
        status = 3;
        bgKeyPressFn = setInterval(() => {
          control.tryEnterBg();
        }, (Math.floor(Math.random() * 3) + 6) * 1000  );
      });
      break;

    case 2:
      //Awaiting queue action
      break;

    case 3:

      //Waiting for BG to pop.
      if ( zone.isBattleGround(p.gameZone) ) {
        console.log('Entered BG');
        clearInterval(bgKeyPressFn);
        status = 4;
      }
      break;

    case 4:
      //Just arrived in battleground.
      //Setup the BG.
      bgClass = new wowBattleground( p.gameZone, client );
      status = 5;

      break;

    case 5:
      //Pass over the functions to wowBattleground.
      bgClass.main();
      break;


  }

}

/**
 * Emits an interrupt signal where required.
 */
function interruptSignal(p) {

  if ( status >= 4 ) {
    //Have we left the battleground unexpendantly?
    if (! zone.isBattleGround(p.gameZone) ) {
      console.error('Unexpectadly left battleground.');
      console.error('Switching back to status 1.')
      status = 1;
      bgClass.onCancel();
    }
  }

}

status = 1;

setTimeout(() => {
  setInterval(() => {
    //Main is the dispatch loop.
    main();
  }, 25);
  setInterval(() => {
    console.log( client.getMemory() );
  }, 5000);
}, 2500);
