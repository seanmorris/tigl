import { roundedSquareWave } from "../math/roundSquareWave";
import { Entity } from "./Entity";

const SUBGRID_BITS = 8;
const SUBGRID_SIZE = 1 << SUBGRID_BITS;
const SUBGRID_INVR = 1 / SUBGRID_SIZE;

export class BoxController
{
	static spriteColor = [0, 0, 0, 255];

	frames = 0;

	create(entity, entityData)
	{
		if(entityData.gid)
		{
			entity.x += entityData.width * 0.5;
			// entity.y += -1;
		}
		else
		{
			entity.x += entityData.width * 0.5;
			entity.y += entityData.height;
		}

		this.xOriginal = entity.x;
		this.yOriginal = entity.y;

		if(entity.map)
		{
			this.xOriginal -= entity.map.x;
			this.yOriginal -= entity.map.y;
		}

		entity.flags |= Entity.E_PLATFORM;
		// entity.flags |= Entity.E_STATIC;

		if(entity.props.get('solid'))
		{
			entity.flags |= Entity.E_SOLID;
		}
	}

	destroy(entity){}

	simulate(entity, delta)
	{
		entity.sprite.width  = entity.width;
		entity.sprite.height = entity.height;

		if(entity.props.has('xOscillate'))
		{
			const range = entity.props.get('xOscillate');
			const delay = entity.props.get('delay') ?? 1500;
			const age = entity.session.world.age;
			// const current = Math.cos(Math.sin(age/delay)**4)**22;
			const current = roundedSquareWave(age/delay, 0.6);

			const mapOffset = entity.lastMap
				? entity.lastMap.x
				: 0;

			entity.x = mapOffset + this.xOriginal + current * range;

			entity.x = Math.round(entity.x * SUBGRID_SIZE) * SUBGRID_INVR;
		}

		if(entity.props.has('yOscillate'))
		{
			const range = entity.props.get('yOscillate');
			const delay = entity.props.get('delay') ?? 1500;
			const age = entity.session.world.age;
			// const current = 1 - Math.cos(Math.sin(age/delay)**4)**22;
			const current = roundedSquareWave(age/delay, 0.6);

			const mapOffset = entity.lastMap
				? entity.lastMap.y
				: 0;

			const yNew = (this.yOriginal + mapOffset + current * range);
			const yNewqQ = Math.round(yNew * SUBGRID_SIZE) * SUBGRID_INVR;
			const moved = yNewqQ - entity.y;

			if(moved < 0)
			{
				const above = entity.session.world.getEntitiesForRect(
					entity.x
					, entity.y -entity.height * 0.5
					, entity.width
					, entity.height + -moved
				);

				above.forEach(other => {
					if(other.flags & Entity.E_STATIC || other.grounded || other.ySpeed < moved) return;
					other.y = entity.y - entity.height;
				});
			}

			entity.y = yNewqQ;
		}
	}

	collide(entity){}
	sleep(entity){}
	wakeup(entity){}
}
