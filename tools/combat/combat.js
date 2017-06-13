const wowMemClient = require('./../../lib/mem-client.js');
const wowControl = require('./../../lib/wow-control.js');
const wowCombat = require('./../../lib/wow-combat.js');

var client = new wowMemClient( 'localhost', 8888 );
var controller = new wowControl( () => {
  return client.getMemory();
} );

setTimeout(() => {

	var combat = new wowCombat(() => {
	  return client.getMemory();
	}, () => {
		console.log('Combat over!');
	});

}, 1000);