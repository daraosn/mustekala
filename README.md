*UPDATE: Working on new version, not ready for production yet*

Mustekala
======

Real-time Push/Pull notification service built over socket.io/express/nodeJS.
It lets you subscribe events which can be triggered from the server side to
every client subscribed to a channel.
Supports POST triggers, so it is possible to use any language on the server-side.

Example 1
-----
Go to http://wehack.it and see it in action.


Example 2
-----
* Clone mustekala on your computer
* Run npm install to get socket.io and Express
* Run node mustekala
* Go to http://localhost:3001/example.html and play with it using different browsers or clients.
* You can also use curl to make a POST request to push/pull events.
````curl -d "channel=yourchannelname&command=alert('hey')&password=yourpassword" http://localhost:3001/puller/run````
* The default password is bGINGS/(ADNfg78GASIMDbkASbj
* See the source code to learn more

How it works?
-----

It uses socket.io to communicate through websockets and it runs any javascript command
in order to adapt to any framework you may use on the client side.

Use the following flow to setup your own puller service:

* Run a node server running node-puller.

* Install javascript plugin to subscribe users on the client-side, receive and run commands.

* Send a POST request from the server-side to the desired channel to execute javascript commands.

Use cases:

* When a user post a message on a board, to update all the users subscribed to that channel.

* To create a admin based notification center to all users connected to a website (like dynamically enabling site maintenance, sending messages, watching activity).

* Easily create your own chat with room.

Client Side
-----

### Javascript plugin ###

* Add socket.io to your html header:

````<script src="http://localhost:3001/socket.io/socket.io.js"></script>````

* Now add a script tag with the client code:

````
var connected = false;
var puller = io.connect('/puller');
puller.on('connect', function() {
	connected = true;
	puller.on('subscribed', function(channel) {
		// This event is triggered after you get subscribed to a channel
		alert('subscribed to '+channel);
	});
	puller.on('run', function(command) {
		// This event is triggered when the server sends a command to the channel
		try {
			eval(command);
		} catch(e) {
			alert('Command "'+command+'" failed to run!')
		}
	});
});
````

* To subscribe to a channel, do:

````
puller.emit('subscribe', 'mychannelname')
````

Server-side
-----

### Rails plugin ###

* Create a ````CONFIG['puller_url']```` (usually it is http://localhost:3001/puller/run)
* Also a ````CONFIG['puller_password']```` (default is bGINGS/(ADNfg78GASIMDbkASbj)
* Add the following code to your application_controller.rb:



````
def puller_run(channel, command)
  puller_url = CONFIG['puller_url']
  puller_password = CONFIG['puller_password']

  uri = URI.parse(puller_url)
  https = Net::HTTP.new(uri.host,uri.port)
  req = Net::HTTP::Post.new(uri.path)
  req.set_form_data({
    'password' => puller_password,
    'channel' => channel,
    'command' => command
  })
  res = https.request(req)

  if !res.blank? && !res.body.blank?
    res=JSON.parse(res.body)
    res['success']
  end
end
````

Now, you can now run any javascript command for an specific channel.

Example: ````puller_run 'mychannelname', 'alert("hello")'````

Contributing
------
Fork this project on Github and join at http://wehack.it/projects/23-puller

What is still missing:

* Scalability

* Authentication

* Private channels

* Presence

* SSL support

* Testing

Author
------

Diego Araos <d@wehack.it>

Contributors
------------

Diego Araos

Herman Junge

License
-----

Mustekala is under MIT License. See LICENSE file.