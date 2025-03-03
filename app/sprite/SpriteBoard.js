import { Bag         } from 'curvature/base/Bag';
import { Bindable    } from 'curvature/base/Bindable';

import { Sprite      } from './Sprite';
import { SpriteSheet } from './SpriteSheet';
import { Entity      } from '../model/Entity';
import { Background  } from './Background';

import { Injectable  } from '../inject/Injectable';

import { Gl2d        } from '../gl2d/Gl2d';
import { Camera      } from './Camera';

export class SpriteBoard extends Gl2d.inject({Camera})
{
	constructor(element, map)
	{
		super(element);

		this.map = map;

		new (Injectable.inject({Gl2d: this}));

		this.mouse = {
			x:        null
			, y:      null
			, clickX: null
			, clickY: null
		};

		this.sprites = new Bag;

		this.Camera.width  = this.element.width;
		this.Camera.height = this.element.height;

		const gl = this.context;

		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		gl.enable(gl.BLEND);

		this.program = this.createProgram(
			this.createShader('sprite/texture.vert')
			, this.createShader('sprite/texture.frag')
		);

		this.overlayProgram = this.createProgram(
			this.createShader('overlay/overlay.vert')
			, this.createShader('overlay/overlay.frag')
		);

		this.positionLocation   = gl.getAttribLocation(this.program, "a_position");
		this.texCoordLocation   = gl.getAttribLocation(this.program, "a_texCoord");

		this.resolutionLocation = gl.getUniformLocation(this.program, "u_resolution");
		this.colorLocation      = gl.getUniformLocation(this.program, "u_color");

		this.overlayPosition   = gl.getAttribLocation(this.overlayProgram, "a_position");
		this.overlayResolution = gl.getUniformLocation(this.overlayProgram, "u_resolution");
		this.overlayColor      = gl.getUniformLocation(this.overlayProgram, "u_color");

		this.positionBuffer = gl.createBuffer();
		this.texCoordBuffer = gl.createBuffer();

		gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
			0.0,  0.0,
			1.0,  0.0,
			0.0,  1.0,
			0.0,  1.0,
			1.0,  0.0,
			1.0,  1.0,
		]), gl.STATIC_DRAW);

		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

		document.addEventListener(
			'mousemove', (event)=>{
				this.mouse.x = event.clientX;
				this.mouse.y = event.clientY;

				// this.moveCamera(
				// 	-this.mouse.x + gl.canvas.width/2
				// 	, -this.mouse.y + gl.canvas.height/2
				// );
			}
		);

		this.selected = {
			localX:    null
			, localY:  null
			, globalX: null
			, globalY: null
			, startGlobalX: null
			, startGlobalY: null
		};

		this.selected = Bindable.makeBindable(this.selected);

		let selecting = false;
		let tileSize  = 32;

		// this.element.addEventListener('mousedown', (event)=>{
		// 	let modSize   = tileSize * this.zoomLevel;

		// 	if(this.unselect())
		// 	{
		// 		selecting = false;
		// 		return;
		// 	}

		// 	// console.log(
		// 	// 	event.clientX
		// 	// 	, event.clientY
		// 	// );

		// 	selecting = true;
		// 	this.mouse.clickX = event.clientX;
		// 	this.mouse.clickY = event.clientY;

		// 	let localX = Math.floor((this.mouse.clickX
		// 		+ (this.Camera.x % modSize)
		// 		- (Math.floor(this.element.width /2) % modSize)
		// 		+ 16  * this.zoomLevel
		// 	) / modSize);

		// 	let localY = Math.floor((this.mouse.clickY
		// 		+ (this.Camera.y % modSize)
		// 		- (Math.floor(this.element.height /2) % modSize)
		// 		+ 16  * this.zoomLevel
		// 	) / modSize);

		// 	this.selected.startLocalX = localX;
		// 	this.selected.startLocalY = localY;

		// 	this.selected.startGlobalX = (this.selected.startLocalX
		// 		- Math.floor(Math.floor(this.element.width /2) / modSize)
		// 		+ (this.Camera.x < 0
		// 			? Math.ceil(this.Camera.x * this.zoomLevel / modSize)
		// 			: Math.floor(this.Camera.x * this.zoomLevel / modSize)
		// 		)
		// 	);

		// 	this.selected.startGlobalY = (this.selected.startLocalY
		// 		- Math.floor(Math.floor(this.element.height /2) / modSize)
		// 		+ (this.Camera.y < 0
		// 			? Math.ceil(this.Camera.y * this.zoomLevel / modSize)
		// 			: Math.floor(this.Camera.y * this.zoomLevel / modSize)
		// 		)
		// 	);
		// });

		// this.element.addEventListener('mouseup', (event)=>{
		// 		let modSize   = tileSize * this.zoomLevel;

		// 		if(!selecting)
		// 		{
		// 			selecting = false;
		// 			return;
		// 		}

		// 		console.log(
		// 			event.clientX
		// 			, event.clientY
		// 		);

		// 		this.mouse.clickX = event.clientX;
		// 		this.mouse.clickY = event.clientY;

		// 		let localX = Math.floor((this.mouse.clickX
		// 			+ (this.Camera.x % modSize)
		// 			- (Math.floor(this.element.width /2) % modSize)
		// 			+ 16  * this.zoomLevel
		// 		) / modSize);

		// 		let localY = Math.floor((this.mouse.clickY
		// 			+ (this.Camera.y % modSize)
		// 			- (Math.floor(this.element.height /2) % modSize)
		// 			+ 16  * this.zoomLevel
		// 		) / modSize);

		// 		console.log(localX, localY);

		// 		let globalX = (localX
		// 			- Math.floor(Math.floor(this.element.width /2) / modSize)
		// 			+ (this.Camera.x < 0
		// 				? Math.ceil(this.Camera.x * this.zoomLevel / modSize)
		// 				: Math.floor(this.Camera.x * this.zoomLevel / modSize)
		// 			)
		// 		);

		// 		let globalY = (localY
		// 			- Math.floor(Math.floor(this.element.height /2) / modSize)
		// 			+ (this.Camera.y < 0
		// 				? Math.ceil(this.Camera.y * this.zoomLevel / modSize)
		// 				: Math.floor(this.Camera.y * this.zoomLevel /  modSize)
		// 			)
		// 		);

		// 		this.selected.localX  = localX;
		// 		this.selected.globalX = globalX;
		// 		this.selected.localY  = localY;
		// 		this.selected.globalY = globalY;

		// 		selecting = false;
		// });

		this.background  = new Background(this, map);
		this.background1 = new Background(this, map, 1);

		const w = 1280;

		for(const i in Array(6).fill())
		{
			const barrel = new Sprite('barrel.png');
			
			barrel.x = (i * 32) % w;
			barrel.y = Math.trunc((i * 32) / w) * 32;
	
			this.sprites.add(this.background);
			this.sprites.add(this.background1);
	
			this.sprites.add(barrel);
		}


		// this.sprites.add(new Sprite('player_standing_south.png'));

	}

	unselect()
	{
		if(this.selected.localX === null)
		{
			return false;
		}

		this.selected.localX  = null;
		this.selected.localY  = null;
		this.selected.globalX = null;
		this.selected.globalY = null;

		return true;
	}

	draw()
	{
		const gl = this.context;

		super.draw();

		gl.uniform2f(
			this.resolutionLocation
			, this.Camera.width
			, this.Camera.height
		);

		let sprites = this.sprites.items();

		sprites.map(s => {
			s.z = s.y
		});

		sprites.sort((a,b)=>{
			if((a instanceof Background) && !(b instanceof Background))
			{
				return -1;
			}

			if((b instanceof Background) && !(a instanceof Background))
			{
				return 1;
			}

			if(a.z === undefined)
			{
				return -1;
			}
			if(b.z === undefined)
			{
				return 1;
			}
			return a.z - b.z;
		});

		sprites.map(s => s.draw());

		if(this.selected.localX === null)
		{
			return;
		}

		gl.useProgram(this.overlayProgram);

		gl.uniform2f(
			this.overlayResolution
			, gl.canvas.width
			, gl.canvas.height
		);

		let minX = this.selected.startGlobalX;
		let maxX = this.selected.globalX;

		if(this.selected.globalX < minX)
		{
			minX = this.selected.globalX;
			maxX = this.selected.startGlobalX;
		}

		let minY = this.selected.startGlobalY;
		let maxY = this.selected.globalY;

		if(this.selected.globalY < minY)
		{
			minY = this.selected.globalY;
			maxY = this.selected.startGlobalY;
		}

		maxX += 1;
		maxY += 1;

		let tileSize = 32;
		let modSize  = tileSize * this.zoomLevel;

		// console.log(minX, minY);

		this.setRectangle(
			(minX * modSize)
				- this.Camera.x * this.zoomLevel
				+ (this.element.width /2)
				- (modSize /2)
			, (minY * modSize)
				- this.Camera.y * this.zoomLevel
				+ (this.element.height /2)
				- (modSize /2)
			, (maxX - minX) * modSize
			, (maxY - minY) * modSize
		);

		console.log();

		gl.drawArrays(gl.TRIANGLES, 0, 6);
	}

	resize(x, y)
	{
		x = x || this.element.width;
		y = y || this.element.height;

		this.Camera.width  = x;
		this.Camera.height = y;

		this.background.resize(
			Math.round(x / 2 + 32)   * (1 / this.zoomLevel)
			, Math.round(y / 2 + 32) * (1 / this.zoomLevel)
		);

		this.background1.resize(
			Math.round(x / 2 + 32)   * (1 / this.zoomLevel)
			, Math.round(y / 2 + 32) * (1 / this.zoomLevel)
		);

		super.resize(x, y);

		this.Camera.width  =  x / this.zoomLevel;
		this.Camera.height =  y / this.zoomLevel;
	}

	setRectangle(x, y, width, height)
	{
		const gl = this.context;

		gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);

		gl.vertexAttribPointer(
			this.overlayPosition
			, 2
			, gl.FLOAT
			, false
			, 0
			, 0
		);

		var x1 = x;
		var x2 = x + width;
		var y1 = y;
		var y2 = y + height;

		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
			x1, y1,
			x2, y1,
			x1, y2,
			x1, y2,
			x2, y1,
			x2, y2,
		]), gl.STREAM_DRAW);
	}
}
