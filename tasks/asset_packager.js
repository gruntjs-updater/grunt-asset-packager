/*
* grunt-asset-packager
* https://github.com/sillypog/grunt-asset-packager
* 
*
* Copyright (c) 2013 Peter Hastie
* Licensed under the MIT license.
*/

// Go to the directory defined for assets
// For each file in there
// Create a property on the packages object named after the package
// If development:
//  Read line by line and get file specified on each line
//  Write the file to the package object
//  Copy that file to build folder
// If production:
//  Concatenate and uglify the files to build
//  Write the package name to the package object

'use strict';

var fs = require('fs'),
    path = require('path'),
    util = require('util'),
    _ = require('lodash');

module.exports = function (grunt) {

	// Please see the Grunt documentation for more information regarding task
	// creation: http://gruntjs.com/creating-tasks

	function processLine(packages, match, lineOpen, lineClose, env){
		var packageName = match[2];
		if (packages[packageName]){
			if (env == 'DEVELOPMENT'){
				// Replace the package line in the array with a line built from the package
				return packages[packageName].map(function(packagedFile){
					return expandLine(match[1], lineOpen, packagedFile, lineClose);
				}).join(grunt.util.linefeed);
			} else if (env == 'PRODUCTION'){
				return expandLine(match[1], lineOpen, packageName, lineClose);
			}
		} else {
			grunt.fail.warn('Reference to nonexistant package '+packageName);
		}
	}

	function expandLine(whitespace, lineOpen, fileName, lineClose){
		return whitespace + lineOpen + fileName + lineClose;
	}

	function createExternalConfig(name, configs, task, options, files){
		configs[task] = grunt.config(task) || {};
		configs[task][name] = { files: files || {} };
		if (options){
			configs[task][name].options = options;
		}
	}

	function runTasks(name, configs, tasks){
		tasks.forEach(function(task){
			grunt.config(task, configs[task]);
			grunt.task.run(task+':'+name);
		});
	}

	grunt.registerMultiTask('asset_packager', 'Packages javascript and stylesheets similarly to the smart_asset gem.', function() {

		var config = grunt.config(this.name),
		    options = this.options() || {},
		    origOptions = config.options || {},
		    context = _.extend({}, process.env, options.context || {}, origOptions.context || {}),
		    packages = {},
		    externalConfigs = {};

		this.files.forEach(function(file){
			grunt.log.writeln('\nProcessing asset file: '+file.src);
			var content = grunt.file.read(file.src),
			    packageName = path.basename(file.src, path.extname(file.src));
			    packages[packageName] = content.split(grunt.util.linefeed);
		}, this);

		if (context.NODE_ENV == 'DEVELOPMENT'){
			// For all of the packages, copy all of their contents
			createExternalConfig(this.name, externalConfigs, 'copy', null, []);

			_.forEach(packages, function(packageContent){
				var mappedContent = packageContent.map(function(packagedFile){
					return {src: packagedFile, dest: options.dest + path.sep + packagedFile};
				});
				externalConfigs.copy[this.name].files = externalConfigs.copy[this.name].files.concat(mappedContent);
			}, this);

			runTasks(this.name, externalConfigs, ['copy']);

		} else if (context.NODE_ENV == 'PRODUCTION'){
			//  Concatenate and uglify the files to build
			createExternalConfig(this.name, externalConfigs, 'concat', { separator: ';\n\n' });
			createExternalConfig(this.name, externalConfigs, 'uglify', { banner: '//Generated at <%= grunt.template.today("dd-mm-yyyy h:MM:ss TT") %> \n' });
			createExternalConfig(this.name, externalConfigs, 'cssmin', null);

			// Loop over the packages and populate the files object
			_.forEach(packages, function(packageContent, packageName){
				var destination = options.dest + path.sep + packageName;
				externalConfigs.concat[this.name].files[destination] = packageContent;
				if (/js$/.test(destination)){
					externalConfigs.uglify[this.name].files[destination] = destination;
				} else if (/css$/.test(destination)){
					externalConfigs.cssmin[this.name].files[destination] = destination;
				}
			}, this);

			runTasks(this.name, externalConfigs, ['concat', 'uglify', 'cssmin']);
		}

		// Get the file defined for index
		// Read through it and when reaching a marker
		// Replace the marker with the contents of the appropriate package from package object
		var indexContent = grunt.file.read(options.index),
		    indexLines = indexContent.split(grunt.util.linefeed),
		    scriptRegEx = /(\s*)<script-package src=["|'](.+)["|']/,
		    styleRegEx = /(\s*)<style-package src=["|'](.+)["|']/;  // Storing the whitespace so we can preserve it

		indexLines.forEach(function(line, i, lines){
			var match;
			if (match = line.match(scriptRegEx)){
				lines[i] = processLine(packages, match, '<script src="', '"></script>', context.NODE_ENV);
			} else if (match = line.match(styleRegEx)){
				lines[i] = processLine(packages, match, '<link rel="stylesheet" href="', '">', context.NODE_ENV);
			}
		}, this);

		var indexOutput = indexLines.join(grunt.util.linefeed);

		grunt.file.write(options.dest + path.sep + 'index.html', indexOutput);
	});
};
