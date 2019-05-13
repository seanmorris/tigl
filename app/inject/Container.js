import { Injectable } from './Injectable';

export class Container extends Injectable
{
	inject(injections)
	{
		return new this.constructor(Object.assign({}, this, injections));
	}
}
