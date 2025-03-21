import { Ray } from "../math/Ray";
import { Entity } from "./Entity";

export class Pushable extends Entity
{
	constructor(entityData)
	{
		super(entityData);

		this.xSpeed = 0;
		this.ySpeed = 0;

		this.grounded = true;

		this.ySpriteOffset = 6;
	}

	simulate()
	{
		super.simulate();

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
		else if(world.getSolid(this.x, this.y) && !world.getSolid(this.x, this.y + 1))
		{
			this.ySpeed = 0;
			this.y++;
		}

		let xMove = this.xSpeed;// Math.abs(xAxis) * Math.sign(xAxis) * speed;
		let yMove = this.ySpeed;// Math.abs(yAxis) * Math.sign(yAxis) * speed;

		const direction = Math.atan2(yMove, xMove);
		const distance = Math.hypot(yMove, xMove);

		if(distance)
		{
			const solid = Ray.cast(
				world
				, this.x
				, this.y
				, 0
				, direction
				, distance
				, Ray.LAST_EMPTY
			);

			if(solid)
			{
				const actualDistance = Math.hypot(
					this.x - solid[0]
					, this.y - solid[1]
				);

				xMove = Math.cos(direction) * actualDistance;
				yMove = Math.sin(direction) * actualDistance;

				// actualDistance && console.log(direction, actualDistance);
			}
		}

		this.x += xMove;
		this.y += yMove;
	}
}
