const fs = require('fs');
const wowMemClient = require('./../../lib/mem-client.js');

var client = new wowMemClient( 'localhost', 8888, false );

client.on("onData", () => {

  var m = client.getMemory();
  fn = m.gameZone + '.json';

  var oj = [];
  var ob = "";

  try {
    ob = fs.readFileSync(fn);
    oj = JSON.parse(ob);
  } catch(e) {
  }

  var buff = {
    x: parseFloat(m.playerX),
    y: parseFloat(m.playerY),
    z: parseFloat(m.playerZ)
  };
	console.log(buff);

  //Don't add double entries.
  if ( oj.length > 0 ) {
    if (
      oj[oj.length -1].x === buff.x &&
      oj[oj.length -1].y === buff.y &&
      oj[oj.length -1].z === buff.z
    ) {
      console.error('Duplicate entry. Skip!');
      process.exit(1);
    }
  }

  oj.push(buff);

  var bs = JSON.stringify(oj, true, 2);
  console.log('Wrote way point');

  fs.writeFileSync(fn, bs);

  process.exit(0);
});
