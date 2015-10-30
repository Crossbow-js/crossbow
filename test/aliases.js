var assert  = require('chai').assert;
var cwd     = require('path').resolve('test/fixtures');
var current = process.cwd();
var resolve = require('path').resolve;
var cli     = require("../cli");

function handoff (cmd, input, cb) {
    return cli({
        input: ['run'].concat(cmd),
        flags: {
            handoff: true
        }
    }, input, cb);
}

describe('Gathering run tasks with aliases', function () {
    it('can resolve a file name & options when using an alias', function () {

        var runner = handoff(['simple:dev:other'], {
            crossbow: {
                aliases: {
                    'simple': 'test/fixtures/tasks/simple.js'
                },
                config: {
                    '$': {
                        root: '/shane/is/awesome'
                    },
                    'simple': {
                        dev: {
                            input: '{{$.root}}'
                        },
                        other: {
                            input: './public{{simple.dev.input}}'
                        }
                    }
                }
            }
        });

        assert.ok(runner.tasks.valid[0].modules[0].indexOf('test/fixtures/tasks/simple.js') > -1);
        assert.equal(runner.tasks.valid[0].alias,    'simple');
        assert.equal(runner.tasks.valid[0].taskName, 'test/fixtures/tasks/simple.js');
        assert.equal(runner.sequence[0].opts.input,  '/shane/is/awesome');
        assert.equal(runner.sequence[1].opts.input,  './public/shane/is/awesome');
    });
});