import { Entity } from "./Entity";

export class BoxController
{
	static spriteColor = [0, 0, 0, 255];

	frames = 0;

	create(entity, entityData)
	{
		if(entityData.gid)
		{
			entity.x += entityData.width * 0.5;
			entity.y += -1;
		}
		else
		{
			entity.x += entityData.width * 0.5;
			entity.y += entityData.height + -1;
		}

		this.xOriginal = entity.x;
		this.yOriginal = entity.y;

		if(entity.map)
		{
			this.xOriginal -= entity.map.x;
			this.yOriginal -= entity.map.y;
		}

		entity.flags |= Entity.E_PLATFORM;
		entity.flags |= Entity.E_STATIC;
	}

	destroy(entity){}

	simulate(entity)
	{
		entity.sprite.width  = entity.width;
		entity.sprite.height = entity.height;

		if(entity.props.has('xOscillate'))
		{
			const range = entity.props.get('xOscillate');
			const delay = entity.props.get('delay') ?? 1500;
			const age = entity.session.world.age;
			const current = Math.cos(Math.sin(age/delay)**5)**(16);

			const mapOffset = entity.lastMap
				? entity.lastMap.x
				: 0;

			entity.x = mapOffset + this.xOriginal + current * range;
		}

		if(entity.props.has('yOscillate'))
		{
			const range = entity.props.get('yOscillate');
			const delay = entity.props.get('delay') ?? 1500;
			const age = entity.session.world.age;
			const current = Math.cos(Math.sin(age/delay)**5)**(16);

			const mapOffset = entity.lastMap
				? entity.lastMap.y
				: 0;

			const yNew = this.yOriginal + mapOffset + current * range;
			const moved = yNew - entity.y;

			if(moved < 0)
			{
				const above = entity.session.world.getEntitiesForRect(
					entity.x
					, entity.y -entity.height * 0.5
					, entity.width
					, entity.height + -moved
				);

				above.forEach(other => {
					if(other.flags & Entity.E_STATIC || other.ySpeed < moved) return;
					other.y = entity.y - entity.height
				});
			}

			entity.y = yNew;
		}
	}

	collide(entity){}
	sleep(entity){}
	wakeup(entity){}
}
