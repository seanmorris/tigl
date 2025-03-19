import { Rectangle } from "./Rectangle";

export class Quadtree extends Rectangle
{
	constructor(x1, y1, x2, y2, minSize)
	{
		super(x1, y1, x2, y2);

		this.split = false;
		this.items = new Set;
		this.minSize = minSize;

		this.ulCell = null;
		this.urCell = null;
		this.blCell = null;
		this.brCell = null;
	}

	insert(entity)
	{
		if(!this.contains(entity.x, entity.y))
		{
			return;
		}

		const xSize = this.x2 - this.x1;
		const ySize = this.y2 - this.y1;

		if(this.items.size && xSize > this.minSize && ySize > this.minSize)
		{
			if(!this.split)
			{
				const xSizeHalf = 0.5 * xSize;
				const ySizeHalf = 0.5 * ySize;

				this.ulCell = new Quadtree(this.x1, this.y1,             this.x1 + xSizeHalf, this.y1 + ySizeHalf, this.minSize);
				this.blCell = new Quadtree(this.x1, this.y1 + ySizeHalf, this.x1 + xSizeHalf, this.y2,             this.minSize);

				this.urCell = new Quadtree(this.x1 + xSizeHalf, this.y1,             this.x2, this.y1 + ySizeHalf, this.minSize);
				this.brCell = new Quadtree(this.x1 + xSizeHalf, this.y1 + ySizeHalf, this.x2, this.y2,             this.minSize);

				this.split  = true;
			}

			for(const item of this.items)
			{
				this.ulCell.insert(item);
				this.urCell.insert(item);
				this.blCell.insert(item);
				this.brCell.insert(item);

				this.items.delete(item);
			}

			this.ulCell.insert(entity);
			this.urCell.insert(entity);
			this.blCell.insert(entity);
			this.brCell.insert(entity);
		}
		else
		{
			this.items.add(entity);
		}
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
