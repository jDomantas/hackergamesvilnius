var app = playground( {
    
    /* silently preload assets before main loader */
    preload: function () { },
    
    /* assets from preloader available, push some more for main loader */
    create: function () {
        
        this.loadImages('guns', 'engines', 'fshield', 'bshield');
        
        var socket = io();
        var self = this;
        self.socket = socket;
        
        self.socket.on('players', function (data) {
            var oldPlayers = self.players;
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
        });
        
        self.socket.on('self', function (id) {
            self.selfID = id;
        })

        self.socket.on('joined', function (data) {
            self.players.push(data); //add player to players list		
            self.initPlayer(data);
        });
        
        self.socket.on('left', function (data) {
            for (var i = 0; i < self.players.length; i++) {
                if (self.players.id === data) {
                    self.players.splice(i, 1); //remove player from players list
                }
            }
        });
    },
    
    /* called when main loader has finished	- you want to setState here */
    ready: function () { },
    
    /* called after container/window has been resized */
    resize: function () { },
    
    /* called each frame to update logic */
    step: function (dt) {
        if (this.players && this.map && this.selfID)
            for (var i = this.players.length; i--; ) {
                this.updatePlayer(this.players[i], dt);
            }
    },
    
    /* called each frame to update rendering */
    render: function (dt) {
        this.layer.clear("#FF9000");
        
        //this.layer.fillStyle("#FFFFFF").fillRect(100, 100, 200, 200);
        
        if (this.players) {
            for (var i = this.players.length; i--; ) {
                var p = this.players[i];
                this.layer
                    .save()
                    .translate(p.vx, p.vy)
                    .rotate(p.vd)
                    .beginPath()
                    .moveTo(25, 0)
                    .lineTo(-20, 20)
                    .lineTo(-20, -20)
                    .closePath()
                    .fillStyle('#000')
                    .fill()
                if (p.fsh > 0.01)
                    this.layer
                        .beginPath()
                        .strokeStyle('#0af')
                        .lineWidth(p.fsh * 8)
                        .arc(0, 0, 35, -Math.PI / 2, +Math.PI / 2)
                        .stroke();
                if (p.bsh > 0.01)
                    this.layer
                        .beginPath()
                        .strokeStyle('#0af')
                        .lineWidth(p.bsh * 8)
                        .arc(0, 0, 35, Math.PI / 2, Math.PI * 3 / 2)
                        .stroke();
                    //.drawImage(this.images.ship, -this.images.ship.width / 2, -this.images.ship.height / 2)
                this.layer.restore();
                
                this.layer.fillStyle("#FFF").fillRect(p.x - 3, p.y - 3, 6, 6);
            }

            if (this.selfID) {
                var p = this.getPlayer(this.selfID);
                this.renderUI(this.images.fshield, 0, p.fsh, p.tfsh);
                this.renderUI(this.images.bshield, 50, p.bsh, p.tbsh);
                this.renderUI(this.images.guns, 100, p.guns, p.tguns);
                this.renderUI(this.images.engines, 150, p.engines, p.tengines);
            }
        }
        
        if (this.map)
            for (var i = this.map.length; i--; )
                this.layer.fillStyle('#F30').fillCircle(this.map[i].x, this.map[i].y, this.map[i].r);
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

    getPlayer: function (id) {
        for (var i = this.players.length; i--; )
            if (this.players[i].id === id)
                return this.players[i];

        throw new Error("can't find player with id: " + id);
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
		this.socket.emit('pointerdown', { x: data.x, y: data.y });
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

