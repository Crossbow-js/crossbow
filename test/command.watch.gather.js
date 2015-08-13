var assert      = require('chai').assert;
var watch       = require('../lib/command.watch');
var cwd         = require('path').resolve('test/fixtures');
var current     = process.cwd();
var gather      = require('../lib/gather-watch-tasks');
var getBsConfig = require('../lib/utils').getBsConfig;

describe('Gathering watch tasks', function () {
    it('can gather default watch tasks', function () {

        var tasks = gather({
           watch: {
               before: ['js'],
               tasks: {
                   default: {
                       "*.css": ["sass", "js"],
                       "*.js": "js"
                   }
               }
           }
        });

        assert.equal(tasks.default.length, 2);
        assert.equal(tasks.default[0].patterns.length, 1);
        assert.equal(tasks.default[0].patterns[0], "*.css");
        assert.equal(tasks.default[0].tasks[0], "sass");
        assert.equal(tasks.default[0].tasks[1], "js");

    });
    it('can gather default + other tasks', function () {

        var tasks = gather({
           watch: {
               before: ['js'],
               tasks: {
                   default: {
                       "*.html": ["js"]
                   },
                   dev: {
                       "*.css": ["sass", "js"],
                       "*.js": "js"
                   }
               }
           }
        });

        assert.equal(tasks.dev.length, 2);
        assert.equal(tasks.dev[0].patterns.length, 1);
        assert.equal(tasks.dev[0].patterns[0], "*.css");
        assert.equal(tasks.dev[0].tasks[0], "sass");
        assert.equal(tasks.dev[0].tasks[1], "js");
    });
    it('can gather tasks in array format', function () {

        var tasks = gather({
           watch: {
               before: ['js'],
               tasks: {
                   dev: [
                       {
                           "*.js": ["css", "js:dev"]
                       },
                       {
                           "*.css":  ["css", "js"],
                           "*.html": ["html-min"]
                       }
                   ]
               }
           }
        });

        assert.equal(tasks.dev.length, 3);
        assert.equal(tasks.dev[0].patterns[0], "*.js");
        assert.equal(tasks.dev[0].tasks[0], "css");
        assert.equal(tasks.dev[0].tasks[1], "js:dev");
        assert.equal(tasks.dev[1].patterns[0], "*.css");
        assert.equal(tasks.dev[2].patterns[0], "*.html");
    });
    it('can gather tasks in colon-separated format', function () {

        var tasks = gather({
           watch: {
               before: ['js'],
               tasks: {
                   dev: {
                       "*.js:*.html": "bs.reload('')"
                   }
               }
           }
        });

        assert.equal(tasks.dev.length, 1);
        assert.equal(tasks.dev[0].patterns.length, 2);
        assert.equal(tasks.dev[0].patterns[0], "*.js");
        assert.equal(tasks.dev[0].patterns[1], "*.html");
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