module.exports = {
    watch: {
        default: {
            before: ['js', 'css', 'some-tasks'],
            "test/fixtures/*.html": ['js']
        }
    },
    tasks: {
        buildall: ['js', 'css'],
        js: [
            'test/fixtures/tasks/simple.js',
            'test/fixtures/tasks/simple.js',
            'test/fixtures/tasks/simple.js'
        ],
        css: ['crossbow-sass']
    },
    config: {
        sass: {
            input:  'test/fixtures/scss/main.scss',
            output: 'test/fixtures/css/main.min.css',
            root:   'test/fixtures/scss'
        },
        "babel-browserify": {
            input:  'test/fixtures/js/app.js',
            output: 'test/fixtures/js/dist/bundle.js',
            root:   'test/fixtures/js'
        },
        "test/fixtures/tasks/promise.js": {
            dev: {
                name: "kiittie"
            },
            normal: {
                name: "shane"
            }
        }
    }
};
