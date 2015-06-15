'use strict';
var path = require('path');
var eachAsync = require('each-async');
var chalk = require('chalk');
var JSFtp = require('jsftp');
var q = require('q');

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

		if (options.host === undefined) {
			throw new Error('`host` required');
		}

		var files = [];
		// Use to construct files dest / src map
		this.files.forEach(function (file) {
			var transformed = file.orig.src.map(function(source) {
				return {'src': source, 'dest': file.orig.dest};
			});
			files = files.concat(transformed);
		});

		getTree(files, options).then(function (data) {
			// When we get the ftp tree, begin the downloading
			return getFiles(data, options);
		}).then(function (count) {
			// When the files are download, display how many files was retrieve
			if (count > 0) {
				grunt.log.writeln(chalk.green(count, count === 1 ? 'file' : 'files', 'downloaded successfully'));
			} else {
				grunt.log.writeln(chalk.yellow('No files downloaded'));
			}
		}).catch(function (error) {
			// If we catch an error during one of the previous action, log it
			grunt.warn(error);
		}).then(function() {
			// Task is done
			done();
		});
	});
	
	var getTree = function (files, options) {
		var totalFiles = [];
		var deferred = q.defer();

		eachAsync(files, function (el, i, next) {
			var ftp = new JSFtp(options);

			ftp.ls(el.src, function (error, files) {
				if(error) {
					next(error);
					return;
				}

				var isDir = (el.dest.lastIndexOf('/') ===  el.dest.length - 1) || (el.dest.lastIndexOf('\\\\') === el.dest.length - 1);

				var transformed = files.map(function (ftpFile) {
					return { 'src': ftpFile.name, 'dest': isDir ? el.dest + path.basename(ftpFile.name) : el.dest };
				});

				totalFiles = totalFiles.concat(transformed);

				ftp.raw.quit();
				next();
			});
		}, function (err) {
			if (err) {
				deferred.reject(err);
				return;
			}

			deferred.resolve(totalFiles);
		});

		return deferred.promise;
	};

	var getFiles = function (files, options) {
		var fileCount = 0;
		var deferred = q.defer();

		eachAsync(files, function (el, i, next) {
			var ftp = new JSFtp(options);

			grunt.file.mkdir(path.dirname(el.dest));

			var finalLocalPath = el.dest;
			if (grunt.file.isDir(el.dest)) {
				// if dest is a directory we have to create a file with the source filename
				finalLocalPath = path.join(el.dest, path.basename(el.src));
			}

			// retrieve the file
			ftp.get(el.src, finalLocalPath, function (getError) {
				if (getError) {
					next(getError);
					return;
				}

				fileCount++;
				ftp.raw.quit();
				next();
				
			});
		}, function (err) {
			if (err) {
				deferred.reject(err);
				return;
			}

			deferred.resolve(fileCount);
		});

		return deferred.promise;
	};
};
