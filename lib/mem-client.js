const net = require('net');
const exec = require('child_process').exec;

class wowMemClient {

	constructor( hostname, port, childServer = true ) {

		if ( childServer ) {
			this.proc = exec(__dirname + '/../native/bin/WowMemoryServer.exe',(err,stdout,stderr) => {
				if ( err ) {
					console.error('Error launching memory server');
					console.log(err);
					process.exit(1);
				}
			});
		}

		this.hostname = hostname;
		this.port = port;
		this.client = null;
		this.clientStatus = 0;
		this.dataBuffer = null;
		this.onConnect = null;
		this.onData = null;
		this.jsonBuffer = {};
		this.createClient();
		this.register = null;
	}

	/**
	 * Registers an event callback to be emitted.
	 * @param {string} e - The event name
	 * @param {function} callback - The callback function
	 */
	on(e, callback) {
		this[e] = callback;
	}

	createClient() {

		var _this = this;

		this.client = new net.Socket();
		this.client.setEncoding('utf8');
		this.client.connect(this.port, this.hostname, () => {
			this.clientStatus = 1;
			console.log('Memory client connected.');
			if ( this.onConnect ) {
				this.onConnect();
			}
		});

		this.client.on('data', (buffer) => {
			_this.clientReceive( _this, buffer );
		});
		this.client.on('end', () => {
			console.log('end');
			process.exit(1);
		});

		this.client.on('error', (err) => {
			console.error('Memory server not active.');
			process.exit(1);
		})

	}

	clientReceive( _this, buffer ) {

		if ( this.register == null ) {
			this.register = buffer;
		} else {
			this.register += buffer;
		}

		var s = this.register.split("\n\n");
		if ( s.length < 2 ) {
			return;
		}

		var ns = s[0];

		//console.log(ns);
		this.register = null;

		this.dataBuffer = buffer;

		try {
			var jsb = JSON.parse(ns);
			this.jsonBuffer = jsb;
		} catch(e) {
			//console.log(e);
			//console.log(ns);
			//process.exit(1);
		}

		//Callback, if registered.
		if ( _this.onData ) {
			_this.onData( jsb );
		}

	}

	getMemory() {
		return this.jsonBuffer;
	}

}

module.exports = wowMemClient;
