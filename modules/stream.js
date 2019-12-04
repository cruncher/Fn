
import { each } from './lists/core.js';
import latest   from './latest.js';
import noop     from './noop.js';
import nothing  from './nothing.js';
import now      from './now.js';
import remove   from './lists/remove.js';
import Timer    from './timer.js';
import toArray  from './to-array.js';
import choke    from './choke.js';
import Fn       from './functor.js';
import Privates from './privates.js';

var debug     = false;
var A         = Array.prototype;
var assign    = Object.assign;


// Functions

function call(value, fn) {
    return fn(value);
}

function isValue(n) { return n !== undefined; }

function isDone(stream) {
    return stream.status === 'done';
}

function checkSource(source) {
    // Check for .shift()
    if (!source.shift) {
        throw new Error('Stream: Source must create an object with .shift() ' + source);
    }
}


// Sources

function notify(object) {
    var events = Privates(object).events;
    if (!events) { return; }

    var n = -1;
    var l = events.length;
    var value;

    while (++n < l) {
        value = events[n](object);
        if (value !== undefined) { return value; }
    }
}

function createSource(stream, privates, options, Source, done) {
    function note() {
        notify(stream);
    }

    function stop(n) {
        // Neuter events
        delete privates.events;

        // If no n, shut the stream down
        if (n !== undefined) {
            privates.source = new StopSource(privates.source, n, done);
            privates.stops && privates.stops.forEach((fn) => fn());
            privates.stops = undefined;
        }

        // Schedule shutdown of stream after n values
        else {
            privates.stops && privates.stops.forEach((fn) => fn());
            privates.stops = undefined;
            done();
        }
    }

    const source = new Source(note, stop, options);

    // Check for sanity
    if (debug) { checkSource(source); }

    // Gaurantee that source has a .stop() method
    if (!source.stop) { source.stop = noop; }

    return (privates.source = source);
}


// StartSource

function StartSource(stream, privates, options, Source) {
    this.stream   = stream;
    this.privates = privates;
    this.options  = options;
    this.Source   = Source;
}

assign(StartSource.prototype, {
    create: function() {
        return createSource(this.stream, this.privates, this.options, this.Source, () => this.stop());
    },

    shift: function shift() {
        return this.create().shift();
    },

    push: function push() {
        const source = this.create();
        if (!source.push) { throw new Error('Attempt to .push() to unpushable stream'); }
        source.push.apply(source, arguments);
    },

    start: function start() {
        const source = this.create();
        if (!source.start) { throw new Error('Attempt to .start() unstartable stream'); }
        source.start.apply(source, arguments);
    },

    stop: function done() {
        this.stream.status = 'done';
        this.privates.source = nothing;
        this.privates.resolve();
    }
});


// StopSource

function StopSource(source, n, done) {
    this.source = source;
    this.n      = n;
    this.done   = done;
}

assign(StopSource.prototype, nothing, {
    shift: function() {
        const value = this.source.shift();
        if (--this.n < 1) { this.done(); }
        return value;
    },

    start: function() {
        throw new Error('Cannot .start() stopped stream');
    },

    push: function() {
        throw new Error('Cannot .push() to stopped stream');
    }
});


// BufferSource

function BufferSource(notify, stop, list) {
    const buffer = list === undefined ? [] :
        Fn.prototype.isPrototypeOf(list) ? list :
        Array.from(list).filter(isValue) ;

    this.buffer = buffer;
    this.notify = notify;
    this.stopfn = stop;
}

assign(BufferSource.prototype, {
    shift: function() {
        return this.buffer.shift();
    },

    push: function() {
        this.buffer.push.apply(this.buffer, arguments);
        this.notify();
    },

    stop: function() {
        this.stopfn(this.buffer.length);
    }
});


// Stream

export default function Stream(Source, options) {
    // Enable construction without the `new` keyword
    if (!Stream.prototype.isPrototypeOf(this)) {
        return new Stream(Source, options);
    }

    // Privates

    const privates = Privates(this);
    privates.stream  = this;
    privates.events  = [];
    privates.resolve = noop;
    privates.source  = new StartSource(this, privates, options, Source);

    // Methods

    this.shift = function shift() {
        return privates.source.shift();
    };

    // I use presence of push to check for writeability in various places,
    // keep it as an instance method for just now
    this.push = function push() {
        const source = privates.source;
        source.push.apply(source, arguments);
        return this;
    };
}

// Stream Methods

Stream.prototype = assign(Object.create(Fn.prototype), {
    constructor: Stream,

    // Transform

    clone: function clone() {
        var source  = this;
        var shift   = this.shift;
        var buffer1 = [];
        var buffer2 = [];

        var stream  = new Stream(function setup(notify, stop) {
            var buffer = buffer2;

            source.on(notify);

            return {
                shift: function() {
                    if (buffer.length) { return buffer.shift(); }
                    var value = shift();

                    if (value !== undefined) { buffer1.push(value); }
                    else if (source.status === 'done') {
                        stop(0);
                        source.off(notify);
                    }

                    return value;
                },

                stop: function() {
                    var value;

                    // Flush all available values into buffer
                    while ((value = shift()) !== undefined) {
                        buffer.push(value);
                        buffer1.push(value);
                    }

                    stop(buffer.length);
                    source.off(notify);
                }
            };
        });

        this.done(() => stream.stop());

        this.shift = function() {
            if (buffer1.length) { return buffer1.shift(); }
            var value = shift();
            if (value !== undefined && stream.status !== 'done') { buffer2.push(value); }
            return value;
        };

        return stream;
    },

    combine: function(fn, source) {
        return Stream.Combine(fn, this, source);
    },

    join: function join() {
        const output = this.constructor.of();
        this.each((input) => {
            input.pipe ?
                // Input is a stream
                input.pipe(output) :
                // Input is an array-like
                output.push.apply(output, input) ;
        });
        return output;
    },

    merge: function merge() {
        var sources = toArray(arguments);
        sources.unshift(this);
        return Stream.Merge.apply(null, sources);
    },

    choke: function choke(time) {
        return this.pipe(Stream.Choke(time));
    },

    throttle: function throttle(timer) {
        return this.pipe(Stream.throttle(timer));
    },

    clock: function clock(timer) {
        return this.pipe(Stream.clock(timer));
    },

    // Consume

    each: function each(fn) {
        var args   = arguments;
        var source = this;

        // Flush and observe
        Fn.prototype.each.apply(source, args);

        // Delegate to Fn#each().
        return this.on(() => Fn.prototype.each.apply(source, args));
    },

    last: function last(fn) {
        const privates = Privates(this);
        privates.stops = privates.stops || [];
        privates.stops.push(() => fn(this.latest().shift()));
        return this;
    },

    fold: function fold(fn, accumulator) {
        // Fold to promise
        return new Promise((resolve, reject) => {
            this
            .scan(fn, accumulator)
            .last(resolve)
        });
    },

    reduce: function reduce(fn) {
        // Support array.reduce semantics with optional seed
        return arguments[1] ?
            this.fold(fn, arguments[1]) :
            this.fold((acc, value) => (acc === undefined ? value : fn(acc, value)), this.shift()) ;
    },

    // Lifecycle

    start: function start() {
        const source = Privates(this).source;
        source.start.apply(source, arguments);
        return this;
    },

    stop: function stop() {
        const source = Privates(this).source;
        source.stop.apply(source, arguments);
        return this;
    },

    done: function done(fn) {
        const privates = Privates(this);
        const promise = privates.promise || (
            privates.promise = this.status === 'done' ?
                Promise.resolve() :
                new Promise((resolve, reject) => assign(privates, { resolve, reject }))
        );

        promise.then(fn);
        return this;
    },

    on: function on(fn) {
        if (typeof fn === 'string') {
            throw new Error('stream.on(fn) no longer takes type');
        }

        var events = Privates(this).events;
        if (!events) { return this; }

        events.push(fn);
        return this;
    },

    off: function off(fn) {
        if (typeof fn === 'string') {
            throw new Error('stream.off(fn) no longer takes type');
        }

        var events = Privates(this).events;
        if (!events) { return this; }

        // Remove all handlers
        if (!fn) {
            events.length = 0;
            return this;
        }

        // Remove handler fn for type
        var n = events.length;
        while (n--) {
            if (events[n] === fn) { events.splice(n, 1); }
        }

        return this;
    }
});


/*
Stream.from(array)
*/

Stream.from = function(list) {
    return new Stream(BufferSource, list);
};

/*
Stream.fromPromise(promise)
*/

Stream.fromPromise = function(promise) {
    const stream = Stream.of();

    promise
    .then((value) => {
        stream.push(value);
        stream.stop();
    })
    .catch(() => stream.stop());

    return stream;
};

/*
Stream.of(...values)
*/

Stream.of = function() {
    return Stream.from(arguments);
};


// Clock Stream

const clockEventPool = [];

function TimeSource(notify, end, timer) {
    this.notify = notify;
    this.end    = end;
    this.timer  = timer;

    const event = this.event = clockEventPool.shift() || {};
    event.stopTime = Infinity;

    this.frame = (time) => {
        // Catch the case where stopTime has been set before or equal the
        // end time of the previous frame, which can happen if start
        // was scheduled via a promise, and therefore should only ever
        // happen on the first frame: stop() catches this case thereafter
        if (event.stopTime <= event.t2) { return; }

        // Wait until startTime
        if (time < event.startTime) {
            this.requestId = this.timer.request(this.frame);
            return;
        }

        // Reset frame fn without checks
        this.frame = (time) => this.update(time);
        this.frame(time);
    };
}

assign(TimeSource.prototype, {
    shift: function shift() {
        var value = this.value;
        this.value = undefined;
        return value;
    },

    start: function(time) {
        const now = this.timer.now();

        this.event.startTime = time !== undefined ? time : now ;
        this.event.t2 = time > now ? time : now ;

        // If the currentTime (the last frame time) is greater than now
        // call the frame for up to this point, otherwise add an arbitrary
        // frame duration to now.
        const frameTime = this.timer.currentTime > now ?
            this.timer.currentTime :
            now + 0.08 ;

        if (this.event.startTime > frameTime) {
            // Schedule update on the next frame
            this.requestId = this.timer.request(this.frame);
        }
        else {
            // Run the update on the next tick, in case we schedule stop
            // before it gets chance to fire. This also gaurantees all stream
            // pushes are async.
            Promise.resolve(frameTime).then(this.frame);
        }
    },

    stop: function stop(time) {
        if (this.event.startTime === undefined) {
            // This is a bit of an arbitrary restriction. It wouldnt
            // take much to support this.
            throw new Error('TimeStream: Cannot call .stop() before .start()');
        }

        this.event.stopTime = time || this.timer.now();

        // If stopping during the current frame cancel future requests.
        if (this.event.stopTime <= this.event.t2) {
            this.requestId && this.timer.cancel(this.requestId);
            this.end();
        }
    },

    update: function(time) {
        const event = this.event;
        event.t1 = event.t2;

        this.requestId = undefined;
        this.value     = event;

        if (time >= event.stopTime) {
            event.t2 = event.stopTime;
            this.notify();
            this.end();

            // Release event
            clockEventPool.push(event);
            return;
        }

        event.t2 = time;
        this.notify();
        // Todo: We need this? Test.
        this.value     = undefined;
        this.requestId = this.timer.request(this.frame);
    }
});


/*
Stream.fromTimer(timer)
*/

Stream.fromTimer = function TimeStream(timer) {
    return new Stream(TimeSource, timer);
};

/*
Stream.fromDuration(s)
*/

Stream.fromDuration = function(duration) {
    return Stream.fromTimer(new Timer(duration));
};

Stream.frames = function() {
    return Stream.fromTimer(frameTimer);
};




// Stream.Combine

function toValue(data) {
    var source = data.source;
    var value  = data.value;
    return data.value = value === undefined ? latest(source) : value ;
}

function CombineSource(notify, stop, fn, sources) {
    var object = this;

    this._notify  = notify;
    this._stop    = stop;
    this._fn      = fn;
    this._sources = sources;
    this._hot     = true;

    this._store = sources.map(function(source) {
        var data = {
            source: source,
            listen: listen
        };

        // Listen for incoming values and flag as hot
        function listen() {
            data.value = undefined;
            object._hot = true;
        }

        source.on(listen)
        source.on(notify);
        return data;
    });
}

assign(CombineSource.prototype, {
    shift: function combine() {
        // Prevent duplicate values going out the door
        if (!this._hot) { return; }
        this._hot = false;

        var sources = this._sources;
        var values  = this._store.map(toValue);
        if (sources.every(isDone)) { this._stop(0); }
        return values.every(isValue) && this._fn.apply(null, values) ;
    },

    stop: function stop() {
        var notify = this._notify;

        // Remove listeners
        each(function(data) {
            var source = data.source;
            var listen = data.listen;
            source.off(listen);
            source.off(notify);
        }, this._store);

        this._stop(this._hot ? 1 : 0);
    }
});

Stream.Combine = function(fn) {
    var sources = A.slice.call(arguments, 1);

    if (sources.length < 2) {
        throw new Error('Stream: Combine requires more than ' + sources.length + ' source streams')
    }

    return new Stream(function setup(notify, stop) {
        return new CombineSource(notify, stop, fn, sources);
    });
};


// Stream.Merge



function MergeSource(notify, stop, sources) {
    var values = [];

    function update(source) {
        values.push.apply(values, toArray(source));
    }

    this.values  = values;
    this.notify  = notify;
    this.sources = sources;
    this.update  = update;
    this.cueStop = stop;

    each(function(source) {
        // Flush the source
        update(source);

        // Listen for incoming values
        source.on(update);
        source.on(notify);
    }, sources);
}

assign(MergeSource.prototype, {
    shift: function() {
        if (this.sources.every(isDone)) {
            this.stop();
        }

        return this.values.shift();
    },

    stop: function() {
        this.cueStop(this.values.length);
    }
});

Stream.Merge = function(source1, source2) {
    return new Stream(MergeSource, Array.from(arguments));
};


// Stream Timers

Stream.Choke = function(time) {
    return new Stream(function setup(notify, done) {
        var value;
        var update = choke(function() {
            // Get last value and stick it in buffer
            value = arguments[arguments.length - 1];
            notify();
        }, time);

        return {
            shift: function() {
                var v = value;
                value = undefined;
                return v;
            },

            push: update,

            stop: function stop() {
                update.cancel(false);
                done();
            }
        };
    });
};



// Frame timer

var frameTimer = {
    now:     now,
    request: requestAnimationFrame.bind(window),
    cancel:  cancelAnimationFrame.bind(window)
};


// Stream timer

function StreamTimer(stream) {
    var timer = this;
    var fns0  = [];
    var fns1  = [];
    this.fns = fns0;

    stream.each(function() {
        timer.fns = fns1;
        fns0.reduce(call, undefined);
        fns0.length = 0;
        fns1 = fns0;
        fns0 = timer.fns;
    });
}

assign(StreamTimer.prototype, {
    request: function(fn) {
        this.fns.push(fn);
        return fn;
    },

    cancel: function(fn) {
        remove(this.fns, fn);
    }
});


// Stream.throttle

function schedule() {
    var timer   = this.timer;

    this.queue = noop;
    this.ref   = timer.request(this.update);
}

function ThrottleSource(notify, stop, timer) {
    var source   = this;

    this._stop   = stop;
    this.timer   = timer;
    this.queue   = schedule;
    this.update  = function update() {
        source.queue = schedule;
        notify();
    };
}

assign(ThrottleSource.prototype, {
    shift: function shift() {
        var value = this.value;
        this.value = undefined;
        return value;
    },

    stop: function stop(callLast) {
        var timer = this.timer;

        // An update is queued
        if (this.queue === noop) {
            timer.cancel && timer.cancel(this.ref);
            this.ref = undefined;
        }

        // Don't permit further changes to be queued
        this.queue = noop;

        // If there is an update queued apply it now
        // Hmmm. This is weird semantics. TODO: callLast should
        // really be an 'immediate' flag, no?
        this._stop(this.value !== undefined && callLast ? 1 : 0);
    },

    push: function throttle() {
        // Store the latest value
        this.value = arguments[arguments.length - 1];

        // Queue the update
        this.queue();
    }
});

Stream.throttle = function(timer) {
    if (typeof timer === 'function') {
        throw new Error('Dont accept request and cancel functions anymore');
    }

    timer = typeof timer === 'number' ?
        new Timer(timer) :
    timer instanceof Stream ?
        new StreamTimer(timer) :
    timer ? timer :
        frameTimer ;

    return new Stream(function(notify, stop) {
        return new ThrottleSource(notify, stop, timer);
    });
};
