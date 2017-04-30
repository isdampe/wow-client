const robot = require('robotjs');
const exec = require('child_process').exec;
const WC_KEY_PRESS = 'down';
const WC_KEY_RELEASE = 'up';
const activateWindowCmd = __dirname + '/../native/bin/Win32.exe winactivate';

class wowInput {

  constructor( keymap ) {
    this.keymap = keymap;
  }

  queueForBg( callback ) {
    this.activateWindow();
    robot.keyTap('1');
    if ( typeof callback !== 'undefined' ) {
      setTimeout(() => {
        callback();
      }, 1500);
    }
  }

  tryEnterBg() {
    this.activateWindow();
    robot.keyTap('1');
    robot.keyTap('2');
  }

  releaseSpirit() {
    this.activateWindow();
    robot.keyTap('3');
  }

  allKeysUp() {
    robot.keyToggle('left', WC_KEY_RELEASE);
    robot.keyToggle('right', WC_KEY_RELEASE);
    robot.keyToggle('up', WC_KEY_RELEASE);
  }

  activateWindow() {
    exec(activateWindowCmd);
  }

}
module.exports = wowInput;
