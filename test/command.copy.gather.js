var assert = require('chai').assert;
var watch = require('../lib/command.watch');
var cwd = require('path').resolve('test/fixtures');
var current = process.cwd();
var resolve = require('path').resolve;
var gather = require('../lib/command.copy').gatherCopyTasks;
var getBsConfig = require('../lib/utils').getBsConfig;

describe('Gathering copy tasks', function () {
    it('can gather simple tasks', function () {

        var tasks = gather({
            copy: {
                images: {
                    "js": "public/js",
                    "css": "public/css"
                }
            }
        });

        assert.equal(tasks.length, 2);
        assert.equal(tasks[0].src[0], 'js');
        assert.equal(tasks[0].dest[0], 'public/js');
        assert.equal(tasks[1].src[0], 'css');
        assert.equal(tasks[1].dest[0], 'public/css');
    });
    it('can gather nested simple tasks', function () {
        var tasks = gather({
            copy: {
                tasks: [
                    {
                        "**/*.js": "babel"
                    }
                ]
            }
        });

        assert.equal(tasks.length, 1);
        assert.equal(tasks[0].src[0], '**/*.js');
        assert.equal(tasks[0].dest[0],    'babel');
    });
    it('can select namespaced copy tasks (2)', function () {
        var tasks = gather({
            copy: {
                "someother": {
                    "app/**/*.js": "babel2"
                },
                "default": {
                    "app/**/*.css": "public/css"
                },
            }
        }, 'someother');

        assert.equal(tasks.length, 1);
        assert.equal(tasks[0].src[0], 'app/**/*.js');
        assert.equal(tasks[0].dest[0], 'babel2');
    });
});