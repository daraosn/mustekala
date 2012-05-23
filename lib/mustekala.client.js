var Mustekala=function(setup) {
	setup=setup || {};
	var m={
		'version': '0.1.0'
		,'connected': false
		,'socket': {}
		,'events': {}
		// configurable settings
		,'server': setup['server'] || '/mustekala'
		,'authUrl': setup['authUrl'] || false // auth url for private/presence channels
		,'debug': setup['debug'] || 0 // debugging (verbose level: 0,1,2)
	}
		
	m.unbindEvents=function() {
		delete m.events;
		m.events={};
	}
	m.unbindEvents();
	m.connect=function(server, connectListener) {
		// connect to socket
		if(m.debug)
			console.log('mustekala.connect');
		
		m.unbindEvents();
		m.onConnect(connectListener);
		m.socket=io.connect(server);
		m.socket.on('connect', function() {
			m.connected = true;
			if(m.debug)
				console.log('mustekala.connected');

			m.triggerEvent('connect');
		});
		// set event listeners
		m.socket.on('log', function(data) {
			m.triggerEvent('log', data);
		});
		m.socket.on('subscribe', function(channel) {
			m.triggerEvent('subscribe', channel);
			m.triggerEvent('_'+channel+':subscribe');
		});
		m.socket.on('unsubscribe', function(channel) {
			m.triggerEvent('unsubscribe', channel);
		});
		m.socket.on('trigger', function(channel, action, data) {
			m.triggerEvent('trigger', channel, action, data);
			m.triggerEvent('_'+channel+'.'+action, data);
		});
		m.socket.on('disconnect', function() {
			m.connected = false;
			m.triggerEvent('disconnect');
		});
		// presence
		m.socket.on('presence.memberList', function(channel, members, user) {
			m.triggerEvent('_'+channel+':memberList', members, user);
		});
		m.socket.on('presence.memberJoin', function(channel, user) {
			m.triggerEvent('_'+channel+':memberJoin', user);
		});
		m.socket.on('presence.memberLeave', function(channel, user) {
			m.triggerEvent('_'+channel+':memberLeave', user);
		});
	}
	m.subscribe=function(channel) {
		if(m.debug>0) console.log('mustekala.subscribe',channel);
		if(m.connected) {
			var authMatch=new RegExp(/^(presence|private)@(.+)$/).exec(channel);
			if(authMatch) {
				// Private or Presence channels:
				var channelType=authMatch[1];
				// var channel=authMatch[2]; // do not enable!
				if(m.authUrl) {
					var presenceChannel=new MustekalaPresenceChannel(channel);
					AjaxRequest.post({
						'url': m.authUrl
						,'parameters': {'channel': channel}
						,'onSuccess': function(response) {
							try {
								authKey=JSON.parse(response.responseText).authKey;
								if(authKey) {
									m.socket.emit('subscribe',channel,authKey);
								} else {
									throw true
								}
							} catch(e) {
								
								console.warn('Unable to parse your '+channelType+' channel authorization key.');
							}
						}, 'onError': function() {
							console.warn('Unable to authentificate your '+channelType+' channel subscription.');
						}
					})
					return presenceChannel;
				} else {
					console.warn('You must provide an authUrl when instancing Mustekala to create private or presence channels.');
				}
			} else {
				// Public channel:
				m.socket.emit('subscribe', channel);
				return new MustekalaChannel(channel);
			}
		} else {
			console.warn('Mustekala is not connected.');
		}
	}
	// TODO: m.disconnet()
	/*
	 * This is for testing purposes, do not use it in your front-end code on production
	 */ 
	m.trigger=function(password, channel, action, data) {
		if(m.connected) {
			if(m.debug) console.log('mustekala.trigger', 'WARNING: This is for testing purposes only, do not use on production!');
			m.socket.emit('trigger', password, channel, action, data);
		} else {
			console.warn('Mustekala is not connected.');
		}
	}
	
	// Events
	m.onConnect=function(listener) {
		m.addEventListener('connect', listener);
		if(m.debug>1) console.log('mustekala.onConnect');
	}
	m.onDisconnect=function(listener) {
		m.addEventListener('disconnect', listener);
		if(m.debug>1) console.log('mustekala.onDisconnect');
	}
	m.onLog=function(listener) { // deprecated, do not use
		m.addEventListener('log', listener);
		if(m.debug>1) console.log('mustekala.onDisconnect');
	}
	m.onSubscribe=function(listener) {
		m.addEventListener('subscribe', listener);
		if(m.debug>1) console.log('mustekala.onSubscribe');
	}
	m.onUnsubscribe=function(listener) {
		m.addEventListener('unsubscribe', listener);
		if(m.debug>1) console.log('mustekala.onUnsubscribe');
	}
	m.onTrigger=function(listener) {
		m.addEventListener('trigger', listener);
		if(m.debug>1) console.log('mustekala.onTrigger');
	}
	m.addEventListener=function(name, callback) {
		if(!m.events[name]) m.events[name]=[];
		m.events[name].push(callback);
	}
	m.triggerEvent=function() {
		if(m.debug) console.log('mustekala.triggerEvent',m.triggerEvent.arguments);
		
		eventName=m.triggerEvent.arguments[0];
		if(m.events[eventName]) {
			args=[];
			for(var i=1; i<m.triggerEvent.arguments.length; i++) {
				args.push(m.triggerEvent.arguments[i]);
			}
			
			for(var i in m.events[eventName]) {
				if(m.events[eventName]) {
					var callback=m.events[eventName][i];
					if(typeof callback == "function")
						callback.apply(m,args);
				}
			}
			return true;
		}
		return false;
	}
	
	// Helpers
	function MustekalaChannel(channelName) {
		return {
			name: channelName
			,onSubscribe: function(handler) {
				if(m.debug>1) console.log('mustekala.subscribe().channel<'+channelName+'>.onSubscribe');
				m.addEventListener('_'+channelName+':subscribe', handler);
			}
			,on: function(action, handler) {
				if(m.debug>1) console.log('mustekala.subscribe().channel<'+channelName+'>.on', action);
				m.addEventListener('_'+channelName+'.'+action, handler);
			}
			// TODO: add more methods & attributes (status, unsubscribe, etc.)
		}
	}
	function MustekalaPresenceChannel(channelName) {
		var channel = new MustekalaChannel(channelName); // extends
		channel.on=undefined;
		channel.members={};
		channel.user={};
		m.addEventListener('_'+channelName+':memberList', function(members, user) {
			channel.members=members;
			channel.user=user;
		});
		channel.onMemberJoin=function(handler) {
			if(m.debug>1) console.log('mustekala.subscribe().presenceChannel<'+channelName+'>.onMemberJoin');
			var eventName = '_'+channelName+':memberJoin';
			m.addEventListener(eventName, function(user) {
				channel.members[user.id]=user;
				handler(user);
			});
		}
		channel.onMemberLeave=function(handler) {
			if(m.debug>1) console.log('mustekala.subscribe().presenceChannel<'+channelName+'>.onMemberLeave');
			var eventName = '_'+channelName+':memberLeave';
			m.addEventListener(eventName, function(user) {
				delete channel.members[user.id];
				handler(user);
			});
		}
		return channel;
	}
	
	return m;
};

/*! AjaxRequest Author: http://www.ajaxtoolbox.com/ */
function AjaxRequest(){var a=new Object();a.timeout=null;a.generateUniqueUrl=true;a.url=window.location.href;a.method="GET";a.async=true;a.username=null;a.password=null;a.parameters=new Object();a.requestIndex=AjaxRequest.numAjaxRequests++;a.responseReceived=false;a.groupName=null;a.queryString="";a.responseText=null;a.responseXML=null;a.status=null;a.statusText=null;a.aborted=false;a.xmlHttpRequest=null;a.onTimeout=null;a.onLoading=null;a.onLoaded=null;a.onInteractive=null;a.onComplete=null;a.onSuccess=null;a.onError=null;a.onGroupBegin=null;a.onGroupEnd=null;a.xmlHttpRequest=AjaxRequest.getXmlHttpRequest();if(a.xmlHttpRequest==null){return null}a.xmlHttpRequest.onreadystatechange=function(){if(a==null||a.xmlHttpRequest==null){return}if(a.xmlHttpRequest.readyState==1){a.onLoadingInternal(a)}if(a.xmlHttpRequest.readyState==2){a.onLoadedInternal(a)}if(a.xmlHttpRequest.readyState==3){a.onInteractiveInternal(a)}if(a.xmlHttpRequest.readyState==4){a.onCompleteInternal(a)}};a.onLoadingInternalHandled=false;a.onLoadedInternalHandled=false;a.onInteractiveInternalHandled=false;a.onCompleteInternalHandled=false;a.onLoadingInternal=function(){if(a.onLoadingInternalHandled){return}AjaxRequest.numActiveAjaxRequests++;if(AjaxRequest.numActiveAjaxRequests==1&&typeof(window.AjaxRequestBegin)=="function"){AjaxRequestBegin()}if(a.groupName!=null){if(typeof(AjaxRequest.numActiveAjaxGroupRequests[a.groupName])=="undefined"){AjaxRequest.numActiveAjaxGroupRequests[a.groupName]=0}AjaxRequest.numActiveAjaxGroupRequests[a.groupName]++;if(AjaxRequest.numActiveAjaxGroupRequests[a.groupName]==1&&typeof(a.onGroupBegin)=="function"){a.onGroupBegin(a.groupName)}}if(typeof(a.onLoading)=="function"){a.onLoading(a)}a.onLoadingInternalHandled=true};a.onLoadedInternal=function(){if(a.onLoadedInternalHandled){return}if(typeof(a.onLoaded)=="function"){a.onLoaded(a)}a.onLoadedInternalHandled=true};a.onInteractiveInternal=function(){if(a.onInteractiveInternalHandled){return}if(typeof(a.onInteractive)=="function"){a.onInteractive(a)}a.onInteractiveInternalHandled=true};a.onCompleteInternal=function(){if(a.onCompleteInternalHandled||a.aborted){return}a.onCompleteInternalHandled=true;AjaxRequest.numActiveAjaxRequests--;if(AjaxRequest.numActiveAjaxRequests==0&&typeof(window.AjaxRequestEnd)=="function"){AjaxRequestEnd(a.groupName)}if(a.groupName!=null){AjaxRequest.numActiveAjaxGroupRequests[a.groupName]--;if(AjaxRequest.numActiveAjaxGroupRequests[a.groupName]==0&&typeof(a.onGroupEnd)=="function"){a.onGroupEnd(a.groupName)}}a.responseReceived=true;a.status=a.xmlHttpRequest.status;a.statusText=a.xmlHttpRequest.statusText;a.responseText=a.xmlHttpRequest.responseText;a.responseXML=a.xmlHttpRequest.responseXML;if(typeof(a.onComplete)=="function"){a.onComplete(a)}if(a.xmlHttpRequest.status==200&&typeof(a.onSuccess)=="function"){a.onSuccess(a)}else{if(typeof(a.onError)=="function"){a.onError(a)}}delete a.xmlHttpRequest.onreadystatechange;a.xmlHttpRequest=null};a.onTimeoutInternal=function(){if(a!=null&&a.xmlHttpRequest!=null&&!a.onCompleteInternalHandled){a.aborted=true;a.xmlHttpRequest.abort();AjaxRequest.numActiveAjaxRequests--;if(AjaxRequest.numActiveAjaxRequests==0&&typeof(window.AjaxRequestEnd)=="function"){AjaxRequestEnd(a.groupName)}if(a.groupName!=null){AjaxRequest.numActiveAjaxGroupRequests[a.groupName]--;if(AjaxRequest.numActiveAjaxGroupRequests[a.groupName]==0&&typeof(a.onGroupEnd)=="function"){a.onGroupEnd(a.groupName)}}if(typeof(a.onTimeout)=="function"){a.onTimeout(a)}delete a.xmlHttpRequest.onreadystatechange;a.xmlHttpRequest=null}};a.process=function(){if(a.xmlHttpRequest!=null){if(a.generateUniqueUrl&&a.method=="GET"){a.parameters.AjaxRequestUniqueId=new Date().getTime()+""+a.requestIndex}var c=null;for(var b in a.parameters){if(a.queryString.length>0){a.queryString+="&"}a.queryString+=encodeURIComponent(b)+"="+encodeURIComponent(a.parameters[b])}if(a.method=="GET"){if(a.queryString.length>0){a.url+=((a.url.indexOf("?")>-1)?"&":"?")+a.queryString}}a.xmlHttpRequest.open(a.method,a.url,a.async,a.username,a.password);if(a.method=="POST"){if(typeof(a.xmlHttpRequest.setRequestHeader)!="undefined"){a.xmlHttpRequest.setRequestHeader("Content-type","application/x-www-form-urlencoded")}c=a.queryString}if(a.timeout>0){setTimeout(a.onTimeoutInternal,a.timeout)}a.xmlHttpRequest.send(c)}};a.handleArguments=function(b){for(var c in b){if(typeof(a[c])=="undefined"){a.parameters[c]=b[c]}else{a[c]=b[c]}}};a.getAllResponseHeaders=function(){if(a.xmlHttpRequest!=null){if(a.responseReceived){return a.xmlHttpRequest.getAllResponseHeaders()}alert("Cannot getAllResponseHeaders because a response has not yet been received")}};a.getResponseHeader=function(b){if(a.xmlHttpRequest!=null){if(a.responseReceived){return a.xmlHttpRequest.getResponseHeader(b)}alert("Cannot getResponseHeader because a response has not yet been received")}};return a}AjaxRequest.getXmlHttpRequest=function(){if(window.XMLHttpRequest){return new XMLHttpRequest()}else{if(window.ActiveXObject){
/*@cc_on @*/
/*@if(@_jscript_version >=5)
try{return new ActiveXObject("Msxml2.XMLHTTP");}catch(e){try{return new ActiveXObject("Microsoft.XMLHTTP");}catch(E){return null;}}@end @*/
}else{return null}}};AjaxRequest.isActive=function(){return(AjaxRequest.numActiveAjaxRequests>0)};AjaxRequest.get=function(a){AjaxRequest.doRequest("GET",a)};AjaxRequest.post=function(a){AjaxRequest.doRequest("POST",a)};AjaxRequest.doRequest=function(c,a){if(typeof(a)!="undefined"&&a!=null){var b=new AjaxRequest();b.method=c;b.handleArguments(a);b.process()}};AjaxRequest.submit=function(a,b){var d=new AjaxRequest();if(d==null){return false}var c=AjaxRequest.serializeForm(a);d.method=a.method.toUpperCase();d.url=a.action;d.handleArguments(b);d.queryString=c;d.process();return true};AjaxRequest.serializeForm=function(b){var e=b.elements;var a=e.length;var g="";this.addField=function(h,i){if(g.length>0){g+="&"}g+=encodeURIComponent(h)+"="+encodeURIComponent(i)};for(var d=0;d<a;d++){var f=e[d];if(!f.disabled){switch(f.type){case"text":case"password":case"hidden":case"textarea":this.addField(f.name,f.value);break;case"select-one":if(f.selectedIndex>=0){this.addField(f.name,f.options[f.selectedIndex].value)}break;case"select-multiple":for(var c=0;c<f.options.length;c++){if(f.options[c].selected){this.addField(f.name,f.options[c].value)}}break;case"checkbox":case"radio":if(f.checked){this.addField(f.name,f.value)}break}}}return g};AjaxRequest.numActiveAjaxRequests=0;AjaxRequest.numActiveAjaxGroupRequests=new Object();AjaxRequest.numAjaxRequests=0;
/*! JSON fallback Author: https://github.com/douglascrockford/JSON-js */
var JSON;if(!JSON){JSON={}}(function(){function f(n){return n<10?"0"+n:n}if(typeof Date.prototype.toJSON!=="function"){Date.prototype.toJSON=function(key){return isFinite(this.valueOf())?this.getUTCFullYear()+"-"+f(this.getUTCMonth()+1)+"-"+f(this.getUTCDate())+"T"+f(this.getUTCHours())+":"+f(this.getUTCMinutes())+":"+f(this.getUTCSeconds())+"Z":null};String.prototype.toJSON=Number.prototype.toJSON=Boolean.prototype.toJSON=function(key){return this.valueOf()}}var cx=/[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,escapable=/[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,gap,indent,meta={"\b":"\\b","\t":"\\t","\n":"\\n","\f":"\\f","\r":"\\r",'"':'\\"',"\\":"\\\\"},rep;function quote(string){escapable.lastIndex=0;return escapable.test(string)?'"'+string.replace(escapable,function(a){var c=meta[a];return typeof c==="string"?c:"\\u"+("0000"+a.charCodeAt(0).toString(16)).slice(-4)})+'"':'"'+string+'"'}function str(key,holder){var i,k,v,length,mind=gap,partial,value=holder[key];if(value&&typeof value==="object"&&typeof value.toJSON==="function"){value=value.toJSON(key)}if(typeof rep==="function"){value=rep.call(holder,key,value)}switch(typeof value){case"string":return quote(value);case"number":return isFinite(value)?String(value):"null";case"boolean":case"null":return String(value);case"object":if(!value){return"null"}gap+=indent;partial=[];if(Object.prototype.toString.apply(value)==="[object Array]"){length=value.length;for(i=0;i<length;i+=1){partial[i]=str(i,value)||"null"}v=partial.length===0?"[]":gap?"[\n"+gap+partial.join(",\n"+gap)+"\n"+mind+"]":"["+partial.join(",")+"]";gap=mind;return v}if(rep&&typeof rep==="object"){length=rep.length;for(i=0;i<length;i+=1){if(typeof rep[i]==="string"){k=rep[i];v=str(k,value);if(v){partial.push(quote(k)+(gap?": ":":")+v)}}}}else{for(k in value){if(Object.prototype.hasOwnProperty.call(value,k)){v=str(k,value);if(v){partial.push(quote(k)+(gap?": ":":")+v)}}}}v=partial.length===0?"{}":gap?"{\n"+gap+partial.join(",\n"+gap)+"\n"+mind+"}":"{"+partial.join(",")+"}";gap=mind;return v}}if(typeof JSON.stringify!=="function"){JSON.stringify=function(value,replacer,space){var i;gap="";indent="";if(typeof space==="number"){for(i=0;i<space;i+=1){indent+=" "}}else{if(typeof space==="string"){indent=space}}rep=replacer;if(replacer&&typeof replacer!=="function"&&(typeof replacer!=="object"||typeof replacer.length!=="number")){throw new Error("JSON.stringify")}return str("",{"":value})}}if(typeof JSON.parse!=="function"){JSON.parse=function(text,reviver){var j;function walk(holder,key){var k,v,value=holder[key];if(value&&typeof value==="object"){for(k in value){if(Object.prototype.hasOwnProperty.call(value,k)){v=walk(value,k);if(v!==undefined){value[k]=v}else{delete value[k]}}}}return reviver.call(holder,key,value)}text=String(text);cx.lastIndex=0;if(cx.test(text)){text=text.replace(cx,function(a){return"\\u"+("0000"+a.charCodeAt(0).toString(16)).slice(-4)})}if(/^[\],:{}\s]*$/.test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g,"@").replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,"]").replace(/(?:^|:|,)(?:\s*\[)+/g,""))){j=eval("("+text+")");return typeof reviver==="function"?walk({"":j},""):j}throw new SyntaxError("JSON.parse")}}}());