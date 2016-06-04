﻿"use strict";

var sim = require('./static/script/shared/sim.js');

function Game(io) {
    this.io = io;
    this.players = [];
    this.obstacles = [{ x: 800, y: 400, r: 200 }];
    this.nextState = 0;

    this.aimAngleWidth = 1;
    this.minFireDist = 30;
    this.maxFireDist = 250;

    this.timeToEnd = 40;
    this.nextFire = 0;

    this.localData = {};
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
    var t1c = 0;
    var t2c = 0;
    for (var i = this.players.length; i--;)
        if (this.players[i].team === 1)
            t1c += 1;
        else
            t2c += 1;

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
        hp: 10,//000000, //10,
        fly: false,
        team: (t1c > t2c ? 2 : (t1c < t2c ? 1 : (Math.random() < 0.5 ? 1 : 2))),
    };
    
    this.localData[id] = {
        fireTimer: 0,
        hpLoss: 0,
    };

    player.tx = player.x;
    player.ty = player.y;
    player.td = player.dir;
    
    socket.emit('self', player.id);
    socket.emit('players', this.players);
    socket.emit('map', this.obstacles);

    this.players.push(player);
    this.io.to('game').emit('joined', player);
}

Game.prototype.left = function (id) {
    this.io.to('game').emit('left', id);

    for (var i = 0; i < this.players.length; i++)
        if (this.players[i].id === id) {
            this.players.splice(i, 1);
            return;
        }
}

Game.prototype.dead = function (id) {
    this.io.to('game').emit('dead', id);

    for (var i = 0; i < this.players.length; i++)
        if (this.players[i].id === id) {
            this.players.splice(i, 1);
            return;
        }
}

Game.prototype.getPlayer = function (id) {
    for (var i = this.players.length; i--; )
        if (this.players[i].id === id)
            return this.players[i];

    throw new Error("player with id='" + id + "' was not found");
}

Game.prototype.step = function (dt) {
    
    this.timeToEnd -= dt;

    this.nextState -= dt;
    if (this.nextState < 0) {
        this.nextState += 0.3;
        this.io.to('game').emit('players', this.players);
    }
    
    this.nextFire -= dt;
    if (this.nextFire < 0) {
        for (var i = this.players.length; i--; ) {
            var p = this.players[i];
            var d = this.localData[p.id];
            p.hp -= d.hpLoss;
            d.hpLoss = 0;
            if (p.hp <= 0)
                this.dead(p.id);
        }
        
        var fired = [];
        for (var i = this.players.length; i--; )
            this.updateGuns(this.players[i], fired);
        
        if (fired.length > 0)
            this.io.to('game').emit('fire', fired);

        this.nextFire += 0.3;
    }

    for (var i = this.players.length; i--; ) {
        var p = this.players[i];
        sim.updatePlayer(p, dt, this.players, this.obstacles);
        this.localData[p.id].nextFire -= dt;
    }
}

Game.prototype.systemPower = function (id, engines, guns, fshield, bshield) {
    var player = this.getPlayer(id);
    if (player.hp <= 0)
        return;
    
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

Game.prototype.updateGuns = function (p, fired) {
    if (this.localData[p.id].nextFire > 0)
        return;

    for (var i = this.players.length; i--; ) {
        var t = this.players[i];
        if (p.team === t.team)
            continue;
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

        this.localData[t.id].hpLoss += damage;
        this.localData[p.id].nextFire = 0.55;

        fired.push({ from: p.id, to: t.id, p: this.gunDamage(p) });
        return;
    }
}

Game.prototype.gunDamage = function (p) {
    return 1 + p.guns * Math.sqrt(p.guns);
}

Game.prototype.shieldReduce = function (power) {
    return 1 - power * 0.75;
}

module.exports = Game;
