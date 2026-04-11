import { Ray } from "../math/Ray";
import { Entity } from "./Entity";

const fireRegion  = [1, 0, 0];
const waterRegion = [0, 1, 1];

export class PlayerController
{
	static spriteSheet = '/player.tsj';
	static spriteColor = [0, 255, 255, 255];

	create(entity, entityData)
	{
		this.direction = 'south';
		this.state = 'standing';

		entity.xSpeed = 0;
		entity.ySpeed = 0;

		this.xSpeedMax = 8;

		this.acceleration = 0.16;
		this.decceleration = 0.75;

		this.airAcceleration = 0.32;

		entity.height = 34;
		entity.width = 24;

		entity.sprite.width = 24;
		entity.sprite.height = 34;

		entity.grounded = true;
		entity.grounded = 0;

		this.gravity = 0.5; // 0x80

		this.lastMap = null;
		this.pushing = null;

		this.xDirection = 0;

		this.jumpPower = 9.9;
		this.maxAirJumps = 1;
		this.airJumps = 0;
	}

	destroy(entity){}

	simulate(entity)
	{
		if(this.state === 'jumping')
		{
			entity.height = 24;
		}
		else
		{
			entity.height = 34;
		}

		if(Math.abs(entity.xSpeed) < 0.01) entity.xSpeed = 0;
		if(Math.abs(entity.ySpeed) < 0.01) entity.ySpeed = 0;

		const xAxis = entity.inputManager ? ( Math.min(1, Math.max(entity.inputManager.axes[0].magnitude || 0, -1)) || 0 ) : 0;
		const yAxis = entity.inputManager ? ( Math.min(1, Math.max(entity.inputManager.axes[1].magnitude || 0, -1)) || 0 ) : 0;

		const world = entity.session.world;

		const regions = world.getRegionsForPoint(entity.x, entity.y);
		const maps = world.getMapsForPoint(entity.x, entity.y);

		const solidTerrain = world.getSolidTerrain(entity.x, entity.y + 1);
		const solidEntitiesBelow = world.getEntitiesForPoint(entity.x, entity.y + 1, Entity.E_SOLID | Entity.E_PLATFORM);

		const firstMap = [...maps][0];

		let gravity = this.gravity;

		regions.forEach(region => gravity *= region.gravity ?? 1);

		if(!solidTerrain)
		{
			entity.ySpeed = Math.min(8, entity.ySpeed + gravity);
			entity.grounded = false;
		}
		else if(entity.ySpeed >= 0)
		{
			entity.ySpeed = Math.min(0, entity.ySpeed);
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

				if(entity.ySpeed >= 0 && entity.y < otherTop + 16)
				{
					entity.y = otherTop;
					entity.ySpeed = Math.min(0, entity.ySpeed);
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

			if(!world.getSolidTerrain(entity.x + Math.sign(xAxis) * entity.width * 0.5 + Math.sign(xAxis), entity.y + -entity.height * 0.5))
			{
				entity.xSpeed += xAxis * (entity.grounded ? this.acceleration : this.airAcceleration);
			}

			if(Math.abs(entity.xSpeed) > this.xSpeedMax)
			{
				entity.xSpeed = this.xSpeedMax * Math.sign(entity.xSpeed);
			}

			if(entity.grounded && xAxis && Math.sign(xAxis) !== Math.sign(entity.xSpeed))
			{
				entity.xSpeed *= this.decceleration;
			}
		}
		else if(entity.grounded)
		{
			entity.xSpeed *= 0.9;
		}
		else
		{
			entity.xSpeed *= 0.99;
		}

		if(this.pushing)
		{
			if(entity.xSpeed && Math.sign(entity.xSpeed) !== Math.sign(this.pushing.x - entity.x))
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
			, entity.x + entity.xSpeed
			, entity.y + entity.ySpeed
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

		if(entity.xSpeed || entity.ySpeed)
		{
			regions.forEach(region => {
				entity.xSpeed *= region.drag;
				if(entity.ySpeed > 0)
				{
					entity.ySpeed *= region.drag;
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
						entity.ySpeed = Math.min(0, entity.ySpeed);
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

			// console.time('tcast');

			const terrain = Ray.castTerrain(
				world
				, entity.x
				, entity.y
				, entity.x + entity.xSpeed
				, entity.y + entity.ySpeed
				, Ray.T_SNAP_TO_INT
			);

			// console.timeEnd('tcast');

			const solidEntities = Ray.castEntity(
				world
				, entity.x
				, entity.y
				, entity.x + entity.xSpeed
				, entity.y + entity.ySpeed
				, Ray.E_SOLID
				, entity
			);

			let minDist = Infinity;

			if(solidEntities.size)
			for(const [solid, point] of solidEntities.entries())
			{
				if((solid.flags & Entity.E_SOLID))
				{
					const [x,y,t] = point;

					if(t < minDist)
					{
						minDist = t;

						const solidTop = solid.y + -solid.height;
						const solidLeft = solid.x + -solid.width * 0.5;
						const solidRight = solid.x + solid.width * 0.5;

						const myTop = entity.y + -entity.height;

						if(entity.x >= solidLeft && entity.x <= solidRight)
						{
							if(Math.sign(solid.y - entity.y) === Math.sign(entity.ySpeed))
							{
								entity.y = y;
								entity.ySpeed = 0;
							}
						}

						if(entity.y > solidTop && myTop < solid.y)
						{
							if(Math.sign(solid.x - entity.x) === Math.sign(entity.xSpeed))
							{
								entity.x = x;
								entity.xSpeed = 0;
							}
						}
					}
				}
			}
			else if(terrain)
			{
				entity.xSpeed = terrain[0] - entity.x;
				entity.ySpeed = terrain[1] - entity.y;
				entity.currentMap = terrain[4];
			}

			entity.x += entity.xSpeed;
			entity.y += entity.ySpeed;
		}

		let snapped = false;

		if(!entity.grounded && entity.ySpeed >= 0)
		{
			const groundSnapper = Ray.castTerrain(
				world
				, entity.x
				, entity.y
				, entity.x
				, entity.y + entity.ySpeed + 6
				, Ray.T_SNAP_TO_INT
			);

			if(groundSnapper)
			{
				console.log(groundSnapper);
				entity.ySpeed = 0;
				entity.y = groundSnapper[1];
				entity.currentMap = groundSnapper[4];
				entity.grounded = true;

				console.log(entity.y, firstMap.y);

				snapped = true;
			}
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
				entity.ySpeed = -this.jumpPower;
				entity.y--;
			}

			if(!entity.grounded && entity.inputManager.buttons[0] && entity.inputManager.buttons[0].time === -1)
			{
				entity.ySpeed = Math.max(-4, entity.ySpeed);
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

		if(Math.abs(entity.xSpeed) < 0.001)
		{
			entity.xSpeed = 0;
		}

		if(Math.abs(entity.ySpeed) < 0.001)
		{
			entity.ySpeed = 0;
		}

		snapped && console.log(entity.y, firstMap.y);
	}

	collide(entity, other, point)
	{
		// if(other.flags & Entity.E_PLATFORM)
		// {
		// 	const otherTop = other.y - other.height;

		// 	if(entity.ySpeed > 0 && entity.y < otherTop + 16)
		// 	{
		// 		entity.ySpeed = 0;
		// 		entity.grounded = true;
		// 		this.y = otherTop;
		// 	}
		// }
	}

	sleep(entity){}
	wakeup(entity){}
}
