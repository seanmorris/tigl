import { View as BaseView } from 'curvature/base/View';

import { Gl2d } from '../gl2d/Gl2d';
import { Sprite } from '../gl2d/Sprite';

import { Keyboard } from 'curvature/input/Keyboard'

export class View extends BaseView
{
	constructor(args)
	{
		super(args);
		this.template = require('./view.tmp');
		this.routes   = [];

		// this.keyboard = new Keyboard;
		this.speed    = 8;
		this.maxSpeed = this.speed;

		this.args.fps = 0;
		this.args.sps = 0;

		this.args.camX = 0;
		this.args.camY = 0;

		this.frameLock      = 60;
		this.simulationLock = 60;
	}

	postRender()
	{
		this.gl2d = new Gl2d(this.tags.canvas.element);

		window.addEventListener('resize', () => {
			this.resize();
		});

		let fThen = 0;
		let sThen = 0;

		const simulate = (now) => {
			const delta = now - sThen;

			if(delta < 1/this.simulationLock)
			{
				return;
			}

			sThen = now;

			this.args._sps = (1 / delta).toFixed(2).padStart(5, ' ');
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

			this.gl2d.update();

			window.requestAnimationFrame(update);

			fThen = now;

			this.args._fps = (1 / delta).toFixed(2).padStart(5, ' ');

			this.args.camX = this.gl2d.camera.x;
			this.args.camY = this.gl2d.camera.y;
		};

		this.resize();

		setInterval(()=>{
			this.args.fps = this.args._fps;
		}, 227);

		setInterval(()=>{
			this.args.sps = this.args._sps;
		}, 231/2);

		window.requestAnimationFrame(update);
	}

	resize()
	{
		this.args.width  = this.tags.canvas.element.width  = document.body.clientWidth;
		this.args.height = this.tags.canvas.element.height = document.body.clientHeight;

		this.gl2d.resize();
	}
}
