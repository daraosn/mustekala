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
		
		// Models:
		// ,Client: {} // connected sockets
		// ,Channel: {} // online channels
		// ,User: {} // presence users
		
		// Non-models:
		,clients: {}
		,channels: {}
		,users: {}
	}
	
	var environment=process.env.NODE_ENV || 'development';
	try {
		m.config = require('../config.js')[environment];
	} catch(e) {
		console.log("No 'config.js' found. Use 'config.template.js' to create one.");
		process.exit(1);
	}
	
	m.config.port = m.config.port || 3000;
	
	m.initialize=function() {
		require('./configure');
		require('./socket');
		require('./routes');
		require('./utils');
		
		// m.configureModels();
		
		// m.generateAuthKey(m.config.password);
		// setInterval(function() {
			// console.log(m.authKeys);
		// }, 1000);
	}
	
	// m.configureModels = function() {
		// var Schema = require('jugglingdb').Schema;
		// // var schema = new Schema('memory');
		// var schema = new Schema('redis', {port: 6379});
// 		
		// // Setup models
		// m.User = schema.define('User', {
			 // id:						String
			// ,data:					Object
			// ,clients:				Array
		// });
		// m.Client = schema.define('Client', {
			 // id:						String
			 // ,userId:				String
		// });
		// m.Channel = schema.define('Channel', {
			 // id:						String
			// ,type:					String
			// ,clients:				Array
			// ,users:					Array
		// });
	// }
// 	
	// m.addClient=function(client) {
		// m.Client.updateOrCreate({
			// id: client.id
		// });
	// }
// 	
	// m.removeClient=function(client) {
		// m.Client.find(client.id, function(err, client) {
			// client.destroy();
		// });
	// }
// 	
	// m.addChannel=function(channelName, channelType, callback) {
		// m.Channel.updateOrCreate({
			// id: channelName
			// ,type: channelType
		// }, function(error, channel) {
			// if(callback) callback(channel);
		// });
	// }
// 	
	// m.subscribeClient=function(client, channelName, channelType) {
		// m.addChannel(channelName, channelType, function(channel) {
// 			
			// channel.clients.push(client.id);
		// });
	// }
// 	
	// m.authUser=function(user, channelName, client) {
// 		
	// }
	
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

// *********************
// Relations:
// 'user' has many 'clients' // not in use
// 'user' has many 'channels' // not in use
// 'client' has one 'user' // used to associate user to client and notify others when client disconnects
// 'client' has many 'channels' // used to notify memberLeft when client disconnects
// 'channel' has many 'users' // used to get members on client side
// 'channel' has many 'clients' // not in use
// *********************

	m.addClient = function(clientId) {
		// console.log('m.addClient', clientId)
		m.clients[clientId]={
			'id': clientId
			,'userId': null
			,'channels': {}
		}
	}
	
	m.addChannel = function(channelName, channelType) {
		// console.log('m.addChannel', channelName, channelType);
		if(!m.channels[channelName]) {
			// create channel
			m.channels[channelName]={
				'name': channelName
				,'type': channelType
				,'clients': {}
				,'users': {}
			}
		}
	}

	m.addClientToChannel = function(clientId, channelName) {
		// console.log('m.addClientToChannel', clientId, channelName);
		// console.log('mmmm', m.channels[channelName], m.clients[clientId], m.channels[channelName].clients[clientId])
		if(m.channels[channelName]&&m.clients[clientId]&&!m.channels[channelName].clients[clientId]) {
			// create associations
			m.channels[channelName].clients[clientId]=new Date().getTime();
			m.clients[clientId].channels[channelName]=new Date().getTime();
			return true;
		}
		// console.log('m.addClientToChannel', false);
		return false; // client already subscribed this channel
	}
	
	m.addUser = function(userId, userData) {
		if(!m.users[userId]) {
			// create channel
			m.users[userId]={
				'id': userId
				,'data': userData
				,'channels': {}
				,'clients': {}
			}
		}
	}
	
	m.getUser = function(userId) {
		var user=m.users[userId];
		return !user ? null : {
			id: user.id
			,data: user.data
		}
	}
	
	m.addUserToClient = function(userId, clientId) {
		if(m.clients[clientId]&&!m.clients[clientId].userId) {
			m.clients[clientId].userId=userId;
			m.users[userId].clients[clientId]=new Date().getTime();
			return true;
		}
		return false;
	}
	
	m.getClientUser = function(clientId) {
		var client=m.clients[clientId];
		return !client ? null : m.getUser(client.userId);
	}
	
	m.countUserClientsOnChannel = function(userId, channelName) {
		var clients=Object.keys(m.users[userId].clients);
		var clientCount=0;
		clients.forEach(function(clientId) {
			if(m.channels[channelName].clients[clientId]) {
				clientCount++;
			}
		});
		return clientCount;
	}
	
	m.addUserToChannel = function(userId, channelName) {
		// console.log('m.addUserToChannel', userId, channelName);
		if(m.channels[channelName]&&!m.channels[channelName].users[userId]) {
			// create associations
			m.users[userId].channels[channelName]=new Date().getTime();
			m.channels[channelName].users[userId]=new Date().getTime();
			return true;
		}
		return false; // user already subscribed this channel
	}
	
	m.eachClientChannel = function(clientId, callback) {
		var channels=m.clients[clientId].channels;
		if(channels) {
			for(var channelName in channels) {
				callback(channelName, m.channels[channelName]);
			}
		}
	}
	
	m.removeUserFromChannel = function(userId, channelName) {
		if(m.channels[channelName]&&m.users[userId]&&m.channels[channelName].users[userId]) {
			// check if user has another client connected to channel
			if(m.countUserClientsOnChannel(userId, channelName)<=1) {
				// destroy associations
				delete m.channels[channelName].users[userId];
				delete m.users[userId].channels[channelName];
				return true;
			}
		}
		return false;
	}
	
	m.removeClientFromChannel = function(clientId, channelName) {
		if(m.channels[channelName]) {
			// destroy associations
			delete m.clients[clientId].channels[channelName];
			delete m.channels[channelName].clients[clientId];
			
			// destroy channel if empty
			if(Object.keys(m.channels[channelName].clients).length===0) {
				delete m.channels[channelName];
			}
			return true;
		}
		return false;
	}
	
	m.removeUserFromClient = function(userId, clientId) {
		if(m.clients[clientId]&&m.users[userId]&&m.clients[clientId].userId) {
			// destroy associations
			m.clients[clientId].userId = null;
			delete m.users[userId].clients[clientId];
			
			// destroy user if empty
			if(Object.keys(m.users[userId].clients).length===0) {
				delete m.users[userId];
			}
			return true;
		}
		return false;
	}

	m.removeClient = function(clientId) {
		// console.log('m.removeClient', client.id)
		delete m.clients[clientId];
	}
	
	m.getChannelUsers = function(channelName, user) {
		var users={};
		if(m.channels[channelName]) {
			var channelUsers=Object.keys(m.channels[channelName].users);
			channelUsers.forEach(function(userId) {
				users[userId]=m.getUser(userId);
			});
		}
		return users;
	}
	
	return m;
}
