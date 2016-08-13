const assert = require('chai').assert;
const cli = require("../");
const exec = require("child_process").exec;

describe('running tasks with config', function () {
    it('accepts overrides from external input file', function (done) {
        exec("node dist/index run '@npm sleep 0.1' -c test/fixtures/inputs/1.yaml", function (err, stdout) {
            assert.include(stdout, '+ @npm sleep 0.1');
            assert.include(stdout, '✔ @npm sleep 0.1');
            done();
        });
    });
    it('allows overrides in input file', function (done) {
        const runner = cli.getRunner(['css'], {
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
                css: '@sh sleep $JJSSJJ_OPTIONS_SOME_NESTED_PROP'
            }
        });
        var start = new Date().getTime();
        runner.runner
            .series()
            .toArray()
            .subscribe(function () {
                assert.ok(new Date().getTime() - start > 300);
                done();
            });
    });
    it('allows overrides in input file with local ENV vars', function (done) {
        const runner = cli.getRunner(['css2'], {
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
        var start = new Date().getTime();
        runner.runner
            .series()
            .toArray()
            .subscribe(function () {
                assert.ok(new Date().getTime() - start > 100);
                assert.ok(new Date().getTime() - start < 200);
                done();
            });
    });
});
