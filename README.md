# Fn

A library of functional functions.

<hr/>

##### `noop()`
##### `id(object)`
##### `curry(fn)`
##### `compose(fn1, fn2)`
##### `pipe(fn1, fn2, ...)`

<hr/>

##### `isDefined(object)`
##### `is(source, object)`
##### `equals(source, object)`
##### `assign(source, object)`
##### `get(path, object)`
##### `set(path, object)`
##### `call(fn)`
##### `of(value, ...)`
##### `map(fn, object)`
##### `apply(arguments, fn)`
##### `invoke(name, object)`
##### `throttle([time,] fn)`
##### `concat(array1, object)`
##### `each(fn, object)`
##### `filter(fn, object)`
##### `reduce(fn, initial, object)`
##### `slice(n, m, object)`
##### `sort(fn, object)`
##### `by(name, a, b)`
##### `byGreater(a, b)`
##### `byAlphabet(a, b)`
##### `add(n, m)`
##### `multiply(n, m)`
##### `pow(n, m)`
##### `mod(n, m)`
##### `normalise(min, max, value)`
##### `denormalise(min, max, value)`
##### `toFixed(n, value)`
##### `not(object)`
##### `match(regex, string)`
##### `exec(regex, string)`
##### `slugify(string)`
##### `typeOf(object)`
##### `classOf(object)`
##### `stringTypeOf(string)`

    Fn.stringTypeOf('http://cruncher.ch');  // 'url'
    Fn.stringTypeOf('hello@cruncher.ch');   // 'email'
    Fn.stringTypeOf('42');                  // 'int'
    Fn.stringTypeOf('41.5');                // 'float'
    Fn.stringTypeOf('{}');                  // 'json'
    Fn.stringTypeOf('...');                 // 'string'

## Fn.Stream(setup)

    var f = Fn.Stream(function(notify) {
        return {
            next: fn,
            push: fn,
            end:  fn
        };
    });

#### Input

##### `of(value, ...)`
##### `push(value, ...)`

#### Output

##### `pipe(stream)`
##### `pull(fn)`
##### `shift()`
##### `tap()`
##### `toArray()`

#### Transform

##### `filter(fn)`
##### `map(fn)`
<!-- ##### `reduce(fn, value)` -->
##### `scan(fn, value)`
##### `sort(fn)`
##### `find(fn)`
##### `head()`
##### `tail()`
##### `slice(n, m)`
##### `split(fn)`
##### `batch(n)`
##### `group(fn)`
##### `chain()`
##### `unique(fn)`

##### `delay(time)`
##### `throttle(time, fn)`

##### `boolify()`
##### `stringify()`
##### `jsonify()`
##### `slugify()`
##### `match(regex)`
##### `exec(regex)`
##### `get(path)`
##### `set(path, value)`
##### `assign(source)`
##### `toFunction()`
