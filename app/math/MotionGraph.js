import { Entity } from "../model/Entity";
import { Region } from "../sprite/Region";

/**
 * @import { TileMap } from "../world/TileMap"
 */

/**
 * Tracks the parent/child relationships of movable objects in the world.
 */
export class MotionGraph
{
	/**
	 * @property {WeakMap<Entity,MotionGraph>} globalMap - Maps objects back to MotionGraphs they're in.
	 */
	static globalMap = new WeakMap;

	/**
	 * @property {WeakMap<Entity,MotionGraph>} backmap - Maps objects back to MotionGraphs they're in.
	 */
	backmap = new WeakMap;

	/**
	 * @property {Map<Entity,Entity|TileMap>} entities - Maps objects back to MotionGraphs they're in.
	 */
	entities = new Map;

	/**
	 * Attach an entity to a motion parent
	 * @param {Entity} entity - The child Entity
	 * @param {Entity|TileMap} parent - The parent
	 */
	add(entity, parent)
	{
		if(this.backmap.has(entity))
		{
			this.entities.get(this.backmap.get(entity)).delete(entity);
		}

		if(!this.entities.has(parent))
		{
			this.entities.set(parent, new Set());
		}

		this.entities.get(parent).add(entity);
		this.backmap.set(entity, parent);

		if(!this.constructor.globalMap.has(entity))
		{
			this.constructor.globalMap.set(entity, new Set);
		}

		this.constructor.globalMap.get(entity).add(this);
	}

	/**
	 * Return the motion parent for an Entity
	 * @param {Entity} entity - The child to select a parent by
	 * @returns {Entity|TileMap} - The motion parent of the child
	 */
	getParent(entity)
	{
		return this.backmap.get(entity);
	}

	/**
	 * Return the Entities for a motion parent
	 * @param {Entity|TileMap} parent - The motion parent to select children by
	 * @returns {Set<Entity>} - The children of the parent
	 */
	getChildren(parent)
	{
		return this.entities.get(parent);
	}

	/**
	 * Remove an entity from a motion parent
	 * @param {Entity} entity - The Entity to remove
	 * @returns {void}
	 */
	delete(entity)
	{
		if(!this.backmap.has(entity))
		{
			return;
		}

		this.entities.get(this.backmap.get(entity)).delete(entity);
		this.backmap.delete(entity);
	}

	/**
	 * Remove an entity from all MotionGraphs motion parents
	 * @param {Entity} entity - The Entity to remove
	 * @returns {void}
	 */
	static deleteFromAllGraphs(entity)
	{
		if(!this.globalMap.has(entity))
		{
			return;
		}

		const graphs = this.globalMap.get(entity);

		for(const graph of graphs)
		{
			graph.delete(entity);
		}
	}

	/**
	 * Move the chidlren of a motion parent
	 * @param {Entity|TileMap} parent - The parent to select children by
	 * @param {number} x - The x offset
	 * @param {number} y - The y offset
	 * @returns {Set<Entity>} - The children that moved
	 */
	moveChildren(parent, x, y)
	{
		if(!this.entities.has(parent))
		{
			return new Set;
		}

		if(x === 0 && y === 0)
		{
			return new Set;
		}

		let children = this.entities.get(parent);

		for(const child of children)
		{
			if(parent.session.removed.has(child))
			{
				continue;
			}

			const maps = parent.session.world.getMapsForPoint(child.x, child.y);

			if(child instanceof Entity)
			{
				child.x += x;
				child.y += y;
				maps.forEach(map => map.moveEntity(child));
			}
			else if(child instanceof Region)
			{
				child.move(x, y);
				maps.forEach(map => map.regionTree.move(child.rect));
			}

			this.moveChildren(child, x, y);
		}

		return children;
	}
}