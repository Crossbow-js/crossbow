module.exports = {
    tasks: {
        "my-awesome-task": ['examples/tasks/simple.js', 'examples/tasks/simple2.js']
    },
    watch:  {
        'bs-config': {
            server: 'test/fixtures',
            logFileChanges: false,
            open: false
        },
        'tasks': {
            default: {
                "*.css": ["js"]
            }
        }
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
        }
    },
    copy: {
        "default": [
            "test/fixtures/*/**:public"
        ]
    }
};