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
			var authMatch=new RegExp(/^(presence|private)@(.+)$/).exec(channelName);
			var channelType=authMatch?authMatch[1]:'public';
			
			if(channelType!='public') {
				// validate authKey
				var auth=mustekala.authKeys[authKey];
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

			client.join(channelName);
			client.emit('subscribe', channelName);
			
			if(channelType=="presence") {
				// console.log('presence.memberJoin', channelName, auth.user)
				socket.to(channelName).emit('presence.memberJoin', channelName, auth.user);
			}
			
		}
	});
	client.on('trigger', function(password, channel, action, data) {
		console.log('***trigger.data:',data)
		var result=mustekala.trigger(password, channel, action, data)
	});
	client.on('disconnect',function() {
		mustekala.eachClientChannel(client, function(channelName, channel) {
			socket.to(channelName).emit('presence.memberLeft', channelName, auth.user);
			
			mustekala.removeClientChannel(client, channelName);
		});
		mustekala.removeClient(client);
	});
});