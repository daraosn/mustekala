module.exports={
	development: {
		password: 'bGINGS/(ADNfg78GASIMDbkASbj'
		,port: 3001
	}
	// add your own config for different environments (using NODE_ENV):
	,test: {}
	,production: {
		// example config for heroku:
		password: 'my_super_secure_password'
		,port: process.env.PORT
		,socketIO: {
			'transports': ["xhr-polling"]
			,'polling duration': 10
		}
	}
}
