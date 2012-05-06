var mustekala = {
	'version': '0.1.0'
	,'github': 'http://github.com/daraosn/mustekala'
}

try {
	var config = require('./config.js');
} catch(e) {
	console.log("No 'config.js' found. Use 'config.template.js' to create one.");
	process.exit(1);
}

var express = require('express');
var app = module.exports = express.createServer();

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
	// app.get('/example.html', function(req, res) { res.redirect('/'); }); // Disable /example.html on production
  app.use(express.errorHandler()); 
});

var io = require('socket.io').listen(app);
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
	  , 'flashsocket'
	  , 'htmlfile'
	  , 'xhr-polling'
	  , 'jsonp-polling'
	]);
});


var channels=[];

// Sockets
var socket=io.of('/mustekala').on('connection', function(client) {
	console.log('*** CLIENT CONNECTED ***');
	
	client.emit('log','welcome')
	var currentChannel;
	
	client.on('subscribe', function(channel,presenceToken,userData) {
		if(channel) {
			if(currentChannel) {
				client.leave(currentChannel);
				client.emit('unsubscribe',currentChannel);
				client.emit('log','left channel: '+currentChannel);
			}
			client.join(channel);
			currentChannel=channel;
			client.emit('subscribe', channel);
			client.emit('log','joined channel: '+channel)
			
		}
	});
	client.on('authentificate', function() {
		
	});
	client.on('run', function(password, channel, command, data) {
		socketRun(password, channel, command, data)
	});
	client.on('disconnect',function(){
		socket.emit('log','someone left!');
	});
});

function socketRun(password, channel, command, data) {
	if(password==config.password) {
		// client.emit('log','authorized')
		if(channel) {
			socket.to(channel).emit('run', command);
			//client.emit('log','broadcasted to channel ('+channel+'): '+command);
		} else {
			socket.emit('run', command);
			//client.emit('log','broadcasted to all: '+command);
		}
		return true;
	} else {
		// client.emit('log','not authorized')
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

app.get('/mustekala.js', function(req, res) {
	// we must "cheat" socket.io to get the socket.io.js with specific transports
	var ioHead={};
	var ioEnd={};
	var fakeRes = {
		writeHead: function(status, headers) {
			ioHead.status=status;
			ioHead.headers=headers;
		},
		end: function(content, encoding) {
			ioEnd.content=content;
			ioEnd.encoding=encoding;
			finishRequest();
		}
	}
	// fake uri
	req.url="/socket.io/socket.io.js";
	var data=io.checkRequest(req);
	var mustekalaJS=require('fs').readFileSync(process.cwd()+'/public/mustekala.js');
	io.static.write(data.path, req, fakeRes);
	// send js
	function finishRequest() {
		// inject mustekala
		ioEnd.content=mustekalaJS+"\n"+ioEnd.content;
		ioHead.headers['Content-Length']=ioEnd.content.length;
		res.writeHead(ioHead.status, ioHead.headers)
		res.end(ioEnd.content, ioEnd.encoding);
	}
	// TODO: verify if socket.io.js is dynamic or not to cache js.
});

app.get('/', function(req, res) {
	res.writeHead(200, {"Content-Type": "text/html"});
	res.end('Mustekala v'+mustekala.version+'. Fork it at <a href="'+mustekala.github+'">'+mustekala.github+'</a>');
});

app.listen(config.port || 3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
