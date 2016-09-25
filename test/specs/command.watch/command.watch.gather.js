const assert = require('chai').assert;
const utils = require('../../utils');
const defaultWatchOptions = require('../../../dist/watch.resolve').defaultWatchOptions;
const yml  = require('js-yaml');

describe('Gathering watch tasks in longer format', function () {
    it('can gather tasks in long format', function () {
        const runner = utils.getWatcher(['default'], {
           watch: {
               "bs-config": {
                   server: true
               },
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
        });
        assert.deepEqual(runner.tasks.valid[0].watchers[0].patterns, ['*.css']);
        assert.deepEqual(runner.tasks.valid[0].watchers[0].tasks, ['sass', 'js']);
        assert.deepEqual(runner.tasks.valid[0].watchers[0].options, defaultWatchOptions);
    });
    it('can gather tasks in array format', function () {
        const ymlInput = yml.safeLoad(`
watch:
    options:
        debounce: 3000
    bs-config:
        server: '.'
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

        const runner = utils.getWatcher(['default', 'sassdev'], ymlInput);
        assert.equal(runner.tasks.valid[0].watchers.length, 2);
        assert.equal(runner.tasks.valid[0].watchers[0].patterns[0], 'test/fixtures');
        assert.equal(runner.tasks.valid[0].before[0], 'bs');
        assert.equal(runner.tasks.valid[0].watchers[1].tasks[0], '3');
        assert.equal(runner.tasks.valid[0].watchers[0].options.debounce, 3000);
        assert.equal(runner.tasks.valid[0].watchers[0].options.exclude, '*.html');

        assert.equal(runner.tasks.valid[1].watchers.length, 1);
        assert.equal(runner.tasks.valid[1].before.length, 0);
        assert.equal(runner.tasks.valid[1].watchers[0].tasks[0], 'sass');
        assert.equal(runner.tasks.valid[1].watchers[0].options.debounce, 3000);
        assert.isUndefined(runner.tasks.valid[1].watchers[0].options.exclude);
    });
    it('can gather tasks in colon-separated format', function () {

        const runner = utils.getWatcher(['dev'], {
           watch: {
               before: ['js'],
               dev: {
                   "*.js:*.html": "bs.reload('')"
               }
           }
        });

        assert.equal(runner.tasks.valid[0].watchers.length, 1);
        assert.equal(runner.tasks.valid[0].before.length, 0);
        assert.equal(runner.tasks.valid[0].watchers[0].patterns.length, 2);
        assert.equal(runner.tasks.valid[0].watchers[0].patterns[0], "*.js");
        assert.equal(runner.tasks.valid[0].watchers[0].patterns[1], "*.html");
    });
    it('can gather tasks in a mix of short/longhand', function () {

        const runner = utils.getWatcher(['dev'], {
           watch: {
               before: ['js'],
               dev: {
                   before: ['js', '@npm watchify'],
                   watchers: {
                        "*.js:*.html": "bs.reload('')"
                   }
               }
           }
        });

        assert.equal(runner.tasks.valid[0].watchers.length, 1);
        assert.equal(runner.tasks.valid[0].before.length, 2);
        assert.equal(runner.tasks.valid[0].watchers[0].patterns.length, 2);
        assert.equal(runner.tasks.valid[0].watchers[0].patterns[0], "*.js");
        assert.equal(runner.tasks.valid[0].watchers[0].patterns[1], "*.html");
    });
});
