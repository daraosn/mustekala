var Mustekala=function(setup) {
	setup=setup || {};
	var m={
		'version': '0.1.0'
		,'connected': false
		,'socket': {}
		,'events': {}
		// configurable settings
		,'authUrl': setup['authUrl'] || false // auth url for private/presence channels
		,'debug': setup['debug'] || 0 // debugging (verbose levels: 0,1,2)
	}
	
	m.unbindEvents=function() {
		m.events={
			'connect': []
			,'disconnect': []
			,'run': []
			,'subscribe': []
			,'unsubscribe': []
			,'log': []
		}
	}
	m.connect=function(connectListener) {
		// connect to socket
		m.unbindEvents();
		m.onConnect(connectListener);
		m.socket=io.connect('/mustekala');
		m.socket.on('connect', function() {
			m.connected = true;
			m.triggerEvent('connect');
		});
		// set event listeners
		m.socket.on('log', function(data) {
			m.triggerEvent('log', data);
		});
		m.socket.on('subscribe', function(channel) {
			m.triggerEvent('subscribe', channel);
		});
		m.socket.on('unsubscribe', function(channel) {
			m.triggerEvent('unsubscribe', channel);
		});
		m.socket.on('disconnect', function() {
			m.connected = false;
			m.triggerEvent('disconnect');
		})
	}
	m.subscribe=function(channel) {
		if(m.connected) {
			m.socket.emit('subscribe', channel);
		} else {
			if(m.debug)
				console.log('m.subscribe', 'Not connected.');
		}
	}
	// TODO: m.disconnet()
	/*
	 * This is for testing purposes, do not use it in your front-end code on production
	 */ 
	m.trigger=function(password, channel, eventName, data) {
		if(connected) {
			if(m.debug)
				console.log('m.trigger', 'WARNING: This is for testing purposes only, do not use on production!');
			m.socket.emit('trigger', password, channel, eventName, data);
		} else {
			if(m.debug)
				console.log('m.trigger', 'Not connected.');
		}
	}
	
	// Events
	m.onConnect=function(listener) {
		m.events['connect'].push(listener);
		if(m.debug>1)
			console.log('m.onConnect');
	}
	m.onDisconnect=function(listener) {
		m.events['disconnect'].push(listener);
		if(m.debug>1)
			console.log('m.onDisconnect');
	}
	m.onLog=function(listener) {
		m.events['log'].push(listener);
		if(m.debug>1)
			console.log('m.onDisconnect');
	}
	m.onSubscribe=function(listener) {
		m.events['subscribe'].push(listener);
		if(m.debug>1)
			console.log('m.onSubscribe');
	}
	m.onUnsubscribe=function(listener) {
		m.events['unsubscribe'].push(listener);
		if(m.debug>1)
			console.log('m.onUnsubscribe');
	}
	m.onRun=function(listener) {
		m.events['run'].push(listener);
		if(m.debug>1)
			console.log('m.onRun');
	}
	
	m.triggerEvent=function() {
		if(m.debug)
			console.log('m.triggerEvent',m.triggerEvent.arguments);
		
		event=m.triggerEvent.arguments[0];
		args=[];
		for(var i=1; i<m.triggerEvent.arguments.length; i++)
			args.push(m.triggerEvent.arguments[i]);
			for(var i in m.events[event]) {
				try {
						m.events[event][i].apply(m,args);
				} catch(e) {
					if(m.debug)
						console.log(e.toString());
				}
			}
	}
	
	return m;
};
