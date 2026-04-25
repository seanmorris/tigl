declare module 'curvature/base/Bindable' {
	declare class Bindable {
		static Prevent: Symbol;
	};

	export const Bindable;
}

declare module 'curvature/base/Bindable.js' {
	export * from 'curvature/base/Bindable';
}

declare module 'curvature/input/Keyboard' {
	declare class Keyboard {
		static get(): Keyboard;
		getKeyCode(string): number;
		update(); void;
		listening: boolean;
		keys: Bindable;
	};
	export const Keyboard;
}

declare module 'curvature/base/View' {
	declare class View {
		constructor(args?:object, mainView?:View): View;
		args: object;
		tags: object;
		render: (HTMLElement) => void;
		onTimeout: (delay: number, callback: () => any) => number;
	};
	export const View;
}
