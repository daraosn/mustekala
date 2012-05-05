var Mustekala=(function() {
	var m={'version': '0.0.2'}
	m._waitForIo=setInterval(function() {
		if(typeof io!="undefined") {
			clearInterval(m._waitForIo);
		}
		// console.log(typeof io);
	}, 100);
	return m;
})();
