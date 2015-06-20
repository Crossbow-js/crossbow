var assert = require('chai').assert;
var watch  = require('../lib/command.watch');

describe('Watch task', function () {
    it('can gather simple tasks', function () {
        var tasks = watch.gatherTasks({
           watch: {
               tasks: {
                   "**/*.js": "babel"
               }
           }
        });

        assert.equal(tasks.length, 1);
        assert.equal(tasks[0].patterns[0], '**/*.js');
        assert.equal(tasks[0].tasks[0],    'babel');

    });
    it('can gather nested simple tasks', function () {
        var tasks = watch.gatherTasks({
            watch: {
                tasks: [
                    {
                        "**/*.js": "babel"
                    }
                ]
            }
        });

        assert.equal(tasks.length, 1);
        assert.equal(tasks[0].patterns[0], '**/*.js');
        assert.equal(tasks[0].tasks[0],    'babel');

    });
    it('can select namespaced watchers', function () {
        var tasks = watch.gatherTasks({
            watch: {
                "default": [
                    {
                        "**/*.js": "babel"
                    }
                ],
                "someother": [
                    {
                        "app/**/*.js": "babel2"
                    }
                ]
            }
        }, 'someother');

        assert.equal(tasks.length, 1);
        assert.equal(tasks[0].patterns[0], 'app/**/*.js');
        assert.equal(tasks[0].tasks[0],    'babel2');
    });
    it('can select namespaced watchers (2)', function () {
        var tasks = watch.gatherTasks({
            watch: {
                "someother": {
                    tasks: [
                        {
                            "app/**/*.js": "babel2"
                        }

                    ]
                }
            }
        }, 'someother');

        assert.equal(tasks.length, 1);
        assert.equal(tasks[0].patterns[0], 'app/**/*.js');
        assert.equal(tasks[0].tasks[0],    'babel2');
    });
    it('can gather tasks from multiple formats', function () {
        var tasks = watch.gatherTasks({
            config: {
                crossbow: {
                    input: [
                        'src/**',
                        'docs/**'
                    ]
                }
            },
            watch: {
                "default": {
                    "tasks": [
                        {
                            patterns: 'src/js/*.js',
                            tasks: ['babel']
                        },
                        {
                            "config:crossbow.input": "bs:reload",
                            "src/js/*.js": [
                                "babel-browserify",
                                "bs:reload"
                            ],
                            "src/svg/*.svg": [
                                "svg-icons",
                                "bs:reload"
                            ],
                            "src/scss/*.scss": [
                                "sass",
                                "bs:reload:main.css"
                            ]
                        }
                    ]
                }
            }
        });

        assert.equal(tasks.length, 5);
        assert.equal(tasks[0].patterns[0], 'src/js/*.js');
        assert.equal(tasks[1].patterns[0], 'src/**');
        assert.equal(tasks[1].patterns[1], 'docs/**');
        assert.equal(tasks[1].tasks[0],    'bs:reload');
    });
});