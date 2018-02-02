(function(window) {
	"use strict";

	var Fn = window.Fn;

	// Be generous with the input we accept.
	var rdiff = /^(-)?(\d{4})(?:-(\d+))?(?:-(\d+))?$/;
	var rtime = /^(-)?(\d+):(\d+)(?::(\d+(?:\.\d+)?))?$/;
	//var rdatetime = /^(-)?(\d+)-(0[0-9]|1[12])-([0-2][0-9]|3[01])T([01][0-9]|2[0-3]):([0-5][0-9])(?::([0-5][0-9](?:\.\d+)?))?/;
	//var rtimezone = /(?:Z|[+-]\d{2}:\d{2})$/;
	//var rnonzeronumbers = /[1-9]/;

	var days = { mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 0 };


	// Duration of year, in seconds
	var year  = 365.25 * 24 * 60 * 60;
	var today = new Date();

	function createOrdinals(ordinals) {
		var array = [], n = 0;

		while (n++ < 31) {
			array[n] = ordinals[n] || ordinals.n;
		}

		return array;
	}

	var locales = {
		'en': {
			days:     ('Sunday Monday Tuesday Wednesday Thursday Friday Saturday').split(' '),
			months:   ('January February March April May June July August September October November December').split(' '),
			ordinals: createOrdinals({ n: 'th', 1: 'st', 2: 'nd', 3: 'rd', 21: 'st', 22: 'nd', 23: 'rd', 31: 'st' })
		},

		'fr': {
			days:     ('dimanche lundi mardi mercredi jeudi vendredi samedi').split(' '),
			months:   ('janvier février mars avril mai juin juillet août septembre octobre novembre décembre').split(' '),
			ordinals: createOrdinals({ n: "ième", 1: "er" })
		},

		'de': {
			days:     ('Sonntag Montag Dienstag Mittwoch Donnerstag Freitag Samstag').split(' '),
			months:   ('Januar Februar März April Mai Juni Juli Oktober September Oktober November Dezember').split(' '),
			ordinals: createOrdinals({ n: "er" })
		},

		'it': {
			days:     ('domenica lunedì martedì mercoledì giovedì venerdì sabato').split(' '),
			months:   ('gennaio febbraio marzo aprile maggio giugno luglio agosto settembre ottobre novembre dicembre').split(' '),
			ordinals: createOrdinals({ n: "o" })
		}
	};

	function isDefined(value) {
		// !!value is a fast out for non-zero numbers, non-empty strings
		// and other objects, the rest checks for 0, '', etc.
		return !!value || (value !== undefined && value !== null && !Number.isNaN(value));
	}

	var dayMap = [6,0,1,2,3,4,5];

	function toDay(date) {
		return dayMap[date.getDay()];
	}

//	function createDate(value) {
//		// Test the Date constructor to see if it is parsing date
//		// strings as local dates, as per the ES6 spec, or as GMT, as
//		// per pre ES6 engines.
//		// developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse#ECMAScript_5_ISO-8601_format_support
//		var date = new Date(value);
//		var json = date.toJSON();
//		var gmt =
//			// It's GMT if the string matches the same length of
//			// characters from it's JSONified version...
//			json.slice(0, value.length) === value &&
//
//			// ...and if all remaining numbers are 0.
//			!json.slice(value.length).match(rnonzeronumbers) ;
//
//		return typeof value !== 'string' ? new Date(value) :
//			// If the Date constructor parses to gmt offset the date by
//			// adding the date's offset in milliseconds to get a local
//			// date. getTimezoneOffset returns the offset in minutes.
//			gmt ? new Date(+date + date.getTimezoneOffset() * 60000) :
//
//			// Otherwise use the local date.
//			date ;
//	}

	function addTimeToDate(time, date) {
		var tokens = rtime.exec(time) ;

		if (!tokens) { throw new Error('Time: "' + time + '" does not parse as time.'); }

		var sign = tokens[1] ? -1 : 1 ;

		if (isDefined(tokens[4])) { date.setUTCMilliseconds(date.getUTCMilliseconds() + sign * parseFloat(tokens[4]) * 1000); }
		if (isDefined(tokens[3])) { date.setUTCMinutes(date.getUTCMinutes() + sign * parseInt(tokens[3], 10)); }
		if (isDefined(tokens[2])) { date.setUTCHours(date.getUTCHours() + sign * parseInt(tokens[2], 10)); }

		return date;
	}

	function addDateToDate(time, date) {
		var tokens = rdiff.exec(time) ;

		if (!tokens) { throw new Error('Time: "' + time + '" does not parse as date.'); }

		var sign = tokens[1] ? -1 : 1 ;

		if (isDefined(tokens[4])) { date.setUTCDate(date.getUTCDate() + sign * parseInt(tokens[4], 10)); }
		if (isDefined(tokens[3])) { date.setUTCMonth(date.getUTCMonth() + sign * parseInt(tokens[3], 10)); }
		if (isDefined(tokens[2])) { date.setUTCFullYear(date.getUTCFullYear() + sign * parseInt(tokens[2], 10)); }

		return date;
	}

	function Time(time) {
		// If time is a time object, don't make a new one, return it
		if (time instanceof Time) { return time; }

		// Time has not been called with `new` do that now
		if (!Time.prototype.isPrototypeOf(this)) {
			return new Time(time);
		}

		Object.defineProperty(this, 'timestamp', {
			enumerable: true,

			value: time === undefined ? 0 :
				// Accept time in seconds
				typeof time === 'number' ? time :
				// Accept date objects.
				time instanceof Date ? +time / 1000 :
				// Accept time strings
				rtime.test(time) ? +addTimeToDate(time, new Date(0)) / 1000 :
				// Accept date strings
				+new Date(time) / 1000
		});

		// Check now for invalid times
		if (Number.isNaN(this.timestamp)) {
			throw new Error('Time: Invalid argument: ' + typeof time + ' ' + time);
		}
	}

	function create(seconds) {
		// A fast way of creating times without all the bothersome type checking
		return Object.create(Time.prototype, {
			timestamp: {
				enumerable: true,
				value: seconds
			}
		});
	}

	Object.assign(Time.prototype, {
		add: function(time) {
			return create(
				// Accept time in seconds
				typeof time === "number" ? time + this.timestamp :
				// Accept date string
				rdiff.test(time) ? +addDateToDate(time, this.toDate()) / 1000 :
				// Accept time string
				+addTimeToDate(time, this.toDate()) / 1000
			);
		},

		floor: function(grain) {
			// Take a day string or number, find the last matching day
			var day = typeof grain === 'number' ?
				grain :
				days[grain] ;

			var date = this.toDate();
			var diff;

			if (!isDefined(day)) {
				if (grain === 'ms') { return this; }

				date.setUTCMilliseconds(0);
				if (grain === 's') { return new Time(date); }

				date.setUTCSeconds(0);
				if (grain === 'm') { return new Time(date); }

				date.setUTCMinutes(0);
				if (grain === 'h') { return new Time(date); }

				date.setUTCHours(0);
				if (grain === 'day') { return new Time(date); }

				if (grain === 'week') {
					date.setDate(date.getDate() - toDay(date));
					return new Time(date);
				}

				if (grain === 'fortnight') {
					var week = Time.now().floor('mon').date;
					diff = Fn.mod(14, Time.dateDiff(week, date));
					date.setUTCDate(date.getUTCDate() - diff);
					return new Time(date);
				}

				date.setUTCDate(1);
				if (grain === 'month') { return new Time(date); }

				date.setUTCMonth(0);
				if (grain === 'year') { return new Time(date); }

				date.setUTCFullYear(0);
				return new Time(date);
			}

			var currentDay = date.getUTCDay();

			// If we are on the specified day, return this date
			if (day === currentDay) { return this; }

			diff = currentDay - day;

			if (diff < 0) { diff = diff + 7; }

			return this.add('-0000-00-0' + diff);
		},

		render: (function() {
			// Todo: this regex should be stricter
			var rletter = /(th|ms|[YZMDdHhmsz]{1,4}|[a-zA-Z])/g;

			return function render(string, lang) {
				var date = this.toDate();
				return string.replace(rletter, function($0, $1) {
					return Time.format[$1] ? Time.format[$1](date, lang) : $1 ;
				});
			};
		})(),

		valueOf: function() {
			return this.timestamp;
		},

		toDate: function() {
			return new Date(this.valueOf() * 1000);
		},

		toString: function() {
			return this.valueOf() + '';
		},

		toJSON: function() {
			return this.toDate().toJSON();
		},

		to: function(unit) {
			return unit === 'ms' ? Time.secToMs(this.timestamp) :
				unit === 'months' ? Time.secToMonths(this.timestamp) :
				// Accept string starting with...
				unit[0] === 's' ? this.timestamp :
				unit[0] === 'm' ? Time.secToMins(this.timestamp) :
				unit[0] === 'h' ? Time.secToHours(this.timestamp) :
				unit[0] === 'd' ? Time.secToDays(this.timestamp) :
				unit[0] === 'w' ? Time.secToWeeks(this.timestamp) :
				unit[0] === 'y' ? Time.secToYears(this.timestamp) :
				undefined ;
		}
	});

	Object.defineProperties(Time.prototype, {
		date: {
			get: function() {
				return this.toJSON().slice(0, 10);
			}
		},

		time: {
			get: function() {
				return this.toJSON().slice(11, -1);
			}
		}
	});

	// Here are the types requested for certain operations, and
	// the methods they fall back to when Symbol.toPrimitive does
	// not exist. For consistency, it's probably best not to change
	// the results of these operations with Symbol.toPrimitive after
	// all.
	//
	// +Time()          type: "number"   method: valueOf
	// Time() * 4       type: "number"   method: valueOf
	// Time() + 4       type: "default"  method: valueOf
	// Time() < 0       type: "number"   method: valueOf
	// [Time()].join()  type: "string"   method: toString
	// Time() + ''      type: "default"  method: valueOf
	// new Date(Time()) type: "default"  method: valueOf
	//
	// if (Symbol.toPrimitive) {
	//	Time.prototype[Symbol.toPrimitive] = function(type) {
	//		return type === 'number' ?
	//			this.timestamp :
	//			this.toJSON() ;
	//	};
	// }

	Object.assign(Time, {
		of: function of(time) {
			return new Time(time);
		},

		now: function() {
			return Time(new Date());
		},

		format: {
			YYYY: function(date)       { return ('000' + date.getFullYear()).slice(-4); },
			YY:   function(date)       { return ('0' + date.getFullYear() % 100).slice(-2); },
			MM:   function(date)       { return ('0' + (date.getMonth() + 1)).slice(-2); },
			MMM:  function(date, lang) { return this.MMMM(date, lang).slice(0,3); },
			MMMM: function(date, lang) { return locales[lang || Time.lang].months[date.getMonth()]; },
			D:    function(date)       { return '' + date.getDate(); },
			DD:   function(date)       { return ('0' + date.getDate()).slice(-2); },
			ddd:  function(date, lang) { return this.dddd(date, lang).slice(0,3); },
			dddd: function(date, lang) { return locales[lang || Time.lang].days[date.getDay()]; },
			HH:   function(date)       { return ('0' + date.getHours()).slice(-2); },
			hh:   function(date)       { return ('0' + date.getHours() % 12).slice(-2); },
			mm:   function(date)       { return ('0' + date.getMinutes()).slice(-2); },
			ss:   function(date)       { return ('0' + date.getSeconds()).slice(-2); },
			sss:  function(date)       { return (date.getSeconds() + date.getMilliseconds() / 1000 + '').replace(/^\d\.|^\d$/, function($0){ return '0' + $0; }); },
			ms:   function(date)       { return '' + date.getMilliseconds(); },

			// Experimental
			am:   function(date) { return date.getHours() < 12 ? 'am' : 'pm'; },
			zz:   function(date) {
				return (date.getTimezoneOffset() < 0 ? '+' : '-') +
					 ('0' + Math.round(100 * Math.abs(date.getTimezoneOffset()) / 60)).slice(-4) ;
			},
			th:   function(date, lang) { return locales[lang || Time.lang].ordinals[date.getDate()]; },
			n:    function(date) { return +date; },
			ZZ:   function(date) { return -date.getTimezoneOffset() * 60; }
		},

		locales: locales,

		secToMs:     function(n) { return n * 1000; },
		secToMins:   function(n) { return n / 60; },
		secToHours:  function(n) { return n / 3600; },
		secToDays:   function(n) { return n / 86400; },
		secToWeeks:  function(n) { return n / 604800; },
		secToMonths: function(n) { return n / (year / 12); },
		secToYears:  function(n) { return n / year; },

		msToSec:     function(n) { return n / 1000; },
		minsToSec:   function(n) { return n * 60; },
		hoursToSec:  function(n) { return n * 3600; },
		daysToSec:   function(n) { return n * 86400; },
		weeksToSec:  function(n) { return n * 604800; },
		monthsToSec: function(n) { return n * (year / 12); },
		yearsToSec:  function(n) { return n * year; }
	});

	Object.defineProperty(Time, 'lang', {
		get: function() {
			var lang = document.documentElement.lang;
			return lang && Time.locales[lang] ? lang : 'en';
		},

		enumerable: true
	});




	// Local times
	//
	// Don't parse date strings with the JS Date object. It has variable
	// time zone behaviour. Set up our own parsing.
	//
	// Accept BC dates by including leading '-'.
	// (Year 0000 is 1BC, -0001 is 2BC.)
	// Limit months to 01-12
	// Limit dates to 01-31

	var rdate = /^(-?\d{4})(?:-(0[1-9]|1[012])(?:-(0[1-9]|[12]\d|3[01]))?)?/;

	function execDate(fn) {
		return function exec(string) {
			var parts = rdate.exec(string) ;
			if (!parts) { throw new Error('Invalid date ' + string); }
			return fn(
				// Year
				parseInt(parts[1], 10),
				// Month, 0-indexed for the Date constructor
				parts[2] ? parseInt(parts[2], 10) - 1 : 0,
				// Date
				parts[3] ? parseInt(parts[3], 10) : 1
			);
		};
	}

	var dateFromLocal = execDate(function dateFromLocal(year, month, date) {
		return new Date(year, month, date);
	});

	var dateFromUTC = execDate(function dateFromUTC(year, month, date) {
		return new Date(Date.UTC(year, month, date));
	});

	function dateDiff(t, d1, d2) {
		var y1 = d1.getFullYear();
		var m1 = d1.getMonth();
		var y2 = d2.getFullYear();
		var m2 = d2.getMonth();

		if (y1 === y2 && m1 === m2) {
			return t + d2.getDate() - d1.getDate() ;
		}

		t += d2.getDate() ;

		// Set to last date of previous month
		d2.setDate(0);

		return dateDiff(t, d1, d2);
	}

	Object.assign(Time, {
		dateFromLocal: dateFromLocal,
		dateFromUTC:   dateFromUTC,

		dateDiff: function(date1, date2) {
			var d1 = typeof date1 === 'string' ? dateFromLocal(date1) : date1 ;
			var d2 = typeof date2 === 'string' ? dateFromLocal(date2) : date2 ;

			return d2 > d1 ?
				// 3rd argument mutates, so make sure we get a clean date if we
				// have not just made one.
				dateDiff(0, d1, d2 === date2 ? new Date(d2.getFullYear(), d2.getMonth(), d2.getDate()) : d2) :
				dateDiff(0, d2, d1 === date1 ? new Date(d1.getFullYear(), d1.getMonth(), d1.getDate()) : d1) * -1 ;
		}
	});







	// Render local times for any arbitrary time region

	var options = {
		// Time zone
		timeZone: 'UTC',
		// Use specified locale matcher
		formatMatcher: 'basic',
		// Use 24 hour clock
		hour12:  false,
		// Format string components
		weekday: 'short',
		year:    'numeric',
		month:   '2-digit',
		day:     '2-digit',
		hour:    '2-digit',
		minute:  '2-digit',
		second:  '2-digit'
	};

	var rusdate = /\w+|\d+/g;
	var componentKeys = ['weekday', 'year', 'month', 'day', 'hour', 'minute', 'second'];

	function matchEach(regex, fn, text) {
		var match = regex.exec(text);

		return match ? (
			fn.apply(null, match),
			matchEach(regex, fn, text)
		) :
		undefined ;
	}

	function toLocaleString(timezone, date) {
		options.timeZone = timezone;
		var string = date.toLocaleString('en-US', options);
		return string;
	}

	function toLocaleComponents(timezone, date) {
		var localedate = toLocaleString(timezone, date);
		var i          = 0;
		var components = {};

		matchEach(rusdate, function(value) {
			components[componentKeys[i++]] = value.toLowercase();
		}, localedate);

		return components;
	}

	var rletter = /(th|ms|[YZMDdHhmsz]{1,4}|[a-zA-Z])/g;

	var formats = {
		YYYY: function(data)       { return data.year; },
		YY:   function(data)       { return ('0' + data.year).slice(-2); },
		MM:   function(data)       { return data.month; },
		MMM:  function(data, lang) { return this.MMMM(data, lang).slice(0,3); },
		MMMM: function(data, lang) { return locales[lang].months[data.month - 1]; },
		D:    function(data)       { return '' + data.day; },
		DD:   function(data)       { return data.day; },
		ddd:  function(data, lang) { return this.dddd(data, lang).slice(0,3); },
		dddd: function(data, lang) { return locales[lang].days[data.day]; },
		HH:   function(data)       { return data.hour; },
		hh:   function(data)       { return ('0' + data.hour % 12).slice(-2); },
		mm:   function(data)       { return data.minute; },
		ss:   function(data)       { return data.second; },
		//sss:  function(data)       { return (date.second + date.getMilliseconds() / 1000 + '').replace(/^\d\.|^\d$/, function($0){ return '0' + $0; }); },
		//ms:   function(data)       { return '' + date.getMilliseconds(); },
	};

	Time.formatDate = function formatDate(string, timezone, lang, date) {
		var components = toLocaleComponents(timezone, date);
		return string.replace(rletter, function($0, $1) {
			return formats[$1] ? formats[$1](components, lang) : $1 ;
		});
	};


	// Export

	window.Time = Time;

})(this);
