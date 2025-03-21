import { Entity } from "./Entity";
import { Sprite } from '../sprite/Sprite';

export class Spawner extends Entity
{
	constructor(entityData)
	{
		entityData.sprite = new Sprite({
			session: entityData.session
			, src: './thing.png'
			, width: 32
			, height: 32
		});

		super(entityData);

		this.spawnFunction = entityData.spawnFunction;
		this.session = entityData.session;
	}

	simulate()
	{
		const entity = this.spawnFunction(this.session);
		entity.x = this.x;
		entity.y = this.y;
		this.session.addEntity(entity);
		this.session.removeEntity(this);
		super.simulate();
	}
}
