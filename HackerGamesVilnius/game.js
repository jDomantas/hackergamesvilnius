var sim = require('./static/script/shared/sim.js');

function Game(io) {
    this.io = io;
    this.players = [];
    this.obstacles = [{ x: 800, y: 400, r: 200 }];
    this.nextState = 0;

    this.systemShutdownSpeed = 3;
    this.systemPowerupSpeed = 0.15;
}

Game.prototype.moveTo = function (id, x, y) {
    var player = this.getPlayer(id);
    player.tx = x;
    player.ty = y;
    var dx = player.tx - player.x;
    var dy = player.ty - player.y;
    player.td = Math.atan2(dy, dx);
}

Game.prototype.joined = function (socket, id) {
    var player = {
        id: id,
        x: Math.random() * 500,
        y: Math.random() * 500,
        tx: 0,
        ty: 0,
        dir: Math.random() * Math.PI * 2,
        td: 0,
        engines: 0.5,
        tengines: 0.5,
        fsh: 0.5,
        tfsh: 0.5,
        bsh: 0,
        tbsh: 0,
        gun: 0.5,
        tgun: 0.5,
    };
    player.tx = player.x;
    player.ty = player.y;
    player.td = player.dir;
    
    socket.emit('players', this.players);
    socket.emit('map', this.obstacles);

    this.players.push(player);
    this.io.emit('joined', player);
}

Game.prototype.left = function (id) {
    for (var i = 0; i < this.players.length; i++)
        if (this.players[i].id == id) {
            this.players.splice(i, 1);
            return;
        }
    
    this.io.emit('left', id);
}

Game.prototype.getPlayer = function (id) {
    for (var i = this.players.length; i--; )
        if (this.players[i].id == id)
            return this.players[i];

    throw new Error("player with id='" + id + "' was not found");
}

Game.prototype.step = function (dt) {
    
    this.nextState -= dt;
    if (this.nextState < 0) {
        this.nextState += 0.3;
        this.io.emit('players', this.players);
    }

    for (var i = this.players.length; i--; ) {
        var p = this.players[i];
        sim.updatePlayer(p, dt, this.players, this.obstacles);
    }
}

Game.prototype.systemPower = function (id, engines) {
    var player = this.getPlayer(id);
    player.tengines = engines;
    if (player.tengines < 0) player.tengines = 0;
    if (player.tengines > 1) player.tengines = 1;
}

module.exports = Game;
