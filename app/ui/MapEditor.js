import { View } from 'curvature/base/View';

export class MapEditor extends View
{
	constructor(args)
	{
		super(args);
		this.template  = require('./mapEditor.tmp');

		args.spriteSheet.ready.then((sheet)=>{
			this.args.tiles = sheet.frames;
		});

		this.args.bindTo('selectedGraphic', (v)=>{
			this.args.selectedGraphic = null;
		}, {wait:0});

		this.args.multiSelect   = false;
		this.args.selection     = {};
		this.args.selectedImage = null
	}

	selectGraphic(src)
	{
		console.log(src);

		this.args.selectedGraphic = src;
	}

	select(selection)
	{
		Object.assign(this.args.selection, selection);

		if(selection.globalX !== selection.startGlobalX
			|| selection.globalY !== selection.startGlobalY
		){
			this.args.multiSelect = true;
		}
		else
		{
			this.args.multiSelect = false;
		}

		if(!this.args.multiSelect)
		{
			this.args.selectedImages = this.args.map.getTile(selection.globalX, selection.globalY);
		}
	}
}
