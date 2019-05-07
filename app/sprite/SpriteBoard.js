import { Bindable    } from 'curvature/base/Bindable';

import { Sprite      } from './Sprite';
import { Background  } from './Background';

import { Gl2d } from '../gl2d/Gl2d';

export class SpriteBoard extends Gl2d
{
	constructor(element, map)
	{
		super(element);

		this.map = map;

		this.camera = {
			x:        0
			, y:      0
			, width:  0
			, height: 0
		};

		this.mouse = {
			x:        null
			, y:      null
			, clickX: null
			, clickY: null
		};

		this.sprites = [];

		this.camera = Bindable.makeBindable(this.camera);

		this.camera.width  = this.element.width;
		this.camera.height = this.element.height;

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

		this.element.addEventListener(
			'mousedown', (event)=>{
				let modSize   = tileSize * this.zoomLevel;

				if(this.unselect())
				{
					selecting = false;
					return;
				}

				// console.log(
				// 	event.clientX
				// 	, event.clientY
				// );

				selecting = true;
				this.mouse.clickX = event.clientX;
				this.mouse.clickY = event.clientY;

				let localX = Math.floor((this.mouse.clickX
					+ (this.camera.x % modSize)
					- (Math.floor(this.element.width /2) % modSize)
					+ 16  * this.zoomLevel
				) / modSize);

				let localY = Math.floor((this.mouse.clickY
					+ (this.camera.y % modSize)
					- (Math.floor(this.element.height /2) % modSize)
					+ 16  * this.zoomLevel
				) / modSize);

				this.selected.startLocalX = localX;
				this.selected.startLocalY = localY;

				this.selected.startGlobalX = (this.selected.startLocalX
					- Math.floor(Math.floor(this.element.width /2) / modSize)
					+ (this.camera.x < 0
						? Math.ceil(this.camera.x /modSize)
						: Math.floor(this.camera.x /modSize)
					)
				);

				this.selected.startGlobalY = (this.selected.startLocalY
					- Math.floor(Math.floor(this.element.height /2) / modSize)
					+ (this.camera.y < 0
						? Math.ceil(this.camera.y /modSize)
						: Math.floor(this.camera.y /modSize)
					)
				);
			}
		);

		this.element.addEventListener(
			'mouseup', (event)=>{
				let modSize   = tileSize * this.zoomLevel;

				if(!selecting)
				{
					selecting = false;
					return;
				}

				console.log(
					event.clientX
					, event.clientY
				);

				this.mouse.clickX = event.clientX;
				this.mouse.clickY = event.clientY;

				let localX = Math.floor((this.mouse.clickX
					+ (this.camera.x % modSize)
					- (Math.floor(this.element.width /2) % modSize)
					+ 16  * this.zoomLevel
				) / modSize);

				let localY = Math.floor((this.mouse.clickY
					+ (this.camera.y % modSize)
					- (Math.floor(this.element.height /2) % modSize)
					+ 16  * this.zoomLevel
				) / modSize);

				console.log(localX, localY);

				let globalX = (localX
					- Math.floor(Math.floor(this.element.width /2) / modSize)
					+ (this.camera.x < 0
						? Math.ceil(this.camera.x /modSize)
						: Math.floor(this.camera.x /modSize)
					)
				);

				let globalY = (localY
					- Math.floor(Math.floor(this.element.height /2) / modSize)
					+ (this.camera.y < 0
						? Math.ceil(this.camera.y /modSize)
						: Math.floor(this.camera.y /modSize)
					)
				);

				console.log(globalX, globalY);

				console.log(this.element.width, this.element.height);

				this.selected.localX  = localX;
				this.selected.globalX = globalX;
				this.selected.localY  = localY;
				this.selected.globalY = globalY;

				selecting = false;
			}
		);

		this.background = new Background(this, map);
		this.background1 = new Background(this, map, 1);

		const sprite = new Sprite(this);
		const barrel = new Sprite(this, 'barrel.png');

		barrel.x = 32;
		barrel.y = 32;

		this.sprites = [
			barrel
			, sprite
			, this.background
			, this.background1
		];
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

	moveCamera(x, y)
	{
		let originalX = this.camera.x;
		let originalY = this.camera.y;

		this.camera.x = x;
		this.camera.y = y;

		this.mouse.clickX += (originalX - this.camera.x);
		this.mouse.clickY += (originalY - this.camera.y);
	}

	draw()
	{
		const gl = this.context;

		super.draw();

		gl.uniform2f(
			this.resolutionLocation
			, this.camera.width
			, this.camera.height
		);

		this.sprites.map(s => {
			s.z = s.y

			if(s instanceof Background)
			{
				s.z = -s.layer - 100;
			}
		});

		this.sprites.sort((a,b)=>{
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

		this.sprites.map(s => s.draw());

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
				- this.camera.x
				+ (this.element.width /2)
				- (modSize /2)
			, (minY * modSize)
				- this.camera.y
				+ (this.element.height /2)
				- (modSize /2)
			, (maxX - minX) * modSize
			, (maxY - minY) * modSize
		);

		console.log();

		gl.drawArrays(gl.TRIANGLES, 0, 6);
	}

	simulate()
	{
		this.sprites.map(s => s.simulate());
	}

	resize(x, y)
	{
		x = x || this.element.width;
		y = y || this.element.height;

		this.background.resize(
			Math.round(x / 2 + 32)   * (1 / this.zoomLevel)
			, Math.round(y / 2 + 32) * (1 / this.zoomLevel)
		);

		this.background1.resize(
			Math.round(x / 2 + 32)   * (1 / this.zoomLevel)
			, Math.round(y / 2 + 32) * (1 / this.zoomLevel)
		);

		super.resize(x, y);
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
