import { View as BaseView } from 'curvature/base/View';
import { Keyboard } from 'curvature/input/Keyboard'
import { Bag } from 'curvature/base/Bag';

import { Config } from 'Config';

import { TileMap } from '../world/TileMap';

import { SpriteBoard } from '../sprite/SpriteBoard';

import { Controller as OnScreenJoyPad } from '../ui/Controller';

import { Camera } from '../sprite/Camera';

import { Controller } from '../model/Controller';
import { Sprite } from '../sprite/Sprite';
import { World } from '../world/World';
import { Quadtree } from '../math/Quadtree';
import { Rectangle } from '../math/Rectangle';
import { SMTree } from '../math/SMTree';
import { Player } from '../model/Player';
import { SpriteSheet } from '../sprite/SpriteSheet';

const Application = {};

Application.onScreenJoyPad = new OnScreenJoyPad;
Application.keyboard = Keyboard.get();


const quad = new Quadtree(0, 0, 100, 100, 0.25);
quad.insert({x: 10, y: 10});
quad.insert({x: 20, y: 20});
quad.insert({x: 20, y: 25});
quad.insert({x: 25, y: 25});

// console.log(quad);
// console.log(quad.findLeaf(75, 75));
// console.log(quad.select(0 , 0, 20, 20));

const mapTree = new SMTree;

// const rect1 = new Rectangle( 0, 0, 50,  20);
// const rect2 = new Rectangle(25, 0, 75,  10);
// const rect3 = new Rectangle(50, 0, 75,  10);
// const rect4 = new Rectangle(50, 0, 100, 100);
// const rect5 = new Rectangle(140, 0, 160, 0);
// console.log({rect1, rect2, rect3, rect4});
// mapTree.add(rect1);
// mapTree.add(rect2);
// mapTree.add(rect3);
// mapTree.add(rect4);
// mapTree.add(rect5);


// console.log(mapTree.segments);
// console.log(mapTree.query(0, 0, 100, 100));

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

		this.args.frameLock = 60;
		this.args.simulationLock = 60;

		this.args.showEditor = false;

		this.keyboard.listening = true;

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

		this.world = new World({src: './world.json'});
		this.map = new TileMap({src: './map.json'});
	}

	onRendered()
	{
		const spriteBoard = new SpriteBoard({
			element: this.tags.canvas.element
			, world: this.world
			, map: this.map
		});

		this.spriteBoard = spriteBoard;

		const player = new Player({
			sprite: new Sprite({
				x: 0,//48,
				y: 0,//64,
				// src: undefined,
				spriteSet: new SpriteSheet({source: './player.tsj'}),
				spriteBoard: spriteBoard,
				width: 32,
				height: 48,
			}),
			controller: new Controller({
				keyboard: this.keyboard,
				onScreenJoyPad: this.args.controller,
			}),
			camera: Camera,
		});

		this.entities.add(player);
		this.spriteBoard.sprites.add(player.sprite);
		this.spriteBoard.following = player;

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

		const draw = now => {

			if(document.hidden)
			{
				window.requestAnimationFrame(draw);
				return;
			}

			const delta = now - fThen;
			fThen = now;

			simulate(performance.now());
			window.requestAnimationFrame(draw);
			this.spriteBoard.draw(delta);

			this.args.fps = (1000 / delta).toFixed(3);

			this.args.camX = Number(Camera.x).toFixed(3);
			this.args.camY = Number(Camera.y).toFixed(3);

			if(this.spriteBoard.following)
			{
				this.args.posX = Number(this.spriteBoard.following.sprite.x).toFixed(3);
				this.args.posY = Number(this.spriteBoard.following.sprite.y).toFixed(3);
			}

		};

		this.spriteBoard.gl2d.zoomLevel = document.body.clientHeight / 1024 * 4;
		this.resize();

		draw(performance.now());

		// setInterval(()=>{
		// }, 0);

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

		this.args.rwidth = Math.trunc(
			(x || document.body.clientWidth)  / this.spriteBoard.gl2d.zoomLevel
		);

		this.args.rheight = Math.trunc(
			(y || document.body.clientHeight) / this.spriteBoard.gl2d.zoomLevel
		);

		const oldScale = this.spriteBoard.gl2d.screenScale;
		this.spriteBoard.gl2d.screenScale = document.body.clientHeight / 1024;

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
		const max = this.spriteBoard.gl2d.screenScale * 32;
		const min = this.spriteBoard.gl2d.screenScale * 0.2;
		const step = 0.05 * this.spriteBoard.gl2d.zoomLevel;

		let zoomLevel = (delta * step + this.spriteBoard.gl2d.zoomLevel).toFixed(2);

		if(zoomLevel < min)
		{
			zoomLevel = min;
		}
		else if(zoomLevel > max)
		{
			zoomLevel = max;
		}

		if(Math.abs(zoomLevel - 1) < 0.05)
		{
			zoomLevel = 1;
		}

		if(this.spriteBoard.gl2d.zoomLevel !== zoomLevel)
		{
			this.spriteBoard.gl2d.zoomLevel = zoomLevel;
			this.resize();
		}
	}
}
