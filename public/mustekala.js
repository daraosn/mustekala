(function() {
var socketIO = document.createElement('script');
var mustekala = document.createElement('script');
var script = document.getElementsByTagName('script')[0];
socketIO.src = '/socket.io/socket.io.js';
mustekala.src = '/mustekala/mustekala.js';
script.parentNode.insertBefore(socketIO, script);
script.parentNode.insertBefore(mustekala, script);
})();