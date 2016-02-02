const cli = require('./');
const runner = cli({
    input: ['watch', 'dev'],
    flags: {
        handoff: true
    }
}, {
    crossbow: {
        watch: {
            tasks: {
                dev: {
                    watchers: {
                        "*.css:test/fixtures/*.html": ["css", "js"],
                        "*.js": ["js"],
                        "*.json": ["css"],
                        "*.html": ["css"]
                    }
                },
                default: {
                    watchers: {
                        "*.js":   ["js"],
                        "*.json": ["css"]
                    }
                }
            }
        },















        tasks: {
            css: ['test/fixtures/tasks/simple2.js'],
            js: ['test/fixtures/tasks/slow1.js', 'test/fixtures/tasks/error.js']
        }
    }
});
