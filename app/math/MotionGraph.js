import { Entity } from "../model/Entity.js";
import { Region } from "../sprite/Region.js";

/**
 * @import { TileMap } from "../world/TileMap"
 */

/**
 * @class MotionGraph
 * Tracks the parent/child relationships of movable objects in the world.
 */
export class MotionGraph
{
	/** @property {} globalMap - Maps objects back to MotionGraphs they're in. */
	/** @type {WeakMap<Entity|Region,Set<MotionGraph>>} globalMap - Maps objects back to MotionGraphs they're in. */
	static globalMap = new WeakMap;

	/** @property {WeakMap<Entity|Region,Entity|Region|TileMap>} backmap - Maps parents back to children. */
	backmap = new WeakMap;

	/** @type {Map<Entity|Region|TileMap,Set<Entity|Region>>} entities - Maps children to parents. */
	entities = new Map;

	/**
	 * Attach an entity to a motion parent
	 * @param {Entity|Region} entity - The child Entity
	 * @param {Entity|Region|TileMap} parent - The parent
	 */
	add(entity, parent)
	{
		const oldParent = this.backmap.get(entity);

		if(oldParent)
		{
			const oldSet = this.entities.get(oldParent);

			if(oldSet) oldSet.delete(entity);
		}

		const newSet = this.entities.get(parent);

		if(!newSet)
		{
			this.entities.set(parent, new Set([entity]));
		}
		else
		{
			newSet.add(entity);
		}

		this.backmap.set(entity, parent);

		/** @type { typeof MotionGraph } */
		this.constructor;

		const globalSet = this.constructor.globalMap.get(entity);

		if(!globalSet)
		{
			this.constructor.globalMap.set(entity, new Set([this]));
		}
		else
		{
			globalSet.add(this);
		}
	}

	/**
	 * Return the motion parent for an Entity
	 * @param {Entity|Region} entity - The child to select a parent by
	 * @returns {Entity|Region|TileMap|undefined} - The motion parent of the child
	 */
	getParent(entity)
	{
		return this.backmap.get(entity);
	}

	/**
	 * Return the Entities for a motion parent
	 * @param {Entity|Region|TileMap} parent - The motion parent to select children by
	 * @returns {Set<Entity|Region>} - The children of the parent
	 */
	getChildren(parent)
	{
		return this.entities.get(parent) || new Set;
	}

	/**
	 * Remove an entity from a motion parent
	 * @param {Entity|Region} entity - The Entity to remove
	 * @returns {void}
	 */
	delete(entity)
	{
		if(!this.backmap.has(entity))
		{
			return;
		}

		const parent = this.backmap.get(entity);

		const set = this.entities.get(parent);

		if(set) set.delete(entity);

		this.backmap.delete(entity);
	}

	/**
	 * Remove an entity from all MotionGraphs motion parents
	 * @param {Entity|Region} entity - The Entity to remove
	 * @returns {void}
	 */
	static deleteFromAllGraphs(entity)
	{
		if(!this.globalMap.has(entity))
		{
			return;
		}

		const graphs = this.globalMap.get(entity);

		if(graphs)
		for(const graph of graphs)
		{
			graph.delete(entity);
		}
	}

	/**
	 * Move the chidlren of a motion parent
	 * @param {Entity|Region|TileMap} parent - The parent to select children by
	 * @param {number} x - The x offset
	 * @param {number} y - The y offset
	 * @returns {Set<Entity|Region>} - The children that moved
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

		if(children)
		{
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

		return new Set;
	}
}