
import Stream  from './stream.js';
import noop    from './noop.js';
import { observe } from './observer/observe.js';
//import { setPath } from './paths.js';

function ObserveSource(push, stop, args) {
    const path   = args[0];
    const object = args[1];

	this.end = stop;
	this.unobserve = observe(path, (value) => {
		this.value = value === undefined ? null : value ;
		push(this.value);
	}, object);
}

ObserveSource.prototype = {
	shift: function() {
		var value = this.value;
		this.value = undefined;
		return value;
	},

	stop: function() {
		this.unobserve();
		this.end();
	},

	unobserve: noop
};

export default function Observable(path, object) {
	return new Stream(ObserveSource, arguments);
}

Stream.fromProperty = Observable;
