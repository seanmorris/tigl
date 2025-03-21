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
	}

	simulate()
	{
		const speed = 4;

		const xAxis = Math.min(1, Math.max(this.controller.axis[0] || 0, -1)) || 0;
		const yAxis = Math.min(1, Math.max(this.controller.axis[1] || 0, -1)) || 0;

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

		if(world.getSolid(this.x, this.y) && !world.getSolid(this.x, this.y - 1))
		{
			this.ySpeed = 0;
			this.y--;
		}
		else if(world.getSolid(this.x, this.y) && !world.getSolid(this.x, this.y + 2))
		{
			this.ySpeed = 0;
			this.y++;
		}

		if(xAxis)
		{
			if(!world.getSolid(this.x + Math.sign(xAxis) * this.width * 0.5 + Math.sign(xAxis), this.y))
			{
				this.xSpeed += xAxis;
			}

			if(Math.abs(this.xSpeed) > 8)
			{
				this.xSpeed = 8 * Math.sign(this.xSpeed);
			}
		}
		else if(this.grounded)
		{
			this.xSpeed *= 0.75;
		}
		else
		{
			this.xSpeed *= 0.999;
		}

		while(world.getSolid(this.x + -this.width * 0.5, this.y) && !world.getSolid(this.x + this.width * 0.5, this.y))
		{
			this.xSpeed = 0;
			this.x++;
		}

		while(world.getSolid(this.x + this.width * 0.5, this.y) && !world.getSolid(this.x - this.width * 0.5, this.y))
		{
			this.xSpeed = 0;
			this.x--;
		}

		let xMove = this.xSpeed;// Math.abs(xAxis) * Math.sign(xAxis) * speed;
		let yMove = this.ySpeed;// Math.abs(yAxis) * Math.sign(yAxis) * speed;

		const direction = Math.atan2(yMove, xMove);
		const distance = Math.hypot(yMove, xMove);

		if(distance)
		{
			const hit = Ray.cast(
				world
				, this.x
				, this.y
				, 0
				, direction
				, distance
				, Ray.LAST_EMPTY
			);

			if(hit)
			{
				const actualDistance = Math.hypot(this.x - hit[0], this.y - hit[1]);
				xMove = Math.cos(direction) * actualDistance;
				yMove = Math.sin(direction) * actualDistance;
			}
		}

		this.x += xMove;
		this.y += yMove;

		if(this.x % 1 > 0.99999) this.x = Math.round(this.x);
		if(this.y % 1 > 0.99999) this.y = Math.round(this.y);
		if(this.x % 1 < 0.00001) this.x = Math.round(this.x);
		if(this.y % 1 < 0.00001) this.y = Math.round(this.y);

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

		for(let t in this.controller.triggers)
		{
			if(!this.controller.triggers[t])
			{
				continue;
			}

			this.sprite.spriteBoard.renderMode = t;

			if(t === '0' && this.grounded)
			{
				this.state = 'jumping';
				this.ySpeed = -10;
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

		super.simulate();
	}
}
