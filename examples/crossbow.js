module.exports = {
    watch: {
        default: {
            before: ['js', 'css', 'some-fake-task'],
            "test/fixtures/*.html": ['js']
        },
        dev: {
            before: ['js', 'css'],
            "test/fixtures/*.html": ['js'],
            "test/fixtures/*.css:anthier": ['js', 'css']
        },
        watcher: {
            before: ['js:s'],
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
        css: {
            name: "kittie"
        },
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
