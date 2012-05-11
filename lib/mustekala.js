module.exports=function() {
	var m={
		version: '0.1.0'
		,github: 'http://github.com/daraosn/mustekala'
		,config: {}
		,io: {}
		,socket: {}
		,authKeyExpiry: 2 // seconds
		,authKeys: {}
		,authUsers: {}
		
		,clients: {} // connected sockets
		,clientCount: 0 // to avoid counting object each time
		,channels: {}
	}
	
	try {
		m.config = require('../config.js');
	} catch(e) {
		console.log("No 'config.js' found. Use 'config.template.js' to create one.");
		process.exit(1);
	}
	
	m.config.port = m.config.port || 3000;
	
	m.initialize=function() {
		require('./configure');
		require('./socket');
		require('./routes');
		require('./utils');
		
		// m.generateAuthKey(m.config.password);
		// setInterval(function() {
			// console.log(m.authKeys);
		// }, 1000);
	}
	
	m.trigger=function(password, channel, action, data) {
		if(password==mustekala.config.password) {
			if(channel) {
				mustekala.socket.to(channel).emit('trigger', channel, action, data);
			} else {
				// Global trigger
				mustekala.socket.emit('trigger', channel, action, data);
			}
			return true;
		} else {
			return false;
		}
	}
	
	m.generateAuthKey = function(password,channel,user) {
		if(password==mustekala.config.password&&channel) {
			do { var token = Utils.token()+Utils.token(); } while(m.authKeys[token]);
			m.authKeys[token] = {
				'expireTime': new Date().getTime() + m.authKeyExpiry
				,'channel': channel
				,'user': user
			}
			setTimeout(function() { delete m.authKeys[token] }, m.authKeyExpiry*1000);
			return token;
		} else {
			return false;
		}
	}
	
	// Debug
setInterval(function() {
	console.log('****************************')
	console.log(mustekala.clients)
}, 1000);
	
	m.addClient = function(client) {
		// console.log('m.addClient', client.id)
		m.clients[client.id]={
			'client': client
			,'channels': {}
			,'channelCount': 0
		}
		m.clientCount++;
	}
	
	m.addClientChannel = function(client, channelName, channelType) {
		if(!m.channels[channelName]) {
			// create channel
			m.channels[channelName]={
				'type': channelType
				,'clients': {}
				,'clientCount': 0
			}
		}
		if(!m.channels[channelName].clients[client.id]) {
			// create associations
			m.channels[channelName].clientCount++
			m.channels[channelName].clients[client.id]=new Date().getTime();
			m.clients[client.id].channelCount++;
			m.clients[client.id].channels[channelName]=new Date().getTime();
			return true;
		}
		return false; // client already subscribed this channeñ
	}
	
	m.removeClientChannel = function(client, channelName) {
		if(m.channels[channelName]) {
			// destroy associations
			m.clients[client.id].channelCount--;
			delete m.clients[client.id].channels[channelName];
			m.channels[channelName].clientCount--;
			delete m.channels[channelName].clients[client.id];
			
			// destroy channel if empty
			if(m.channels[channelName].clientCount===0) {
				delete m.channels[channelName];
			}
			return true;
		}
		return false;
	}
	
	m.eachClientChannel = function(client, handler) {
		// console.log('m.eachClientChannel', client.id)
		if(m.clients[client.id].channels) {
			for(var channelName in m.clients[client.id].channels) {
				// console.log('m.eachClientChannel.callback', channelName, m.clients[client.id].channels[channelName])
				handler(channelName, m.clients[client.id].channels[channelName]);
			}
		}
	}
	
	m.removeClient = function(client) {
		// console.log('m.removeClient', client.id)
		delete m.clients[client.id];
		m.clientCount--;
	}
	
	return m;
}
