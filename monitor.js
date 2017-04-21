const wowMemClient = require('./lib/mem-client.js');

var client = new wowMemClient( 'localhost', 8888 );

setInterval(() => {
	console.log( client.getMemory() );
}, 100);
