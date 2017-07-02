const wowMemClient = require('./lib/mem-client.js');
const httpSrv = require('./lib/http.js');

var client = new wowMemClient( 'localhost', 8888 );

setInterval(() => {
	console.log( client.getMemory() );
}, 1000);

var server = new httpSrv('0.0.0.0', 9001, client);
