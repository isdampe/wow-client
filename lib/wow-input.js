const robot = require('robotjs');
const WC_KEY_PRESS = 'down';
const WC_KEY_RELEASE = 'up';

class wowInput {

  constructor( keymap ) {
    this.keymap = keymap;
  }

  queueForBg( callback ) {
    robot.keyTap('1');
    if ( typeof callback !== 'undefined' ) {
      setTimeout(() => {
        callback();
      }, 1500);
    }
  }

  tryEnterBg() {
    robot.keyTap('2');
  }

}
module.exports = wowInput;
