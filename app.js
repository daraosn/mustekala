try {
	var config = require('./config.js');
} catch(e) {
	console.log("No 'config.js' found. Use 'config.template.js' to create one.");
	process.exit(1);
}

var express = require('express');
var app = module.exports = express.createServer();
var io = require('socket.io').listen(app);

configure();

var channels=[];

// Sockets
var socket=io.of('/mustekala').on('connection', function(client) {
	//console.log('*** CLIENT CONNECTED ***')
	//client.emit('log','welcome')
	var currentChannel;
	var currentUserId;
	client.on('subscribe', function(channel,presenceToken,userData) {
		if(channel) {
			if(currentChannel) {
				client.leave(currentChannel);
				//client.emit('log','left channel: '+currentChannel);
			}
			client.join(channel);
			currentChannel=channel;
			client.emit('subscribed', channel);
			//client.emit('log','joined channel: '+channel)
			
		}
	});
	client.on('authentificate', function() {
		
	});
	client.on('run', function(password, channel, command) {
		socketRun(password, channel, command)
	});
	client.on('disconnect',function(){
		socket.emit('log','someone left!');
	});
});

function socketRun(password, channel, command) {
	if(password==config.password) {
		//client.emit('log','authorized')
		if(channel) {
			socket.to(channel).emit('run', command);
			//client.emit('log','broadcasted to channel ('+channel+'): '+command);
		} else {
			socket.emit('run', command);
			//client.emit('log','broadcasted to all: '+command);
		}
		return true;
	} else {
		//client.emit('log','not authorized')
		return false;
	}	
}

function socketPresencePreauthorize(password) {
	if(password==config.password) {
		do { var token = global.token(); } while(presenceKeys[token]);
		presenceKeys[token] = new Date().getTime() + presenceKeyExpiry;
		// console.log(global.dump(presenceKeys));
		return token;
	} else {
		return false;
	}
}

app.post('/mustekala/run', function(req, res) {
	var password=req.body.password;
	var channel=req.body.channel;
	var command=req.body.command;
	var data=req.body.data;
	var result=socketRun(password, channel, command);
	res.send(JSON.stringify({'success':result, 'channel': channel, 'command': command, 'data': data}));
});

app.post('/mustekala/presence/preauthorize', function(req, res) {
	var password=req.body.password;
	var result=socketPreauthorize();
	res.send(JSON.stringify({'success':result}));
});


function configure() {
	// Configuration
	app.configure(function(){
	  // app.set('views', __dirname + '/views');
	  // app.set('view engine', 'jade');
	  app.use(express.bodyParser());
	  app.use(express.methodOverride());
	  app.use(app.router);
	  app.use(express.static(__dirname + '/public'));
	});
	
	app.configure('development', function(){
	  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
	});
	
	app.configure('production', function(){
	// Disable /example.html on production
		app.get('/example.html', function(req, res) {
			res.redirect('/');
		});
	  app.use(express.errorHandler()); 
	});
}


app.listen(3001);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
