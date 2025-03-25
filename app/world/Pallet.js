
export class Pallet
{
	objectPallet = {};

	async resolve(typeName)
	{
		if(typeName[0] === '@')
		{
			if(this.objectPallet[ typeName ])
			{
				return this.objectPallet[ typeName ];
			}
		}
		else if(typeName === 'http://' || typeName === 'https://')
		{
			return (await import(typeName)).default;
		}
	}

	register(typeName, spawnClass)
	{
		if(this.objectPallet[typeName])
		{
			console.warn(`Overwriting spawnclass!`);
		}

		this.objectPallet[typeName] = spawnClass;
	}
}