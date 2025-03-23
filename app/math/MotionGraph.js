export class MotionGraph
{
	entities = new Map;

	add(entity)
	{
		if(this.entities.has(entity))
		{
			return;
		}

		this.entities.set(entity, new MotionGraph);
	}

	delete(entity)
	{
		this.entities.delete(entity);
	}
}