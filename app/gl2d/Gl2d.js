/**
 * Wraps a WebGLProgram
 */
class Program
{
	/**
	 * @property {CanvasRenderingContext2D} context - Rendering context from canvas
	 */
	context = null;

	/**
	 * @property {WebGLProgram} program - The WebGLProgram object
	 */
	program = null;

	/**
	 * @property { {[string]: GLint} } attributes - Attributes keyed by name
	 */
	attributes = {};

	/**
	 * @property { {[string]: WebGLBuffer} } buffers - Attribute buffers keyed by name
	 */
	buffers = {};

	/**
	 * @property { {[string]: WebGLUniformLocation} } uniforms - Uniform locations keyed by name
	 */
	uniforms = {};

	/**
	 * Construct a Program object
	 * @param {object} param0 - Named params
	 * @param {WebGLRenderingContext} param0.gl - The WebGL rendering context
	 * @param {WebGLShader} param0.vertexShader - The vertex shader
	 * @param {WebGLShader} param0.fragmentShader - The fragment shader
	 * @param {Array<string>} param0.attributes - List of attribute names
	 * @param {Array<string>} param0.uniforms - List of uniform names
	 */
	constructor({gl, vertexShader, fragmentShader, attributes, uniforms})
	{
		this.context = gl;
		this.program = gl.createProgram();

		gl.attachShader(this.program, vertexShader);
		gl.attachShader(this.program, fragmentShader);

		gl.linkProgram(this.program);

		gl.detachShader(this.program, vertexShader);
		gl.detachShader(this.program, fragmentShader);

		gl.deleteShader(vertexShader);
		gl.deleteShader(fragmentShader);

		if(!gl.getProgramParameter(this.program, gl.LINK_STATUS))
		{
			console.error(gl.getProgramInfoLog(this.program));
			gl.deleteProgram(this.program);
		}

		for(const uniform of uniforms)
		{
			const location = gl.getUniformLocation(this.program, uniform);

			if(location === null)
			{
				console.warn(`Uniform ${uniform} not found.`);
				continue;
			}

			this.uniforms[uniform] = location;
		}

		for(const attribute of attributes)
		{
			const location = gl.getAttribLocation(this.program, attribute);

			if(location === null)
			{
				console.warn(`Attribute ${attribute} not found.`);
				continue;
			}

			const buffer = gl.createBuffer();

			gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
			gl.enableVertexAttribArray(location);
			gl.vertexAttribPointer(
				location
				, 2
				, gl.FLOAT
				, false
				, 0
				, 0
			);

			this.attributes[attribute] = location;
			this.buffers[attribute] = buffer;
		}
	}

	/**
	 * Activate the program
	 */
	use()
	{
		this.context.useProgram(this.program);
	}

	/**
	 * Set a floating point uniform[1,2,3,4]
	 * @param {string} name - The uniform name
	 * @param  {...number} floats - The floating point values to set
	 */
	uniformF(name, ...floats)
	{
		const gl = this.context;
		gl[`uniform${floats.length}f`](this.uniforms[name], ...floats);
	}

	/**
	 * Set an integer uniform[1,2,3,4]
	 * @param {string} name - The uniform name
	 * @param  {...number} ints - The integer values to set
	 */
	uniformI(name, ...ints)
	{
		const gl = this.context;
		gl[`uniform${ints.length}i`](this.uniforms[name], ...ints);
	}
}

/**
 * Wraps common GL operations
 */
export class Gl2d
{
	/**
	 * Construct a Gl2d object
	 * @param {HTMLCanvasElement} element - The canvas element to render to.
	 */
	constructor(element)
	{
		this.element = element || document.createElement('canvas');
		this.context = this.element.getContext('webgl2');

		if(!this.context)
		{
			this.context = this.element.getContext('webgl');
		}
	}

	/**
	 * Create a new fragment or vertex shader
	 * @param {string} location - The shader location
	 * @returns {WebGLShader|void} - The shader
	 */
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
			shader, this.context.COMPILE_STATUS
		);

		if(success)
		{
			return shader;
		}

		console.error(this.context.getShaderInfoLog(shader));

		this.context.deleteShader(shader);
	}

	/**
	 * Create a new Program object
	 * @param {object} param0 - Named params
	 * @param {WebGLShader} param0.vertexShader - The vertex shader
	 * @param {WebGLShader} param0.fragmentShader - The fragment shader
	 * @param {Array<string>} param0.attributes - List of attribute names
	 * @param {Array<string>} param0.uniforms - List of uniform names
	 * @returns {Program} - The program
	 */
	createProgram({vertexShader, fragmentShader, uniforms, attributes})
	{
		const gl = this.context;
		return new Program({gl, vertexShader, fragmentShader, uniforms, attributes});
	}

	/**
	 * Create a new texture
	 * @param {number} width - Texture width
	 * @param {number} height - Texture height
	 * @returns {WebGLTexture} - Texture object
	 */
	createTexture(width, height)
	{
		const gl = this.context;
		const texture = gl.createTexture();

		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texImage2D(
			gl.TEXTURE_2D
			, 0
			, gl.RGBA
			, width
			, height
			, 0
			, gl.RGBA
			, gl.UNSIGNED_BYTE
			, null
		);

		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

		return texture;
	}

	/**
	 * Create a framebuffer for a texture
	 * @param {WebGLTexture} texture - The texture
	 * @returns {WebGLFramebuffer} - The framebuffer
	 */
	createFramebuffer(texture)
	{
		const gl = this.context;

		const framebuffer = gl.createFramebuffer();

		gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

		gl.framebufferTexture2D(
			gl.FRAMEBUFFER
			, gl.COLOR_ATTACHMENT0
			, gl.TEXTURE_2D
			, texture
			, 0
		);

		return framebuffer;
	}

	/**
	 * Enable alpha blending
	 */
	enableBlending()
	{
		const gl = this.context;
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		gl.enable(gl.BLEND);
	}
}
