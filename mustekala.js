var Mustekala=require('./lib/mustekala.js');
global.express = require('express');
global.app = module.exports = express.createServer();
global.mustekala = new Mustekala();
mustekala.initialize();

app.listen(mustekala.config.port || 3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
