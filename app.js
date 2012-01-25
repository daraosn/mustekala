global.dump = function(arr,level) {
	var dumped_text = "";
	if(!level) level = 0;
	
	//The padding given at the beginning of the line.
	var level_padding = "";
	for(var j=0;j<level+1;j++) level_padding += "    ";
	
	if(typeof(arr) == 'object') { //Array/Hashes/Objects 
		for(var item in arr) {
			var value = arr[item];
			
			if(typeof(value) == 'object') { //If it is an array,
				dumped_text += level_padding + "'" + item + "' ...\n";
				dumped_text += dump(value,level+1);
			} else {
				dumped_text += level_padding + "'" + item + "' => \"" + value + "\"\n";
			}
		}
	} else { //Stings/Chars/Numbers etc.
		dumped_text = "===>"+arr+"<===("+typeof(arr)+")";
	}
	return dumped_text;
}

global.debug=function(params,alive) {
	console.log(params);
	if(!alive) process.exit(0);
}

/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')

var app = module.exports = express.createServer();
var io = require('socket.io').listen(app);

configure();

var channels=[];

// Sockets
global.password = "bGINGS/(ADNfg78GASIMDbkASbj";
var mySocket=io.of('/puller').on('connection', function(socket) {
	//console.log('*** CLIENT CONNECTED ***')
	//socket.emit('log','welcome')
	var currentChannel;
	socket.on('subscribe', function(channel) {
		if(channel) {
			if(currentChannel) {
				socket.leave(currentChannel);
				//socket.emit('log','left channel: '+currentChannel);
			}
			socket.join(channel);
			currentChannel=channel;
			socket.emit('subscribed', channel);
			//socket.emit('log','joined channel: '+channel)
		}
	});
	socket.on('run', function(password, channel, command) {
		socketRun(password, channel, command)
	});
});

function socketRun(password, channel, command) {
	if(password==global.password) {
		//socket.emit('log','authorized')
		if(channel) {
			mySocket.to(channel).emit('run', command);
			//socket.emit('log','broadcasted to channel ('+channel+'): '+command);
		} else {
			mySocket.emit('run', command);
			//socket.emit('log','broadcasted to all: '+command);
		}
		return true;
	} else {
		//socket.emit('log','not authorized')
		return false;
	}	
}

app.post('/puller/run', function(req, res) {
	var password=req.body.password;
	var channel=req.body.channel;
	var command=req.body.command;
	var result=socketRun(password, channel, command);
	res.send(JSON.stringify({'success':result, 'channel': channel, 'command': command}));
});


function configure() {
	// Configuration
	app.configure(function(){
	  app.set('views', __dirname + '/views');
	  app.set('view engine', 'jade');
	  app.use(express.bodyParser());
	  app.use(express.methodOverride());
	  app.use(app.router);
	  app.use(express.static(__dirname + '/public'));
	});
	
	app.configure('development', function(){
	  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
	});
	
	app.configure('production', function(){
	// Disable /public/monitor.html on production
		app.get('/example.html', function(req, res) {
			res.redirect('/');
		});
	  app.use(express.errorHandler()); 
	});
}


app.listen(8080);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
