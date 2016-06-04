var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var gameFn = require('./game.js');
var game = new gameFn(io);

// serves all the static files
app.use(express.static('static'));

var listeningPort = /*process.env.PORT || parseInt(process.argv[2]) ||*/ 8000;
http.listen(listeningPort, function () { console.log('listening on *:' + listeningPort); });

var lastTime = Date.now();
setInterval(function () {
    var now = Date.now();
    var dt = (now - lastTime) / 1000.0;
    //console.log('stepping, passed: ' + dt);
    game.step(dt);
    lastTime = now;
}, 1000.0 / 10.0);

io.on('connect', function (socket) {
    
    console.log("connected: " + socket.id + " from " + socket.handshake.address);
    game.joined(socket, socket.id);

    socket.on('disconnect', function () {
        console.log("disconnected: " + socket.id);
        game.left(socket.id);
    });

    socket.on('pointerdown', function (data) {
        if (typeof data === 'object' && 
            typeof data.x === 'number' &&
            typeof data.y === 'number')
            game.moveTo(socket.id, data.x, data.y);
    });
    
    socket.on('power', function (data) {
        if (typeof data === 'object' && 
            typeof data.engines === 'number' && 
            typeof data.guns === 'number' && 
            typeof data.fshield === 'number' && 
            typeof data.bshield === 'number') {
            
            console.log('changing power: ' + JSON.stringify(data));
            game.systemPower(socket.id, data.engines, data.guns, data.fshield, data.bshield);
        }
    });
});
