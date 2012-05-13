var io = mustekala.io = require('socket.io').listen(app);
io.configure('development', function(){
  io.set('transports', ['websocket']);
	io.set('log level', 1);
});
io.configure('production', function(){
	io.enable('browser client minification');
	io.enable('browser client etag');
	io.disable('browser client gzip'); // Mustekala won't support gzip yet
	io.set('log level', 1);
	io.set('transports', [
	  'websocket'
	  ,'flashsocket'
	  ,'htmlfile'
	  ,'xhr-polling'
	  ,'jsonp-polling'
	]);
});

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
				mustekala.addUserToChannel(auth.user.id, channelName);
				
				socket.to(channelName).emit('presence.memberJoin', channelName, mustekala.getUser(auth.user.id));
				// Remember: must tell others about memberJoined before actually adding member to channel to avoid possible duplicates on client side.
			}
			
			// Subscribe client
			client.join(channelName);
			client.emit('subscribe', channelName);
		}
	});
	client.on('trigger', function(password, channel, action, data) {
		console.log('***trigger.data:',data)
		var result=mustekala.trigger(password, channel, action, data)
	});
	client.on('disconnect',function() {
		var user=mustekala.getClientUser(client.id);
		mustekala.eachClientChannel(client.id, function(channelName, channel) {
			if(channel.type=="presence") {
				socket.to(channelName).emit('presence.memberLeave', channelName, user);
				mustekala.removeUserFromChannel(user.id, channelName);
			}
			mustekala.removeClientFromChannel(client.id, channelName);
		});
		
		mustekala.removeUserFromClient(user.id, client.id);
		mustekala.removeClient(client.id);
	});
});