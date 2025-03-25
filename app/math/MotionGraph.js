import { Entity } from "../model/Entity";
import { Region } from "../sprite/Region";

export class MotionGraph
{
	static globalMap = new WeakMap;
	backmap = new WeakMap;
	entities = new Map;

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

	getParent(entity)
	{
		return this.backmap.get(entity);
	}

	delete(entity)
	{
		if(!this.backmap.has(entity))
		{
			return;
		}

		this.entities.get(this.backmap.get(entity)).delete(entity);
		this.backmap.delete(entity);
	}

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

	moveChildren(entity, x, y)
	{
		if(!this.entities.has(entity))
		{
			return new Set;
		}

		if(x === 0 && y === 0)
		{
			return new Set;
		}

		let children = this.entities.get(entity);

		for(const child of children)
		{
			if(entity.session.removed.has(child))
			{
				continue;
			}

			child.x += x;
			child.y += y;
			const maps = entity.session.world.getMapsForPoint(child.x, child.y);

			if(child instanceof Entity)
			{
				maps.forEach(map => map.moveEntity(child));
			}
			else if(child instanceof Region)
			{
				maps.forEach(map => map.regionTree.move(child.rect));
			}

			this.moveChildren(child, x, y);
		}

		return children;
	}
}