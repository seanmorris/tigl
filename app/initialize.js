import { Tag    } from 'curvature/base/Tag';
import { Router } from 'curvature/base/Router';
import { View   } from 'home/View';

if(Proxy !== undefined)
{
	document.addEventListener('DOMContentLoaded', () => {
		const view = new View();
		const body = new Tag(document.querySelector('body'));
		body.clear();
		view.render(body.element);
		Router.listen(view);
		require('initialize');
	});
}
else
{
	// document.write(require('./Fallback/fallback.tmp'));
}

