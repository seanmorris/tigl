import { Bindable } from "curvature/base/Bindable";
import { Rectangle } from "./Rectangle";

export class Quadtree extends Rectangle
{
	constructor(x1, y1, x2, y2, minSize = 0, parent = null)
	{
		super(x1, y1, x2, y2);

		this[Bindable.Prevent] = true;

		this.items = new Set;
		this.split = false;
		this.minSize = minSize || 10;
		this.backMap = parent ? parent.backMap : new Map
		this.parent = parent;

		this.ulCell = null;
		this.urCell = null;
		this.blCell = null;
		this.brCell = null;
	}

	add(entity)
	{
		if(!this.contains(entity.x, entity.y))
		{
			return;
		}

		const xSize = this.x2 - this.x1;
		const ySize = this.y2 - this.y1;

		if(this.split)
		{
			this.ulCell.add(entity);
			this.urCell.add(entity);
			this.blCell.add(entity);
			this.brCell.add(entity);
		}
		else if(this.items.size && xSize > this.minSize && ySize > this.minSize)
		{
			const xSizeHalf = 0.5 * xSize;
			const ySizeHalf = 0.5 * ySize;

			this.ulCell = new Quadtree(
				this.x1
				, this.y1
				, this.x1 + xSizeHalf
				, this.y1 + ySizeHalf
				, this.minSize
				, this
			);

			this.blCell = new Quadtree(
				this.x1
				, this.y1 + ySizeHalf
				, this.x1 + xSizeHalf
				, this.y2
				, this.minSize
				, this
			);

			this.urCell = new Quadtree(
				this.x1 + xSizeHalf
				, this.y1
				, this.x2
				, this.y1 + ySizeHalf
				, this.minSize
				, this
			);

			this.brCell = new Quadtree(
				this.x1 + xSizeHalf
				, this.y1 + ySizeHalf
				, this.x2
				, this.y2
				, this.minSize
				, this
			);

			for(const item of this.items)
			{
				this.items.delete(item);

				this.ulCell.add(item);
				this.urCell.add(item);
				this.blCell.add(item);
				this.brCell.add(item);
			}

			this.ulCell.add(entity);
			this.urCell.add(entity);
			this.blCell.add(entity);
			this.brCell.add(entity);

			this.split  = true;
		}
		else
		{
			this.backMap.set(entity, this);
			this.items.add(entity);
		}
	}

	move(entity)
	{
		if(!this.backMap.has(entity))
		{
			// console.warn('Entity not in Quadtree.');
			this.add(entity);
			return;
		}

		const startCell = this.backMap.get(entity);
		let cell = startCell;

		while(cell && !cell.contains(entity.x, entity.y))
		{
			cell = cell.parent;
		}

		if(!cell)
		{
			// console.warn('No QuadTree cell found!');
			startCell.delete(entity);
			return;
		}

		if(cell !== startCell)
		{
			startCell.delete(entity);
			cell.add(entity);
		}
	}

	delete(entity)
	{
		if(!this.backMap.has(entity))
		{
			console.warn('Entity not in Quadtree.');
			return;
		}

		const cell = this.backMap.get(entity);
		this.backMap.delete(entity);

		cell.items.delete(entity);

		if(cell.parent)
		{
			cell.parent.prune();
		}
	}

	isPrunable()
	{
		return !this.ulCell.split && this.ulCell.items.size === 0
			&& !this.urCell.split && this.urCell.items.size === 0
			&& !this.blCell.split && this.blCell.items.size === 0
			&& !this.brCell.split && this.brCell.items.size === 0;
	}

	prune()
	{
		if(!this.isPrunable())
		{
			return;
		}

		this.split = false;

		this.ulCell = null;
		this.urCell = null;
		this.blCell = null;
		this.brCell = null;
	}

	findLeaf(x, y)
	{
		if(!this.contains(x, y))
		{
			return null;
		}

		if(!this.split)
		{
			return this;
		}

		return this.ulCell.findLeaf(x, y)
			?? this.urCell.findLeaf(x, y)
			?? this.blCell.findLeaf(x, y)
			?? this.brCell.findLeaf(x, y);
	}

	has(entity)
	{
		if(this.split)
		{
			return this.ulCell.has(entity)
				|| this.urCell.has(entity)
				|| this.blCell.has(entity)
				|| this.brCell.has(entity);
		}

		return this.items.has(entity);
	}

	select(x, y, w, h)
	{
		const xMax = x + w;
		const yMax = y + h;

		if(xMax < this.x1 || x > this.x2)
		{
			return new Set;
		}

		if(yMax < this.y1 || y > this.y2)
		{
			return new Set;
		}

		if(this.split)
		{
			return new Set([
				...this.ulCell.select(x, y, w, h)
				, ...this.urCell.select(x, y, w, h)
				, ...this.blCell.select(x, y, w, h)
				, ...this.brCell.select(x, y, w, h)
			]);
		}

		return this.items;
	}

	dump()
	{
		if(this.split)
		{
			return new Set([
				...this.ulCell.dump()
				, ...this.urCell.dump()
				, ...this.blCell.dump()
				, ...this.brCell.dump()
			]);
		}

		return this.items;
	}
}
