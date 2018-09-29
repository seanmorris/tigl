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

		this.keyboard = new Keyboard;
		this.speed    = 8;
		this.maxSpeed = this.speed;

		this.args.fps = 0;
		this.args.sps = 0;

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
			window.requestAnimationFrame(simulate);

			now = now / 1000;

			const delta = now - sThen;


			if(delta < 1/(this.simulationLock+1))
			{
				console.log(delta);
				return;
			}

			sThen = now;

			this.args._sps = (1 / delta).toFixed(2).padStart(6, ' ');

			this.keyboard.update();
		};

		const update = (now) =>{
			window.requestAnimationFrame(update);

			now = now / 1000;

			const delta = now - fThen;

			fThen = now;

			this.args._fps = (1 / delta).toFixed(2).padStart(6, ' ');

			this.gl2d.update();
		};

		this.resize();

		setInterval(()=>{
			this.args.fps = this.args._fps;
		}, 227);

		setInterval(()=>{
			this.args.sps = this.args._sps;
		}, 231);

		/**/
		window.requestAnimationFrame(simulate);
		/*/
		setInterval(()=>{
			simulate((new Date()).getTime());
		}, 16);
		/**/

		/**/
		window.requestAnimationFrame(update);
		/*/
		setInterval(()=>{
			update((new Date()).getTime());
		}, 15);
		/**/
	}

	resize()
	{
		this.args.width  = this.tags.canvas.element.width  = document.body.clientWidth;
		this.args.height = this.tags.canvas.element.height = document.body.clientHeight;

		this.gl2d.resize();
	}
}
