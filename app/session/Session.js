import { QuickTree } from "../math/QuickTree";

import { SpriteBoard } from "../sprite/SpriteBoard";
import { SpriteSheet } from '../sprite/SpriteSheet';
import { Sprite } from '../sprite/Sprite';
import { Entity } from '../model/Entity';
import { Camera } from '../sprite/Camera';
import { World } from "../world/World";

import { Controller } from '../input/Controller';
import { EntityPallet } from "../world/EntityPallet";

import { PlayerController } from '../model/PlayerController';
import { BallController } from "../model/BalllController";
import { BarrelController } from "../model/BarrelController";

EntityPallet.register('@basic-platformer', PlayerController);
EntityPallet.register('@barrel', BarrelController);
EntityPallet.register('@ball', BallController);

export class Session
{
	constructor({element, world, keyboard, onScreenJoyPad})
	{

		this.fThen = 0;
		this.sThen = 0;

		this.frameLock = 60;
		this.simulationLock = 60;

		this.entities  = new Set;
		this.removed = new WeakSet;

		this.paused = false;

		this.loaded = false;

		this.world = new World({source: new URL(world, location).href, session: this});
		this.spriteBoard = new SpriteBoard({element, world: this.world, session: this});

		this.keyboard = keyboard;

		this.world.ready.then(() => this.initialize({keyboard, onScreenJoyPad}));

		this.controller = new Controller({deadZone: 0.2});
		this.controller.zero();

		this.gamepad = null;
		window.addEventListener('gamepadconnected', event => {
			console.log(event);
			this.gamepad = event.gamepad;

		});

		window.addEventListener('gamepaddisconnected', event => {
			if(!this.gamepad)
			{
				return;
			}

			this.gamepad = null;
		});
	}

	async initialize()
	{
		this.loaded = true;

		for(const map of this.world.maps)
		{
			if(!map.properties['player-start'])
			{
				continue;
			}

			const startId = map.properties['player-start'];
			const startDef = map.entityDefs[startId];
			const playerClass = await EntityPallet.resolve(startDef.type);

			const player = this.player = new Entity({
				controller: new playerClass,
				session: this,
				x: startDef.x,
				y: startDef.y,
				inputManager: this.controller,
				sprite: new Sprite({
					session: this,
					spriteSheet: new SpriteSheet({source: '/player.tsj'}),
					width: 32,
					height: 48,
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
		this.spriteBoard.sprites.add(entity.sprite);
		const maps = this.world.getMapsForPoint(entity.x, entity.y);
		maps.forEach(map => map.quadTree.add(entity));
	}

	removeEntity(entity)
	{
		this.entities.delete(entity);
		this.spriteBoard.sprites.delete(entity.sprite);
		QuickTree.deleteFromAllTrees(entity)
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
		this.controller.readInput({gamepads: navigator.getGamepads(), keyboard: this.keyboard});

		if(this.controller.buttons[1020] && this.controller.buttons[1020].time === 1)
		{
			this.paused = !this.paused;
		}

		if(this.paused || !this.player)
		{
			return false;
		}

		this.entities.forEach(entity => entity.sprite.visible = false);

		const player = this.player;
		const nearBy = this.world.getEntitiesForRect(
			player.x
			, player.y
			, (Camera.width * 1.0) + 64
			, (Camera.height * 1.0) + 64
		);

		nearBy.delete(player);
		nearBy.add(player);

		nearBy.forEach(entity => {
			entity.simulate(delta);
			const maps = this.world.getMapsForRect(entity.x, entity.y, 100, 100);
			maps.forEach(map => this.removed.has(entity) || map.quadTree.move(entity));
			entity.sprite.visible = true;
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
