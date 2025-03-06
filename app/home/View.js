import { View as BaseView } from 'curvature/base/View';
import { Keyboard } from 'curvature/input/Keyboard'
import { Bag } from 'curvature/base/Bag';

import { Config } from 'Config';

import { Map as WorldMap } from '../world/Map';

import { SpriteSheet } from '../sprite/SpriteSheet';
import { SpriteBoard } from '../sprite/SpriteBoard';

import { Controller as OnScreenJoyPad } from '../ui/Controller';
import { MapEditor   } from '../ui/MapEditor';

import { Entity } from '../model/Entity';
import { Camera } from '../sprite/Camera';

import { Controller } from '../model/Controller';
import { Sprite } from '../sprite/Sprite';

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

		this.entities  = new Bag;
		this.keyboard  = Application.keyboard;
		this.speed     = 24;
		this.maxSpeed  = this.speed;

		this.args.controller = Application.onScreenJoyPad;

		this.args.fps  = 0;
		this.args.sps  = 0;

		this.args.camX = 0;
		this.args.camY = 0;

		this.args.frameLock      = 60;
		this.args.simulationLock = 60;

		this.args.showEditor = false;

		this.keyboard.listening = true;

		this.keyboard.keys.bindTo('e', (v,k,t,d)=>{
			if(v > 0)
			{
				this.map.export();
			}
		});

		this.keyboard.keys.bindTo('Escape', (v,k,t,d)=>{
			if(v === -1)
			{
				this.spriteBoard.unselect();
			}
		});

		this.keyboard.keys.bindTo('Home', (v,k,t,d)=>{
			if(v > 0)
			{
				this.args.frameLock++;
			}
		});

		this.keyboard.keys.bindTo('End', (v,k,t,d)=>{
			if(v > 0)
			{
				this.args.frameLock--;

				if(this.args.frameLock < 0)
				{
					this.args.frameLock = 0;
				}
			}
		});

		this.keyboard.keys.bindTo('PageUp', (v,k,t,d)=>{
			if(v > 0)
			{
				this.args.simulationLock++;
			}
		});

		this.keyboard.keys.bindTo('PageDown', (v,k,t,d)=>{
			if(v > 0)
			{
				this.args.simulationLock--;

				if(this.args.simulationLock < 0)
				{
					this.args.simulationLock = 0;
				}
			}
		});

		this.spriteSheet = new SpriteSheet;
		this.map         = new WorldMap;

		this.map.import();

		this.args.mapEditor  = new MapEditor({
			spriteSheet: this.spriteSheet
			, map:       this.map
		});
	}

	onRendered()
	{
		const spriteBoard = new SpriteBoard(
			this.tags.canvas.element
			, this.map
		);

		this.spriteBoard = spriteBoard;

		const entity = new Entity({
			sprite: new Sprite({
				src: undefined,
				spriteBoard: spriteBoard,
				spriteSheet: this.spriteSheet,
			}),
			controller: new Controller({
				keyboard: this.keyboard,
				onScreenJoyPad: this.args.controller,
			}),
			camera: Camera,
		});
		this.entities.add(entity);
		this.spriteBoard.sprites.add(entity.sprite);

		this.spriteBoard.following = entity;

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

		this.args.mapEditor.args.bindTo('selectedGraphic', (v)=>{
			if(!v || this.spriteBoard.selected.globalX == null)
			{
				return;
			}

			this.args.showEditor = false;

			let i  = this.spriteBoard.selected.startGlobalX;
			let ii = this.spriteBoard.selected.globalX;

			if(ii < i)
			{
				[ii, i] = [i, ii];
			}

			for(; i<= ii; i++)
			{
				let j  = this.spriteBoard.selected.startGlobalY;
				let jj = this.spriteBoard.selected.globalY;
				if(jj < j)
				{
					[jj, j] = [j, jj];
				}
				for(; j <= jj; j++)
				{
					this.map.setTile(i, j, v);
				}
			}

			this.map.setTile(
				this.spriteBoard.selected.globalX
				, this.spriteBoard.selected.globalY
				, v
			);

			this.spriteBoard.resize();
			this.spriteBoard.unselect();
		});

		this.spriteBoard.selected.bindTo((v,k,t,d,p)=>{
			if(this.spriteBoard.selected.localX == null)
			{
				this.args.showEditor = false;
				return
			}

			this.args.mapEditor.select(this.spriteBoard.selected);

			this.args.showEditor = true;

			this.spriteBoard.resize();
		},{wait:0});

		this.args.showEditor = true;

		window.addEventListener('resize', () => this.resize());

		let fThen = 0;
		let sThen = 0;

		let fSamples = [];
		let sSamples = [];

		let maxSamples = 5;

		const simulate = (now) => {
			now = now / 1000;

			const delta = now - sThen;

			if(this.args.simulationLock == 0)
			{
				sSamples = [0];
				return;
			}

			if(delta < 1/(this.args.simulationLock+(10 * (this.args.simulationLock/60))))
			{
				return;
			}

			sThen = now;

			this.keyboard.update();

			Object.values(this.entities.items()).map((e)=>{
				e.simulate();
			});

			// this.spriteBoard.simulate();

			// this.args.localX  = this.spriteBoard.selected.localX;
			// this.args.localY  = this.spriteBoard.selected.localY;
			// this.args.globalX = this.spriteBoard.selected.globalX;
			// this.args.globalY = this.spriteBoard.selected.globalY;

			this.args._sps = (1 / delta);

			sSamples.push(this.args._sps);

			while(sSamples.length > maxSamples)
			{
				sSamples.shift();
			}

			// this.spriteBoard.moveCamera(sprite.x, sprite.y);
		};

		const update = (now) =>{
			window.requestAnimationFrame(update);
			this.spriteBoard.draw();

			const delta = now - fThen;
			fThen = now;
			
			this.args.fps = (1000 / delta).toFixed(3);

			this.args.camX = Number(Camera.x).toFixed(3);
			this.args.camY = Number(Camera.y).toFixed(3);
		};

		this.spriteBoard.gl2d.zoomLevel = document.body.clientWidth / 1024 * 2;
		this.resize();

		update(performance.now());

		setInterval(()=>{
			simulate(performance.now());
		}, 0);

		setInterval(()=>{
			document.title = `${Config.title} ${this.args.fps} FPS`;
		}, 227/3);

		setInterval(()=>{
			const sps = sSamples.reduce((a,b)=>a+b, 0) / sSamples.length;
			this.args.sps = sps.toFixed(3).padStart(5, ' ');
		}, 231/2);
	}

	resize(x, y)
	{
		this.args.width  = this.tags.canvas.element.width   = x || document.body.clientWidth;
		this.args.height = this.tags.canvas.element.height  = y || document.body.clientHeight;

		this.args.rwidth  = Math.trunc(
			(x || document.body.clientWidth)  / this.spriteBoard.gl2d.zoomLevel
		);

		this.args.rheight = Math.trunc(
			(y || document.body.clientHeight) / this.spriteBoard.gl2d.zoomLevel
		);

		const oldScale = this.spriteBoard.gl2d.screenScale;
		this.spriteBoard.gl2d.screenScale = document.body.clientWidth / 1024;

		this.spriteBoard.gl2d.zoomLevel *= this.spriteBoard.gl2d.screenScale / oldScale;

		this.spriteBoard.resize();
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
		const max   = this.spriteBoard.gl2d.screenScale * 32;
		const min   = this.spriteBoard.gl2d.screenScale * 0.6667;

		const step  = 0.05 * this.spriteBoard.gl2d.zoomLevel;

		let zoomLevel = this.spriteBoard.gl2d.zoomLevel + (delta * step);

		if(zoomLevel < min)
		{
			zoomLevel = min;
		}
		else if(zoomLevel > max)
		{
			zoomLevel = max;
		}

		if(this.spriteBoard.gl2d.zoomLevel !== zoomLevel)
		{
			this.spriteBoard.gl2d.zoomLevel = zoomLevel;
			this.resize();
		}
	}
}
