const net = require('net');
const exec = require('child_process').exec;

class wowMemClient {

	constructor( hostname, port ) {

		this.proc = exec(__dirname + '/../native/bin/WowMemoryServer.exe',(err,stdout,stderr) => {
			if ( err ) {
				console.error('Error launching memory server');
				console.log(err);
				process.exit(1);
			}
		});

		this.hostname = hostname;
		this.port = port;
		this.client = null;
		this.clientStatus = 0;
		this.dataBuffer = null;
		this.onConnect = null;
		this.onData = null;
		this.jsonBuffer = {};
		this.createClient();
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

		this.client.on('error', (err) => {
			console.error('Memory server not active.');
			process.exit(1);
		})

	}

	clientReceive( _this, buffer ) {

		this.dataBuffer = buffer;

		//Parse the buffer as a string
		var str = buffer.toString('utf8');

		//Strip away the \0 character from C++ string.
		str = str.substr(0,str.length -1);

		try {
			var jsb = JSON.parse(str);
			this.jsonBuffer = jsb;

			//Callback, if registered.
			if ( _this.onData ) {
				_this.onData( buffer );
			}

		} catch(e) {
		}

	}

	getMemory() {
		return this.jsonBuffer;
	}

}

module.exports = wowMemClient;
