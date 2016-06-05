"use strict";

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var gameFn = require('./game.js');
var game = null;

// serves all the static files
app.use(express.static('static'));

var listeningPort = /*process.env.PORT || parseInt(process.argv[2]) ||*/ 8000;
http.listen(listeningPort, function () { console.log('listening on *:' + listeningPort); });

var maxPlayers = 10;
var waitingForRound = 0;
var roundWaitTime = 30;
var timeOfStart = 0;

var lastTime = Date.now();

setInterval(function () {
    if (game != null) {
        // game is currently running
        var now = Date.now();
        var dt = (now - lastTime) / 1000.0;
        game.step(dt);
        lastTime = now;
        if (game.timeToEnd <= 0) {
            io.emit('gameOver', "The round is over");
            waitingForRound = 0;
            io.emit('waitingCount', 0);
            io.emit('timer', { inGame: false, time: 0 });
            if (io.nsps['/'].adapter.rooms['game']) {
                for (var id in io.nsps['/'].adapter.rooms['game'].sockets) {
                    var s = io.sockets.connected[id];
                    s.game = null;
                    s.leave('game');
                    s.inGameRoom = false;
                }
            }
            game = null;
        }
    } else {
        // before the start of the game
        if (waitingForRound >= 2 && Date.now() > timeOfStart) {
            // start game
            game = new gameFn(io);
            for (var id in io.nsps['/'].adapter.rooms['game'].sockets) {
                var s = io.sockets.connected[id];
                s.game = game;
                game.joined(s, s.id);
            }
            
            lastTime = Date.now();
            console.log('starting, time: ' + game.timeToEnd);
            io.emit('timer', { inGame: true, time: Math.floor(game.timeToEnd) });
        }
    }
}, 1000.0 / 10.0);

io.on('connect', function (socket) {
    
    console.log("connected: " + socket.id + " from " + socket.handshake.address);
    
    socket.inGameRoom = false;

    if (game !== null) {
        socket.emit('timer', { inGame: true, time: Math.floor(game.timeToEnd) });
    } else {
        socket.emit('waitingCount', waitingForRound);
        socket.emit('timer', { inGame: false, time: Math.floor((timeOfStart - Date.now()) / 1000) });
    }

    socket.on('joinGame', function () {
        if (game !== null)
            return;

		if (waitingForRound < maxPlayers && !socket.inGameRoom) {
			console.log('player is joining');
			socket.join('game');
			socket.inGameRoom = true;
			waitingForRound += 1;
			io.emit('waitingCount', waitingForRound);
			socket.emit('joinedRoom', null);
			if (waitingForRound === 2) {
				io.emit('timer', { inGame: false, time: roundWaitTime });
				timeOfStart = Date.now() + roundWaitTime * 1000;
			}
		}
		else if (waitingForRound >= maxPlayers && !socket.inGameRoom) {
			console.log('player tried to join full lobby');
			socket.emit('fullLobby', null);
		}
    });

    socket.on('disconnect', function () {
        if (game === null) {
            if (socket.inGameRoom) {
                waitingForRound -= 1;
                io.emit('waitingCount', waitingForRound);
            }
        } else {
            if (socket.game) {
                // need to allow reconnects
                console.log("disconnected: " + socket.id);
                socket.game.left(socket.id);
            }
        }
    });

    socket.on('pointerdown', function (data) {
        if (socket.game) {
            if (typeof data === 'object' && 
                typeof data.x === 'number' &&
                typeof data.y === 'number')
                socket.game.moveTo(socket.id, data.x, data.y);
        }
    });

    socket.on('power', function (data) {
		if (socket.game) {
			if (typeof data === 'object' &&
				typeof data.system === 'string' && 
                typeof data.value === 'number')
                socket.game.systemPower(socket.id, data.system, data.value);
        }
    });
});
