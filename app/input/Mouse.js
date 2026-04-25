export class Mouse
{
	constructor(element, session)
	{
		this.x = 0;
		this.y = 0;
		this.buttons = 0;

		this.element = element;

		this.onMoved = event => {
			this.x = event.clientX;
			this.y = event.clientY;
			session.moveCursor(this.x, this.y);
		};

		this.onDown = event => {
			event.preventDefault();
			this.buttons = event.buttons;
		};

		this.onUp = event => {
			event.preventDefault();
			this.buttons = event.buttons;
		};

		this.onMenu = event => {
			event.preventDefault();
		};

		element.addEventListener('mousemove', this.onMoved);
		element.addEventListener('mousedown', this.onDown);
		element.addEventListener('mouseup', this.onUp);
		element.addEventListener('contextmenu', this.onMenu);
	}

	detatch()
	{
		this.element.removeEventListener('mousemove', this.onMoved);
		this.element.removeEventListener('mousedown', this.onDown);
		this.element.removeEventListener('mouseup', this.onUp);
		this.element.removeEventListener('contextmenu', this.onMenu);
	}
}
