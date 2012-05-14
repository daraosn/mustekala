app.post('/mustekala/trigger', function(req, res) {
	var password=req.body.password;
	var channel=req.body.channel;
	var action=req.body.action;
	var data=req.body.data;
	var result=mustekala.trigger(password, channel, action, data);
	// console.log({'password': password, 'channel': channel, 'action': action, 'data': data})
	res.send(JSON.stringify({'success':result, 'channel': channel, 'action': action, 'data': data}));
});

app.post('/mustekala/authenticate', function(req, res) {
	var password=req.body.password;
	var channel=req.body.channel;
	var user=req.body.user;
	
	var response=JSON.stringify({'authKey':mustekala.generateAuthKey(password,channel,user)}).toString();
	res.end(response);
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
	var data=mustekala.io.checkRequest(req);
	var mustekalaJS=require('fs').readFileSync(process.cwd()+'/lib/mustekala.client.js');
	mustekala.io.static.write(data.path, req, fakeRes);
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

// TODO: Disable on production
app.post('/example/auth', function(req, res) {
	// this should be grabbed from DB
	if(Math.random()<0.5) {
		var exampleUser = {
			id: '1000'
			,data: {
				name: 'Joseph'
				,nickname: 'joe'
			}
		}
	} else {
		var exampleUser = {
			id: '1001'
			,data: {
				name: 'Deborah'
				,nickname: 'deb'
			}
		}
	}
	
	var body={
		password: mustekala.config.password
		,channel: req.body.channel
		,user: exampleUser
	};

	// note: if not using json, you must provide header 'content-type: application/x-www-form-urlencoded'
	require('request').post({
		url: "http://localhost:"+mustekala.config.port+'/mustekala/authenticate'
		, headers: {'content-type': 'application/x-www-form-urlencoded'}
		, body: require('qs').stringify(body)
	},function(error, response, body) {
		res.end(body);
	});
});

// TODO: Disable or protect on production
app.get('/admin', function(req, res) {
	res.render('admin.jade', { 'title': 'Mustekala Admin' });
});
app.post('/admin/data', function(req, res) {
	if(req.body.fullView=='true') {
		var clients=mustekala.clients
		 	, channels=mustekala.channels
			, users=mustekala.users;
	} else {
		var clients=Object.keys(mustekala.clients)
		 	, channels=Object.keys(mustekala.channels)
			, users=Object.keys(mustekala.users);
	}
	
	res.end(
		JSON.stringify({
			'clients': clients
			,'channels': channels
			,'users': users
			,'memory': process.memoryUsage()
		})
	);
});