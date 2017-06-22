const telnetServer = require('../../lib/telnet.js');

var srv = new telnetServer('localhost', 9001, () => {
	return "Player HP: 322\nCurrent zone: Warsong gulch";
});