const assert = require('chai').assert;
const cli = require("../../");

describe('Adaptor tasks + global option vars', function () {
    it('@sh with options env vars' , function (done) {
        const runner = cli.getRunner(['js'], {
            tasks: {
                js: {
                    input: '@sh sleep $CB_OPTIONS_MY_NESTED_OBJECT_SLEEP'
                }
            },
            options: {
                my: {
                    nested: {
                        object: {
                            sleep: 0.1
                        }
                    }
                }
            }
        });
        runner.runner
            .series()
            .toArray()
            .subscribe(function (xs) {
                assert.ok(xs.slice(-1)[0].stats.duration > 100);
                done();
            });
    });
    it('@npm with options env vars' , function (done) {
        const runner = cli.getRunner(['js'], {
            tasks: {
                js: {
                    input: '@sh sleep $CB_OPTIONS_MY_NESTED_OBJECT_SLEEP'
                }
            },
            options: {
                my: {
                    nested: {
                        object: {
                            sleep: 0.1
                        }
                    }
                }
            }
        });
        runner.runner
            .series()
            .toArray()
            .subscribe(function (xs) {
                assert.ok(xs.slice(-1)[0].stats.duration > 100);
                done();
            });
    });
});
