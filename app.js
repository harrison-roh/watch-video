var express = require('express'),
	app = express(),
	server = require('http').createServer(app),
	io = require('socket.io').listen(server),
	path = require('path'),
	fs = require('fs'),
	port = 8888; // Change yourself

var debug = true; // Change yourself
var visitors = [];

if (debug)
{
	app.use(express.logger('dev'));
}
app.set('views', path.join(__dirname, '/views'));
app.engine('html', require('ejs').renderFile);
app.use(express.static(path.join(__dirname, '/list')));

server.listen(port);

app.get('/', function(req, res)
{
	res.render('index.html');
});

io.on('connection', function(socket)
{
	sendVideoList(socket);

	socket.on('disconnect', function(data)
	{
		// delete user's video list
		if (visitors[socket.id] != undefined)
		{
			log('Delete user: ' + socket.id);
			delete visitors[socket.id];
		}
	});

	socket.on('cs_selectVideo', function(data)
	{
		log('Request: ' + data.videoName + ' from ' + socket.id);
		sendVideo(socket, data.videoName);
	});
});

function log(msg)
{
	if (debug)
	{
		console.log('+ ' + msg);
	}
}

function sendError(socket, msg)
{
	socket.emit('sc_error', {msg: msg});
}

function sendVideo(socket, videoName)
{
	var list = visitors[socket.id];

	if (list[videoName])
	{
		log('Send: `' + videoName + '` to ' + socket.id);
		socket.emit('sc_playVideo', {playVideo: videoName});
	}
	else
	{
		log('Error occurred: ' + socket.id);
		sendError(socket, 'Cannot find `' + videoName + '`!');
	}
}

function updateVideoList(socket, videoList)
{
	// delete old video list
	if (visitors[socket.id] != undefined)
	{
		delete visitors[socket.id];
	}

	// store video list
	visitors[socket.id] = videoList;

	socket.emit('sc_videoList', {videoList: Object.keys(videoList)});
}

function sendVideoList(socket)
{
	var list = [];

	// get files in `list` directory
	fs.readdir(path.join(__dirname, '/list'), function(err, files)
	{
		if (err) { throw err; }

		var isRemain = files.length;

		files.forEach(function(file)
		{
			var filePath = path.join(__dirname, '/list/', file);

			fs.stat(filePath, function(err, stats)
			{
				if (err) { throw err; }

				if (stats.isFile())
				{
					// store video file
					list[file] = true; // What content do?
				}

				--isRemain;

				if (!isRemain)
				{
					// if get all list, send the list to client
					updateVideoList(socket, list);
				}
			});
		});
	});
}

console.log('Listening on port ' + port);
