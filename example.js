var cli = require("./cli");
var assert = require("assert");

cli({input: ["watch"]}, {
    crossbow: {
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
        }
    }
});