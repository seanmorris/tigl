export class Properties
{
	constructor(properties, owner, defaults = [])
	{
		this.properties = {};
		this.owner = owner;
		this.add(...properties);

		for(const {name} of defaults)
		{
			if(!this.has(name)) this.add(...defaults);
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

	has(name)
	{
		return !!this.properties[name];
	}

	add(...properties)
	{
		for(const property of properties)
		{
			if(!this.properties[ property.name ])
			{
				this.properties[ property.name ] = [];
			}

			switch(property.type)
			{
				case 'color':
					this.properties[ property.name ].push(new Uint8ClampedArray([
						parseInt(property.value.substr(3 ,2), 16),
						parseInt(property.value.substr(5 ,2), 16),
						parseInt(property.value.substr(7 ,2), 16),
						parseInt(property.value.substr(1 ,2), 16),
					]));

					break;

				case 'file':
						this.properties[ property.name ].push([
							new URL(property.value, this.owner.src)
						]);

						break;

				default:
					this.properties[ property.name ].push(property.value);
			}
		}
	}

	getAll(name)
	{
		return [...this.properties[name]];
	}
}
