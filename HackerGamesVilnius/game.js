function Game(io) {
    this.io = io;
    this.players = [];
    this.nextState = 0;
}

Game.prototype.moveTo = function (id, x, y) {
    var player = this.getPlayer(id);
    player.tx = x;
    player.ty = y;
}

Game.prototype.joined = function (socket, id) {
    var player = {
        id: id,
        x: Math.random() * 500,
        y: Math.random() * 500,
        tx: 0,
        ty: 0,
    }
    player.tx = player.x;
    player.ty = player.y;
    this.players.push(player);
    
    socket.emit('players', this.players);
    this.io.emit('joined', player);
}

Game.prototype.left = function (id) {
    for (var i = 0; i < this.players.length; i++)
        if (this.players[i].id === id) {
            this.players.splice(i, 1);
            return;
        }
    
    this.io.emit('left', id);
}

Game.prototype.getPlayer = function (id) {
    for (var i = this.players.length; i--; )
        if (this.players[i].id === id)
            return this.players[i];

    throw new Error("player with id='" + id + "' was not found");
}

Game.prototype.step = function (dt) {
    
    this.nextState -= dt;
    if (this.nextState < 0) {
        this.nextState += 0.5;
        this.io.emit('players', this.players);
    }

    for (var i = this.players.length; i--; ) {
        var p = this.players[i];
        var dx = p.tx - p.x;
        var dy = p.ty - p.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 50 * dt) {
            p.x += dx / dist * 50 * dt;
            p.y += dy / dist * 50 * dt;
        } else {
            p.x = p.tx;
            p.y = p.ty;
        }
    }

}

module.exports = Game;
