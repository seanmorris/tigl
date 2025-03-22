import { Quadtree } from "./Quadtree";
import { Rectangle } from "./Rectangle";

const registry = new WeakMap();

export class QuickTree extends Quadtree
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

	select(x, y, w, h)
	{
		const selectRect = new Rectangle(x, y, x + w, y + h);
		const result = super.select(x, y, w, h);

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
