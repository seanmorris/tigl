import { Tag    } from 'curvature/base/Tag';
import { Router } from 'curvature/base/Router';
import { View   } from 'home/View';

import { Single } from 'inject/Single';
import { single } from 'inject/Single';

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

// import { Injectable } from 'inject/Injectable';
// import { Container } from 'inject/Container';

// class Star
// {
// 	constructor()
// 	{
// 		// super();
// 		this.x = 333 + '..' + Math.random();
// 	}

// 	blink()
// 	{
// 		console.log(this.x);
// 	}
// }

// class RedStar extends Star
// {
// 	constructor()
// 	{
// 		super();
// 		this.x = 666 + '..' + Math.random();
// 	}
// }

// class Lights extends Injectable.inject({star: Star})
// {
// 	blink()
// 	{
// 		if(this.x)
// 		{
// 			console.log('!!!');
// 		}

// 		this.star.blink();
// 	}
// }

// class XmasTree extends Injectable.inject({
// 	lights: Lights
// 	, star: Star
// }) {
// 	constructor()
// 	{
// 		super();

// 		console.log(this.star);

// 		this.star.blink();
// 		this.lights.blink();
// 	}
// }


// // let star    = new Star;
// let redStar = new RedStar;
// // let container = new ();
// // let container = new Container({});

// // console.log(container);

// // Container.inject();

// let tree = new (XmasTree.inject({star: RedStar}));

// // console.log(tree);
