var io = mustekala.io = require('socket.io').listen(app);
io.configure('development', function(){
  io.set('transports', ['websocket']);
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
	console.log('*** CLIENT CONNECTED ***');
	
	mustekala.addClient(client);

	var currentChannel;
	
	client.on('subscribe', function(channelName,authKey) {
		if(channelName) {
			var auth;
			var authMatch=new RegExp(/^(presence|private)@(.+)$/).exec(channelName);
			var channelType=authMatch?authMatch[1]:'public';
			
			if(channelType!='public') {
				// validate authKey
				auth=mustekala.authKeys[authKey];
				console.log('checking auth key:',auth);
				if(!auth||auth.channel!=channelName||!auth.user) {
					// invalid authentication
					// TODO: emit('error', 'Bad authentication')....
					return;
				}
			}
			
			if(!mustekala.addClientChannel(client, channelName, channelType)) {
				// check if client already subscribed channel
				// TODO: emit('error', 'Already joined channel')....
				return;
			}
			if(channelType=="presence") {
				// console.log('presence.memberJoin', channelName, auth.user)
				mustekala.addUserClient(auth.user, client);
				
				var user=mustekala.getClientUser(client); // get user, even if we already have it
				socket.to(channelName).emit('presence.memberJoin', channelName, {id: user.id, data: user.data});
				// Remember: must tell others about memberJoined before actually adding member to channel to avoid possible duplicates on client side.
			}

			client.join(channelName);
			client.emit('subscribe', channelName);
		}
	});
	client.on('trigger', function(password, channel, action, data) {
		console.log('***trigger.data:',data)
		var result=mustekala.trigger(password, channel, action, data)
	});
	client.on('disconnect',function() {
		mustekala.eachClientChannel(client, function(channelName, channel) {
			// console.log('********',channel.type)
			if(channel.type=="presence") {
				var user=mustekala.getClientUser(client);
				socket.to(channelName).emit('presence.memberLeave', channelName, {id: user.id, data: user.data});
				mustekala.removeUserClient(user, client);
			}
			mustekala.removeClientChannel(client, channelName);
		});
		mustekala.removeClient(client);
	});
});