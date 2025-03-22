import { View as BaseView } from 'curvature/base/View';
import { Camera } from '../sprite/Camera';

import { OnScreenJoyPad } from '../ui/OnScreenJoyPad';
import { Keyboard } from 'curvature/input/Keyboard'

import { Session } from '../session/Session';
import { Config } from 'Config';

const Application = {};

Application.onScreenJoyPad = new OnScreenJoyPad;
Application.keyboard = Keyboard.get();

export class View extends BaseView
{
	constructor(args)
	{
		window.smProfiling = true;
		super(args);
		this.template  = require('./view.tmp');
		this.routes    = [];

		this.keyboard  = Application.keyboard;
		this.speed     = 24;
		this.maxSpeed  = this.speed;

		this.args.joypad = Application.onScreenJoyPad;

		this.args.fps  = 0;
		this.args.sps  = 0;

		this.args.camX = 0;
		this.args.camY = 0;

		this.args.showEditor = false;

		this.keyboard.listening = true;

		this.keyboard.keys.bindTo('Home', (v,k,t,d)=>{
			if(!this.session || v < 0) return;

			if(v % 5 === 0)
			{
				this.session.frameLock++;

				this.args.frameLock = this.session.frameLock;
			}
		});

		this.keyboard.keys.bindTo('End', (v,k,t,d)=>{
			if(!this.session || v < 0) return;

			if(v % 5 === 0)
			{
				this.session.frameLock--;

				if(this.session.frameLock < 0)
				{
					this.session.frameLock = 0;
				}

				this.args.frameLock = this.session.frameLock;
			}
		});

		this.keyboard.keys.bindTo('PageUp', (v,k,t,d)=>{
			if(!this.session || v < 0) return;

			if(v % 5 === 0)
			{
				this.session.simulationLock++;
			}

			this.args.simulationLock = this.session.simulationLock;
		});

		this.keyboard.keys.bindTo('PageDown', (v,k,t,d)=>{
			if(!this.session || v < 0) return;

			if(v % 5 === 0)
			{
				this.session.simulationLock--;

				if(this.session.simulationLock < 0)
				{
					this.session.simulationLock = 0;
				}
			}

			this.args.simulationLock = this.session.simulationLock;
		});

		this.keyboard.keys.bindTo('=', (v,k,t,d)=>{
			if(v > 0)
			{
				this.zoom(1);
			}
		});

		this.keyboard.keys.bindTo('+', (v,k,t,d)=>{
			if(v > 0)
			{
				this.zoom(1);
			}
		});

		this.keyboard.keys.bindTo('-', (v,k,t,d)=>{
			if(v > 0)
			{
				this.zoom(-1);
			}
		});

	}

	onRendered()
	{
		this.session = new Session({
			onScreenJoyPad: this.args.joypad
			, keyboard: this.keyboard
			, element: this.tags.canvas.element
			, world: '/world.json'
		});

		this.args.frameLock = this.session.frameLock;
		this.args.simulationLock = this.session.simulationLock;

		window.addEventListener('resize', () => this.resize());

		let fThen = 0;
		let sThen = 0;

		const simulate = now => {
			if(document.hidden)
			{
				return;
			}

			if(!this.session.simulate(now))
			{
				return;
			}

			this.args.sps = (1000 / (now - sThen)).toFixed(3);
			sThen = now;
		};

		const draw = now => {
			if(document.hidden)
			{
				window.requestAnimationFrame(draw);
				return;
			}

			window.requestAnimationFrame(draw);

			if(!this.session.draw(now))
			{
				return;
			}

			this.args.fps = (1000 / (now - fThen)).toFixed(3);
			this.args.camX = Number(Camera.x).toFixed(3);
			this.args.camY = Number(Camera.y).toFixed(3);

			fThen = now;

			if(this.session.spriteBoard.following)
			{
				this.args.posX = Number(this.session.spriteBoard.following.sprite.x).toFixed(3);
				this.args.posY = Number(this.session.spriteBoard.following.sprite.y).toFixed(3);
			}
		};

		this.session.spriteBoard.zoomLevel = document.body.clientHeight / 1280 * 4;
		this.resize();

		setInterval(() => simulate(performance.now()), 0);
		draw(performance.now());
	}

	resize(x, y)
	{
		const oldScale = this.session.spriteBoard.screenScale;

		this.session.spriteBoard.screenScale = document.body.clientHeight / 1280;
		this.session.spriteBoard.zoomLevel *= this.session.spriteBoard.screenScale / oldScale;

		this.args.width  = this.tags.canvas.element.width   = x || document.body.clientWidth;
		this.args.height = this.tags.canvas.element.height  = y || document.body.clientHeight;

		this.args.rwidth = Math.trunc(
			(x || document.body.clientWidth)  / this.session.spriteBoard.zoomLevel
		);

		this.args.rheight = Math.trunc(
			(y || document.body.clientHeight) / this.session.spriteBoard.zoomLevel
		);

		this.session.spriteBoard.resize();
	}

	scroll(event)
	{
		let delta = event.deltaY > 0 ? -1 : (
			event.deltaY < 0 ? 1 : 0
		);

		this.zoom(delta);
	}

	zoom(delta)
	{
		if(!this.session)
		{
			return;
		}

		this.session.spriteBoard.zoom(delta);
		// this.resize();
	}
}
