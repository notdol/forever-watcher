var program = require('commander');
var forever = require('forever-monitor');
var request = require('request');
var osenv = require('osenv');
var shortid = require('shortid');
var colors = require('colors');
var fs = require('fs');
var path = require('path');
var util = require('util');

var GCon = require('./forever-watcher-config');
var LCon = {};

var FOREVER = 'forever';

(function makeConfig (){
	LCon.homeDirectory = osenv.home();
	LCon.os = process.platform
	if(LCon.os == 'win32'){
		LCon.processHome = LCon.homeDirectory+'\\.'+FOREVER+'\\';
	}else{
		LCon.processHome = LCon.homeDirectory+'/.'+FOREVER+'/';
	}
	fs.mkdir(LCon.processHome,function(e){
	    if(!e || (e && e.code === 'EEXIST')){

	    } else {
	        //debug
	        console.log("create directory : " + LCon.processHome);
	    }
	});
})();

var serverFile;
program
  .version('0.0.1')
  .arguments('<cmd>')
  .action(function (cmd) {
     serverFile = cmd;
  });
 
program.parse(process.argv);
 
if (typeof serverFile === 'undefined') {
   console.error('node forever-whatcher.js <server.js>');
   process.exit(1);
}

LCon.logFile = LCon.processHome+shortid.generate()+'_log.txt';
LCon.outFile = LCon.processHome+shortid.generate()+'_out.txt';
LCon.errFile = LCon.processHome+shortid.generate()+'_err.txt';

var child = new (forever.Monitor)(serverFile, {
	silent: true,
	args: [],
    'logFile': LCon.logFile, // Path to log output from forever process (when daemonized)
    'outFile': LCon.outFile, // Path to log output from child stdout
    'errFile': LCon.errFile, // Path to log output from child stderr
});

child.on('watch:restart', function(info) {
    console.error('Restaring script because ' + info.file + ' changed');
});

child.on('restart', function() {
	var notis = GCon['restart'];
	for(var i = 0 ; i < notis.length; i++){
		var noti = notis[i];
		sendNotification(noti.type, noti.domain,noti.options);
	}
    console.error('Forever restarting script for ' + child.times + ' time');
});

child.on('exit:code', function(code) {
    console.error('Forever detected script exited with code ' + code);
});

child.on('exit', function () {
	console.log('your-filename.js has exited after 3 restarts');
});

child.start();

console.log("forever Watcher started with : ".red+ serverFile.red);

console.log("log file : "+LCon.logFile.yellow);
console.log("out file : "+LCon.outFile.yellow);
console.log("err file : "+LCon.errFile.yellow);

console.log("=== notification setting start ===");
for(var k in GCon){
	var notis = GCon[k];
	for(var i = 0 ; i < notis.length; i ++){
		var noti = notis[i];
		console.log( util.inspect(noti).yellow);
	}
}
console.log("=== notification setting end ===");

function sendNotification(type, domain, options){	
	var message = makeNotiMessage(domain);
	console.log('== sendNoti :  '+type, options, message);
	switch(type){
		case 'http':
			request({
			    url: options.url,
			    method: "POST",
			    body: message,
			    json: true},
			    function (error, response, body) {
			        if (!error && response.statusCode == 200) {
			            console.log(body)
			        }
			    }
			);
		break; 
	}
}

function makeNotiMessage(domain){
	var message = {};
	switch(domain){
		case 'kato':
			message.from = 'your name';
			message.color = 'red';
			message.renderer = 'markdown';
			message.text = '**your** text message';
			return message;
		break;
	}
}
