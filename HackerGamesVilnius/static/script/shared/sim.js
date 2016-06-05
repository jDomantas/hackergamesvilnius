"use strict";

(function (root) {
    
    var playerRadius = 20;
    var playerDiameter = 2 * playerRadius;
	
	var mapWidth = 2000;
	var mapHeight = 2000;

    var systemPowerdownSpeed = 1;
    var systemPowerupSpeed = 0.15;
	var maxSystemPower = 1.5;
    
    var sim = {};
    
    var mapWidth = sim.mapWidth = 2000;
    var mapHeight = sim.mapHeight = 2000;

	var sim = {};
	sim.maxSystemPower = maxSystemPower;
	sim.mapWidth = mapWidth;
	sim.mapHeight = mapHeight;

    sim.updatePlayer = function (p, dt, players, obstacles) {
        var oldx = p.x;
        var oldy = p.y;

        sim.movePlayer(p, dt);
        sim.resolveMapCollisions(p, obstacles);
        sim.resolvePlayerCollisions(p, players);
        
        if (p.x < playerRadius)
            p.x = playerRadius;
        if (p.x > mapWidth - playerRadius)
            p.x = mapWidth - playerRadius;
        if (p.y < playerRadius)
            p.y = playerRadius;
        if (p.y > mapHeight - playerRadius)
            p.y = mapHeight - playerRadius;
        
        if (p.td === p.dir && p.fly) {
            var dx = p.x - oldx;
            var dy = p.y - oldy;
            if (Math.abs(dx) + Math.abs(dy) > 0.005)
                p.td = p.dir = Math.atan2(dy, dx);
        }
        
        sim.updateSystems(p, dt);
    }
    
    sim.movePlayer = function (p, dt) {
        var speed = sim.moveSpeed(p);
        var turnSpeed = sim.turnSpeed(p);

        if (p.td != p.dir) {
            var deltadir = p.td - p.dir;
            while (deltadir > Math.PI) deltadir -= Math.PI * 2;
            while (deltadir < -Math.PI) deltadir += Math.PI * 2;
            var s = turnSpeed * dt;
            if (deltadir > s) p.dir += s;
            else if (deltadir < -s) p.dir -= s;
            else p.dir = p.td;
        } else {
            var dx = p.tx - p.x;
            var dy = p.ty - p.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > speed * dt) {
                p.x += dx / dist * speed * dt;
                p.y += dy / dist * speed * dt;
            } else {
                p.x = p.tx;
                p.y = p.ty;
                p.fly = false;
            }
        }
    }
    
    sim.resolvePlayerCollisions = function (p, players) {
        for (var i = players.length; i--; ) {
            var o = players[i];
            if (p === o)
                continue;
            
            var dx = o.x - p.x;
            var dy = o.y - p.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < playerDiameter && dist > 0) {
                dx /= dist;
                dy /= dist;
                p.x -= dx * 0.5 * (playerDiameter - dist);
                p.y -= dy * 0.5 * (playerDiameter - dist);
                o.x += dx * 0.5 * (playerDiameter - dist);
                o.y += dy * 0.5 * (playerDiameter - dist);
            }
        }

    }
    
    sim.resolveMapCollisions = function (p, obstacles) {
        
        for (var i = obstacles.length; i--; ) {
            var o = obstacles[i];
            var dx = o.x - p.x;
            var dy = o.y - p.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < playerRadius + o.r && dist > 0) {
                dx /= dist;
                dy /= dist;
                p.x -= dx * (playerRadius + o.r - dist);
                p.y -= dy * (playerRadius + o.r - dist);
            }
        }
    }
    
    sim.updateSystems = function (p, dt) {
        if (p.tengines > p.engines) {
            p.engines += systemPowerupSpeed * dt;
            if (p.engines > p.tengines)
                p.engines = p.tengines;
        } else if (p.tengines < p.engines) {
            p.engines -= systemPowerdownSpeed * dt;
            if (p.engines < p.tengines)
                p.engines = p.tengines;
        }

        if (p.tfsh > p.fsh) {
            p.fsh += systemPowerupSpeed * dt;
            if (p.fsh > p.tfsh)
                p.fsh = p.tfsh;
        } else if (p.tfsh < p.fsh) {
            p.fsh -= systemPowerdownSpeed * dt;
            if (p.fsh < p.tfsh)
                p.fsh = p.tfsh;
        }

        if (p.tbsh > p.bsh) {
            p.bsh += systemPowerupSpeed * dt;
            if (p.bsh > p.tbsh)
                p.bsh = p.tbsh;
        } else if (p.tbsh < p.bsh) {
            p.bsh -= systemPowerdownSpeed * dt;
            if (p.bsh < p.tbsh)
                p.bsh = p.tbsh;
        }

        if (p.tguns > p.guns) {
            p.guns += systemPowerupSpeed * dt;
            if (p.guns > p.tguns)
                p.guns = p.tguns;
        } else if (p.tguns < p.guns) {
            p.guns -= systemPowerdownSpeed * dt;
            if (p.guns < p.tguns)
                p.guns = p.tguns;
        }
    }
    
    sim.moveSpeed = function (p) {
        return (125 + p.engines * 125);
    }
    
    sim.turnSpeed = function (p) {
        return Math.exp(p.engines * 4);
    }

    if (typeof exports !== 'undefined') {
        if (typeof module !== 'undefined' && module.exports)
            module.exports = sim;
        exports.sim = sim;
    } else {
        window.sim = sim;
    }
}).call(this);
