import { SpriteSheet } from "../sprite/SpriteSheet";
import { Sprite } from "../sprite/Sprite";
import { Entity } from "./Entity";
import { Properties } from "../world/Properties";

export class Spawner extends Entity
{
	constructor(spawnData)
	{
		super(spawnData);

		this.spawnData = spawnData;

		this.spawnType = spawnData.spawnType;
		this.spawnClass = spawnData.spawnClass;
		this.session = spawnData.session;

		const props = new Properties(spawnData.properties ?? []);
		this.count = props.get('count') ?? 1;

		this.i = 0;
	}

	simulate()
	{
		const spawnClass = this.spawnData.spawnClass;
		const entityDef = {...this.spawnData.entityDef};

		const controller = new spawnClass;

		if(!entityDef.sprite)
		{
			if(spawnClass.spriteSheet)
			{
				entityDef.sprite = new Sprite({
					session: this.spawnData.session
					, spriteSheet: new SpriteSheet({
						source: spawnClass.spriteSheet
					})
				});
			}
			else if(spawnClass.spriteImage)
			{
				entityDef.sprite = new Sprite({
					session: this.spawnData.session
					, src: spawnClass.spriteImage
				});
			}
			else if (this.spawnData.gid)
			{
				entityDef.sprite = new Sprite({
					session: this.spawnData.session
					, src: this.spawnData.map.getTileImage(this.spawnData.gid)
					, tiled: true
				});
			}
			else if(spawnClass.spriteColor)
			{
				entityDef.sprite = new Sprite({
					session: this.spawnData.session
					, color: spawnClass.spriteColor
					, width: this.width
					, height: this.height
				});
			}
		}

		const entity = new Entity({
			...entityDef
			, controller
			, session: this.session
			, x: entityDef.x
			, y: entityDef.y
		});

		this.session.removeEntity(this);
		this.session.addEntity(entity);
		super.simulate();
	}
}
