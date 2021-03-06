﻿"use strict";

var sim = require('./static/script/shared/sim.js');

function Game(io) {
    this.io = io;
    this.players = [];
    this.obstacles = []
    this.nextState = 0;
	
	this.spawnSize = 500;

    this.timeToEnd = 120;
    this.nextFire = 0;

    this.localData = {};

    this.placeObstacles();
}

Game.prototype.nearestObstacleDistSq = function (x, y, r) {
    var bestDist = sim.mapWidth + sim.mapHeight;
    bestDist *= bestDist;
    for (var i = this.obstacles.length; i--; ) {
        var dx = this.obstacles[i].x - x;
        var dy = this.obstacles[i].y - y;
        var dist = dx * dx + dy * dy;
        if (dist < bestDist)
            bestDist = dist;
    }
    
    return bestDist;
}

Game.prototype.placeObstacles = function () {
   
    for (var i = 0; i < 1000; i++) {
        var pt = [Math.random() * sim.mapWidth, Math.random() * sim.mapHeight];
        var radius = Math.random() * 50 + 50;
        
        if (pt[0] - radius < this.spawnSize && pt[1] - radius < this.spawnSize)
            continue;
        if (pt[0] + radius > sim.mapWidth - this.spawnSize && pt[1] + radius > sim.mapHeight - this.spawnSize)
            continue;

        if (this.nearestObstacleDistSq(pt[0], pt[1], radius) >= (150 + radius) * (150 + radius))
            this.obstacles.push({ x: pt[0], y: pt[1], r: radius });
    }

    for (var i = 0; i < 100; i++) {
        var pt = [Math.random() * sim.mapWidth, Math.random() * sim.mapHeight];
        var radius = Math.random() * 50 + 100;
        
        if (pt[0] - radius < this.spawnSize && pt[1] - radius < this.spawnSize)
            continue;
        if (pt[0] + radius > sim.mapWidth - this.spawnSize && pt[1] + radius > sim.mapHeight - this.spawnSize)
            continue;

        if (this.nearestObstacleDistSq(pt[0], pt[1]) >= 100 * 100 && 
            (Math.abs(pt[0] - pt[1]) > this.spawnSize + radius))
            this.obstacles.push({ x: pt[0], y: pt[1], r: radius });
    }

    for (var i = this.obstacles.length; i--; ) {
        this.obstacles[i].tex = Math.floor(Math.random() * 3);
        this.obstacles[i].rot = Math.random() * Math.PI * 2;
    }
}

Game.prototype.moveTo = function (id, x, y) {
    var player = this.getPlayer(id);
    if (!player || player.hp <= 0)
        return;
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
        x: 0,
        y: 0,
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
        d: 0,
	};
	
	player.x = (player.team === 1) ? (Math.random() * this.spawnSize) : (sim.mapWidth - Math.random() * this.spawnSize);
	player.y = (player.team === 1) ? (Math.random() * this.spawnSize) : (sim.mapHeight - Math.random() * this.spawnSize);
    
    this.localData[id] = {
        fireTimer: 0,
        hpLoss: 0,
    };

    player.tx = player.x;
    player.ty = player.y;
    player.td = player.dir;
    
    socket.emit('self', { id: player.id, team: player.team });
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
    
    return null;
    //throw new Error("player with id='" + id + "' was not found");
}

Game.prototype.step = function (dt) {
    
    if (this.players.length === 0)
        this.timeToEnd = 0;
    
    var allSame = true;
    for (var i = this.players.length; i--; )
        if (this.players[i].team !== this.players[0].team)
            allSame = false;
    
    if (allSame && this.timeToEnd > 5)
        this.timeToEnd = 5;

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
    
    for (var i = this.players.length; i--; )
        if (this.players[i].hp <= 0)
            this.dead(this.players[i].id);
}

Game.prototype.systemPower = function (id, system, value) {
	var player = this.getPlayer(id);
	if (!player || player.hp <= 0)
		return;
	
	if (!system || (!value && value !== 0))
		return;
	
	if (value < 0) value = 0;
	if (value > 1) value = 1;
	
	switch (system) {
		case 'engines':
			player.tengines = value;
			var otherUse = player.tguns + player.tfsh + player.tbsh;
			var loadRemaining = sim.maxSystemPower - value;
			if (otherUse > loadRemaining) {
				//give equivivalent percentage of load remaining to other systems
				player.tguns = player.tguns / otherUse * loadRemaining;
				player.tfsh = player.tfsh / otherUse * loadRemaining;
				player.tbsh = player.tbsh / otherUse * loadRemaining;
			}
			break;
		case 'guns':
			player.tguns = value;
			var otherUse = player.tengines + player.tfsh + player.tbsh;
			var loadRemaining = sim.maxSystemPower - value;
			if (otherUse > loadRemaining) {
				//give equivivalent percentage of load remaining to other systems
				player.tengines = player.tengines / otherUse * loadRemaining;
				player.tfsh = player.tfsh / otherUse * loadRemaining;
				player.tbsh = player.tbsh / otherUse * loadRemaining;
			}
			break;
		case 'fshield':
			player.tfsh = value;
			var otherUse = player.tguns + player.tengines + player.tbsh;
			var loadRemaining = sim.maxSystemPower - value;
			if (otherUse > loadRemaining) {
				//give equivivalent percentage of load remaining to other systems
				player.tguns = player.tguns / otherUse * loadRemaining;
				player.tengines = player.tengines / otherUse * loadRemaining;
				player.tbsh = player.tbsh / otherUse * loadRemaining;
			}
			break;
		case 'bshield':
			player.tbsh = value;
			var otherUse = player.tguns + player.tfsh + player.tengines;
			var loadRemaining = sim.maxSystemPower - value;
			if (otherUse > loadRemaining) {
				//give equivivalent percentage of load remaining to other systems
				player.tguns = player.tguns / otherUse * loadRemaining;
				player.tfsh = player.tfsh / otherUse * loadRemaining;
				player.tengines = player.tengines / otherUse * loadRemaining;
			}
			break;
		default:
			break;
	}
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
        if (Math.abs(angle) > sim.aimAngleWidth / 2)
            continue;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < sim.minFireDist || dist > sim.maxFireDist)
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
