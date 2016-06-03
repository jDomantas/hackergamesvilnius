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
			console.log(data);
		});

		self.socket.on('joined', function (data) {
			self.players.push(data); //add player to players list
			console.log(data);
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
		for (var player in this.players) {
			player.x = dt * 50;
		}
	},

	/* called each frame to update rendering */
	render: function(dt) {
		this.layer.clear("#FF9000");
		this.layer.fillStyle("#FFFFFF").fillRect(100, 100, 200, 200);
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

