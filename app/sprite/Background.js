import { Surface } from './Surface';
import { Camera } from './Camera';
import { SpriteSheet } from './SpriteSheet';

export  class Background
{
	constructor(spriteBoard, map, layer = 0)
	{
		this.spriteBoard = spriteBoard;
		this.spriteSheet = new SpriteSheet;

		this.panes       = [];
		this.panesXY     = {};
		this.maxPanes    = 9;

		this.map         = map;
		this.layer       = layer;

		this.tileWidth   = 32;
		this.tileHeight  = 32;

		this.surfaceWidth = 5;
		this.surfaceHeight = 5;
	}

	renderPane(x, y, forceUpdate)
	{
		let pane;
		let paneX = x * this.tileWidth * this.surfaceWidth * this.spriteBoard.gl2d.zoomLevel;
		let paneY = y * this.tileHeight * this.surfaceHeight * this.spriteBoard.gl2d.zoomLevel;

		if(this.panesXY[paneX] && this.panesXY[paneX][paneY])
		{
			pane = this.panesXY[paneX][paneY];
		}
		else
		{
			pane = new Surface(
				this.spriteBoard
				, this.spriteSheet
				, this.map
				, this.surfaceWidth
				, this.surfaceHeight
				, paneX
				, paneY
				, this.layer
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

		this.panes.push(pane);

		if(this.panes.length > this.maxPanes)
		{
			this.panes.shift();
		}
	}

	draw()
	{
		this.panes.length = 0;

		const centerX = Math.floor(
			(Camera.x / (this.surfaceWidth * this.tileWidth * this.spriteBoard.gl2d.zoomLevel)) + 0
		);

		const centerY = Math.floor(
			Camera.y / (this.surfaceHeight * this.tileHeight * this.spriteBoard.gl2d.zoomLevel) + 0
		);

		let range = [-1, 0, 1];

		for(let x in range)
		{
			for(let y in range)
			{
				this.renderPane(centerX + range[x], centerY + range[y]);
			}
		}

		this.panes.forEach(p => p.draw());
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

		this.surfaceWidth = Math.ceil((x / this.tileWidth));
		this.surfaceHeight = Math.ceil((y / this.tileHeight));

		this.draw();
	}

	simulate()
	{
		
	}
}
