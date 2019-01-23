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

		this.surfaceX    = 5;
		this.surfaceY    = 5;

		this.spriteSheet = new SpriteSheet;

		this.tileWidth   = 32;
		this.tileHeight  = 32;

		this.map         = map;
	}

	renderPane(x, y, forceUpdate)
	{
		let pane;
		const gl2d = this.gl2d;

		let paneX  = x * (this.tileWidth * this.surfaceX);
		let paneY  = y * (this.tileHeight * this.surfaceY);

		if(this.panesXY[paneX] && this.panesXY[paneX][paneY])
		{
			pane = this.panesXY[paneX][paneY];
		}
		else
		{
			pane = new Surface(
				gl2d
				, this.map
				, this.surfaceX
				, this.surfaceY
				, paneX
				, paneY
			);

			if(!this.panesXY[paneX])
			{
				this.panesXY[paneX] = {};
			}

			if(!this.panesXY[paneX][paneY])
			{
				this.panesXY[paneX][paneY] = pane;
			}
		}

		this.panes.unshift(pane);

		if(this.panes.length > this.maxPanes)
		{
			this.panes.pop();
		}
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

		while(this.panes.length)
		{
			this.panes.pop();
		}

		this.surfaceX = Math.ceil(x / this.tileWidth);
		this.surfaceY = Math.ceil(y / this.tileHeight);

		this.draw();
	}

	simulate()
	{
		
	}
}
