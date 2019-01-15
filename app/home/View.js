import { Config }           from 'Config';

import { View as BaseView } from 'curvature/base/View';

// import { Gl2d }             from '../gl2d/Gl2d';

// import { Sprite }           from '../sprite/Sprite';
import { SpriteBoard }      from '../sprite/SpriteBoard';

import { Keyboard }         from 'curvature/input/Keyboard'

export class View extends BaseView
{
	constructor(args)
	{
		super(args);
		this.template  = require('./view.tmp');
		this.routes    = [];

		this.keyboard = new Keyboard;
		this.speed     = 8;
		this.maxSpeed  = this.speed;

		this.args.fps  = 0;
		this.args.sps  = 0;

		this.args.camX = 0;
		this.args.camY = 0;

		this.frameLock      = 60;
		this.simulationLock = 60;

		this.keyboard.keys.bindTo('Home', (v,k,t,d)=>{
			if(v > 0)
			{
				this.frameLock++;
			}
		});

		this.keyboard.keys.bindTo('End', (v,k,t,d)=>{
			if(v > 0)
			{
				this.frameLock--;

				if(this.frameLock < 0)
				{
					this.frameLock = 0;
				}
			}
		});

		this.keyboard.keys.bindTo('PageUp', (v,k,t,d)=>{
			if(v > 0)
			{
				this.simulationLock++;
			}
		});

		this.keyboard.keys.bindTo('PageDown', (v,k,t,d)=>{
			if(v > 0)
			{
				this.simulationLock--;

				if(this.simulationLock < 0)
				{
					this.simulationLock = 0;
				}
			}
		});
	}

	postRender()
	{
		this.spriteBoard = new SpriteBoard(this.tags.canvas.element);

		window.addEventListener('resize', () => {
			this.resize();
		});

		let fThen = 0;
		let sThen = 0;

		let fSamples = [];
		let sSamples = [];

		let maxSamples = 2;

		const simulate = (now) => {
			// return;

			now = now / 1000;

			const delta = now - sThen;

			if(delta < 1/this.simulationLock)
			{
				return;
			}

			this.keyboard.update();

			this.spriteBoard.simulate();

			sThen = now;

			this.args._sps = (1 / delta);

			sSamples.push(this.args._sps);

			while(sSamples.length > maxSamples)
			{
				sSamples.shift();
			}
		};

		const update = (now) =>{
			now = now / 1000;

			simulate(now);

			const delta = now - fThen;

			if(delta < 1/this.frameLock)
			{
				window.requestAnimationFrame(update);
				return;
			}

			this.spriteBoard.draw();

			window.requestAnimationFrame(update);

			fThen = now;

			this.args._fps = (1 / delta);

			fSamples.push(this.args._fps);

			while(fSamples.length > maxSamples)
			{
				fSamples.shift();
			}

			this.args.camX = this.spriteBoard.camera.x;
			this.args.camY = this.spriteBoard.camera.y;
		};

		this.resize();

		//

		setInterval(()=>{
			simulate(performance.now());
		}, 0);

		setInterval(()=>{
			const fps = fSamples.reduce((a,b)=>a+b, 0) / fSamples.length;
			this.args.fps = fps.toFixed(3).padStart(5, ' ');
		}, 227/4);

		setInterval(()=>{
			document.title = `${Config.title} ${this.args.fps} FPS`;
		}, 227);

		setInterval(()=>{
			const sps = sSamples.reduce((a,b)=>a+b, 0) / sSamples.length;
			this.args.sps = sps.toFixed(3).padStart(5, ' ');
		}, 231/2);

		window.requestAnimationFrame(update);
	}

	resize()
	{
		this.args.width  = this.tags.canvas.element.width  = document.body.clientWidth;
		this.args.height = this.tags.canvas.element.height = document.body.clientHeight;

		this.spriteBoard.resize();
	}
}
