module.exports = function(grunt) {

    grunt.initConfig({
        jshint: {
            files: ['examples/Gruntfile.js'],
            options: {
                globals: {
                    jQuery: true
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');

    grunt.registerTask('default', ['jshint']);
};