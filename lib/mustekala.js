module.exports=function() {
	var m={
		version: '0.1.0'
		,github: 'http://github.com/daraosn/mustekala'
		,config: {}
		,io: {}
		,socket: {}
		,authKeyExpiry: 2 // seconds
		,authKeys: {}
	}
	
	try {
		m.config = require('../config.js');
	} catch(e) {
		console.log("No 'config.js' found. Use 'config.template.js' to create one.");
		process.exit(1);
	}
	
	m.config.port = m.config.port || 3000;
	
	m.trigger=function(password, channel, action, data) {
		if(password==mustekala.config.password) {
			if(channel) {
				mustekala.socket.to(channel).emit('trigger', channel, action, data);
			} else {
				mustekala.socket.emit('trigger', channel, action, data);
			}
			return true;
		} else {
			return false;
		}
	}
	
	m.initialize=function() {
		require('./configure');
		require('./socket');
		require('./routes');
		require('./utils');
		
		m.generateAuthKey(m.config.password);
		setInterval(function() {
			console.log(m.authKeys);
		}, 1000);
	}
	
	m.generateAuthKey = function(password) {
		if(password==mustekala.config.password) {
			do { var token = Utils.token(); } while(m.authKeys[token]);
			m.authKeys[token] = new Date().getTime() + m.authKeyExpiry;
			setTimeout(function() { delete m.authKeys[token] }, m.authKeyExpiry*1000);
			return token;
		} else {
			return false;
		}
	}
	
	return m;
}
