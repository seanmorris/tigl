import { SpriteSheet } from "../sprite/SpriteSheet";
import { Sprite } from "../sprite/Sprite";
import { Entity } from "./Entity";
import { Properties } from "../world/Properties";

/**
 * @import { Session } from "../session/Session";
 * @import { TileMap } from "../world/TileMap";
 * @import { SpawnClass } from "./Entity";
 */

/**
 * @class Spawner
 * @property {TileMap} lastMap
 * Spawns other Entities in a TileMap
 */
export class Spawner extends Entity
{
	/**
	 * Construct a Spawner object
	 * @param {object} spawnData - Named params
	 * @param {string} [spawnData.spawnType] - The `type` from the Entity definition
	 * @param {SpawnClass} spawnData.spawnClass - The class of the Entity controller object
	 * @param {Session} spawnData.session - The current Session
	 * @param {TileMap} spawnData.map - The current Session
	 * @param {object} [spawnData.properties] - Properties from TMJ TileMap
	 * @param {object} [spawnData.entityDef] - The current Session
	 * @param {number} [spawnData.x] - x position
	 * @param {number} [spawnData.y] - y position
	 */
	constructor(spawnData)
	{
		super(spawnData);

		this.spawnData = spawnData;
		this.spawnType = spawnData.spawnType;
		this.spawnClass = spawnData.spawnClass;
		this.session = spawnData.session;
		this.props = new Properties(spawnData.properties ?? [], this);

		this.flags |= Entity.E_STATIC;

		/** @type {TileMap|null} */
		this.lastMap = null;
	}

	/**
	 * Tick the simulation once.
	 * @param {number} delta
	 */
	simulate(delta)
	{
		const spawnClass = this.spawnData.spawnClass;
		const entityDef = {...this.spawnData.entityDef};

		const map = this.spawnData.map;

		const entity = new Entity({
			spawnClass
			, session: this.session
			, x: this.x
			, y: this.y
			, map
			, ...entityDef
		});

		this.session.world.motionGraph.add(entity, map);
		entity.lastMap = map;
		map.entities.set(entity.id, entity);
		this.session.addEntity(entity);
		this.session.removeEntity(this);
		super.simulate(delta);
	}
}
