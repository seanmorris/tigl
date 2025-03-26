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

		if(entity.lastMap)
		{
			this.xOriginal -= entity.lastMap.x;
			this.yOriginal -= entity.lastMap.y;
		}

		entity.flags |= 0x1;
	}

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

			if(yNew < entity.y)
			{
				const above = entity.session.world.getEntitiesForRect(
					entity.x
					, yNew + -entity.height * 0.5 + -(entity.y - yNew)
					, entity.width
					, entity.y + -yNew + entity.height * 0.5
				);

				above.forEach(other => {
					if(other.ySpeed < yNew - entity.y) return;
					other.y = entity.y - entity.height
				});
			}

			entity.y = yNew;
		}
	}

	collide(){}
}
