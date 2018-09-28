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

		this.routes = [];

		this.keyboard = new Keyboard;

		this.speed = 16;

		this.args.fps = 0;
		this.args.sps = 0;
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
			now = now / 1000;

			const delta = now - sThen;

			sThen = now;

			this.args.sps = (1 / delta).toFixed(2);

			this.keyboard.update();

			if(this.keyboard.getKey('ArrowUp') > 0)
			{
				this.gl2d.sprite.y -= this.speed;
			}

			if(this.keyboard.getKey('ArrowDown') > 0)
			{
				this.gl2d.sprite.y += this.speed;
			}

			if(this.keyboard.getKey('ArrowLeft') > 0)
			{
				this.gl2d.sprite.x -= this.speed;
			}

			if(this.keyboard.getKey('ArrowRight') > 0)
			{
				this.gl2d.sprite.x += this.speed;
			}
		};

		const update = (now) =>{
			now = now / 1000;

			const delta = now - fThen;

			fThen = now;

			this.args.fps = (1 / delta).toFixed(2);

			this.gl2d.update();

			window.requestAnimationFrame(update);
		};

		this.resize();

		window.requestAnimationFrame(update);

		setInterval(()=>{
			simulate((new Date()).getTime());
		}, 16);

		// setInterval(()=>{
		// 	update((new Date()).getTime());
		// }, 500);
	}

	resize()
	{
		this.tags.canvas.element.width  = document.body.clientWidth;
		this.tags.canvas.element.height = document.body.clientHeight;

		this.gl2d.resize();
	}
}
