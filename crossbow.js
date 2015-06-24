module.exports = {
    tasks: {
        build: [
            "copy:default",
            "sass",
            "test/fixtures/task.js"
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
            "test/fixtures/js":     ["test/fixtures/task.js", "bs:reload"],
            "test/fixtures/*.html": ["bs:reload"]
        }
    },
    config: {
        sass: {
            input:  'test/fixtures/scss/main.scss',
            output: 'test/fixtures/css/main.min.css',
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