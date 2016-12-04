const assert = require('chai').assert;
const utils = require("../../utils");

describe('running tasks with config', function () {
    it('allows overrides in input file', function (done) {
        const runner = utils.getRunner(['css'], {
            config: {
                envPrefix: 'JJSSJJ'
            },
            options: {
                some: {
                    nested: {
                        prop: '0.1'
                    }
                }
            },
            tasks: {
                css: '@sh sleep $JJSSJJ_OPTIONS_SOME_NESTED_PROP'
            }
        });
        runner
            .toArray()
            .subscribe(function (xs) {
                console.log(xs);
                assert.ok(xs.slice(-1)[0].stats.duration > 100);
                done();
            });
    });
    it('allows overrides in input file with local ENV vars', function (done) {
        const runner = utils.getRunner(['css2'], {
            config: {
                envPrefix: 'JJSSJJ'
            },
            options: {
                some: {
                    nested: {
                        prop: '0.3'
                    }
                }
            },
            tasks: {
                // uses global env var from options + override prefix
                css: '@sh sleep $JJSSJJ_OPTIONS_SOME_NESTED_PROP',
                // uses simple local env name
                css2: {
                    input: '@sh sleep $NAME_OF_PROP',
                    env: {
                        NAME_OF_PROP: '0.1'
                    }
                }
            }
        });
        runner
            .toArray()
            .subscribe(function (xs) {
                assert.ok(xs.slice(-1)[0].stats.duration > 100);
                assert.ok(xs.slice(-1)[0].stats.duration < 200);
                done();
            });
    });
});
