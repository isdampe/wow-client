const express = require('express');
const os = require('os');
const screenCap = require('desktop-screenshot');
var app = express();

class wowHttp {

	/**
	 * Builds and listens the HTTP server
	 * @param {string} host - The hostname to listen on
	 * @param {int} port - The port number to listen on
	 * @param {wowMemClient} - The reference to wowMemClient
	 * @return {void}
	 */
	constructor(host, port, client) {
		this.host = host;
		this.port = port;
		this.client = client;
		
		app = express();
		this.addRoutes();
		this.serve();
	}

	addRoutes() {

		var _this = this;

		//Serve static files from the http directory.
		app.use(express.static('http'));

		//Return JSON data to client
		app.get('/status', _this.status);
		app.get('/screenshot', _this.screenshot);

	}

	serve() {

		var _this = this;

		app.listen(this.port, this.host, () => {
			console.log('wowHttp listening on http://' + _this.host + ':' + _this.port);
		});

	}

	/**
	 * Returns the current status in JSON to the client
	 * @return {void}
	 */
	status(req, res) {
		
		res.json({
			"x": "2818.22",
			"y": "-9544.95",
			"z": "14.66"
		});

	}

	/**
	 * Takes a screenshot and sends it back to the client
	 * as base64 encoded img
	 * @return {void}
	 */
	screenshot(req, res) {

		var imgUri = os.tmpdir() + '/wow-client-ss.jpg';
		var args = {
			quality: 70,
			width: 1280,
			height: 720
		};

		screenCap(imgUri, args, (err, comp) => {
			if ( err ) {
				res.json({
					status: "error"
				});
				return;
			}
			
			res.sendFile(imgUri);
		});

	}

}

module.exports = wowHttp;