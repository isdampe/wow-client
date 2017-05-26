const wowMemClient = require('./../../lib/mem-client.js');
const wowControl = require('./../../lib/wow-control.js');

var client = new wowMemClient( 'localhost', 8888, false );
var controller = new wowControl( () => {
  return client.getMemory();
} );

//Stormwind...
var points = [
  {
    "x": -8823.866211,
    "y": -71.212761,
    "z": 87.723396
  },
  {
    "x": -8843.186523,
    "y": -96.341629,
    "z": 84.218338
  },
  {
    "x": -8848.952148,
    "y": -107.333435,
    "z": 81.298637
  }
];

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
},1000);

/*
setTimeout(() => {
  controller.walkTo( -9087.443359, 417.471130, () => {
    console.log('I made it!');
  } );
}, 1000);
*/
