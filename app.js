var express = require('express'),
	app = express(),
	server = require('http').createServer(app),
	io = require('socket.io').listen(server),
	path = require('path'),
	fs = require('fs'),
	async = require('async'),
	port = 8888; // Change yourself

var debug = true; // Change yourself

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
	socket.on('cs_updateVideo', function(data)
	{
		var range = data.updateRange; // not yet used

		log('Request: Update list ' + range + ' @' + socket.id);
		updateVideoList(socket, range);
	});

	socket.on('cs_selectVideo', function(data)
	{
		log('Request: `' + data.videoName + '` @' + socket.id);
		playVideo(socket, data.videoName);
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

function playVideo(socket, videoName)
{
	var filePath = path.join(__dirname, '/list', videoName);

	fs.stat(filePath, function(err, stats)
	{
		if (err)
		{
			log('Error occurred: @' + socket.id + '-> ' + err);
			sendError(socket, 'Cannot find `' + videoName + '`!');

			return;
		}

		if (stats.isFile())
		{
			log('Play: `' + videoName + '` @' + socket.id);
			socket.emit('sc_playVideo', {playVideo: videoName});
		}
		else
		{
			log('Error occurred: @' + socket.id);
			sendError(socket, 'Server internal error occurred!');
		}
	});
}

function updateVideoList(socket, range)
{
	var list = [];

	// get files in `list` directory
	fs.readdir(path.join(__dirname, '/list'), function(err, files)
	{
		if (err)
		{
			log('Error occurred: @' + socket.id + '-> ' + err);
			sendError(socket, 'Server internal error occurred!');

			return;
		}

		async.each(files, function (file, callback)
		{
			var filePath = path.join(__dirname, '/list', file)
		
			fs.stat(filePath, function (err, stats)
			{
				if (err) { callback(err); }
		
				if (stats.isFile())
				{
					// store video file
					list[file] = true; // What content do?
				}
		
				callback(null);
			});
		}, function (err)
		{
			if (err)
			{
				log('Error occurred: @' + socket.id + '-> ' + err);
				sendError(socket, 'Internal server error occurred!');
			}
			else
			{
				// if get all list, send the list to client
				socket.emit('sc_videoList', {videoList: Object.keys(list)});
			}
		});
	});
}

console.log('Listening on port ' + port);
