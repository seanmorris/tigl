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

		this.spawnType = entityData.spawnType;
		this.spawnClass = entityData.spawnClass;
		this.session = entityData.session;
	}

	simulate()
	{
		const entity = new this.spawnClass({
			session: this.session,
			x: this.x,
			y: this.y,
		});
		this.session.addEntity(entity);
		this.session.removeEntity(this);
		super.simulate();
	}
}
