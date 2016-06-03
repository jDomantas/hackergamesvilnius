var app = playground( {
    
    /* silently preload assets before main loader */
    preload: function () { },
    
    /* assets from preloader available, push some more for main loader */
    create: function () {
        
        this.loadImages('ship');
        
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
        if (this.players)
            for (var i = this.players.length; i--; ) {
                this.updatePlayer(this.players[i], dt);
            }
    },
    
    /* called each frame to update rendering */
    render: function (dt) {
        this.layer.clear("#FF9000");
        
        //this.layer.fillStyle("#FFFFFF").fillRect(100, 100, 200, 200);
        
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
                //.drawImage(this.images.ship, -this.images.ship.width / 2, -this.images.ship.height / 2)
                .restore();
            
            this.layer.fillStyle("#FFF").fillRect(p.x - 3, p.y - 3, 6, 6);
        }

        for (var i = this.map.length; i--; ) {
            this.layer.fillStyle('#F30').fillCircle(this.map[i].x, this.map[i].y, this.map[i].r);
        }
	},
    
    /* initializes fields p.vx, p.vy, p.vdir */
    initPlayer: function (p) {
        p.vx = p.x;
        p.vy = p.y;
        p.vd = p.dir;
    },
    
    updatePlayer: function (p, dt) {
        if (this.map)
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
        if (data.key === 'q') this.socket.emit('power', { engines: 0 });
        if (data.key === 'w') this.socket.emit('power', { engines: 1 });
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

