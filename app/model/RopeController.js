import { Ray } from "../math/Ray";
import { Sprite } from "../sprite/Sprite";
import { Particle } from "./Particle";

/**
 * @import { Entity } from "./Entity";
 */

/**
 *
 */
export class RopeController
{
	// static spriteImage = './rope.png';
	/**
	 *
	 */
	static spriteColor = [0, 255, 0, 96];

	/**
	 *
	 * @param entity
	 * @param entityData
	 */
	create(entity, entityData)
	{
		this.width = entity.sprite.width = 4;

		if(entity.props.has('endpoint'))
		{
			const endpointId = entity.props.get('endpoint');
			const endpoint = entity.map.entityDefs[endpointId];
			this.endX = endpoint.x;
			this.endY = endpoint.y;
		}
		else
		{
			this.endX = entityData.endX;
			this.endY = entityData.endY;
		}

		this.particles = [];
		this.endParticle = null;
	}

	/**
	 *
	 * @param entity
	 */
	destroy(entity){}

	/**
	 * Simulate the Rope
	 * @param {Entity} entity
	 */
	simulate(entity)
	{
		const endX = this.endX;
		const endY = this.endY;

		const theta = Math.atan2(entity.y - endY, entity.x - endX) + -Math.PI * 0.5;
		const length = Math.hypot(entity.y - endY, entity.x - endX) + 1;
		const scale = length / entity.sprite.height;

		entity.sprite.scaleY = scale;
		entity.sprite.repeatY = scale;
		entity.sprite.theta = theta;
		// entity.sprite.visible = false;

		const world = entity.session.world;

		const points = Ray.castTerrain(
			world
			, entity.x, entity.y
			, this.endX, this.endY
			, Ray.T_ALL_POINTS
			, 0
		);

		if(points instanceof Set)
		{
			const aPoints = [...points];

			if(this.particles.length < points.size) this.particles.length = points.size;

			for(const i in aPoints)
			{
				if(this.particles[i])
				{
					entity.session.particles.delete(this.particles[i]);
				}

				let color = [255,255,0,240];

				if(aPoints[i][5] === 2)
				{
					color = [255,0,255,240];
				}

				if(aPoints[i][5] === 3)
				{
					color = [0,255,0,255];
				}

				if(aPoints[i][5] === 4)
				{
					color = [254,0,0,255];
				}

				this.particles[i] = new Particle({
					x: aPoints[i][0]
					, y: aPoints[i][1]
					, sprite: new Sprite({
						session: entity.session
						, color
						, width: 1
						, height: 1
					})
				});

				this.particles[i].sprite.scale = 2;
				this.particles[i].sprite.xCenter = 0.5;
				this.particles[i].sprite.yCenter = 0.5;

				entity.session.particles.add(this.particles[i]);

				this.particles[i].x = aPoints[i][0];
				this.particles[i].y = aPoints[i][1];
				this.particles[i].sprite.z = i;
			}

			for(let i = points.size; i < this.particles.length; i++)
			{
				entity.session.particles.delete(this.particles[i]);
			}
		}

		// console.time('Raycast');
		const endPoint = Ray.cast(
			world
			, entity.x, entity.y
			, this.endX, this.endY
			, Ray.T_SNAP_TO_INT
		);
		// console.timeEnd('Raycast');

		if(endPoint)
		{
			if(!this.endParticle)
			{
				this.endParticle = new Particle({
					x: endPoint[0]
					, y: endPoint[1]
					, sprite: new Sprite({
						session: entity.session
						, color: [255, 0, 0, 240]
						, width: 1
						, height: 1
					})
				});

				entity.session.particles.add(this.endParticle);

				this.endParticle.sprite.xCenter = 0.5;
				this.endParticle.sprite.yCenter = 0.5;
			}

			this.endParticle.sprite.scale = 3;
			this.endParticle.x = endPoint[0];
			this.endParticle.y = endPoint[1];
			this.endParticle.sprite.z = points.size;
		}
		else if(this.endParticle)
		{
			this.endParticle.sprite.scale = 1;
			this.endParticle.x = this.endX;
			this.endParticle.y = this.endY;
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
	sleep(entity)
	{
		console.log(this);
	}

	/**
	 *
	 * @param entity
	 */
	wakeup(entity)
	{
		console.log(this);
	}

	/**
	 *
	 * @param session
	 */
	reset(session)
	{
		this.particles.forEach(p => session.particles.delete(p));
	}
}
