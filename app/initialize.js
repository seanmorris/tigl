import { Router } from 'curvature/base/Router';
import { View } from './home/View';
import { ImportMapper } from 'import-mapper/ImportMapper';

import { Tag } from  'curvature/base/Tag';

console.log(Tag);

// const importMapper = new ImportMapper( globalThis.require.list() );
const view = new View({});

Router.listen(view, {
	'*': (...args) => {
		// console.log(args);
	}
});

document.addEventListener('DOMContentLoaded', () => {
	// importMapper.register();
	view.render(document.body)
});
