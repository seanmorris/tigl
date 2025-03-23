import { Bindable } from "curvature/base/Bindable";
import { Rectangle } from "./Rectangle";

export class QuadTree extends Rectangle
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
		this.count = 0;

	}

	add(entity)
	{
		if(!this.contains(entity.x, entity.y))
		{
			// console.warn('No QuadTree cell found!');
			return false;
		}

		const xSize = this.x2 - this.x1;
		const ySize = this.y2 - this.y1;

		if(this.split)
		{
			return this.ulCell.add(entity)
				|| this.urCell.add(entity)
				|| this.blCell.add(entity)
				|| this.brCell.add(entity);
		}
		else if(this.items.size && xSize > this.minSize && ySize > this.minSize)
		{
			this.split  = true;

			const xSizeHalf = 0.5 * xSize;
			const ySizeHalf = 0.5 * ySize;

			this.ulCell = new QuadTree(
				this.x1
				, this.y1
				, this.x1 + xSizeHalf
				, this.y1 + ySizeHalf
				, this.minSize
				, this
			);

			this.blCell = new QuadTree(
				this.x1
				, this.y1 + ySizeHalf
				, this.x1 + xSizeHalf
				, this.y2
				, this.minSize
				, this
			);

			this.urCell = new QuadTree(
				this.x1 + xSizeHalf
				, this.y1
				, this.x2
				, this.y1 + ySizeHalf
				, this.minSize
				, this
			);

			this.brCell = new QuadTree(
				this.x1 + xSizeHalf
				, this.y1 + ySizeHalf
				, this.x2
				, this.y2
				, this.minSize
				, this
			);

			let parent = this;
			while(parent)
			{
				parent.count -= this.items.size;
				parent = parent.parent;
			}

			for(const item of this.items)
			{
				let parent = this;
				let added = false;

				while(parent)
				{
					added = parent.ulCell.add(item)
						|| parent.urCell.add(item)
						|| parent.blCell.add(item)
						|| parent.brCell.add(item);
					if(added) break;
					parent = parent.parent;
				}

				if(!added)
				{
					console.warn('Bad split!');
				}

				this.items.delete(item);
			}

			return this.ulCell.add(entity)
				|| this.urCell.add(entity)
				|| this.blCell.add(entity)
				|| this.brCell.add(entity);

		}
		else
		{
			if(!this.items.has(entity))
			{
				let parent = this;
				while(parent)
				{
					parent.count++;
					parent = parent.parent;
				}
			}

			this.backMap.set(entity, this);
			this.items.add(entity);
			return true;
		}
	}

	move(entity)
	{
		if(!this.backMap.has(entity))
		{
			// console.warn('Entity not in QuadTree.');
			return this.add(entity);
		}

		const startCell = this.backMap.get(entity);

		let cell = startCell;
		while(cell && !cell.contains(entity.x, entity.y))
		{
			cell = cell.parent;
		}

		if(!cell)
		{
			console.warn('No QuadTree cell found!');
			startCell.delete(entity);
			return false;
		}

		if(cell !== startCell)
		{
			startCell.delete(entity);
			cell.add(entity);
		}

		return true;
	}

	delete(entity)
	{
		if(!this.backMap.has(entity))
		{
			console.warn('Entity not in QuadTree.');
			return false;
		}

		const cell = this.backMap.get(entity);
		cell.items.delete(entity);

		if(cell.parent)
		{
			cell.parent.prune();
		}

		this.backMap.delete(entity);

		let parent = cell;
		while(parent)
		{
			parent.count--;
			parent = parent.parent;
		}

		return true;
	}

	isPrunable()
	{
		if(this.split)
		{
			return this.ulCell.isPrunable()
				&& this.urCell.isPrunable()
				&& this.blCell.isPrunable()
				&& this.brCell.isPrunable();
		}
		else
		{
			return this.items.size === 0;
		}
	}

	prune()
	{
		if(!this.isPrunable())
		{
			return false;
		}

		this.split = false;

		this.ulCell = null;
		this.urCell = null;
		this.blCell = null;
		this.brCell = null;

		return true;
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

	select(x1, y1, x2, y2)
	{
		if(x1 > this.x2 || x2 < this.x1)
		{
			return new Set;
		}

		if(y1 > this.y2 || y2 < this.y1)
		{
			return new Set;
		}

		if(this.split)
		{
			return new Set([
				...this.ulCell.select(x1, y1, x2, y2)
				, ...this.urCell.select(x1, y1, x2, y2)
				, ...this.blCell.select(x1, y1, x2, y2)
				, ...this.brCell.select(x1, y1, x2, y2)
			]);
		}

		return new Set(this.items);
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

		return new Set(this.items);
	}
}
