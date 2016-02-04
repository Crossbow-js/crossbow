var assert = require('chai').assert;
var watch  = require('../lib/command.watch');
var gather = require('../lib/gather-watch-tasks');
const yml  = require('js-yaml');

describe('Gathering watch tasks', function () {
    it('can gather tasks in shorthand format', function () {
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
        assert.equal(tasks.default.watchers.length, 2);
        assert.equal(tasks.default.watchers[0].patterns.length, 1);
        assert.equal(tasks.default.watchers[0].patterns[0], "*.css");
        assert.equal(tasks.default.watchers[0].tasks[0], "sass");
        assert.equal(tasks.default.watchers[0].tasks[1], "js");
    });
    it('can gather tasks in long format', function () {
        var tasks = gather({
           watch: {
               "bs-config": {
                   server: true
               },
               tasks: {
                   default: {
                       before: ['@npm webpack'],
                       watchers: [
                           {
                               patterns: ["*.css"],
                               tasks: ["sass", "js"]
                           }
                       ]
                   }
               }
           }
        });
        assert.equal(tasks.default.watchers.length, 1);
        assert.equal(tasks.default.watchers[0].patterns.length, 1);
    });
    it('can gather tasks in array format', function () {
        const ymlInput = yml.safeLoad(`
watch:
    options:
        debounce: 3000
    bs-config:
        server: '.'
    tasks:
        default:
            options:
                exclude: '*.html'
            before: ['bs']
            watchers:
                - patterns: ['test/fixtures']
                  tasks:    ['1', '2']
                - patterns: ['*.css']
                  tasks:    '3'
        sassdev:
            watchers:
                - patterns: ['*.scss']
                  tasks:    ['sass']
`);

        const gathered = gather(ymlInput);
        assert.equal(gathered.default.watchers.length, 2);
        assert.equal(gathered.default.watchers[0].patterns[0], 'test/fixtures');
        assert.equal(gathered.default.before[0], 'bs');
        assert.equal(gathered.default.watchers[1].tasks[0], '3');
        assert.equal(gathered.default.watchers[0].options.debounce, 3000);
        assert.equal(gathered.default.watchers[0].options.exclude, '*.html');

        assert.equal(gathered.sassdev.watchers.length, 1);
        assert.equal(gathered.sassdev.before.length, 0);
        assert.equal(gathered.sassdev.watchers[0].tasks[0], 'sass');
        assert.equal(gathered.sassdev.watchers[0].options.debounce, 3000);
        assert.isUndefined(gathered.sassdev.watchers[0].options.exclude);
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

        assert.equal(tasks.dev.watchers.length, 1);
        assert.equal(tasks.dev.before.length, 0);
        assert.equal(tasks.dev.watchers[0].patterns.length, 2);
        assert.equal(tasks.dev.watchers[0].patterns[0], "*.js");
        assert.equal(tasks.dev.watchers[0].patterns[1], "*.html");
    });
    it('can gather tasks in a mix of short/longhand', function () {

        var tasks = gather({
           watch: {
               before: ['js'],
               tasks: {
                   dev: {
                       before: ['js', '@npm watchify'],
                       watchers: {
                            "*.js:*.html": "bs.reload('')"
                       }
                   }
               }
           }
        });

        assert.equal(tasks.dev.watchers.length, 1);
        assert.equal(tasks.dev.before.length, 2);
        assert.equal(tasks.dev.watchers[0].patterns.length, 2);
        assert.equal(tasks.dev.watchers[0].patterns[0], "*.js");
        assert.equal(tasks.dev.watchers[0].patterns[1], "*.html");
    });
});
