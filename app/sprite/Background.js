import { Bindable    } from 'curvature/base/Bindable';

import { Surface     } from './Surface';
import { SpriteSheet } from './SpriteSheet';

export class Background
{
	constructor(gl2d, map)
	{
		Bindable.makeBindable(this);

		this.gl2d        = gl2d;
		this.panes       = [];
		this.panesXY     = {};
		this.maxPanes    = 9;

		this.surfaceX    = 10;
		this.surfaceY    = 10;

		this.spriteSheet = new SpriteSheet;

		this.tileWidth   = 32;
		this.tileHeight  = 32;

		this.map         = map;
	}

	cachePane(pane, x, y)
	{
		if(this.panes.length >= this.maxPanes)
		{
			let deadPane = this.panes.pop();
		}

		this.panes.unshift(pane);

		if(!this.panesXY[x])
		{
			this.panesXY[x] = {};
		}

		this.panesXY[x][y] = pane;
	}

	renderPane(x, y, forceUpdate)
	{
		let pane;
		const gl2d = this.gl2d;

		let paneX  = x * (this.tileWidth * this.surfaceX);
		let paneY  = y * (this.tileHeight * this.surfaceY);

		if(!(this.panesXY[paneX] && this.panesXY[paneX][paneY]))
		{
			// console.log('render.');
			pane = new Surface(
				gl2d
				, this.map
				, this.surfaceX
				, this.surfaceY
				, paneX
				, paneY
			);
		}
		else
		{
			pane = this.panesXY[paneX][paneY];
		}

		this.cachePane(pane, paneX, paneY);
	}

	draw()
	{
		const centerX = Math.floor(this.gl2d.camera.x / (this.surfaceX * this.tileWidth));
		const centerY = Math.floor(this.gl2d.camera.y / (this.surfaceY * this.tileHeight));

		let range = [-1,0,1];
		// let range = [-2,-1,0,1,2];

		for(let x in range)
		{
			for(let y in range)
			{
				this.renderPane(centerX + range[x], centerY + range[y]);
			}
		}

		this.panes.map((p)=>{
			p.draw();
		});
	}

	resize(x, y)
	{
		for(let i in this.panesXY)
		{
			for(let j in this.panesXY[i])
			{
				delete this.panesXY[i][j];
			}
		}

		this.surfaceX = Math.ceil(x / this.tileWidth);
		this.surfaceY = Math.ceil(y / this.tileHeight);
	}

	simulate()
	{
		
	}
}
