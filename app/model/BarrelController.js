import { Ray } from "../math/Ray";
import { Entity } from "./Entity";

/** @import { TerrainPoint } from "../math/Ray"; */

export class BarrelController
{
	static spriteImage = '/barrel.png';

	create(entity, entityData)
	{
		entity.xSpeed = 0;
		entity.ySpeed = 0;

		entity.height = 36;
		entity.width = 26;

		entity.ySpriteOffset = 6;

		entity.grounded = true;
		this.shot = false;

		entity.flags |= Entity.E_PLATFORM;
	}

	destroy(entity)
	{
	}

	simulate(entity)
	{
		if(Math.abs(entity.xSpeed) < 0.01) entity.xSpeed = 0;
		if(Math.abs(entity.ySpeed) < 0.01) entity.ySpeed = 0;

		const world = entity.session.world;

		if(!world.getSolidTerrain(entity.x, entity.y + 1))
		{
			entity.ySpeed = Math.min(8, entity.ySpeed + 0.5);
			entity.grounded = false;
		}
		else
		{
			entity.ySpeed = Math.min(0, entity.ySpeed);
			entity.grounded = true;
		}

		if(this.pushedBy)
		{
			const other = this.pushedBy;

			const dist = Math.abs(other.x + -entity.x);
			const min  = 0.5 * (other.width + entity.width) + Math.abs(other.xSpeed);
			const side = Math.sign(entity.x - other.x);

			entity.xSpeed = (min - dist) * side;

			if(dist < min * 0.75)
			{
				entity.ySpeed = Math.max(-2, entity.ySpeed - 1);
				entity.xSpeed = -other.controller.xDirection;
			}
		}

		if(entity.xSpeed || entity.ySpeed)
		{
			const front = entity.x + (entity.width * 0.5 * Math.sign(entity.xSpeed));

			const hit = world.castRay(
				front
				, entity.y + -1
				, front + entity.xSpeed
				, entity.y + -1
				, Ray.T_SNAP_TO_INT
			);

			if(hit.terrain)
			{
				entity.xSpeed = hit.terrain[0] - front;
				// entity.ySpeed = hit.terrain[1] - entity.y + 1;

				// console.log(entity.xSpeed, hit);
			}

			entity.x += entity.xSpeed;
			entity.y += entity.ySpeed;

			if(!this.shot)
			{
				entity.xSpeed *= 0.9125;
			}
		}
		else
		{
			entity.shot = false;
		}

		if(world.getSolid(entity.x, entity.y + -1) && !world.getSolid(entity.x, entity.y + -entity.height))
		{
			entity.ySpeed = 0;
			entity.y--;
		}

		while(world.getSolid(entity.x, entity.y + -entity.height) && !world.getSolid(entity.x, entity.y))
		{
			entity.ySpeed = 0;
			entity.y++;
		}

		while(world.getSolid(entity.x + entity.width * -0.5, entity.y + -8) && !world.getSolid(entity.x + entity.width * 0.5, entity.y + -8))
		{
			entity.xSpeed = 0;
			entity.x = Math.floor(entity.x + 1);
		}

		while(world.getSolid(entity.x + entity.width * 0.5 + -1, entity.y + -8) && !world.getSolid(entity.x + entity.width * -0.5, entity.y + -8))
		{
			entity.xSpeed = 0;
			entity.x = Math.floor(entity.x + -1);
		}

		if(!entity.grounded && entity.ySpeed >= 0)
		{
			/** @type TerrainPoint|void */
			const groundSnapper = Ray.castTerrain(
				world
				, entity.x
				, entity.y
				, entity.x
				, entity.y + 4
				, Ray.T_LAST_EMPTY | Ray.T_SNAP_TO_INT
			);

			if(groundSnapper)
			{
				entity.ySpeed = 0;
				entity.y = groundSnapper[1];
				entity.grounded = true;
			}
		}

		const children = world.motionGraph.getChildren(entity);

		if(children)
		for(const child of children)
		{
			child.sprite.z = entity.sprite.z - 1;
		}

		this.pushedBy = null;
	}

	collide(entity, other, point)
	{
		if(other.y <= entity.y + - entity.height)
		{
			return;
		}

		if(Math.abs(Math.sign(entity.x - other.x) - Math.sign(other.xSpeed)) < 2)
		{
			this.pushedBy = other;
			// other.controller.pushing = entity;
		}
	}

	sleep(entity)
	{
	}

	wakeup(entity)
	{
	}

	stop(entity)
	{
		if(entity.xSpeed > 10)
		{
			// entity.session.removeEntity(entity);
		}

		this.shot = false;
	}
}
