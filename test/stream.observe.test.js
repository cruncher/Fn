group('Stream.observe()', function(test, log) {

	var Stream = window.Stream;

	test('Stream.observe(path, object)', function(equals) {
		var expected = [0, null, 1, null, 0];

		var data   = { a: [] };
		var o      = Observable(data);
		var stream = Stream
		.observe('a[0].n', o)
		.each(function(value) {
			equals(expected.shift(), value);
		});

		o.a[0] = {n: 0};
		o.a[1] = {n: 1};
		o.a[2] = {n: 2};
		
		o.a.length = 0;
		
		o.a[0] = {n: 1};
		
		o.a.length = 0;
		o.a.length = 0;
		
		o.a[0] = {n: 0};

		equals(0, expected.length);

		stream.stop();
		
		o.a[0] = {n: 2};
	});

	test('Stream.observe(path, object)', function(equals) {
		var expected = [0, null, 0, 10, 20];

		var data   = { a: [] };
		var o      = Observable(data);
		var stream = Stream
		.observe('a[0].n', o)
		.each(function(value) {
			equals(expected.shift(), value);
		});

		o.a[0] = {n: 0};
		
		o.a.length = 0;
		
		o.a[0] = {n: 0};

		stream.push(10);
		equals(10, data.a[0].n);

		stream.push(20);
		equals(20, data.a[0].n);
		equals(0, expected.length);

		stream.stop();
		stream.push(30);
		equals(20, data.a[0].n);

		o.a[0] = {n: 2};
	});
});
