module.exports=function() {
	var m={
		version: '0.1.0'
		,github: 'http://github.com/daraosn/mustekala'
		,config: {}
		,io: {}
		,socket: {}
	}
	
	try {
		m.config = require('../config.js');
	} catch(e) {
		console.log("No 'config.js' found. Use 'config.template.js' to create one.");
		process.exit(1);
	}
	
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
	
	m.socketPresencePreauthorize=function(password) {
		if(password==mustekala.config.password) {
			do { var token = global.token(); } while(mustekala.authKeys[token]);
			mustekala.authKeys[token] = new Date().getTime() + presenceKeyExpiry;
			console.log('@@@@@'+global.dump(mustekala.authKeys));
			return token;
		} else {
			return false;
		}
	}
	
	m.initialize=function() {
		require('./routes');
		require('./configure');
		require('./socket');
	}
	return m;
}
