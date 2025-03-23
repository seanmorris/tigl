export class Properties
{
	constructor(properties, map)
	{
		this.properties = {};

		for(const property of properties)
		{
			if(!this.properties[ property.name ])
			{
				this.properties[ property.name ] = [];
			}

			this.properties[ property.name ].push(property.value);
		}
	}

	get(name, index = 0)
	{
		if(!this.properties[name])
		{
			return;
		}

		return this.properties[name][index];
	}

	getAll(name)
	{
		return [...this.properties[name]];
	}
}
