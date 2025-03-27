import { QuadTree } from "./QuadTree";
import { Rectangle } from "./Rectangle";

const registry = new WeakMap();

export class QuickTree extends QuadTree
{
	static deleteFromAllTrees(entity)
	{
		if(!registry.has(entity))
		{
			return;
		}

		registry.get(entity).forEach(tree => tree.delete(entity));
	}

	add(entity, xOffset = 0, yOffset = 0)
	{
		if(!super.add(entity, xOffset, yOffset))
		{
			if(!this.parent)
			{
				console.warn('Failed to add object to QuickTree.');
			}

			return;
		}

		if(!registry.has(entity))
		{
			registry.set(entity, new Set());
		}

		registry.get(entity).add(this);
	}

	delete(entity)
	{
		if(!super.delete(entity))
		{
			return;
		}

		if(registry.has(entity))
		{
			registry.get(entity).delete(this);
		}
	}

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

	onBadSplit(item)
	{
		if(item.session && item.session.world)
		{
			const maps = item.session.world.getMapsForPoint(item.x, item.y);
			maps.forEach(map => console.log(map.moveEntity(item)));

			if(!maps.size)
			{
				console.warn('Bad split!', item);
			}
		}
	}
}
