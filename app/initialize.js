import { Router } from 'curvature/base/Router';
import { View   } from 'home/View';

if(Proxy !== undefined)
{
	document.addEventListener('DOMContentLoaded', () => {
		const view = new View();
		
		Router.listen(view);
		
		view.render(document.body);
	});
}
else
{
	// document.write(require('./Fallback/fallback.tmp'));
}
