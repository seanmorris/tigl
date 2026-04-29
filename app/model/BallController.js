/**
 *
 */
export class BallController
{
	/**
	 *
	 */
	static spriteImage = './sphere.png';

	/**
	 *
	 * @param entity
	 * @param entityData
	 */
	create(entity, entityData)
	{
		entity.xSpeed = 0;
		entity.ySpeed = 0;

		entity.height = 32;
		entity.width  = 32;
	}

	/**
	 *
	 * @param entity
	 */
	destroy(entity){}

	/**
	 *
	 * @param entity
	 */
	simulate(entity)
	{
		const world = entity.session.world;

		if(entity.xSpeed || entity.ySpeed)
		{
			let xMove = entity.xSpeed;
			let yMove = entity.ySpeed;

			const h = world.castTerrainRay(
				entity.x + 0
				, entity.y + -16
				, entity.x + entity.xSpeed
				, entity.y + -16
				, 0x01
			);

			const v = world.castTerrainRay(
				entity.x + 0
				, entity.y + -16
				, entity.x
				, entity.y + -16 + entity.ySpeed
				, 0x1
			);

			if(h)
			{
				const actualDistance = h[0] - entity.x;
				xMove = actualDistance + -16 * Math.sign(entity.xSpeed);
				entity.xSpeed = -entity.xSpeed;
			}

			if(v)
			{
				const actualDistance = v[1] - (entity.y + -16);
				yMove = actualDistance + -16 * Math.sign(entity.ySpeed);
				entity.ySpeed = -entity.ySpeed;
			}

			entity.x += xMove;
			entity.y += yMove;
		}
		else
		{
			const a = Math.PI * 2 * Math.random();
			const s = 6;
			entity.xSpeed = Math.cos(a) * s;
			entity.ySpeed = Math.sin(a) * s;
		}
	}

	/**
	 *
	 * @param entity
	 * @param other
	 * @param point
	 */
	collide(entity, other, point){}
	/**
	 *
	 * @param entity
	 */
	sleep(entity){}
	/**
	 *
	 * @param entity
	 */
	wakeup(entity){}
}
