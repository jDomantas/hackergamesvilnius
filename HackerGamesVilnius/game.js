var sim = require('./static/script/shared/sim.js');

function Game(io) {
    this.io = io;
    this.players = [];
    this.obstacles = [{ x: 800, y: 400, r: 200 }];
    this.nextState = 0;

    this.aimAngleWidth = 1;
    this.minFireDist = 30;
    this.maxFireDist = 250;
}

Game.prototype.moveTo = function (id, x, y) {
    var player = this.getPlayer(id);
    player.tx = x;
    player.ty = y;
    var dx = player.tx - player.x;
    var dy = player.ty - player.y;
    player.td = Math.atan2(dy, dx);
    player.fly = true;
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
        guns: 0.5,
        tguns: 0.5,
        hp: 10000000, //10,
        fly: false,
    };
    player.tx = player.x;
    player.ty = player.y;
    player.td = player.dir;
    
    socket.emit('self', player.id);
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
        for (var i = this.players.length; i--; )
            if (this.players[i].hp <= 0)
                this.left(this.players[i].id);

        this.nextState += 0.3;
        this.io.emit('players', this.players);
        this.updateGuns();
    }

    for (var i = this.players.length; i--; ) {
        var p = this.players[i];
        sim.updatePlayer(p, dt, this.players, this.obstacles);
    }
}

Game.prototype.systemPower = function (id, engines, guns, fshield, bshield) {
    var player = this.getPlayer(id);
    
    player.tengines = engines;
    if (player.tengines < 0) player.tengines = 0;
    if (player.tengines > 1) player.tengines = 1;
    
    player.tguns = guns;
    if (player.tguns < 0) player.tguns = 0;
    if (player.tguns > 1) player.tguns = 1;
    
    player.tfsh = fshield;
    if (player.tfsh < 0) player.tfsh = 0;
    if (player.tfsh > 1) player.tfsh = 1;
    
    player.tbsh = bshield;
    if (player.tbsh < 0) player.tbsh = 0;
    if (player.tbsh > 1) player.tbsh = 1;
}

Game.prototype.updateGuns = function () {
    var fired = [];
    for (var i = this.players.length; i--; ) {
        for (var j = this.players.length; j--; ) {
            var p = this.players[i];
            var t = this.players[j];
            var dx = t.x - p.x;
            var dy = t.y - p.y;
            if (Math.abs(dx) + Math.abs(dy) < 0.005)
                continue;
            var angle = Math.atan2(dy, dx);
            angle -= p.dir;
            while (angle < -Math.PI) angle += 2 * Math.PI;
            while (angle > Math.PI) angle -= 2 * Math.PI;
            if (Math.abs(angle) > this.aimAngleWidth / 2)
                continue;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < this.minFireDist || dist > this.maxFireDist)
                continue;
            
            angle += p.dir;
            angle -= t.dir;
            while (angle < -Math.PI) angle += 2 * Math.PI;
            while (angle > Math.PI) angle -= 2 * Math.PI;
            var shield = (Math.abs(angle) < Math.PI / 2) ? t.bsh : t.fsh;
            var damage = this.gunDamage(p) * this.shieldReduce(shield);
            t.hp -= damage;
            if (t.hp < 0)
                t.hp = 0;

            fired.push({ from: p.id, to: t.id, p: this.gunDamage(p) });
            console.log(p.id + ' fired at ' + t.id + ', damage: ' + damage + ', shield: ' + shield);
        }
    }

    if (fired.length > 0) {
        this.io.emit('fire', fired);
    }
}

Game.prototype.gunDamage = function (p) {
    return 1 + p.guns * Math.sqrt(p.guns);
}

Game.prototype.shieldReduce = function (power) {
    return 1 - power * 0.75;
}

module.exports = Game;
