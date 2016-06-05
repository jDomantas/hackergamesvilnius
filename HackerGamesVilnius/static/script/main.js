"use strict";

var app = playground( {
    
    //smoothing: false,
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
            'rock1', 'rock2', 'rock3',
            'border1', 'border2', 'border3', 'counter', 'energybar', 'energybarempty', 'energybarend', 'limitenergy',
            'death1', 'death2', 'death3', 'death4',
            'deathpart1', 'deathpart2', 'deathpart3');
        
        this.selfTeam = 0;
        this.waitingPlayers = 0;
        this.timer = 0;
        this.hasJoinedGame = false;
        this.isGameRunning = false;
        this.gameOverMsg = "";
        this.barWidth = 100;
        this.barHeight = 50;
        this.explosions = [];
        this.shipParts = [];
		
		this.camX = 0;
		this.camY = 0;
		
        this.shieldFrame = 0;
        this.colorBlend = 0;
        this.bgColors = [[0x3B, 0x2B, 0x40], [0x5B, 0x41, 0x54], [0x28, 0x30, 0x67], [0x26, 0x50, 0x5E]];
        for (var i = this.bgColors.length; i--; )
            for (var j = this.bgColors[i].length; j--; )
                this.bgColors[i][j] = Math.floor(this.bgColors[i][j] * 0.4);

        var socket = io();
        var self = this;
        this.particles = [];
        this.weaponPositions = [-10, 10, -18, 18];
		self.socket = socket;
        
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
                if (self.players[i].id === id) {
                    var p = self.players[i];
                    self.explosions.push({ x: p.x, y: p.y, t: 0.39 });
                    self.players.splice(i, 1); //remove player from players list
                }
            }
        });
        
        self.socket.on('dead', function (id) {
            for (var i = 0; i < self.players.length; i++) {
                if (self.players[i].id === id) {
                    var p = self.players[i];
                    self.explosions.push({ x: p.vx, y: p.vy, t: 0.39 });
                    for (var j = 3; j--; ) {
                        self.shipParts.push({
                            x: p.vx, 
                            y: p.vy, 
                            dx: Math.random() * 20 - 10, 
                            dy: Math.random() * 20 - 10,
                            dir: p.vd,
                            dd: (Math.random() - 0.5) / 10,
                            i: j,
                            t: 4 + Math.random() * 2,
                        });
                    }
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
            self.explosions = [];
            self.shipParts = [];
		});

		self.socket.on('fullLobby', function () {
			console.log('tried to join full lobby');
			$('#errorMsg').text('Lobby is full.');
			$('#errorMsg').show('slow');
			setTimeout(function () {
				$('#errorMsg').hide('slow');
				$('#errorMsg').text('');
			}, 2000);
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
        this.images.death = [this.images.death4, this.images.death3, this.images.death2, this.images.death1];
        this.images.deathpart = [this.images.deathpart1, this.images.deathpart2, this.images.deathpart3];

		setTimeout(function () {
			$('#main_menu').show();
		}, 1250);
    },
    
    /* called after container/window has been resized */
    resize: function () { },
    
    /* called each frame to update logic */
    step: function (dt) {
        this.colorBlend += dt;
        this.shieldFrame += dt;
        while (this.shieldFrame >= 0.3)
            this.shieldFrame -= 0.3;
        
        for (var i = this.explosions.length; i--; ) {
            this.explosions[i].t -= dt;
            if (this.explosions[i].t < 0)
                this.explosions.splice(i, 1);
        }
        
        for (var i = this.shipParts.length; i--; ) {
            this.shipParts[i].x += this.shipParts[i].dx * dt;
            this.shipParts[i].y += this.shipParts[i].dy * dt;
            this.shipParts[i].dir += this.shipParts[i].dd * dt;
            this.shipParts[i].t -= dt;
            if (this.shipParts[i].t < 0)
                this.shipParts.splice(i, 1);
        }

		if (this.isGameRunning || (this.waitingPlayers >= 2)) {
			if(this.timer > 0)
				this.timer -= dt;
            if (this.timer < 0)
                this.timer = 0;
            var time = Math.floor(this.timer);
			if (!this.isGameRunning)
				$("#timer").text(this.gameOverMsg + "Players joined: " + this.waitingPlayers + "/20, time to round: " + time);
			else {
				$("#timer").text(this.gameOverMsg + "Round time left: " + time);
				$("#bbtn").prop('disabled', true);
			}
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
    
    drawBar: function (x, y, width, fill, aim, max) {
        this.layer.drawImage(this.images.energybarempty, x, y, width, 60);
        
        max = Math.round(max * width);
        if (max < width) {
            this.layer.drawImage(this.images.limitenergy, x + max, y, width - max, 60);
        }
        
        fill = Math.round(fill * width);
        this.layer.drawImage(this.images.energybar, x, y, fill, 60);
        
        aim = Math.round(aim * width);

        this.layer.drawImage(this.images.border2, x, y, width, 60);
        this.layer.drawImage(this.images.border1, x + 1 - this.images.border1.width, y);
        this.layer.drawImage(this.images.border3, x + width - 1, y);
        this.layer.drawImage(this.images.energybarend, x + aim - Math.round(this.images.energybarend.width / 2), y);
    },

    renderUI: function (p) {
        this.layer.drawImage(this.images.fshield, 0, this.barHeight * 0.5 - 25);
        this.layer.drawImage(this.images.bshield, 0, this.barHeight * 1.5 - 25);
        this.layer.drawImage(this.images.guns, 0, this.barHeight * 2.5 - 25);
        this.layer.drawImage(this.images.engines, 0, this.barHeight * 3.5 - 25);
        
        var freeEnergy = sim.maxSystemPower - p.tfsh - p.tbsh - p.tguns - p.tengines;

        this.drawBar(60, this.barHeight * 0.5 - 30, this.barWidth, p.fsh, p.tfsh, p.tfsh + freeEnergy);
        this.drawBar(60, this.barHeight * 1.5 - 30, this.barWidth, p.bsh, p.tbsh, p.tbsh + freeEnergy);
        this.drawBar(60, this.barHeight * 2.5 - 30, this.barWidth, p.guns, p.tguns, p.tguns + freeEnergy);
        this.drawBar(60, this.barHeight * 3.5 - 30, this.barWidth, p.engines, p.tengines, p.tengines + freeEnergy);
    },
	
	clamp: function(value, min, max){
	    if (value < min) return min;
	    else if (value > max) return max;
	    return value;
	},

	renderGame: function (dt) {
        //background
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
		//end background
        
        this.barWidth = (this.width - 70) / 3;
        if (this.barWidth < 300)
            this.barWidth = 300;
        this.barWidth = this.clamp(this.barWidth, 50, this.width - 70);
        if (this.width < this.height)
            this.barWidth = this.width - 70;

		this.layer.setTransform(1, 0, 0, 1, 0, 0);

		var player = this.getPlayer(this.selfID);
        if (player) {
            var height = this.height;
            var miny = 0;
            if (this.width < this.height) {
                this.barHeight = this.clamp((this.height - this.width) / 4, 50, 80);
                height = this.height - this.barHeight * 4;
                miny = -this.barHeight * 4;
            }
			this.camX = -this.clamp(player.vx - this.width / 2, 0, sim.mapWidth - this.width);
            this.camY = -this.clamp(player.vy - height / 2 + miny, miny, sim.mapHeight - this.height);
		}
		this.layer.translate(this.camX, this.camY);
		//sets camera pos
		
        this.layer.a(0.4).drawImage(this.images.bg, -100 + 100 * Math.cos(this.colorBlend / 10), -600 + 100 * Math.sin(this.colorBlend / 10), 3000, 3000).ra();
        this.layer.a(0.4).drawImage(this.images.bg2, -100 + 100 * Math.cos(this.colorBlend / 10 * Math.Pi + 3), -600 + 50 * Math.sin(this.colorBlend / 10 * 2), 3000, 3000).ra();
        
        if (this.players) {
            for (var i = this.particles.length; i--; ) {
                var p = this.particles[i];
                this.layer
                    .strokeStyle('#F40')
                    .lineWidth(5)
                    .beginPath()
                    .moveTo(p.x, p.y)
                    .lineTo(p.x + p.dx / 100, p.y + p.dy / 100)
                    .stroke();
            }
            
            for (var i = this.players.length; i--; ) {
                this.renderShip(this.players[i], dt);                
            }

            if (this.map)
                for (var i = this.map.length; i--; ) {
                    var rock = this.map[i];
                    this.layer
                        .save()
                        .translate(rock.x, rock.y)
                        .rotate(rock.rot)
                        .drawImage(this.images.rocks[rock.tex], -rock.r, -rock.r, rock.r * 2, rock.r * 2)
                        .restore();
                }
            
            for (var i = this.shipParts.length; i--; ) {
                this.layer
                    .save()
                    .translate(this.shipParts[i].x, this.shipParts[i].y)
                    .rotate(this.shipParts[i].dir)
                    .drawImage(this.images.deathpart[this.shipParts[i].i], -50, -50)
                    .restore();
            }
            
            for (var i = this.explosions.length; i--; ) {
                this.layer.drawImage(this.images.death[Math.floor(4 / 0.4 * this.explosions[i].t)], this.explosions[i].x - 100, this.explosions[i].y - 100, 200, 200);
            }
            
            if (this.selfID) {
                var p = this.getPlayer(this.selfID);
                if (p) {
                    this.layer
                        .save()
                        .a(0.2)
                        .translate(p.vx, p.vy)
                        .rotate(p.vd)
                        .strokeStyle('#02B')
                        .lineWidth(3)
                        .beginPath()
                        .arc(0, 0, sim.minFireDist, -sim.aimAngleWidth / 2, sim.aimAngleWidth / 2)
                        .lineTo(Math.cos(sim.aimAngleWidth / 2) * sim.maxFireDist, Math.sin(sim.aimAngleWidth / 2) * sim.maxFireDist)
                        .moveTo(Math.cos(-sim.aimAngleWidth / 2) * sim.maxFireDist, Math.sin(-sim.aimAngleWidth / 2) * sim.maxFireDist)
                        .arc(0, 0, sim.maxFireDist, -sim.aimAngleWidth / 2, sim.aimAngleWidth / 2)
                        .moveTo(Math.cos(-sim.aimAngleWidth / 2) * sim.maxFireDist, Math.sin(-sim.aimAngleWidth / 2) * sim.maxFireDist)
                        .lineTo(Math.cos(-sim.aimAngleWidth / 2) * sim.minFireDist, Math.sin(-sim.aimAngleWidth / 2) * sim.minFireDist)
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
                    this.renderUI(p);
                    this.layer.fillStyle('#000').font('30px Verdana').fillText('HP: ' + p.hp, 10, 250);
                }
            }

        }

        this.layer.font('40px Verdana').fillStyle('#FFF').fillText('Time left: ' + Math.max(0, Math.floor(this.timer)), 10, this.height - 30);
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

		switch (data.key) {
			case 'q':
				p.tfsh = 1;
				this.socket.emit('power', { system: 'fshield', value: 1 });
				break;
			case 'a':
				p.tfsh = 0.5;
				this.socket.emit('power', { system: 'fshield', value: 0.5 });
				break;
			case 'z':
				p.tfsh = 0;
				this.socket.emit('power', { system: 'fshield', value: 0 });
				break;
			//-----------------//
			case 'w':
				p.tbsh = 1;
				this.socket.emit('power', { system: 'bshield', value: 1 });
				break;
			case 's':
				p.tbsh = 0.5;
				this.socket.emit('power', { system: 'bshield', value: 0.5 });
				break;
			case 'x':
				p.tbsh = 0;
				this.socket.emit('power', { system: 'bshield', value: 0 });
				break;
			//-----------------//
			case 'e':
				p.tguns = 1;
				this.socket.emit('power', { system: 'guns', value: 1 });
				break;
			case 'd':
				p.tguns = 0.5;
				this.socket.emit('power', { system: 'guns', value: 0.5 });
				break;
			case 'c':
				p.tguns = 0;
				this.socket.emit('power', { system: 'guns', value: 0 });
				break;
			//-----------------//
			case 'r':
				p.tengines = 1;
				this.socket.emit('power', { system: 'engines', value: 1 });
				break;
			case 'f':
				p.tengines = 0.5;
				this.socket.emit('power', { system: 'engines', value: 0.5 });
				break;
			case 'v':
				p.tengines = 0;
				this.socket.emit('power', { system: 'engines', value: 0 });
				break;
			default:
				return;
				break;
		}
		var settings = { engines: p.tengines, guns: p.tguns, fshield: p.tfsh, bshield: p.tbsh };

        console.log('sending: ' + JSON.stringify(settings));

        //this.socket.emit('power', settings);
    },
	keyup: function(data) { },

	/* pointers (mouse and touches) */
	pointerdown: function (data) {
		if (this.isGameRunning === true) {
            if (data.x < this.barWidth + 80 && data.y < this.barHeight * 4) { //click on slider part
                var val = (data.x - 60) / this.barWidth;
                if (val < 0) val = 0;
                if (val > 1) val = 1;
                var p = null;
                if (this.selfID)
                    p = this.getPlayer(this.selfID);

				if (data.y > 0 && data.y <= this.barHeight) {
                    this.socket.emit('power', { system: 'fshield', value: val });
                    p.tfsh = val;
				}
				if (data.y > this.barHeight && data.y <= this.barHeight * 2) {
					this.socket.emit('power', { system: 'bshield', value: val });
                    p.tbsh = val;
				}
				if (data.y > this.barHeight * 2&& data.y <= this.barHeight * 3) {
					this.socket.emit('power', { system: 'guns', value: val });
                    p.tguns = val;
				}
				if (data.y > this.barHeight * 3 && data.y <= this.barHeight * 4) {
					this.socket.emit('power', { system: 'engines', value: val });
                    p.tengines = val;
				}
			}
			else {
				this.socket.emit('pointerdown', { x: data.x - this.camX, y: data.y - this.camY });
			}
		}
	},
	pointerup: function (data) { },
    pointermove: function (data) {
        if (!this.mouse.left && !this.mouse.right && !this.mouse.middle && !data.touch)
            return;

        if (this.isGameRunning === true) {
            if (data.x < this.barWidth + 80 && data.y < this.barHeight * 4) { //click on slider part
                var val = (data.x - 60) / this.barWidth;
                if (val < 0) val = 0;
                if (val > 1) val = 1;
                var p = null;
                if (this.selfID)
                    p = this.getPlayer(this.selfID);
                
                if (data.y > 0 && data.y <= this.barHeight) {
                    this.socket.emit('power', { system: 'fshield', value: val });
                    p.tfsh = val;
                }
                if (data.y > this.barHeight && data.y <= this.barHeight * 2) {
                    this.socket.emit('power', { system: 'bshield', value: val });
                    p.tbsh = val;
                }
                if (data.y > this.barHeight * 2 && data.y <= this.barHeight * 3) {
                    this.socket.emit('power', { system: 'guns', value: val });
                    p.tguns = val;
                }
                if (data.y > this.barHeight * 3 && data.y <= this.barHeight * 4) {
                    this.socket.emit('power', { system: 'engines', value: val });
                    p.tengines = val;
                }
            }
        }
    },

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

