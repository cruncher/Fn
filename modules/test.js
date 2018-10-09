
import id from './id.js';
import overload from './overload.js';
import { default as _equals } from './equals.js';

var A        = Array.prototype;
var rcomment = /\s*\/\*([\s\S]*)\*\/\s*/;

var domify = overload(toType, {
	'string': createSection,

	'function': function(template, name) {
		return createSection(multiline(template), name);
	},

	'default': function(template) {
		// WHAT WHY?
		//var nodes = typeof template.length === 'number' ? template : [template] ;
		//append(nodes);
		//return nodes;
	}
});

var browser = /firefox/i.test(navigator.userAgent) ? 'FF' :
	document.documentMode ? 'IE' :
	'standard' ;

function createSection(html, name) {
	var section = document.createElement('section');
	section.setAttribute('class', 'test-section');

	var title = document.createElement('h2');
	title.setAttribute('class', 'test-title');
	title.innerHTML = name;

	var div = document.createElement('div');
	div.setAttribute('class', 'test-fixture');

	div.innerHTML = html;
	section.appendChild(title);
	section.appendChild(div);
	document.body.appendChild(section);

	return {
		section: section,
		title:   title,
		fixture: div
	};
}

function multiline(fn) {
	if (typeof fn !== 'function') { throw new TypeError('multiline: expects a function.'); }
	var match = rcomment.exec(fn.toString());
	if (!match) { throw new TypeError('multiline: comment missing.'); }
	return match[1];
}

function toType(object) {
	return typeof object;
}

function parse(string) {
	return (new window.DOMParser()).parseFromString(string, 'text/html');
}

function equals(expected, value, message) {
	if (!_equals(value, expected)) {
		var string = (
			'Expected ' + (JSON.stringify(expected) || typeof value) + ', ' +
			'received ' + (JSON.stringify(value) || typeof value) + '.' +
			( message ? ' ' + message : '')
		);

		if (browser === 'IE') {
			console.log(string);
			console.trace();
		}
		else {
			console.trace('%cTest%c %s', 'color: #6f9940; font-weight: 600;', 'color: #ee8833; font-weight: 300;', 'failed', 'expected:', (JSON.stringify(expected) || typeof value), 'received:', (JSON.stringify(value) || typeof value));
		}
	}
}

export default function group(name, fn, template) {
	if (browser === 'IE') {
		console.log(name);
	}
	else {
		console.log('%cTest%c %s', 'color: #6f9940; font-weight: 600;', 'color: #6f9940; font-weight: 300;', name);
	}

	var nodes = template && domify(template, name);
	var tests = [];

	function next() {
		var args = tests.shift();

		if (!args) {
			// Last test has run
			if (nodes) {
				nodes.section.className += ' test-passed';
			}

			return;
		}

		test(args[0], args[1], args[2], next);
	}

	fn(function test(name, fn, n) {
		tests.push(arguments);
	}, console.log.bind(console, '%cTest%c %s', 'color: #6f9940; font-weight: 600;', 'color: #b4d094; font-weight: 300;'), nodes && nodes.fixture);

	next();
}

function stopped() {
	if (browser === 'IE') {
		console.log('Test failed: assertion recieved after test stopped with done().');
		console.trace();
	}
	else {
		console.trace('%c' +
			'Test failed: assertion recieved after test stopped with done().'
		);
	}
}

function test(name, fn, n, next) {
	//console.log('%c' + name, 'color: #6f6f6f; font-weight: 300;');

	var i = 0;
	var eq = equals;

	function assert(expected, value, message) {
		++i;
		return eq.apply(null, arguments);
	}

	fn(assert, function done() {
		eq = stopped;

		if (n !== undefined && i !== n) {
			var string = 'Test failed: ' +
			'expected ' + n + ' assertions, ' +
			'received ' + i;

			if (browser === 'IE') {
				console.log('✘ ' + name);
				console.log(string)
				console.trace();
			}
			else {
				console.log('%c✘ ' + name, 'color: #ee8833; font-weight: 300;');
				console.trace('%c' + string, 'color: #ee8833; font-weight: 700;');
			}
		}
		else {
			if (browser === 'IE') {
				console.log('✔',  + name);
			}
			else {
				console.log('%c✔%c %s', 'color: #b4d094;', 'color: #6f9940; font-weight: 300;', name);
			}
		}

		next();
	});
}
