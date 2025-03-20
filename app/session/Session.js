import { Bag } from "curvature/base/Bag";

import { Camera } from '../sprite/Camera';

import { Controller } from '../model/Controller';
import { Sprite } from '../sprite/Sprite';

import { Quadtree } from '../math/Quadtree';
import { SpriteSheet } from '../sprite/SpriteSheet';

import { Player } from '../model/Player';
import { Pushable } from '../model/Pushable';

export class Session
{
	constructor({spriteBoard, keyboard, onScreenJoyPad})
	{
		this.fThen = 0;
		this.sThen = 0;

		this.frameLock = 60;
		this.simulationLock = 60;

		this.entities  = new Bag;
		this.quadTree = new Quadtree(0, 0, 10000, 10000);

		this.keyboard = keyboard;

		const player = this.player = new Player({
			x: 48,
			y: 64,
			sprite: new Sprite({
				// src: undefined,
				spriteSet: new SpriteSheet({source: './player.tsj'}),
				spriteBoard: spriteBoard,
				width: 32,
				height: 48,
			}),
			controller: new Controller({keyboard, onScreenJoyPad}),
			camera: Camera,
		});

		this.spriteBoard = spriteBoard;

		this.spriteBoard.following = player;

		this.entities.add(player);
		this.quadTree.add(player);
		this.spriteBoard.sprites.add(player.sprite);

		const w = 1280;
		for(const i in Array(2).fill())
		{
			const barrel = new Pushable({
				sprite: new Sprite({
					spriteBoard: this.spriteBoard,
					src: './barrel.png',
				})
			})

			barrel.x = 32 + (i * 64) % w - 16;
			barrel.y = Math.trunc((i * 32) / w) * 32 + 32;

			this.entities.add(barrel);
			this.quadTree.add(barrel);
			this.spriteBoard.sprites.add(barrel.sprite);
		}
	}

	simulate(now)
	{
		const delta = now - this.sThen;

		if(this.simulationLock == 0)
		{
			return false;
		}

		if(delta < (1000 / this.simulationLock))
		{
			return false;
		}

		this.sThen = now;

		this.keyboard.update();

		const player = this.player;

		Object.values(this.entities.items()).forEach(entity => {
			entity.simulate(delta);
			this.quadTree.move(entity);
			entity.sprite.visible = false;
		});

		const nearBy = this.quadTree.select(player.x - 50, player.y - 50, player.x + 50, player.y + 50);

		nearBy.forEach(e => e.sprite.visible = true);

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
