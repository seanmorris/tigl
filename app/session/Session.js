import { QuickTree } from "../math/QuickTree";

import { SpriteBoard } from "../sprite/SpriteBoard";
import { SpriteSheet } from '../sprite/SpriteSheet';
import { Sprite } from '../sprite/Sprite';
import { Entity } from '../model/Entity';
import { Camera } from '../sprite/Camera';
import { World } from "../world/World";

import { MotionGraph } from "../math/MotionGraph";
import { Controller } from '../input/Controller';
import { Pallet } from "../world/Pallet";

const input = new URLSearchParams(location.search);
const warpStart = input.has('start') ? input.get('start').split(',').map(Number) : false;

console.log(location.search, input, warpStart);

export class Session
{
	constructor({element, keyboard, onScreenJoyPad, worldSrc, mapPallet = {}, entityPallet = {}})
	{
		this.entityPallet = new Pallet;
		this.mapPallet = new Pallet;

		Object.entries(entityPallet).forEach(
			([keyword, spawnClass]) => this.entityPallet.register(keyword, spawnClass)
		);

		Object.entries(mapPallet).forEach(
			([keyword, mapClass]) => this.mapPallet.register(keyword, mapClass)
		);

		this.fThen = 0;
		this.sThen = 0;

		this.frameLock = 60;
		this.simulationLock = 60;

		this.entities  = new Set;
		this.removed = new WeakSet;
		this.awake = new Set;

		this.paused = false;
		this.loaded = false;
		this.overscan = 640;

		this.world = new World({src: worldSrc, session: this});
		this.spriteBoard = new SpriteBoard({element, world: this.world, session: this});

		this.keyboard = keyboard;

		this.onScreenJoyPad = onScreenJoyPad;

		this.world.ready.then(() => this.initialize({keyboard, onScreenJoyPad}));

		this.controller = new Controller({deadZone: 0.2});
		this.controller.zero();

		this.gamepad = null;
		window.addEventListener('gamepadconnected', event => {
			this.gamepad = event.gamepad;
		});

		window.addEventListener('gamepaddisconnected', event => {
			if(!this.gamepad) return;
			this.gamepad = null;
		});
	}

	async initialize()
	{
		this.loaded = true;

		if(warpStart)
		{
			const maps = this.world.getMapsForPoint(...warpStart);

			maps.forEach(map => map.initialize());
		}

		for(const map of this.world.maps)
		{
			if(!map.loaded)
			{
				continue;
			}

			if(!map.props.has('player-start'))
			{
				continue;
			}

			const startId = map.props.get('player-start');
			const startDef = map.entityDefs[startId];
			const playerClass = await this.entityPallet.resolve(startDef.type);

			const startX = warpStart[0] ?? startDef.x;
			const startY = warpStart[1] ?? startDef.y;

			const player = this.player = new Entity({
				controller: new playerClass,
				session: this,
				x: startX,
				y: startY,
				inputManager: this.controller,
				sprite: new Sprite({
					session: this,
					spriteSheet: new SpriteSheet({
						src: '/player.tsj'
					}),
				}),
				camera: Camera,
			});

			this.spriteBoard.following = player;
			this.addEntity(player);
		}
	}

	addEntity(entity)
	{
		if(this.entities.has(entity))
		{
			return;
		}

		this.entities.add(entity);
		const maps = this.world.getMapsForPoint(entity.x, entity.y);
		maps.forEach(map => map.addEntity(entity));
	}

	removeEntity(entity)
	{
		entity.destroy();
		this.entities.delete(entity);
		this.awake.delete(entity);
		this.spriteBoard.sprites.delete(entity.sprite);
		QuickTree.deleteFromAllTrees(entity);
		MotionGraph.deleteFromAllGraphs(entity);
		this.removed.add(entity);
	}

	simulate(now)
	{
		if(!this.loaded)
		{
			return false;
		}

		const delta = now - this.sThen;

		if(this.simulationLock == 0 || 0.2 + delta < (1000 / this.simulationLock))
		{
			return false;
		}

		this.sThen = now;

		this.keyboard.update();
		this.controller.update({gamepad: this.gamepad});

		this.controller.readInput({
			onScreenJoyPad: this.onScreenJoyPad
			, gamepads: navigator.getGamepads()
			, keyboard: this.keyboard
		});

		if(this.controller.buttons[1020] && this.controller.buttons[1020].time === 1)
		{
			this.paused = !this.paused;
		}

		if(this.paused || !this.player)
		{
			return false;
		}

		this.entities.forEach(entity => {
			if(entity.sprite) entity.sprite.visible = false;
		});

		const player = this.player;

		this.spriteBoard.sprites.clear();
		this.spriteBoard.regions.clear();

		this.world.simulate(delta);

		const visibleMaps = this.world.getMapsForRect(
			player.x
			, player.y
			, Camera.width
			, Camera.height
		);

		visibleMaps.forEach(map => {
			map.simulate(delta);
			const mapRegions = map.getRegionsForRect(
				player.x + -(Camera.width * 1.0) + 64
				, player.y + -(Camera.height * 1.0) + 64
				, player.x + (Camera.width * 1.0) + 64
				, player.y + (Camera.height * 1.0) + 64
			);

			mapRegions.forEach(region => {
				region.simulate(delta);
				this.spriteBoard.regions.add(region);
			});
		});

		const entities = this.world.getEntitiesForRect(
			player.x
			, player.y
			, (Camera.width  * 1 + this.overscan)
			, (Camera.height * 1 + this.overscan)
		);

		entities.delete(player);
		entities.add(player);

		const sleeping = this.awake.difference(entities);

		sleeping.forEach(entity => {
			if(entity.sprite) entity.sprite.visible = false;
			entity.sleep();
			this.awake.delete(entity);
		});

		entities.forEach(entity => {
			this.awake.add(entity);

			if(entity.sleeping)
			{
				entity.wakeup();
			}

			entity.simulate(delta);
			if(this.removed.has(entity)) return;

			const maps = this.world.getMapsForPoint(entity.x, entity.y);
			maps.forEach(map => map.moveEntity(entity));

			if(entity.sprite)
			{
				this.spriteBoard.sprites.add(entity.sprite);
				entity.sprite.visible = true;
			}
		});

		return true;
	}

	draw(now)
	{
		if(!this.loaded)
		{
			return;
		}

		const delta = now - this.fThen;

		if(this.frameLock == 0 || 0.2 + delta < (1000 / this.frameLock))
		{
			return false;
		}

		this.spriteBoard.draw(delta);
		this.fThen = now;

		return true;
	}
}
