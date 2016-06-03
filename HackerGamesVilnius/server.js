var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

// serves all the static files
app.use(express.static('static'));

var listeningPort = /*process.env.PORT || parseInt(process.argv[2]) ||*/ 8000;
http.listen(listeningPort, function () { console.log('listening on *:' + listeningPort); });

io.on('connect', function (socket) {
    
    console.log("connected: " + socket.handshake.address);

    socket.on('disconnect', function () {
        console.log("disconnected: " + socket.handshake.address);
    });
});
