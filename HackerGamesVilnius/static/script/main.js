var app = playground({
	
	/* silently preload assets before main loader */
	preload: function() { },

	/* assets from preloader available, push some more for main loader */
	create: function () {
		var socket = io();
		var self = this;
		self.socket = socket;

		self.socket.on('players', function (data) {
			self.players = data;
		});

		self.socket.on('joined', function (data) {
			self.players.push(data); //add player to players list		
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
	ready: function() { },

	/* called after container/window has been resized */
	resize: function() { },

	/* called each frame to update logic */
    step: function (dt) {
        if (this.players)
            console.log('have players: ' + this.players.length);
        for (var i in this.players) {
            var p = this.players[i];
            //console.log('with: ' + p);
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
	},

	/* called each frame to update rendering */
	render: function(dt) {
		this.layer.clear("#FF9000");

        //this.layer.fillStyle("#FFFFFF").fillRect(100, 100, 200, 200);

        for (var i = this.players.length; i--; ) {
            var p = this.players[i];
            this.layer.fillStyle("#FFFFFF").fillRect(p.x - 30, p.y - 30, 60, 60);
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

