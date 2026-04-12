const BUTTON_LEFT = 0x1;
const BUTTON_RIGHT = 0x2;
const BUTTON_MIDDLE = 0x4;

export class CursorController
{
	create(entity, entityData)
	{
		entity.buttons = 0;
	}

	destroy(entity){}

	simulate(entity, delta)
	{
		if(entity.buttons)
		{
			entity.sprite.changeAnimation('pressing');
			// console.log(entity.buttons);
			const others = entity.session.world.getEntitiesForPoint(entity.x, entity.y);

			for(const other of others)
			{
				other.ySpeed = -20;
				other.y--;
			}
		}
		else
		{
			entity.sprite.changeAnimation('normal');
		}
	}

	collide(entity, other)
	{
		// if(entity.buttons)
		// {
		// 	other.ySpeed = -20;
		// 	other.y--;
		// }
		// console.log(other);
	}

	sleep(entity){}
	wakeup(entity){}
}
