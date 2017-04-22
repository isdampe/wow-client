const wowMemClient = require('./lib/mem-client.js');

var client = new wowMemClient( 'localhost', 8888 );
var player = {};
var status = 0;

function main() {

  var p = client.getMemory();
  if ( typeof p !== 'undefined' ) player = p;

  switch ( status ) {

  }

}

status = 1;
setInterval(() => {

  //Main is the dispatch loop.
  main();

}, 25);
