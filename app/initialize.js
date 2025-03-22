import { Router } from 'curvature/base/Router';
import { View } from 'home/View';

const view = new View();

Router.listen(view, {
	'*': (...args) => {
		console.log(args);
	}
});

document.addEventListener('DOMContentLoaded', () => view.render(document.body));
