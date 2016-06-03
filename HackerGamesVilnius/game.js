function Game(io) {
    this.io = io;
    this.players = [];
    this.nextState = 0;
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
        speed: 100,
        turnSpeed: 5,
        td: 0,
    };
    player.tx = player.x;
    player.ty = player.y;
    player.td = player.dir;
    
    socket.emit('players', this.players);

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
        this.updatePlayer(p, dt);
    }

}

Game.prototype.updatePlayer = function (p, dt) {
    if (p.td != p.dir) {
        var deltadir = p.td - p.dir;
        //console.log('delta: ' + deltadir);
        while (deltadir > Math.PI) deltadir -= Math.PI * 2;
        while (deltadir < -Math.PI) deltadir += Math.PI * 2;
        var s = p.turnSpeed * dt;
        if (deltadir > s) p.dir -= s;
        else if (deltadir < -s) p.dir += s;
        else p.dir = p.td;
    } else {
        var dx = p.tx - p.x;
        var dy = p.ty - p.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > p.speed * dt) {
            p.x += dx / dist * p.speed * dt;
            p.y += dy / dist * p.speed * dt;
        } else {
            p.x = p.tx;
            p.y = p.ty;
        }
    }
}

module.exports = Game;
