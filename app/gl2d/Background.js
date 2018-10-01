import { Bindable    } from 'curvature/base/Bindable';

import { Surface     } from './Surface';
import { SpriteSheet } from './SpriteSheet';

export class Background
{
	constructor(gl2d)
	{
		Bindable.makeBindable(this);

		this.gl2d     = gl2d;

		this.position = {
			x: 0, y: 0
		};

		this.position = Bindable.makeBindable(this.position);
		this.spriteSheet = new SpriteSheet

		const surface  = new Surface(gl2d, this.spriteSheet);

		this.panes    = [];
		this.panesXY  = [];
		this.paneSize = surface.xSize;
		this.maxPanes = 9;
		this.size     = 32;

		this.panesToEdgeX = Math.floor(
			(this.gl2d.camera.width/2)/surface.xSize
		)+1;

		this.panesToEdgeY = Math.floor(
			(this.gl2d.camera.height/2)/surface.ySize
		)+1;

		this.paneWidth  = surface.xSize * this.size;
		this.paneHeight = surface.ySize * this.size;

		gl2d.camera.bindTo('x', (v)=>{
			if(v > this.position.x + this.paneWidth)
			{
				this.position.x += this.paneWidth;
			}

			if(v < this.position.x)
			{
				this.position.x -= this.paneWidth;
			}
		});

		gl2d.camera.bindTo('y', (v)=>{
			if(v > this.position.y + this.paneHeight)
			{
				this.position.y += this.paneHeight;
			}

			if(v < this.position.y)
			{
				this.position.y -= this.paneHeight;
			}
		});

		this.position.bindTo('x', (v,k,t)=>{
			this.panes.map(p=>{
				if(t[k] < v)
				{
					p.x += this.paneWidth;
				}
				else if(t[k] > v)
				{
					p.x -= this.paneWidth;
				}
			});
		});

		this.position.bindTo('y', (v,k,t)=>{
			this.panes.map(p=>{
				if(t[k] < v)
				{
					p.y += this.paneHeight;
				}
				else if(t[k] > v)
				{
					p.y -= this.paneHeight;
				}
			});
		});
	}

	cachePane(pane, x, y)
	{
		if(this.panes.length >= this.maxPanes)
		{
			let deadPane = this.panes.pop();

			if(!this.panesXY[deadPane.x])
			{
				this.panesXY[deadPane.x] = [];
			}

			this.panesXY[deadPane.x][deadPane.y] = null;
		}

		this.panes.unshift(pane);

		if(!this.panesXY[x])
		{
			this.panesXY[x] = [];
		}

		this.panesXY[x][y] = pane;
	}

	renderPane(x, y, forceUpdate)
	{
		let pane;

		if(!(this.panesXY[x] && this.panesXY[x][y]))
		{
			pane = new Surface(this.gl2d, this.spriteSheet);

			pane.x = x * this.paneWidth;
			pane.y = y * this.paneHeight;

			this.cachePane(pane, x ,y);
		}
		else
		{
			pane = this.panesXY[x][y];
		}

		pane.draw();
	}

	draw()
	{
		let range = [-1, 0, 1];
		// let range = [0];

		for(let x in range)
		{
			for(let y in range)
			{
				this.renderPane(range[x], range[y]);
			}
		}
	}

	simulate()
	{
		
	}
}
