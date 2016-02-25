const cli = require('./');
const tasks = cli.run(['lint'], null, {v: true});

//tasks.runner.parallel().subscribe();
//const runner = cli({
//    input: ['watch', 'dev'],
//    flags: {
//        handoff: true
//    }
//}, {
//    watch: {
//        tasks: {
//            dev: {
//                watchers: {
//                    "*.css:test/fixtures/*.html": ["css", "js"],
//                    "*.js": ["js"],
//                    "*.json": ["css"],
//                    "*.html": ["css"]
//                }
//            },
//            default: {
//                watchers: {
//                    "*.js": ["js"],
//                    "*.json": ["css"]
//                }
//            }
//        }
//    },
//    tasks: {
//        css: ['test/fixtures/tasks/simple2.js'],
//        js: ['test/fixtures/tasks/slow1.js']
//    }
//});
//
//const runner = cli({
//    input: ['run', '@npm ls', 'js'],
//    flags: {
//        handoff: true,
//        c: 'examples/crossbpw.yaml'
//    }
//}, {
//    tasks: {
//        'js': './test/fixtures/tasks/promise.js'
//    }
//});
//
//console.log(runner);

//console.log(runner);
