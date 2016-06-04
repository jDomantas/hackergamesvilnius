"use strict";

var app = playground( {
	
	//container: document.getElementById('playground_container'),

    /* silently preload assets before main loader */
    preload: function () { },
    
    /* assets from preloader available, push some more for main loader */
    create: function () {
        
        this.loadImages(
            'guns', 'engines', 'fshield', 'bshield', 
            'gun1', 'gun2', 'gun3', 'gun4', 
            'selfcolor', 'allycolor', 'enemycolor', 
            'shipbase',
            'damageoverlay1', 'damageoverlay2',
            'smallup1', 'smallup2', 'smallup3', 'smalldown1', 'smalldown2', 'smalldown3',
            'bigup1', 'bigup2', 'bigup3', 'bigdown1', 'bigdown2', 'bigdown3',
            'bg', 'bg2',
            'smallfire1', 'smallfire2', 'smallfire3', 'smallfire4',
            'midfire1', 'midfire2', 'midfire3', 'midfire4', 'midfire5', 'midfire6',
            'bigfire1', 'bigfire2', 'bigfire3', 'bigfire4',
            'rock1', 'rock2', 'rock3');
        
        this.selfTeam = 0;
        this.waitingPlayers = 0;
        this.timer = 0;
        this.hasJoinedGame = false;
        this.isGameRunning = false;
		this.gameOverMsg = "";
		
		this.camX = 0;
		this.camY = 0;
		
        this.shieldFrame = 0;
        this.colorBlend = 0;
        this.bgColors = [[0x3B, 0x2B, 0x40], [0x5B, 0x41, 0x54], [0x28, 0x30, 0x67], [0x26, 0x50, 0x5E]];

        var socket = io();
        var self = this;
        this.particles = [];
        this.weaponPositions = [-10, 10, -18, 18];
		self.socket = socket;
		
		setTimeout(function () {
			$('#main_menu').removeClass('hidden');
			$('#main_menu').addClass('visible');
		}, 1250);
        
        $("#bbtn").on('click touchstart', function () { 
            socket.emit('joinGame', null);            
        });

        self.socket.on('players', function (data) {
            var oldPlayers = self.players;
            if (self.selfTeam && self.selfID) {
                var s = self.getPlayer(self.selfID);
                if (s) {
                    if (s.id !== self.selfID)
                        throw new Error("wrong ship id");
                    if (self.selfTeam !== s.team)
                        throw new Error("wrong self team");
                }
            }

            if (self.selfTeam === 0 && self.selfID) {
                var ship = self.getPlayer(self.selfID);
                if (ship) {
                    self.selfTeam = ship.team;
                    var s = self.getPlayer(self.selfID);
                    if (s) {
                        if (s.id !== self.selfID)
                            throw new Error("wrong ship id");
                        if (self.selfTeam !== s.team)
                            throw new Error("wrong self team");
                    }
                    
                }
            }
            self.players = data;
            if (oldPlayers) {
                for (var i = oldPlayers.length; i--; ) {
                    for (var j = data.length; j--; ) {
                        if (data[j].id === oldPlayers[i].id) {
                            data[j].vx = oldPlayers[i].vx;
                            data[j].vy = oldPlayers[i].vy;
                            data[j].vd = oldPlayers[i].vd;
                        }
                    }
                }
            } else {
                for (var i = data.length; i--; )
                    self.initPlayer(data[i]);
            }
        });
        
        self.socket.on('map', function (data) {
            self.map = data;
            console.log('got map');
        });
        
        self.socket.on('self', function (data) {
            self.selfID = data.id;
            self.selfTeam = data.team;
            
            if (self.selfID) {
                var s = self.getPlayer(self.selfID);
                if (s && self.selfTeam) {
                    if (s.id !== self.selfID)
                        throw new Error("wrong ship id");
                    if (self.selfTeam !== s.team)
                        throw new Error("wrong self team");
                }
            }
        })

        self.socket.on('joined', function (data) {
            if (self.players) {
                self.players.push(data); //add player to players list		
                self.initPlayer(data);
            }
        });
        
        self.socket.on('left', function (id) {
            for (var i = 0; i < self.players.length; i++) {
                if (self.players.id === id) {
                    self.players.splice(i, 1); //remove player from players list
                }
            }
        });
        
        self.socket.on('dead', function (id) {
            for (var i = 0; i < self.players.length; i++) {
                if (self.players.id === id) {
                    self.players.splice(i, 1); //remove player from players list
                }
            }

            // display some animation?
        });

        self.socket.on('fire', function (data) {
            for (var i = data.length; i--; ) {
                var p = self.getPlayer(data[i].from);
                var t = self.getPlayer(data[i].to);
                if (!p || !t) continue;
                
                var particles = Math.floor(p.guns * 4 + 1);
                if (particles < 1) particles = 1;
                if (particles > 4) particles = 4;
                var xx = Math.cos(p.vd);
                var xy = Math.sin(p.vd);
                var yx = -xy;
                var yy = xx;
                for (var j = 0; j < particles; j++) {
                    var x = p.vx + xx * 23 + yx * self.weaponPositions[j];
                    var y = p.vy + xy * 23 + yy * self.weaponPositions[j];
                    self.particles.push({ x: x, y: y, dx: xx * 300, dy: xy * 300, t: 0.3, d: t });
                }
            }
        });

        self.socket.on('timer', function (data) {
            console.log('got timer data: ' + JSON.stringify(data));
            self.isGameRunning = data.inGame;
            if (self.isGameRunning && self.hasJoinedGame) {
                $("#main_menu").hide();
            }
            self.timer = data.time;
        });

        self.socket.on('waitingCount', function (count) {
            self.waitingPlayers = count;
            // disable join button if count == 20, reenable otherwise
            // disable or enable timer
        });

        self.socket.on('joinedRoom', function (_) {
            self.hasJoinedGame = true;
            // disable join button
            $("#bbtn").prop('disabled', true);
            console.log('joined!');
        });

        self.socket.on('gameOver', function (msg) {
            console.log('game over: ' + msg);
            self.gameOverMsg = msg;
            self.isGameRunning = false;
            $("#bbtn").prop('disabled', false);
            if (self.hasJoinedGame)
                $("#main_menu").show();

            self.hasJoinedGame = false;
            self.selfTeam = 0;
            self.selfID = null;
            self.players = null;
        });
    },
    
    /* called when main loader has finished	- you want to setState here */
    ready: function () { 
        this.images.smalldown = [this.images.smalldown1, this.images.smalldown2, this.images.smalldown3];
        this.images.smallup = [this.images.smallup1, this.images.smallup2, this.images.smallup3];
        this.images.bigdown = [this.images.bigdown1, this.images.bigdown2, this.images.bigdown3];
        this.images.bigup = [this.images.bigup1, this.images.bigup2, this.images.bigup3];
        this.images.smallfire = [this.images.smallfire1, this.images.smallfire2, this.images.smallfire3, this.images.smallfire4];
        this.images.midfire = [this.images.midfire1, this.images.midfire2, this.images.midfire3, 
            this.images.midfire4, this.images.midfire5, this.images.midfire6];
        this.images.bigfire = [this.images.bigfire1, this.images.bigfire2, this.images.bigfire3, this.images.bigfire4];
        this.images.rocks = [this.images.rock1, this.images.rock2, this.images.rock3];
    },
    
    /* called after container/window has been resized */
    resize: function () { },
    
    /* called each frame to update logic */
    step: function (dt) {
        this.colorBlend += dt;
        this.shieldFrame += dt;
        while (this.shieldFrame >= 0.3)
            this.shieldFrame -= 0.3;

        if (this.isGameRunning || (this.waitingPlayers >= 2)) {
            this.timer -= dt;
            if (this.timer < 0)
                this.timer = 0;
            var time = Math.floor(this.timer);
            if (!this.isGameRunning)
                $("#timer").text(this.gameOverMsg + "Players joined: " + this.waitingPlayers + "/20, time to round: " + time);
            else
                $("#timer").text(this.gameOverMsg + "Round time left: " + time);
        } else {
            $("#timer").text(this.gameOverMsg + "Players joined: " + this.waitingPlayers + "/20, waiting for more.");
        }
        
        if (this.isGameRunning && this.hasJoinedGame) {
            if (this.players && this.map && this.selfID)
                for (var i = this.players.length; i--; ) {
                    this.updatePlayer(this.players[i], dt);
                }
            
            for (var i = this.particles.length; i--; ) {
                this.updateParticle(this.particles[i], dt);
                if (this.particles[i].t <= 0)
                    this.particles.splice(i, 1);
            }
        }
	},
	
    updateParticle: function (p, dt) {
        if (p.t < 0.01) {
            p.t = 0;
            return;
        }
        var part = dt / p.t;
        if (part > 1)
            part = 1;
        var ndx = (p.d.vx - p.x) / p.t;
        var ndy = (p.d.vy - p.y) / p.t;
        p.dx = p.dx * (1 - part) + ndx * part;
        p.dy = p.dy * (1 - part) + ndy * part;
        p.x += p.dx * dt;
        p.y += p.dy * dt;
        p.t -= dt;
    },
    
    /* called each frame to update rendering */
    render: function (dt) {
        this.layer.clear("#FF9000");
        
		if (this.isGameRunning && this.hasJoinedGame) {
			
            this.renderGame(dt);
        } else {
            // display and update html ui
        }
	},
    
    weaponFunction: function (power, index) {
        if (index === 0) return 1;
        var center = index * 0.25;
        if (power > center + 0.05) return 1;
        else if (power < center - 0.05) return 0;
        else return (power - (center - 0.05)) / 0.1;
    },

    renderShip: function (s, dt) {
        var colorImage = this.images.enemycolor;
        if (this.selfTeam === s.team) colorImage = this.images.allycolor;
        if (this.selfID === s.id) colorImage = this.images.selfcolor;
        
        this.layer.save().translate(s.vx, s.vy).rotate(s.vd);
        
        var fireFrame = Math.floor(this.colorBlend * 10) % 24;
        if (s.x !== s.tx || s.y !== s.ty) {
            if (s.engines < 0.2 || s.td !== s.dir)
                this.layer.drawImage(this.images.smallfire[fireFrame % 4], -96, -50);
            else if (s.engines < 0.7)
                this.layer.drawImage(this.images.midfire[fireFrame % 6], -96, -50);
            else
                this.layer.drawImage(this.images.bigfire[fireFrame % 4], -96, -50);
        }


        var frame = Math.floor(this.shieldFrame * 10);
        if (frame >= 3) frame = 2;
        if (frame < 0) frame = 0;

        if (s.fsh > 0.01) {
            if (s.fsh > 0.5)
                this.layer.a(s.fsh * 2 - 1).drawImage(this.images.bigup[frame], -50, -50).ra();
            this.layer.a(Math.min(1, s.fsh * 2)).drawImage(this.images.smallup[frame], -50, -50).ra();
        }
        if (s.bsh > 0.01) {
            if (s.bsh > 0.5)
                this.layer.a(s.bsh * 2 - 1).drawImage(this.images.bigdown[frame], -50, -50).ra();
            this.layer.a(Math.min(1, s.bsh * 2)).drawImage(this.images.smalldown[frame], -50, -50).ra();
        }
        
        this.layer.drawImage(this.images.gun1, -24 - (1 - this.weaponFunction(s.guns, 0)) * 7, -25);
        this.layer.drawImage(this.images.gun2, -24 - (1 - this.weaponFunction(s.guns, 1)) * 7, -25);
        this.layer.drawImage(this.images.gun3, -25 - (1 - this.weaponFunction(s.guns, 2)) * 10, -25);
        this.layer.drawImage(this.images.gun4, -25 - (1 - this.weaponFunction(s.guns, 3)) * 10, -25);
        
        this.layer.drawImage(colorImage, -25, -25);
        this.layer.a(Math.max(0, 1 - s.hp / 8)).drawImage(this.images.damageoverlay2, -25, -25).ra();
        this.layer.drawImage(this.images.shipbase, -25, -25);
        this.layer.a(Math.max(0, 1 - s.hp / 8)).drawImage(this.images.damageoverlay1, -25, -25).ra();
        
        this.layer.restore();
    },

    renderUI: function (image, y, power, target) {
        this.layer.drawImage(image, 0, y, 50, 50);
        this.layer
            .fillStyle('#666')
            .fillRect(50, y + 20, 100, 10)
            .fillStyle('#333')
            .fillRect(50, y + 15, power * 100, 20)
            .fillStyle('#000')
            .fillRect(50 + target * 100 - 3, y + 10, 6, 30);
    },
	
	clamp: function(value, min, max){
	    if (value < min) return min;
	    else if (value > max) return max;
	    return value;
	},

	renderGame: function (dt) {
        
        var currentColor = Math.floor(this.colorBlend / 4) % this.bgColors.length;
        var nextColor = (currentColor + 1) % this.bgColors.length;
        var delta = this.colorBlend / 4 - Math.floor(this.colorBlend / 4);
        delta = Math.cos(delta * Math.PI);
        delta = (-delta + 1) / 2;
        var res = [0, 0, 0];
        res[0] = Math.round(this.bgColors[currentColor][0] * (1 - delta) + delta * this.bgColors[nextColor][0]);
        res[1] = Math.round(this.bgColors[currentColor][1] * (1 - delta) + delta * this.bgColors[nextColor][1]);
        res[2] = Math.round(this.bgColors[currentColor][2] * (1 - delta) + delta * this.bgColors[nextColor][2]);
        this.layer.clear(cq.color(res));

		this.layer.setTransform(1, 0, 0, 1, 0, 0);

		var player = this.getPlayer(this.selfID);
		if (player) {
			this.camX = -this.clamp(player.vx - this.width / 2, 0, sim.mapWidth - this.width);
			this.camY = -this.clamp(player.vy - this.height / 2, 0, sim.mapHeight - this.height);
		}
		this.layer.translate(this.camX, this.camY);
        //this.layer.fillStyle("#FFFFFF").fillRect(100, 100, 200, 200);
		
        this.layer.a(0.2).drawImage(this.images.bg, -100 + 100 * Math.cos(this.colorBlend / 10), -100 + 100 * Math.sin(this.colorBlend / 10), 2200, 2200).ra();
        this.layer.a(0.2).drawImage(this.images.bg2, -100 + 100 * Math.cos(this.colorBlend / 10 * Math.Pi + 3), -100 + 50 * Math.sin(this.colorBlend / 10 * 2), 2200, 2200).ra();
        
        if (this.players) {
            for (var i = this.particles.length; i--; ) {
                var p = this.particles[i];
                this.layer
                    .strokeStyle('#F40')
                    .lineWidth(2)
                    .beginPath()
                    .moveTo(p.x, p.y)
                    .lineTo(p.x + p.dx / 100, p.y + p.dy / 100)
                    .stroke();
            }
            
            for (var i = this.players.length; i--; ) {
                this.renderShip(this.players[i], dt);                
                //this.layer.fillStyle("#FFF").fillRect(p.x - 3, p.y - 3, 6, 6);
            }
            
            if (this.map)
                for (var i = this.map.length; i--; ) {
                    var rock = this.map[i];
                    this.layer
                        .save()
                        .translate(rock.x, rock.y)
                        .rotate(rock.rot)
                        .drawImage(this.images.rocks[rock.tex], -rock.r / 2, -rock.r / 2, rock.r, rock.r)
                        .restore();
                }
			
            if (this.selfID) {
                var p = this.getPlayer(this.selfID);
                if (p) {
                    this.layer
                        .save()
                        .a(0.1)
                        .translate(p.vx, p.vy)
                        .rotate(p.vd)
                        .strokeStyle('#02B')
                        .lineWidth(3)
                        .beginPath()
                        .arc(0, 0, 30, -0.4, 0.5)
                        .lineTo(Math.cos(0.4) * 350, Math.sin(0.4) * 350)
                        .moveTo(Math.cos(-0.4) * 350, Math.sin(-0.4) * 350)
                        .arc(0, 0, 350, -0.4, 0.4)
                        .moveTo(Math.cos(-0.4) * 350, Math.sin(-0.4) * 350)
                        .lineTo(Math.cos(-0.4) * 30, Math.sin(-0.4) * 30)
                        .closePath()
                        .stroke()
                        .ra()
                        .restore();
                }
            }
            
            this.layer.setTransform(1, 0, 0, 1, 0, 0);

            if (this.selfID) {
                var p = this.getPlayer(this.selfID);
                if (p) {
                    this.renderUI(this.images.fshield, 0, p.fsh, p.tfsh);
                    this.renderUI(this.images.bshield, 50, p.bsh, p.tbsh);
                    this.renderUI(this.images.guns, 100, p.guns, p.tguns);
                    this.renderUI(this.images.engines, 150, p.engines, p.tengines);
                    this.layer.fillStyle('#000').font('30px Verdana').fillText('HP: ' + p.hp, 10, 250);

                }
            }

        }
    },

    getPlayer: function (id) {
        if (!this.players)
            return null;

        for (var i = this.players.length; i--; )
            if (this.players[i].id === id)
                return this.players[i];
        
        return null;
    },

    /* initializes fields p.vx, p.vy, p.vdir */
    initPlayer: function (p) {
        p.vx = p.x;
        p.vy = p.y;
        p.vd = p.dir;
    },
    
    updatePlayer: function (p, dt) {
        sim.updatePlayer(p, dt, this.players, this.map);
        var interpolation = 0.08;
        p.vx = p.vx * (1 - interpolation) + p.x * interpolation;
        p.vy = p.vy * (1 - interpolation) + p.y * interpolation;
        var interpolationAngle = 0.2;
        var dd = p.dir - p.vd;
        while (dd > Math.PI) dd -= Math.PI * 2;
        while (dd < -Math.PI) dd += Math.PI * 2;
        var dest = p.vd + dd;
        p.vd = p.vd * (1 - interpolationAngle) + dest * interpolationAngle;
        
    },

	/* states related events (called only for application) */
	createstate: function() { },
	enterstate: function() { },
	leavestate: function() { },

	/* keyboard events */
    keydown: function (data) {
        if (!this.selfID || !this.players)
            return;

        var p = this.getPlayer(this.selfID);

        if (!p)
            return;

        var settings = { engines: p.tengines, guns: p.tguns, fshield: p.tfsh, bshield: p.tbsh };
        if (data.key === 'q') settings.fshield = 1;
        if (data.key === 'a') settings.fshield = 0.5;
        if (data.key === 'z') settings.fshield = 0;
        
        if (data.key === 'w') settings.bshield = 1;
        if (data.key === 's') settings.bshield = 0.5;
        if (data.key === 'x') settings.bshield = 0;
        
        if (data.key === 'e') settings.guns = 1;
        if (data.key === 'd') settings.guns = 0.5;
        if (data.key === 'c') settings.guns = 0;
        
        if (data.key === 'r') settings.engines = 1;
        if (data.key === 'f') settings.engines = 0.5;
        if (data.key === 'v') settings.engines = 0;
        
        console.log('sending: ' + JSON.stringify(settings));

        this.socket.emit('power', settings);
    },
	keyup: function(data) { },

	/* pointers (mouse and touches) */
	pointerdown: function (data) {
		this.socket.emit('pointerdown', { x: data.x - this.camX, y: data.y - this.camY });
	},
	pointerup: function (data) { },
	pointermove: function(data) { },

	/* mouse trap */
	mousedown: function (data) { },
	mouseup: function (data) { },
	mousemove: function(data) { },

	/* finger trap - ouch */
	touchstart: function(data) { },
	touchend: function(data) { },
	touchmove: function(data) { },

	/* gamepad events */
	gamepaddown: function(data) { },
	gamepadup: function(data) { },
	gamepadmove: function(data) { }

});

