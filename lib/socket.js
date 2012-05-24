var io = mustekala.io = require('socket.io').listen(app);
io.configure('development', function(){
  io.set('transports', ['websocket']);
});
io.configure('production', function(){
	// TODO: Fix this (non-responsive mustekala.js)
	// io.enable('browser client minification');
	// io.enable('browser client etag');
	io.set('log level', 1);
	if(!mustekala.config.socketIO || !mustekala.config.socketIO.transports) {
		io.set('transports', ['websocket','flashsocket','htmlfile','xhr-polling','jsonp-polling']);
	}
});

// Configure with user params
if(mustekala.config.socketIO) {
	for(var name in mustekala.config.socketIO)
		io.set(name, mustekala.config.socketIO[name]);
}

// Mustekala won't support gzip yet
io.disable('browser client gzip');

// Sockets
var socket = mustekala.socket = io.of('/mustekala');
socket.on('connection', function(client) {
	mustekala.addClient(client.id);
	
	client.on('subscribe', function(channelName,authKey) {
		if(channelName) {
			// Checks
			var auth;
			var authMatch=new RegExp(/^(presence|private)@(.+)$/).exec(channelName);
			var channelType=authMatch?authMatch[1]:'public';
			
			if(channelType!='public') {
				// validate authKey
				auth=mustekala.authKeys[authKey];
				// console.log('checking auth key:',auth);
				if(!auth||auth.channel!=channelName||!auth.user) {
					// invalid authentication
					// TODO: emit('error', 'Bad authentication')....
					return;
				}
			}
			
			// Create channel
			mustekala.addChannel(channelName, channelType);
			
			// Check if client already subscribed channel
			if(!mustekala.addClientToChannel(client.id, channelName)) {
				// TODO: emit('error', 'Already joined channel')....
				return;
			}
			// Do presence channel jobs
			if(channelType=="presence") {
				// console.log('presence.memberJoin', channelName, auth.user)
				mustekala.addUser(auth.user.id, auth.user.data);
				mustekala.addUserToClient(auth.user.id, client.id);
				if(mustekala.addUserToChannel(auth.user.id, channelName)) {
					socket.to(channelName).emit('presence.memberJoin', channelName, mustekala.getUser(auth.user.id));
					// Remember: must tell others about 'memberJoined' before actually adding member to channel to avoid possible duplicates on client side.
				}
				
				var channelMembers=mustekala.getChannelUsers(channelName);
				var selfMember=mustekala.getClientUser(client.id);
				client.emit('presence.memberList', channelName, channelMembers, selfMember);
				// Remember: 'memberList' must be sent before 'subscribe' event
			}
			
			// Subscribe client
			client.join(channelName);
			client.emit('subscribe', channelName);
		}
	});
	client.on('trigger', function(password, channel, action, data) {
		// console.log('***trigger.data:',data)
		var result=mustekala.trigger(password, channel, action, data)
	});
	client.on('disconnect',function() {
		var user=mustekala.getClientUser(client.id);
		mustekala.eachClientChannel(client.id, function(channelName, channel) {
			if(channel.type=="presence") {
				if(user) {
					if(mustekala.removeUserFromChannel(user.id, channelName)) {
						socket.to(channelName).emit('presence.memberLeave', channelName, user);
					}
				}
			}
			mustekala.removeClientFromChannel(client.id, channelName);
		});
		
		if(user) mustekala.removeUserFromClient(user.id, client.id);
		mustekala.removeClient(client.id);
	});
});