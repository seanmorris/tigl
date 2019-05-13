let classes = {};
let objects = {};

export class Injectable
{
	constructor()
	{
		let injections = this.constructor.injections();
		let context    = this.constructor.context();

		if(!classes[context])
		{
			classes[context] = {};
		}

		if(!objects[context])
		{
			objects[context] = {};
		}

		for(let name in injections)
		{
			let injection = injections[name];

			if(classes[context][name] || !injection.prototype)
			{
				continue;
			}

			if(/[A-Z]/.test(String(name)[0]))
			{
				classes[context][name] = injection;
			}

		}

		for(let name in injections)
		{
			let instance  = undefined;
			let injection = classes[context][name] || injections[name];

			if(/[A-Z]/.test(String(name)[0]))
			{
				if(injection.prototype)
				{
					if(!objects[context][name])
					{
						objects[context][name] = new injection;
					}
				}
				else
				{
					objects[context][name] = injection;
				}

				instance = objects[context][name];
			}
			else
			{
				if(injection.prototype)
				{
					instance = new injection;
				}
				else
				{
					instance = injection;
				}
			}

			Object.defineProperty(this, name, {
				enumerable: false,
				writable:   false,
				value:      instance
			});
		}

	}

	static injections()
	{
		return {};
	}

	static context()
	{
		return '.';
	}

	static inject(injections, context = '.')
	{
		if(!(this.prototype instanceof Injectable || this === Injectable))
		{
			throw new Error(`Cannot access injectable subclass!

Are you trying to instantiate like this?

	new X.inject({...});

If so please try:

	new (X.inject({...}));

Please note the parenthesis.
`);
		}

		let existingInjections = this.injections();

		return class extends this {
			static injections()
			{
				return Object.assign({}, existingInjections, injections);
			}
			static context()
			{
				return context;
			}
		};
	}
}
