/**
matches(selector, object)
Where `selector` is an object containing properties to be compared against
properties of `object`. If they are all strictly equal, returns `true`,
otherwise `false`.

```
const vegeFoods = menu.filter(matches({ vegetarian: true }));
```
*/

import curry from './curry.js';

export function matches(object, item) {
	let property;
	for (property in object) {
		if (object[property] !== item[property]) { return false; }
	}
	return true;
}

export default curry(matches, true);
