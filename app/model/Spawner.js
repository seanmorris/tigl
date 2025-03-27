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
		this.props = new Properties(spawnData.properties ?? [], this);

		this.flags |= Entity.E_STATIC;
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
						src: spawnClass.spriteSheet
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
			else if(this.props.has('color'))
			{
				entityDef.sprite = new Sprite({
					session: this.spawnData.session
					, color: this.props.get('color')
					, width: this.width
					, height: this.height
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

		const map = this.spawnData.map;

		const entity = new Entity({
			...entityDef
			, controller
			, session: this.session
			, x: this.x
			, y: this.y
			, map
		});

		this.session.world.motionGraph.add(entity, map);
		entity.lastMap = map;
		this.session.addEntity(entity);
		this.session.removeEntity(this);
		super.simulate();
	}
}
