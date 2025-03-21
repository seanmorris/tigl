import { Camera } from '../sprite/Camera';

import { InputManager } from '../model/InputManager';
import { SpriteSheet } from '../sprite/SpriteSheet';
import { Sprite } from '../sprite/Sprite';

import { SpriteBoard } from "../sprite/SpriteBoard";
import { Player } from '../model/Player';
import { World } from "../world/World";
import { QuickTree } from "../math/QuickTree";

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

		this.entities  = new Set;
		this.removed = new WeakSet;

		this.keyboard = keyboard;
		this.loaded = false;

		this.world.ready.then(() => {
			this.loaded = true;

			for(const map of this.world.maps)
			{
				if(!map.properties['player-start'])
				{
					continue;
				}

				const startId = map.properties['player-start'];
				const startDef = map.entityDefs[startId];

				const player = this.player = new Player({
					session: this,
					x: startDef.x,
					y: startDef.y,
					inputManager: new InputManager({keyboard, onScreenJoyPad}),
					sprite: new Sprite({
						session: this,
						spriteSheet: new SpriteSheet({source: './player.tsj'}),
						width: 32,
						height: 48,
					}),
					camera: Camera,
				});

				this.spriteBoard.following = player;
				this.addEntity(player);
			}
		});
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

		if(!this.player)
		{
			return false;
		}

		this.entities.forEach(entity => entity.sprite.visible = false);

		const player = this.player;
		const nearBy = this.world.getEntitiesForRect(
			player.x
			, player.y
			, (Camera.width * 0.5)
			, (Camera.height * 0.5)
		);

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
