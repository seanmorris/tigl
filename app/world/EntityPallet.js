const objectPallet = {};

export class EntityPallet
{
	static async resolve(typeName)
	{
		if(typeName[0] === '@')
		{
			if(objectPallet[ typeName ])
			{
				return objectPallet[ typeName ];
			}
		}
		else if(typeName === 'http://' || typeName === 'https://')
		{
			return (await import(typeName)).default;
		}
	}

	static register(typeName, spawnClass)
	{
		if(objectPallet[typeName])
		{
			console.warn(`Overwriting spawnclass!`);
		}

		objectPallet[typeName] = spawnClass;
	}
}