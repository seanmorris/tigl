import { View as BaseView } from 'curvature/base/View';
import { Camera } from '../sprite/Camera';

import { OnScreenJoyPad } from '../ui/OnScreenJoyPad';
import { Keyboard } from 'curvature/input/Keyboard'

import { Session } from '../session/Session';
import { Config } from 'Config';

import { PlayerController } from '../model/PlayerController';
import { BallController } from "../model/BallController";
import { BarrelController } from "../model/BarrelController";
import { BoxController } from "../model/BoxController";

import { MapMover } from "../model/MapMover";


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

		this.keyboard.keys.bindTo('0', (v,k,t,d)=>{
			if(v > 0)
			{
				this.session.spriteBoard.renderMode = 0;
			}
		});

		this.keyboard.keys.bindTo('1', (v,k,t,d)=>{
			if(v > 0)
			{
				this.session.spriteBoard.renderMode = 1;
			}
		});

		this.keyboard.keys.bindTo('2', (v,k,t,d)=>{
			if(v > 0)
			{
				this.session.spriteBoard.renderMode = 2;
			}
		});

		this.keyboard.keys.bindTo('3', (v,k,t,d)=>{
			if(v > 0)
			{
				this.session.spriteBoard.renderMode = 3;
			}
		});

		this.keyboard.keys.bindTo('4', (v,k,t,d)=>{
			if(v > 0)
			{
				this.session.spriteBoard.renderMode = 4;
			}
		});

		this.keyboard.keys.bindTo('5', (v,k,t,d)=>{
			if(v > 0)
			{
				this.session.spriteBoard.renderMode = 5;
			}
		});

		this.keyboard.keys.bindTo('6', (v,k,t,d)=>{
			if(v > 0)
			{
				this.session.spriteBoard.renderMode = 6;
			}
		});

		this.keyboard.keys.bindTo('7', (v,k,t,d)=>{
			if(v > 0)
			{
				this.session.spriteBoard.renderMode = 7;
			}
		});

		this.keyboard.keys.bindTo('8', (v,k,t,d)=>{
			if(v > 0)
			{
				this.session.spriteBoard.renderMode = 8;
			}
		});

		this.keyboard.keys.bindTo('9', (v,k,t,d)=>{
			if(v > 0)
			{
				this.session.spriteBoard.renderMode = 9;
			}
		});

	}

	onRendered()
	{
		const gameDef = {
			worldSrc: '/tile-world.compiled.world'
			, mapPallet: {
				'@moving-map': MapMover
			}
			, entityPallet: {
				'@basic-platformer': PlayerController
				, '@barrel': BarrelController
				, '@ball': BallController
				, '@box': BoxController
			}
		};

		this.session = new Session({
			onScreenJoyPad: this.args.joypad
			, keyboard: this.keyboard
			// , worldSrc: '/tile-world.world'
			, element: this.tags.canvas.element
			, ...gameDef
		});

		this.args.frameLock = this.session.frameLock;
		this.args.simulationLock = this.session.simulationLock;

		window.addEventListener('resize', () => this.resize());

		let fThen = 0;
		let sThen = 0;

		const simulate = now => {

			setTimeout(() => simulate(performance.now()), 0);

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

			window.requestAnimationFrame(draw);

			if(document.hidden)
			{
				return;
			}

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
				this.args.posX = Number(this.session.spriteBoard.following.x).toFixed(3);
				this.args.posY = Number(this.session.spriteBoard.following.y).toFixed(3);
			}
		};

		this.session.spriteBoard.zoomLevel = document.body.clientHeight / 1280 * 1.5;
		this.resize();

		simulate(performance.now())
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
		this.zoom(-Math.sign(event.deltaY));
	}

	zoom(delta)
	{
		if(!this.session)
		{
			return;
		}

		this.session.spriteBoard.zoom(delta);
	}
}
