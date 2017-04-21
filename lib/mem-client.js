const net = require('net');

class wowMemClient {

	constructor( hostname, port ) {
		this.hostname = hostname;
		this.port = port;
		this.client = null;
		this.clientStatus = 0;
		this.dataBuffer = null;
		this.jsonBuffer = {};
		this.createClient();
	}

	createClient() {

		var _this = this;
		this.client = new net.Socket();
		this.client.connect(this.port, this.hostname, () => {
			this.clientStatus = 1;
			console.log('connected');
		});

		this.client.on('data', (buffer) => {
			_this.clientReceive( _this, buffer );
		});

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
		} catch(e) {
		}

	}

	getMemory() {
		return this.jsonBuffer;
	}

}

module.exports = wowMemClient;
