require('../layer/square.vert');
require('../layer/green.frag');

import { Sprite } from './Sprite';

export class Gl2d
{
	constructor(element)
	{
		this.element = element;
		this.context = element.getContext('webgl');

		const gl = this.context;

		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		gl.enable(gl.BLEND);

		this.program = this.createProgram(
			this.createShader('./texture.vert')
			, this.createShader('./texture.frag')
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

		this.sprite   = new Sprite(this, '/player_standing_south.png');
		const sprite2 = new Sprite(this, '/noodles-03.jpg')

		sprite2.width = 48;

		this.sprites = [
			sprite2
			, this.sprite
		];
	}

	resize()
	{
		const gl = this.context;

		gl.viewport(
			0
			, 0
			, this.element.width
			, this.element.height
		);
	}

	update()
	{
		const gl = this.context;


		gl.clearColor(0, 0, 0, 1);
		gl.clearColor(1, 1, 1, 1);
		gl.clear(gl.COLOR_BUFFER_BIT);

		this.sprites.map(s => s.draw());
	}

	cleanup()
	{
		this.context.deleteProgram(this.program);
	}

	createShader(location)
	{
		const extension = location.substring(location.lastIndexOf('.')+1);
		let   type = null;

		switch(extension.toUpperCase())
		{
			case 'VERT':
				type = this.context.VERTEX_SHADER;
				break;
			case 'FRAG':
				type = this.context.FRAGMENT_SHADER;
				break;
		}

		const shader = this.context.createShader(type);
		const source = require(location);

		this.context.shaderSource(shader, source);
		this.context.compileShader(shader);

		const success = this.context.getShaderParameter(
			shader
			, this.context.COMPILE_STATUS
		);

		if(success)
		{
			return shader;
		}

		console.error(this.context.getShaderInfoLog(shader));

		this.context.deleteShader(shader);
	}

	createProgram(vertexShader, fragmentShader)
	{
		const program = this.context.createProgram();

		this.context.attachShader(program, vertexShader);
		this.context.attachShader(program, fragmentShader);

		this.context.linkProgram(program);

		this.context.detachShader(program, vertexShader);
		this.context.detachShader(program, fragmentShader);
		this.context.deleteShader(vertexShader);
		this.context.deleteShader(fragmentShader);

		if(this.context.getProgramParameter(program, this.context.LINK_STATUS))
		{
			return program;
		}

		console.error(this.context.getProgramInfoLog(program));

		this.context.deleteProgram(program);

		return program;
	}
}
