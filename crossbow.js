module.exports = {
    tasks: {
        build: [
            "sass",
            "babel-browserify"
        ]
    },
    watch:  {
        'bs-config': {
            server: 'test/fixtures',
            logFileChanges: false,
            open: false
        },
        'tasks': {
            "test/fixtures/scss":   ["sass", "bs:reload:*.css"],
            "test/fixtures/js":     ["babel-browserify", "bs:reload"],
            "test/fixtures/*.html": ["bs:reload"]
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
            output: 'test/fixtures/js/app.js',
            root:   'test/fixtures/scss'
        }
    },
    copy: {
        "default": [
            "test/fixtures/js/**:public/js",
            "test/fixtures/css/**:public/css",
            "test/fixtures/**.html:public"
        ]
    }
};