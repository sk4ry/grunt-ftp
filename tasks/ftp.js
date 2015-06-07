'use strict';
var path = require('path');
var eachAsync = require('each-async');
var chalk = require('chalk');
var JSFtp = require('jsftp');

JSFtp = require('jsftp-mkdirp')(JSFtp);

module.exports = function (grunt) {
	grunt.registerMultiTask('ftpPut', 'Upload files to an FTP-server', function () {
		var done = this.async();
		var options = this.options();
		var fileCount = 0;

		if (options.host === undefined) {
			throw new Error('`host` required');
		}

		var files = [];
		// Use to construct files dest / src map
		this.files.forEach(function (file) {
			var transformed = file.src.map(function (source) {
				return {'src': source, 'dest': file.dest};
			});
			files = files.concat(transformed);
			console.log(file.orig);
		});

		console.log("");
		console.log("");
		console.log("");
		console.log(chalk.yellow("this.files"), this.files);
		console.log("");
		console.log("");
		console.log("");
		console.log(chalk.yellow("files"), files);

		eachAsync(files, function(el, i, next) {
			// have to create a new connection for each file otherwise they conflict
			var ftp = new JSFtp(options);
			var finalRemotePath = path.join('/', el.dest, el.src);

			ftp.mkdirp(path.dirname(finalRemotePath), function (err) {
				if (err) {
					next(err);
					return;
				}

				var buffer = grunt.file.read(el.src, {encoding: null});

				ftp.put(buffer, finalRemotePath, function (err) {
					if (err) {
						next(err);
						return;
					}

					fileCount++;
					ftp.raw.quit();
					next();
				});
			});
		}, function (err) {
			if (err) {
				grunt.warn(err);
				done();
				return;
			}

			if (fileCount > 0) {
				grunt.log.writeln(chalk.green(fileCount, fileCount === 1 ? 'file' : 'files', 'uploaded successfully'));
			} else {
				grunt.log.writeln(chalk.yellow('No files uploaded'));
			}

			done();
		});
	});

	grunt.registerMultiTask('ftpGet', 'Download files from an FTP-server', function () {
		var done = this.async();
		var options = this.options();
		var fileCount = 0;

		if (options.host === undefined) {
			throw new Error('`host` required');
		}

		console.log("");
		console.log("");
		console.log("");
		console.log(chalk.yellow("this.files"), this.files);

		var files = [];
		// Use to construct files dest / src map
		this.files.forEach(function (file) {
			var transformed = file.orig.src.map(function(source) {
				return {'src': source, 'dest': file.orig.dest};
			});
			files = files.concat(transformed);
		});

		
		console.log("");
		console.log("");
		console.log("");
		console.log(chalk.yellow("files"), files);

		eachAsync(files, function (el, i, next) {
			// have to create a new connection for each file otherwise they conflict
			var ftp = new JSFtp(options);

			ftp.ls(el.src, function(lsError, ftpFiles){
				if(lsError) {
					next(err);
					//ftp.raw.quit();
					return;
				}

				console.log(ftpFiles);

				var totalFiles = ftpFiles.map(function(ftpFile) {
					return {'src': ftpFile.name, 'dest': el.dest};
				});

				console.log(totalFiles);

				eachAsync(totalFiles, function(test, j, nextnext) {
					var ftpGet = new JSFtp(options);

					grunt.file.mkdir(path.dirname(test.dest));
					console.log(test.dest, path.dirname(test.dest));

					var finalLocalPath = test.dest;
					if (grunt.file.isDir(test.dest)) {
						// if dest is a directory we have to create a file with the source filename
						finalLocalPath = path.join(test.dest, path.basename(test.src));
					}

					console.log(j, finalLocalPath);

					// retrieve the file
					ftpGet.get(test.src, finalLocalPath, function (getError) {
						if (getError) {
							nextnext(getError);
							return;
						}

						fileCount++;
						ftpGet.raw.quit();
						nextnext();
						
					});
				}, function (err) {
					if (err) {
						grunt.warn(err);
						done();
						return;
					}

					if (fileCount > 0) {
						grunt.log.writeln(chalk.green(fileCount, fileCount === 1 ? 'file' : 'files', 'downloaded successfully'));
					} else {
						grunt.log.writeln(chalk.yellow('No files downloaded'));
					}

					done();
				});

				ftp.raw.quit();
				next();
			});
		});
	});
};
