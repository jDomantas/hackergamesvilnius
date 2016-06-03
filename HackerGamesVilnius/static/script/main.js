var app = playground({
	
	/* silently preload assets before main loader */
	preload: function() { },

	/* assets from preloader available, push some more for main loader */
    create: function () {
        var socket = io();
    },

	/* called when main loader has finished	- you want to setState here */
	ready: function() { },

	/* called after container/window has been resized */
	resize: function() { },

	/* called each frame to update logic */
	step: function(dt) { },

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
	pointerdown: function(data) { },
	pointerup: function(data) { },
	pointermove: function(data) { },

	/* mouse trap */
	mousedown: function(data) { },
	mouseup: function(data) { },
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

