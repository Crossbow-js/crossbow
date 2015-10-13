module.exports = function(grunt) {

    grunt.initConfig({
        jshint: {
            dev: {
                files: {src: ['examples/Gruntfilse.js']},
                options: {
                    globals: {
                        jQuery: true
                    }
                }
            },
            other: {
                files: {src: ['examples/Gruntfile.js']},
                options: {
                    globals: {
                        jQuery: true
                    }
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');

    grunt.loadTasks('test/fixtures/grunt/');
    grunt.registerTask('default', ['jshint']);
};