'use strict';
module.exports = function (grunt) {
	grunt.initConfig({
		dirs: {
			local: __dirname
		},
		ftpPut: {
			test: {
				options: {
					host: 'ftp.olympe.in',
					port: 21,
					user: 'skary',
					pass: 'arya77'
				},
				files: {
					'ftp': 'fixture/*.txt',
					'ftp2': ['fixture/test.txt', 'fixture/fixture.txt']
				}
			}
		},
		ftpGet: {
			test: {
				options: {
					host: 'ftp.olympe.in',
					port: 21,
					user: 'skary',
					pass: 'arya77'
				},
				files: {
					'fixtureGet/fixture2.txt': '/ftp2/fixture/fixture.txt',
					'fixtureGet/coucou/': '/ftp/fixture/*'
				}
			}
		},
		simplemocha: {
			test: {
				src: 'test.js'
			}
		},
		clean: {
			test: ['ftp', 'ftp2', 'fixtureGet/coucou/*', 'fixtureGet2']
		}
	});

	grunt.loadTasks('tasks');
	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-simple-mocha');

	var mockServer;
	grunt.registerTask('pre', function () {
		var Server = require('ftp-test-server');

		mockServer = new Server();

		mockServer.init({
			user: 'test',
			pass: 'test'
		});

		mockServer.on('stdout', process.stdout.write.bind(process.stdout));
		mockServer.on('stderr', process.stderr.write.bind(process.stderr));

		setTimeout(this.async(), 500);
	});

	grunt.registerTask('post', function () {
		mockServer.stop();
	});

	grunt.registerTask('default', [
		'clean',
		//'pre',
		//'ftpPut',
		'ftpGet',
		// 'simplemocha',
		// 'post',
		//'clean'
	]);
};
