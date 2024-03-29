import { Config }           from 'Config';

import { Bag              } from 'curvature/base/Bag';
import { View as BaseView } from 'curvature/base/View';

import { Map as WorldMap } from '../world/Map';

import { SpriteSheet } from '../sprite/SpriteSheet';
import { SpriteBoard } from '../sprite/SpriteBoard';

import { Controller as OnScreenJoyPad } from '../ui/Controller';
import { MapEditor   } from '../ui/MapEditor';

import { Keyboard }    from 'curvature/input/Keyboard'

import { Entity }     from '../model/Entity';
import { Injectable } from '../inject/Injectable';

export class View extends BaseView
{
	constructor(args)
	{
		super(args);
		this.template  = require('./view.tmp');
		this.routes    = [];

		this.entities  = new Bag;
		this.keyboard  = Keyboard.get();
		this.speed     = 8;
		this.maxSpeed  = this.speed;

		let injection = new (Injectable.inject({
			OnScreenJoyPad
		}));

		this.args.controller = injection.OnScreenJoyPad;

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
		this.spriteBoard = new SpriteBoard(
			this.tags.canvas.element
			, this.map
		);

		const entity = new Entity;

		this.entities.add(entity);

		this.spriteBoard.sprites.add(entity.sprite);

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

		// this.args.controller.args.bindTo((v,k,t,d,p)=>{
		// 	if(v === 0)
		// 	{
		// 		// sprite.moving = false;
		// 		// sprite.speed  = 0;
		// 		return;
		// 	}

		// 	if(k !== 'x' && k !== 'y')
		// 	{
		// 		return;
		// 	}

		// 	let horizontal = false;
		// 	let magnitude  = t['y'];

		// 	if(Math.abs(t['x']) > Math.abs(t['y']))
		// 	{
		// 		horizontal = true;
		// 		magnitude  = t['x'];
		// 	}

		// 	if(horizontal && magnitude > 0)
		// 	{
		// 		// sprite.setFrames(sprite.walking.east);
		// 		// sprite.direction = sprite.RIGHT;
		// 	}
		// 	else if(horizontal && magnitude < 0)
		// 	{
		// 		// sprite.setFrames(sprite.walking.west);
		// 		// sprite.direction = sprite.LEFT;
		// 	}
		// 	else if(magnitude > 0){
		// 		// sprite.setFrames(sprite.walking.south);
		// 		// sprite.direction = sprite.DOWN;
		// 	}
		// 	else if(magnitude < 0){
		// 		// sprite.setFrames(sprite.walking.north);
		// 		// sprite.direction = sprite.UP;
		// 	}

		// 	magnitude = Math.round(magnitude / 6.125);

		// 	// sprite.speed = magnitude < 8 ? magnitude : 8;

		// 	if(magnitude < -8)
		// 	{
		// 		sprite.speed = -8;
		// 	}

		// 	// sprite.moving = !!magnitude;
		// });

		window.addEventListener('resize', () => {
			this.resize();
			update();
		});

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
			now = now / 1000;
			
			const delta = now - fThen;

			if(delta < 1/(this.args.frameLock+(10 * (this.args.frameLock/60))))
			{
				window.requestAnimationFrame(update);
				return;
			}

			fThen = now;

			if(this.args.frameLock == 0)
			{
				window.requestAnimationFrame(update);
				fSamples = [0];
				return;
			}


			this.spriteBoard.draw();

			window.requestAnimationFrame(update);

			fSamples.push(this.args._fps);

			while(fSamples.length > maxSamples)
			{
				fSamples.shift();
			}

			this.args._fps = (1 / delta);

			this.args.camX = this.spriteBoard.Camera.x;
			this.args.camY = this.spriteBoard.Camera.y;
		};

		this.resize();

		setInterval(()=>{
			simulate(performance.now());
		}, 0);

		setInterval(()=>{
			const fps = fSamples.reduce((a,b)=>a+b, 0) / fSamples.length;
			this.args.fps = fps.toFixed(3).padStart(5, ' ');
		}, 227);

		setInterval(()=>{
			document.title = `${Config.title} ${this.args.fps} FPS`;
		}, 227/3);

		setInterval(()=>{
			const sps = sSamples.reduce((a,b)=>a+b, 0) / sSamples.length;
			this.args.sps = sps.toFixed(3).padStart(5, ' ');
		}, 231/2);

		window.requestAnimationFrame(update);
	}

	resize(x, y)
	{
		this.args.width  = this.tags.canvas.element.width   = x || document.body.clientWidth;
		this.args.height = this.tags.canvas.element.height  = y || document.body.clientHeight;

		this.args.rwidth  = Math.floor(
			(x || document.body.clientWidth)  / this.spriteBoard.zoomLevel
		);

		this.args.rheight = Math.floor(
			(y || document.body.clientHeight) / this.spriteBoard.zoomLevel
		);

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
		let min   = 0.35;
		let step  = 0.05;		

		if(delta > 0 || delta < 0 && this.spriteBoard.zoomLevel > min)
		{
			this.spriteBoard.zoomLevel += (delta * step);
			this.resize();
		}
		else
		{
			this.spriteBoard.zoomLevel = min;
			this.resize();
		}
	}
}
