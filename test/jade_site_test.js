'use strict';

var grunt = require('grunt');

/*
======== A Handy Little Nodeunit Reference ========
https://github.com/caolan/nodeunit

Test methods:
test.expect(numAssertions)
test.done()
Test assertions:
test.ok(value, [message])
test.equal(actual, expected, [message])
test.notEqual(actual, expected, [message])
test.deepEqual(actual, expected, [message])
test.notDeepEqual(actual, expected, [message])
test.strictEqual(actual, expected, [message])
test.notStrictEqual(actual, expected, [message])
test.throws(block, [error], [message])
test.doesNotThrow(block, [error], [message])
test.ifError(value)
*/

exports.asset_packager = {
	setUp: function (done) {
		// setup here if necessary
		done();
	},
	dev: function (test) {
		test.expect(4);

		test.ok(grunt.file.exists('tmp/jade/dev'), 'should create dev directory.');

		test.ok(grunt.file.exists('tmp/jade/dev/app/views/includes/main.html'), 'should generate includes');
		test.equal(grunt.file.read('tmp/jade/dev/app/views/includes/main.html'), grunt.file.read('test/expected/jade/dev/app/views/includes/main.html'), 'should correctly format main.html');

		var jsFilesExist = grunt.file.exists('tmp/jade/dev/public/js/file1.js') && grunt.file.exists('tmp/jade/dev/public/js/file2.js');
		test.ok(jsFilesExist, 'should copy js files');

		test.done();
	},
	prod: function (test) {
		test.expect(7);

		test.ok(grunt.file.exists('tmp/jade/prod'), 'should create prod directory.');

		test.ok(grunt.file.exists('tmp/jade/prod/app/views/includes/main.html'), 'should generate includes.');
		test.equal(grunt.file.read('tmp/jade/prod/app/views/includes/main.html'), grunt.file.read('test/expected/jade/prod/app/views/includes/main.html'), 'should correctly format main.html');

		test.ok(grunt.file.exists('tmp/jade/prod/public/js/main.js'), 'should create packaged js file');

		var actualJSLines = grunt.file.read('tmp/jade/prod/public/js/main.js').split(grunt.util.linefeed),
		    expectedJSLines = grunt.file.read('test/expected/jade/prod/public/js/main.js').split(grunt.util.linefeed);

		test.equal(actualJSLines.length, 2, 'packaged js should contain 2 lines.');
		test.equal(actualJSLines[1], expectedJSLines[1], 'should concat and uglify javascript');
		test.ok(/\/\/Generated by grunt-asset-packager at \d\d-\d\d-\d\d\d\d \d?\d:\d\d:\d\d [A|P]M/.test(actualJSLines[0]), 'should include banner in packaged javascript');

		test.done();
	}
};
