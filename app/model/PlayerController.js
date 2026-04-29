import { Ray } from "../math/Ray";
import { Entity } from "./Entity";

const fireRegion  = [1, 0, 0];
const waterRegion = [0, 1, 1];

/**
 *
 */
export class PlayerController
{
	/**
	 *
	 */
	static spriteSheet = '/player.tsj';
	/**
	 *
	 */
	static spriteColor = [0, 255, 255, 255];

	/**
	 *
	 */
	xSpeed = 0;
	/**
	 *
	 */
	ySpeed = 0;

	/**
	 * Set up a new Entity
	 * @param {Entity} entity
	 * @param {object} entityData
	 */
	create(entity, entityData)
	{
		this.direction = 'south';
		this.state = 'standing';

		this.xSpeed = 0;
		this.ySpeed = 0;

		this.xSpeedMax = 8;

		this.acceleration = 0.16;
		this.decceleration = 0.75;

		this.airAcceleration = 0.32;

		entity.height = 34;
		entity.width = 24;

		entity.sprite.width = 24;
		entity.sprite.height = 34;

		// entity.grounded = true;
		entity.grounded = false;

		this.gravity = 0.5; // 0x80

		this.lastMap = null;
		this.pushing = null;

		this.xDirection = 0;

		this.jumpPower = 9.9;
		this.maxAirJumps = 1;
		this.airJumps = 0;
	}

	/**
	 * Break down an Entity before destruction
	 * @param {Entity} entity
	 */
	destroy(entity){}

	/**
	 * Tick the Entity's simulation logic once.
	 * @param {Entity} entity
	 * @param {number} delta - MS since last tick
	 */
	simulate(entity, delta)
	{
		if(this.state === 'jumping')
		{
			entity.height = 24;
		}
		else
		{
			entity.height = 34;
		}

		if(Math.abs(this.xSpeed) < 0.01) this.xSpeed = 0;
		if(Math.abs(this.ySpeed) < 0.01) this.ySpeed = 0;

		const xAxis = entity.inputManager ? ( Math.min(1, Math.max(entity.inputManager.axes[0].magnitude || 0, -1)) || 0 ) : 0;
		const yAxis = entity.inputManager ? ( Math.min(1, Math.max(entity.inputManager.axes[1].magnitude || 0, -1)) || 0 ) : 0;

		const world = entity.session.world;

		const regions = world.getRegionsForPoint(entity.x, entity.y);
		const maps = world.getMapsForPoint(entity.x, entity.y);

		const solidTerrain = world.getSolidTerrain(entity.x, entity.y + 1, 0);
		const solidEntitiesBelow = world.getEntitiesForPoint(entity.x, entity.y + 1, Entity.E_SOLID | Entity.E_PLATFORM);

		const firstMap = [...maps][0];

		let gravity = this.gravity;

		regions.forEach(region => gravity *= region.gravity ?? 1);

		if(!solidTerrain)
		{
			this.ySpeed = Math.min(8, this.ySpeed + gravity);
			entity.grounded = false;
		}
		else if(this.ySpeed >= 0)
		{
			this.ySpeed = Math.min(0, this.ySpeed);
			entity.grounded = true;
		}

		if(solidTerrain)
		{
			world.motionGraph.add(entity, firstMap);
			this.lastMap = firstMap;
		}
		else if(solidEntitiesBelow.size)
		{
			let minTop = Infinity;

			for(const solidEntity of solidEntitiesBelow)
			{
				const otherTop = solidEntity.y - solidEntity.height;

				if(minTop > otherTop)
				{
					minTop = otherTop;
				}
				else
				{
					continue;
				}

				if(this.ySpeed >= 0 && entity.y < otherTop + 16)
				{
					entity.y = otherTop;
					this.ySpeed = Math.min(0, this.ySpeed);
					entity.grounded = true;

					world.motionGraph.add(entity, solidEntity);
				}
			}
		}
		else if(maps.has(this.lastMap))
		{
			world.motionGraph.add(entity, this.lastMap);
		}
		else if(!maps.has(this.lastMap))
		{
			world.motionGraph.delete(entity);
		}

		if(xAxis)
		{
			this.xDirection = Math.sign(xAxis);

			if(!world.getSolidTerrain(entity.x + Math.sign(xAxis) * entity.width * 0.5 + Math.sign(xAxis), entity.y + -entity.height * 0.5, 0))
			{
				this.xSpeed += xAxis * (entity.grounded ? this.acceleration : this.airAcceleration);
			}

			if(Math.abs(this.xSpeed) > this.xSpeedMax)
			{
				this.xSpeed = this.xSpeedMax * Math.sign(this.xSpeed);
			}

			if(entity.grounded && xAxis && Math.sign(xAxis) !== Math.sign(this.xSpeed))
			{
				this.xSpeed *= this.decceleration;
			}
		}
		else if(entity.grounded)
		{
			this.xSpeed *= 0.9;
		}
		else
		{
			this.xSpeed *= 0.99;
		}

		if(this.pushing)
		{
			if(this.xSpeed && Math.sign(this.xSpeed) !== Math.sign(this.pushing.x - entity.x))
			{
				this.pushing = null;
			}

			if(!entity.grounded)
			{
				this.pushing = null;
			}
		}

		const entities = Ray.castEntity(
			world
			, entity.x
			, entity.y
			, entity.x + this.xSpeed
			, entity.y + this.ySpeed
			, Ray.T_LAST_EMPTY
			, entity
		);

		if(entities)
		{
			entities.delete(entity);
			entities.forEach((point, other) => {
				other.collide(entity, point);
				entity.collide(other, point);
			});
		}

		let coyote = false;

		if(this.xSpeed || this.ySpeed)
		{
			regions.forEach(region => {
				this.xSpeed *= region.drag;
				if(this.ySpeed > 0)
				{
					this.ySpeed *= region.drag;
				}
			});

			// Ledge cases...
			if(!entity.grounded && xAxis)
			{
				const footRayFront = Ray.cast(
					world
					, entity.x
					, entity.y + 1
					, entity.x + entity.width * 0.5 * this.xDirection
					, entity.y + 1
					, Ray.T_LAST_EMPTY
				);

				if(footRayFront.hit && footRayFront.d < entity.width * 0.5)
				{
					const checkRay = Ray.cast(
						world
						, footRayFront.x + entity.width * 0.5 * this.xDirection
						, footRayFront.y + -entity.height
						, footRayFront.x + entity.width * 0.5 * this.xDirection
						, footRayFront.y
						, Ray.T_LAST_EMPTY
					);

					if(checkRay.hit && checkRay.d > entity.height * 0.5)
					{
						coyote = true;
						entity.x += this.xDirection;
						entity.y = footRayFront.y + checkRay.d + -entity.height;
						this.ySpeed = Math.min(0, this.ySpeed);
					}
				}

				const footRayBack = Ray.cast(
					world
					, entity.x
					, entity.y + 1
					, entity.x + entity.width * 0.5 * -this.xDirection
					, entity.y + 1
					, Ray.T_LAST_EMPTY
				);

				if(footRayBack.hit && footRayBack.d < entity.width * 0.5)
				{
					const checkRay = Ray.cast(
						world
						, footRayBack.x + -this.xDirection
						, footRayBack.y + -entity.height
						, footRayBack.x
						, footRayBack.y
						, Ray.T_LAST_EMPTY
					);

					if(checkRay.hit && checkRay.d > entity.height * 0.5)
					{
						coyote = true;
					}
				}
			}

			// console.time('Raycast');

			const gOff = entity.grounded ? -1 : 0;

			const rc = Ray.cast(
				world
				, entity.x
				, entity.y + gOff
				, entity.x + this.xSpeed
				, entity.y + this.ySpeed + gOff
				, Ray.E_SOLID
			);

			// console.timeEnd('Raycast');

			if(rc.hit)
			{
				if(!rc.entity || !(rc.entity.flags & Entity.E_PLATFORM) || (rc.entity.y - rc.entity.height > entity.y))
				{
					this.xSpeed = rc[0] - entity.x;
					this.ySpeed = rc[1] - entity.y;
					entity.currentMap = rc[4];
				}
			}

			entity.x += this.xSpeed;
			entity.y += this.ySpeed;
		}

		let snapped = false;

		if(!entity.grounded && this.ySpeed >= 0)
		{
			const grc = Ray.cast(
				world
				, entity.x
				, entity.y
				, entity.x
				, entity.y + Math.max(this.ySpeed, 6)
				, Ray.E_SOLID
			);

			if(grc.hit)
			{
				if(!grc.entity || !(grc.entity.flags & Entity.E_PLATFORM) || (grc.entity.y - grc.entity.height > entity.y))
				{
					this.ySpeed = 0;
					entity.y = grc[1];
					entity.currentMap = grc[4];
					entity.grounded = true;
					snapped = true;
				}
			}
		}

		if(world.getSolid(entity.x, entity.y + -1, 0) && !world.getSolid(entity.x, entity.y + -entity.height, 0))
		{
			this.ySpeed = 0;
			entity.y--;
		}

		while(world.getSolid(entity.x, entity.y + -entity.height, 0) && !world.getSolid(entity.x, entity.y, 0))
		{
			this.ySpeed = 0;
			entity.y++;
		}

		while(world.getSolid(entity.x + entity.width * -0.5, entity.y + -8, 0) && !world.getSolid(entity.x + entity.width * 0.5, entity.y + -8, 0))
		{
			this.xSpeed = 0;
			entity.x = Math.floor(entity.x + 1);
		}

		while(world.getSolid(entity.x + entity.width * 0.5 + -1, entity.y + -8, 0) && !world.getSolid(entity.x + entity.width * -0.5, entity.y + -8, 0))
		{
			this.xSpeed = 0;
			entity.x = Math.floor(entity.x + -1);
		}

		if(entity.grounded)
		{
			this.airJumps = 0;
			this.state = xAxis ? 'walking' : 'standing';

			if(xAxis < 0)
			{
				this.direction = 'west';
			}
			else if(xAxis > 0)
			{
				this.direction = 'east';
			}
		}

		if(entity.inputManager)
		{
			const canJump = entity.grounded || coyote || this.airJumps < this.maxAirJumps;

			if(canJump && entity.inputManager.buttons[0] && entity.inputManager.buttons[0].time === 1)
			{
				if(!entity.grounded || coyote)
				{
					this.airJumps++;
				}

				entity.grounded = false;
				this.state = 'jumping';
				this.ySpeed = -this.jumpPower;
				entity.y--;
			}

			if(!entity.grounded && entity.inputManager.buttons[0] && entity.inputManager.buttons[0].time === -1)
			{
				this.ySpeed = Math.max(-4, this.ySpeed);
			}

			if(this.pushing && entity.inputManager.buttons[1] && entity.inputManager.buttons[1].time === 1)
			{
				this.pushing.controller.shot = true;
				this.pushing.xSpeed *= 4;
				this.pushing = null;
			}
		}

		if(entity.sprite)
		{
			if(this.state === 'jumping')
			{
				entity.sprite.scaleX = this.xDirection;
				entity.sprite.changeAnimation(`${this.state}`);
			}
			else
			{
				entity.sprite.scaleX = 1;
				entity.sprite.changeAnimation(`${this.state}-${this.direction}`);
			}
		}

		if(this.state === 'jumping' && this.direction === 'south')
		{
			this.xDirection = 1;
			this.direction = 'east';
		}

		if(Math.abs(this.xSpeed) < 0.001)
		{
			this.xSpeed = 0;
		}

		if(Math.abs(this.ySpeed) < 0.001)
		{
			this.ySpeed = 0;
		}
	}

	/**
	 * Handle two Entities colliding
	 * @param {Entity} entity - The main entity in the collision
	 * @param {Entity} other - The other entity in the collision
	 * @param {[number, number]} point - The point where collision was detected
	 */
	collide(entity, other, point)
	{
		// if(other.flags & Entity.E_PLATFORM)
		// {
		// 	const otherTop = other.y - other.height;

		// 	if(this.ySpeed > 0 && entity.y < otherTop + 16)
		// 	{
		// 		this.ySpeed = 0;
		// 		entity.grounded = true;
		// 		this.y = otherTop;
		// 	}
		// }
	}

	/**
	 * Put the Entity into sleep-mode
	 * @param {Entity} entity
	 */
	sleep(entity){}

	/**
	 * Take the Entity out of sleep-mode
	 * @param {Entity} entity
	 */
	wakeup(entity){}
}
