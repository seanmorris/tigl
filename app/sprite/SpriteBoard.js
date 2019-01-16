import { Bindable    } from 'curvature/base/Bindable';

import { Sprite      } from './Sprite';
import { Background  } from './Background';

import { Gl2d } from '../gl2d/Gl2d';

export class SpriteBoard extends Gl2d
{
	constructor(element)
	{
		super(element);

		this.camera = {
			x:        0
			, y:      0
			, width:  0
			, height: 0
		};

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

		this.positionLocation   = gl.getAttribLocation(this.program, "a_position");
		this.texCoordLocation   = gl.getAttribLocation(this.program, "a_texCoord");

		this.resolutionLocation = gl.getUniformLocation(this.program, "u_resolution");
		this.colorLocation      = gl.getUniformLocation(this.program, "u_color");

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

		this.sprite   = new Sprite(
			this
			, '/player_standing_south.png'
			, '/barrel.png'
		);

		const barrel   = new Sprite(
			this
			, '/barrel.png'
		);

		barrel.x = 32;

		this.background = new Background(this);

		// this.background.resize(
		// 	this.element.width / 1
		// 	, this.element.height / 1
		// );
		
		this.sprites = [
			this.background
			, barrel
			, this.sprite
		];
	}

	moveCamera(x, y)
	{
		this.camera.x = x;
		this.camera.y = y;
	}

	draw()
	{
		this.sprites.map(s => s.z = s.y);

		super.draw();

		this.sprites.sort((a,b)=>{
			if(b.z === undefined)
			{
				return 0;
			}
			return a.z - b.z;
		});

		this.sprites.map(s => s.draw());
	}

	simulate()
	{
		this.sprites.map(s => s.simulate());
	}

	resize()
	{
		super.resize();

		// this.background.resizePanes(64, 64);
		// this.background.resizePanes(32, 32);
		// this.background.resizePanes(128, 128);
		// let a = 1;
		// this.background.resizePanes(64, 64);
		// this.background.resizePanes(160, 64);

		// console.log(Math.floor(this.element.width / 2 + 32));

		this.background.resize(
			Math.floor(this.element.width / 2 + 32)
			, Math.floor(this.element.height / 2 + 32)
		);

	}
}
