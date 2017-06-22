const net = require('net');

class telnetServer {

	constructor(host, port, getStat) {
		this.host = host;
		this.port = port;
		this.getStat = getStat;
		this.listen();
		this.srv = false;
	}

	listen() {
		var _this = this;
		this.srv = net.createServer((client) => {
			client.on('data', (data) => {
				_this.parsePacket(client, data);
			});
			client.write("Enter a command number: ", 'utf8');
		});
		this.srv.on('error', (err) => {
			throw err;
		});

		this.srv.listen({
			port: this.port,
			host: this.host
		}, () => {
			console.log('Telnet server listening on ' + _this.host + ':' + _this.port);
		});
	}

	parsePacket(client, data) {
		var str = data.toString('utf8');
		var ex = str.split("\n");
		if ( ex.length < 2 ) {
			client.write( this.getUsage(), 'utf8');
		}
		
		switch ( parseInt(ex) ) {
			case 1:
				var stat = this.getStat();
				client.write("\n" + stat + "\n\n", 'utf8');
				break;
			case 10:
				client.write("Goodbye\n", 'utf8');
				client.destroy();
				return;
				break;
			default:
				client.write( this.getUsage(), 'utf8');
				break;
		}

		client.write("Enter a command number: ", 'utf8');

	}

	getUsage() {
		return "\nCommands available\n1. Dump current info\n10. Close connection\n";
	}

}

module.exports = telnetServer;