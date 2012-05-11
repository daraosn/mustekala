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
// setInterval(function() {
	// console.log('****************************')
	// console.log(mustekala.clients, mustekala.clientCount)
// }, 1000);

var socket = mustekala.socket = io.of('/mustekala');
socket.on('connection', function(client) {
	console.log('*** CLIENT CONNECTED ***');
	
	mustekala.clients[client.id]=client;
	mustekala.clientCount++;
	
	client.mustekala={
		channels: []
		//, 
	};
	
	// client.emit('log','welcome')
	var currentChannel;
	
	client.on('subscribe', function(channel,authKey) {
		if(channel) {
			var authMatch=new RegExp(/^(presence|private)@(.+)$/).exec(channel);
			var channelType=authMatch?authMatch[1]:'public';
			
			if(channelType!='public') {
				// validate authKey
				var auth=mustekala.authKeys[authKey];
				console.log('checking auth key:',auth);
				if(!auth||auth.channel!=channel||!auth.user) {
					// invalid authentication
					return;
				}
			}
			/*
			if(currentChannel) {
				client.leave(currentChannel);
				client.emit('unsubscribe',currentChannel);
				// client.emit('log','left channel: '+currentChannel);
			}*/
			client.join(channel);
			if(!mustekala.channels[channel]) {
				mustekala.channels[channel]={
					'clients': []
					,'type': channelType
				}
			}
			mustekala.channels[channel].clients.push(client.id);
			client.emit('subscribe', channel);
			
			if(channelType=="presence") {
				console.log('presence.memberJoin', channel, auth.user)
				socket.to(channel).emit('presence.memberJoin', channel, auth.user);
			}	
		}
	});
	client.on('trigger', function(password, channel, action, data) {
		console.log('***trigger.data:',data)
		var result=mustekala.trigger(password, channel, action, data)
		// if(result)
			// client.emit('log', 'trigger sent!');
		// else
			// client.emit('log', 'trigger not-sent: wrong password!');
	});
	client.on('disconnect',function(){
		// socket.emit('log','someone left!');
		delete mustekala.clients[client.id];
		mustekala.clientCount--;
	});
});