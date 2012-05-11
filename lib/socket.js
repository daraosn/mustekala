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
	
	// client.emit('log','welcome')
	var currentChannel;
	
	client.on('subscribe', function(channel,authKey) {
		channelType=channelType||'public';
		if(channel) {
			if(currentChannel) {
				client.leave(currentChannel);
				client.emit('unsubscribe',currentChannel);
				// client.emit('log','left channel: '+currentChannel);
			}
			client.join(channel);
			currentChannel=channel;
			client.emit('subscribe', channel);
			// client.emit('log','joined channel: '+channel)
			
		}
	});
	client.on('authentificate', function() {
		
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
	});
});