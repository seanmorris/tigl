import { Bag } from "curvature/base/Bag";

import { Camera } from '../sprite/Camera';

import { Controller } from '../model/Controller';
import { Sprite } from '../sprite/Sprite';

import { Quadtree } from '../math/Quadtree';
import { SpriteSheet } from '../sprite/SpriteSheet';

import { Player } from '../model/Player';
import { Pushable } from '../model/Pushable';
import { Spawner } from "../model/Spawner";
import { SpriteBoard } from "../sprite/SpriteBoard";
import { World } from "../world/World";

export class Session
{
	constructor({element, world, keyboard, onScreenJoyPad})
	{
		this.world = new World({src: world, session: this});
		this.spriteBoard = new SpriteBoard({element, world: this.world, session: this});

		this.fThen = 0;
		this.sThen = 0;

		this.frameLock = 60;
		this.simulationLock = 60;

		this.entities  = new Bag;
		// this.quadTree = new Quadtree(0, 0, 10000, 10000);

		this.keyboard = keyboard;

		const player = this.player = new Player({
			x: 128,
			y: 64,
			session: this,
			sprite: new Sprite({
				session: this,
				spriteSheet: new SpriteSheet({source: './player.tsj'}),
				width: 32,
				height: 48,
			}),
			controller: new Controller({keyboard, onScreenJoyPad}),
			camera: Camera,
		});

		this.spriteBoard.following = player;
		this.addEntity(player);
	}

	addEntity(entity)
	{
		this.entities.add(entity);
		this.spriteBoard.sprites.add(entity.sprite);
		const maps = this.world.getMapsForPoint(entity.x, entity.y);
		maps.forEach(map => map.quadTree.add(entity));
	}


	removeEntity(entity)
	{
		this.entities.delete(entity);
		this.spriteBoard.sprites.delete(entity.sprite);
		const maps = this.world.getMapsForPoint(entity.x, entity.y);
		maps.forEach(map => map.quadTree.delete(entity));
	}

	simulate(now)
	{
		const delta = now - this.sThen;

		if(this.simulationLock == 0)
		{
			return false;
		}

		if(0.2 + delta < (1000 / this.simulationLock))
		{
			return false;
		}

		this.sThen = now;

		this.keyboard.update();

		const player = this.player;

		Object.values(this.entities.items()).forEach(entity => {
			entity.simulate(delta);
			const maps = this.world.getMapsForPoint(entity.x, entity.y);
			maps.forEach(map => map.quadTree.move(entity));
			entity.sprite.visible = false;
		});

		const maps = this.world.getMapsForPoint(player.x, player.y);

		for(const map of maps)
		{
			const nearBy = map.quadTree.select(player.x - 50, player.y - 50, player.x + 50, player.y + 50);
			nearBy.forEach(e => e.sprite.visible = true);
		}

		return true;
	}

	draw(now)
	{
		const delta = now - this.fThen;

		if(this.frameLock == 0)
		{
			return false;
		}

		if(0.2 + delta < (1000 / this.frameLock))
		{
			return false;
		}

		this.spriteBoard.draw(delta);
		this.fThen = now;

		return true;
	}
}
