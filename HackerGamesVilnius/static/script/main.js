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
                .rotate(p.dir)
                .drawImage(this.images.ship, -this.images.ship.width / 2, -this.images.ship.height / 2)
                .restore();
            
            this.layer.fillStyle("#FFF").fillRect(p.vx - 5, p.vy - 5, 10, 10);
            var dx = Math.cos(p.vd) * 30;
            var dy = Math.sin(p.vd) * 30;
            //this.layer.
        }
	},
    
    /* initializes fields p.vx, p.vy, p.vdir */
    initPlayer: function (p) {
        p.vx = p.x;
        p.vy = p.y;
        p.vd = p.dir;
    },
    
    updatePlayer: function (p, dt) {
        this.updateServerSide(p, dt);
        var interpolation = 0.1;
        p.vx = p.vx * (1 - interpolation) + p.x * interpolation;
        p.vy = p.vy * (1 - interpolation) + p.y * interpolation;
        p.vd = p.vd * (1 - interpolation) + p.dir * interpolation;
    },

    /* this function should be EXACTLY the same as Game.prototype.updatePlayer */
    updateServerSide: function (p, dt) {
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
    },

	/* states related events (called only for application) */
	createstate: function() { },
	enterstate: function() { },
	leavestate: function() { },

	/* keyboard events */
	keydown: function(data) { },
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

