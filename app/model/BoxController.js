export class BoxController
{
	static spriteColor = [255, 0, 0, 255];

	create(entity, entityData)
	{
		if(entityData.gid)
		{
			entity.x = entityData.x + entityData.width * 0.5;
			entity.y = entityData.y + -1;
		}
		else
		{
			entity.x = entityData.x + entityData.width * 0.5;
			entity.y = entityData.y + entityData.height + -1;

		}

		entity.flags |= 0x1;
	}

	simulate(entity)
	{
		entity.sprite.width  = entity.width;
		entity.sprite.height = entity.height;
	}

	collide(){}
}
