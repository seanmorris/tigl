import { QuadTree } from "./QuadTree";
import { Rectangle } from "./Rectangle";

/**
 * @import { Entity } from "../model/Entity";
 */

const registry = new WeakMap();

/**
 * Optimized QuadTree
 */
export class QuickTree extends QuadTree
{
	/**
	 * Remove an Entity from all QuickTrees
	 * @param {Entity} entity - The Entity to remove from the QuickTree
	 * @returns {void}
	 */
	static deleteFromAllTrees(entity)
	{
		if(!registry.has(entity))
		{
			return;
		}

		registry.get(entity).forEach(tree => tree.delete(entity));
	}

	/**
	 * Add an object to a QuickTree
	 * @param {Entity} entity - The Entity to add
	 * @param {number} xOffset - The x offset (swaps between global/local coords)
	 * @param {number} yOffset - The y offset (swaps between global/local coords)
	 * @returns {boolean} - Whether the Entity was added to the QuickTree
	 */
	add(entity, xOffset = 0, yOffset = 0)
	{
		if(!super.add(entity, xOffset, yOffset))
		{
			if(!this.parent)
			{
				// console.warn('Failed to add object to QuickTree.');
			}

			return false;
		}

		if(!registry.has(entity))
		{
			registry.set(entity, new Set());
		}

		registry.get(entity).add(this);

		return true;
	}

	/**
	 * Remove an object from a QuickTree
	 * @param {Entity} entity - The entity to remove
	 * @returns {boolean} - Whether the Entity was removed from the QuickTree
	 */
	delete(entity)
	{
		if(!super.delete(entity))
		{
			return false;
		}

		if(registry.has(entity))
		{
			registry.get(entity).delete(this);
		}

		return true;
	}

	/**
	 * Select Entities by a rectangle.
	 * @param {number} x1 - The x value of the top/left
	 * @param {number} y1 - The y value of the top/left
	 * @param {number} x2 - The x value of the bottom/right
	 * @param {number} y2 - The y value of the bottom/right
	 * @param {number} xO - The x offset (swaps between global/local coords)
	 * @param {number} yO - The y offset (swaps between global/local coords)
	 * @returns {Set<Entity>} = The Entities inside the rectangle
	 */
	select(x1, y1, x2, y2, xO = 0, yO = 0)
	{
		const selectRect = new Rectangle(x1, y1, x2, y2);
		const result = super.select(x1, y1, x2, y2);

		for(const entity of result)
		{
			if(!selectRect.contains(entity.x + xO, entity.y + yO))
			{
				result.delete(entity);
			}
		}

		return result;
	}

	/**
	 * Throw a warning on a "bad split"
	 * @param {Entity} item - The item that caused the bad split
	 */
	onBadSplit(item)
	{
		if(item.session && item.session.world)
		{
			const maps = item.session.world.getMapsForPoint(item.x, item.y);

			maps.forEach(map => map.moveEntity(item));

			if(!maps.size)
			{
				console.warn('Bad split!', item);
			}
		}
	}
}
