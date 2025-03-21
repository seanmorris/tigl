import { Ray } from "../math/Ray";
import { Sprite } from "../sprite/Sprite";
import { Entity } from "./Entity";

export class Pushable extends Entity
{
	constructor(entityData)
	{
		super(entityData);

		this.xSpeed = 0;
		this.ySpeed = 0;

		this.height = 48;
		this.width = 32;

		this.sprite = new Sprite({
			session: entityData.session
			, src: './barrel.png'
		});

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
	}
}
