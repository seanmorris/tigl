import { BarrelController } from './BarrelController';
import { Entity } from './Entity';
import { RopeController } from './RopeController';
import { Spawner } from './Spawner';

const BUTTON_LEFT = 0x1;
const BUTTON_RIGHT = 0x2;
const BUTTON_MIDDLE = 0x4;

export class CursorController
{
	create(entity, entityData)
	{
		this.rope = new Entity({
			controller: new RopeController,
			spawnClass: RopeController,
			session: entity.session,
			x: entity.x,
			y: entity.y,
			endX: entity.x + -64,
			endY: entity.y + -64,
			map: entity.map,
		});

		entity.session.addEntity(this.rope);
		entity.map.entities.set(this.rope.id, this.rope);

		this.rope.lastMap = entity.map;

		console.log(this.rope);
	}

	destroy(entity){}

	simulate(entity, delta)
	{
		// this.rope.x = entity.x;
		// this.rope.y = entity.y;

		this.rope.controller.endX = entity.x;
		this.rope.controller.endY = entity.y;

		if(entity.session.mouse.buttons)
		{
			this.rope.controller.reset(entity.session);

			this.rope.x = entity.x;
			this.rope.y = entity.y;

			// this.rope.controller.endX = entity.x;
			// this.rope.controller.endY = entity.y;

			entity.sprite.changeAnimation('pressing');
			const others = entity.session.world.getEntitiesForPoint(entity.x, entity.y);

			for(const other of others)
			{
				other.controller.ySpeed = -20;
				other.y--;
			}
		}
		else
		{
			entity.sprite.changeAnimation('normal');
		}
	}

	collide(entity, other){}
	sleep(entity){}
	wakeup(entity){}
}
