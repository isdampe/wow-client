const fs = require('fs');

var config = {};

config = fs.readFileSync('../config.json', {encoding:"utf8"});
config = JSON.parse(config);

module.exports = config;
