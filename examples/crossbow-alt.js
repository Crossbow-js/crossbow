module.exports = {
    tasks: {
        "my-awesome-task": ['test/fixtures/tasks/simple.js', 'test/fixtures/tasks/simple2.js', 'webpack'],
        "webpack": '@npm webpack --config webpack.prod.js'
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
    }
};