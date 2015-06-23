var assert      = require('chai').assert;
var watch       = require('../lib/command.watch');
var cwd         = require('path').resolve('test/fixtures');
var current     = process.cwd();
var gather      = require('../lib/gather-tasks');
var getBsConfig = require('../lib/utils').getBsConfig;

describe('Watch task', function () {
    it.only('can gather simple tasks', function () {

        var tasks = gather({
           watch: {
               before: ['js'],
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
        var tasks = gather({
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
        var tasks = gather({
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
        var tasks = gather({
            watch: {
                "someother": {
                    before: ['js'],
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
    it('can select from multiple namespaced watchers', function () {
        var tasks = gather({
            watch: {
                "someother": {
                    tasks: [
                        {
                            "app/**/*.js": "babel1"
                        }

                    ]
                },
                'js': {
                    tasks: [
                        {
                            "app/*.js": "babel2"
                        }

                    ]
                },
                'js2': {
                    tasks: [
                        {
                            "app/*.js": "babel2"
                        }

                    ]
                }
            }
        }, ['someother', 'js']);

        assert.equal(tasks.length, 2);
        assert.equal(tasks[0].patterns[0], 'app/**/*.js');
        assert.equal(tasks[1].patterns[0], 'app/*.js');

        assert.equal(tasks[0].tasks[0],    'babel1');
        assert.equal(tasks[1].tasks[0],    'babel2');
    });
    it('can gather tasks from multiple formats', function () {
        var tasks = gather({
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
    it('can use given bs-config', function () {
        var bsConfig = getBsConfig({
            "watch": {
                "bs-config": {
                    server: "./app"
                }
            }
        }, {cwd: cwd});
        assert.equal(bsConfig.server, "./app");
    });
    it('can use given bs-config file', function () {
        var bsConfig = getBsConfig({
            "watch": {
                "bs-config": "bs-config.js"
            }
        }, {cwd: cwd});
        assert.equal(bsConfig.server, "./app/test");
    });
    it('can use default config if file not found', function () {
        var bsConfig = getBsConfig({
            "watch": {
                "bs-config": "bs-config.js"
            }
        }, {cwd: current});
        assert.equal(bsConfig.server, "./public");
    });
});