import { SpriteSheet } from "../sprite/SpriteSheet";
import { Sprite } from "../sprite/Sprite";
import { Entity } from "./Entity";

export class Spawner extends Entity
{
	constructor(entityData)
	{
		super(entityData);

		this.entityData = entityData;

		this.spawnType = entityData.spawnType;
		this.spawnClass = entityData.spawnClass;
		this.session = entityData.session;

		this.i = 0;
	}

	simulate()
	{
		const entityData = {...this.entityData};
		const spawnClass = this.entityData.spawnClass;

		const controller = new spawnClass;

		if(!entityData.sprite)
		{
			if(spawnClass.spriteSheet)
			{
				entityData.sprite = new Sprite({
					session: entityData.session
					, spriteSheet: new SpriteSheet({source: spawnClass.spriteSheet})
				});
			}
			else if(spawnClass.spriteImage)
			{
				entityData.sprite = new Sprite({
					session: entityData.session
					, src: entityData.spawnClass.spriteImage
				});
			}
		}

		const entity = new Entity({
			...entityData
			, controller
			, session: this.session
			, x: this.x
			, y: this.y
		});

		this.session.addEntity(entity);
		this.session.removeEntity(this);
		super.simulate();
	}
}
