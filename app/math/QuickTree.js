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

	add(entity)
	{
		if(!super.add(entity))
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

	select(x1, y1, x2, y2)
	{
		const selectRect = new Rectangle(x1, y1, x2, y2);
		const result = super.select(x1, y1, x2, y2);

		for(const entity of result)
		{
			if(!selectRect.contains(entity.x, entity.y))
			{
				result.delete(entity);
			}
		}

		return result;
	}
}
