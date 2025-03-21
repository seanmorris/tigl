import { Ray } from "../math/Ray";
import { Entity } from "./Entity";

const fireRegion  = [1, 0, 0];
const waterRegion = [0, 1, 1];

export class Player extends Entity
{
	constructor(entityData)
	{
		super(entityData);

		this.direction = 'south';
		this.state = 'standing';

		this.xSpeed = 0;
		this.ySpeed = 0;

		this.grounded = true;

		this.xDirection = 0;
	}

	simulate()
	{
		super.simulate();

		if(this.state === 'jumping')
		{
			this.height = 24;
		}
		else
		{
			this.height = 48;
		}

		const speed = 4;

		const xAxis = Math.min(1, Math.max(this.inputManager.axis[0] || 0, -1)) || 0;
		const yAxis = Math.min(1, Math.max(this.inputManager.axis[1] || 0, -1)) || 0;

		const world = this.session.world;

		if(!world.getSolid(this.x, this.y + 1))
		{
			this.ySpeed = Math.min(8, this.ySpeed + 0.5);
			this.grounded = false;
		}
		else
		{
			this.ySpeed = Math.min(0, this.ySpeed);
			this.grounded = true;
		}

		if(xAxis)
		{
			this.xDirection = Math.sign(xAxis);

			if(!world.getSolid(this.x + Math.sign(xAxis) * this.width * 0.5 + Math.sign(xAxis), this.y))
			{
				this.xSpeed += xAxis * (this.grounded ? 0.2 : 0.4);
			}

			if(Math.abs(this.xSpeed) > 8)
			{
				this.xSpeed = 8 * Math.sign(this.xSpeed);
			}

			if(this.grounded && xAxis && Math.sign(xAxis) !== Math.sign(this.xSpeed))
			{
				this.xSpeed *= 0.75;
			}
		}
		else if(this.grounded)
		{

			this.xSpeed *= 0.9;
		}
		else
		{
			this.xSpeed *= 0.99;
		}

		if(world.getSolid(this.x, this.y) && !world.getSolid(this.x, this.y + -this.height))
		{
			this.ySpeed = 0;
			this.y--;
		}

		while(world.getSolid(this.x, this.y + -this.height) && !world.getSolid(this.x, this.y))
		{
			this.ySpeed = 0;
			this.y++;
		}

		while(world.getSolid(this.x + -this.width * 0.5, this.y + -8) && !world.getSolid(this.x + this.width * 0.5, this.y + -8))
		{
			this.xSpeed = 0;
			this.x++;
		}

		while(world.getSolid(this.x + this.width * 0.5, this.y + -8) && !world.getSolid(this.x - this.width * 0.5, this.y + -8))
		{
			this.xSpeed = 0;
			this.x--;
		}

		if(this.xSpeed || this.ySpeed)
		{
			const direction = Math.atan2(this.ySpeed, this.xSpeed);
			const distance = Math.hypot(this.ySpeed, this.xSpeed);

			const hit = Ray.cast(
				world
				, this.x
				, this.y
				, 0
				, direction
				, distance
				, Ray.T_LAST_EMPTY
			);

			let xMove = this.xSpeed;
			let yMove = this.ySpeed;

			if(hit.terrain)
			{
				const actualDistance = Math.hypot(
					this.x - hit.terrain[0]
					, this.y - hit.terrain[1]
				);

				xMove = Math.cos(direction) * actualDistance;
				yMove = Math.sin(direction) * actualDistance;
			}

			this.x += xMove;
			this.y += yMove;

			this.fixFPE();
		}

		let horizontal = false;

		if(Math.abs(xAxis) > Math.abs(yAxis))
		{
			horizontal = true;
		}

		if(horizontal)
		{
			this.direction = 'west';

			if(xAxis > 0)
			{
				this.direction = 'east';
			}

			if(this.grounded)
			{
				this.state = 'walking';
			}
		}
		// else if(yAxis)
		// {
		// 	this.direction = 'north';

		// 	if(yAxis > 0)
		// 	{
		// 		this.direction = 'south';
		// 	}

		// 	this.state = 'walking';
		// }
		else
		{
			if(this.grounded)
			{
				this.state = 'standing';
			}
		}

		this.sprite.changeAnimation(`${this.state}-${this.direction}`);

		// if(Math.trunc(performance.now() / 1000) % 15 === 0)
		// {
		// 	this.sprite.region = null;
		// }

		// if(Math.trunc(performance.now() / 1000) % 15 === 5)
		// {
		// 	this.sprite.region = waterRegion;
		// }

		// if(Math.trunc(performance.now() / 1000) % 15 === 10)
		// {
		// 	this.sprite.region = fireRegion;
		// }

		for(let t in this.inputManager.triggers)
		{
			if(!this.inputManager.triggers[t])
			{
				continue;
			}

			this.sprite.spriteBoard.renderMode = t;

			if(t === '0' && this.grounded)
			{
				this.state = 'jumping';
				this.ySpeed = -10;
			}

			if(t === '8')
			{
				const entities = Ray.castEntity(
					world
					, this.x
					, this.y + -16
					, this.x + 200 * this.xDirection
					, this.y + -16
					, 0x0
				);

				entities.delete(this);

				console.log(entities);
			}

			if(t === '9')
			{
				const maps = this.sprite.spriteBoard.world.getMapsForPoint(
					this.sprite.x, this.sprite.y,
				);

				maps.forEach(m => console.log(m.src));
			}

			if(this.state === 'jumping' && this.direction === 'south')
			{
				this.direction = 'east';
			}
		}
	}
}
