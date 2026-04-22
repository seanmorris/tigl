import { Bindable } from "curvature/base/Bindable";
import { Rectangle } from "../math/Rectangle";
import { Sprite } from '../sprite/Sprite';
import { Properties } from "../world/Properties";
import { SpriteSheet } from "../sprite/SpriteSheet";

/**
 * @import { Session } from "../session/Session";
 * @import { TmxPropertyDefList } from '../world/Properties';
 * @import { TileMap } from "../world/TileMap";
 */

/**
 * @class Entity
 * Represents an entity
 * @property {object} controller - The Entity controller object
 * @property {number} id - The ID of the Entity
 * @property {number} xSpriteOffset - The x offset for the Sprite
 * @property {number} ySpriteOffset - The y offset for the Sprite
 * @property {number} flags - The Entity flags
 * @property {number} x - The x position
 * @property {number} y - The y position
 * @property {number} width - The hitbox width
 * @property {number} height - The hitbox height
 * @property {Sprite} sprite - The Sprite object
 * @property {object} inputManager - The input manager object
 * @property {Session} session - The Session
 * @property {Properties} props - The properties
 * @property {object} entityData - The original entityData object
 * @property {Rectangle} rect - The Rectangle of the Entity
 * @property {number} xOrigin - The original x position
 * @property {number} yOrigin - The original y position
 * @property {boolean} sleeping - Whether the Entity is asleep
 * @property {boolean} fresh - Whether the Entity just spawned
 * @property {TileMap} map - The map that spawned the Entity
 * @property {TileMap} currentMap - The map the Entity is currently on
 * @property {boolean} grounded - Whether the Entity is grounded
 */
export class Entity
{
	/**
	 * @property {number} E_SOLID - Flag the Entity as Solid
	 */
	static E_SOLID = 0b0000_0001;

	/**
	 * @property {number} E_PLATFORM - Flag the Entity as a Platform
	 */
	static E_PLATFORM = 0b0001_0000;

	/**
	 * @property {number} E_STATIC - Flag the Entity as a Static
	 */
	static E_STATIC = 0b1000_0000;

	map;

	/**
	 * Construct an Entity object.
	 * @param {object} entityData - Named params
	 * @param {Session} entityData.session - The SpawnClass of the Entity
	 * @param {object} [entityData.controller] - The Entity Controller object
	 * @param {new () => object} [entityData.spawnClass] - The SpawnClass of the Entity
	 * @param {object} [entityData.inputManager] - The inputManager for the Entity
	 * @param {Sprite} [entityData.sprite] - The Sprite for the Entity
	 * @param {number} [entityData.x] - The x position of the Entity
	 * @param {number} [entityData.y] - The y position of the Entity
	 * @param {number} [entityData.width] - The width of the Entity
	 * @param {number} [entityData.height] - The height  of the Entity
	 * @param {number} [entityData.xSpriteOffset] - The x offset for the sprite
	 * @param {number} [entityData.ySpriteOffset] - The y offset for the sprite
	 * @param {number} [entityData.id] - The ID of the Entity
	 * @param {TmxPropertyDefList} [entityData.properties] - The raw properties of the Entity (TMX format)
	 * @param {TileMap} [entityData.map] - The tileMap that spawned the Entity
	 */
	constructor(entityData)
	{
		// this[Bindable.Prevent] = true;

		const {
			controller
			, spawnClass
			, session
			, inputManager
			, sprite
			, x = 0
			, y = 0
			, width = 32
			, height = 32
			, xSpriteOffset = 0
			, ySpriteOffset = 0
		} = entityData;

		this.controller = controller;
		this.id = entityData.id;

		this.xSpriteOffset = xSpriteOffset;
		this.ySpriteOffset = ySpriteOffset;

		this.flags = 0b0000_0000;

		this.x = x;
		this.y = y;

		this.width  = width;
		this.height = height;

		this.sprite = sprite || new Sprite({
			session
			// , src: '/thing.png'
			// , color: spawnClass ? spawnClass.spriteColor : null
			, spriteSheet: spawnClass
				? new SpriteSheet({src: spawnClass.spriteSheet})
				: undefined
			, width
			, height
		});

		this.inputManager = inputManager;

		/** @type {Session} */
		this.session = session;

		this.props = new Properties(entityData.properties ?? [], this);

		this.entityData = entityData;

		this.rect = new Rectangle(
			x - width * 0.5, y - height,
			x + width * 0.5, y
		);

		this.xOrigin = x;
		this.yOrigin = y;

		this.sleeping = false;

		this.fresh = true;
		this.map = entityData.map;
		this.currentMap = this.map;
		this.grounded = false;

		this.controller && this.controller.create(this, this.entityData);
	}

	/**
	 * Tick the Entity's simulation logic once.
	 * @param {number} delta - MS since last tick
	 */
	simulate(delta)
	{
		const startX = this.x;
		const startY = this.y;

		const world = this.session.world;

		if(this.fresh)
		{
			this.fresh = false;
		}

		this.controller && this.controller.simulate(this, delta);

		const motionParent = world.motionGraph.getParent(this);
		const maps = world.getMapsForPoint(this.x, this.y);
		// const firstMap = [...maps][0];

		if(motionParent
			&& !world.motionGraph.getParent(motionParent)
			&& !maps.has(motionParent)
		){
			world.motionGraph.delete(this);
		}

		if(this.grounded && this.currentMap && !world.motionGraph.getParent(this))
		{
			world.motionGraph.add(this, this.currentMap);
		}

		if(startX !== 0 || startY !== 0)
		{
			world.motionGraph.moveChildren(
				this
				, this.x - startX
				, this.y - startY
			);

			this.rect.x1 = this.x - this.width * 0.5;
			this.rect.x2 = this.x + this.width * 0.5;

			this.rect.y1 = this.y - this.height;
			this.rect.y2 = this.y;
		}

		if(this.sprite)
		{
			this.sprite.x = this.x + this.xSpriteOffset;
			this.sprite.y = this.y + this.ySpriteOffset;
		}
	}

	/**
	 * Handle two Entities colliding
	 * @param {Entity} other - The other entity in the collision
	 * @param {[number, number]} point - The point where collision was detected
	 */
	collide(other, point)
	{
		this.controller && this.controller.collide(this, other, point);
	}

	/**
	 * Put the Entity into sleep-mode
	 */
	sleep()
	{
		if(!this.sleeping)
		{
			this.controller && this.controller.sleep(this);
			this.sleeping = true;
		}
	}

	/**
	 * Take the Entity out of sleep-mode
	 */
	wakeup()
	{
		if(this.sleeping)
		{
			this.controller && this.controller.wakeup(this);
			this.sleeping = false;
		}
	}

	/**
	 * Destroy the Entity and remove it from play.
	 */
	destroy()
	{
		this.controller && this.controller.destroy(this);
	}
}
