const assert = require('chai').assert;
const utils = require("../../utils");

describe('Adaptor tasks + global option vars', function () {
    it('@sh with options env vars' , function (done) {
        const runner = utils.getRunner(['js'], {
            tasks: {
                js: {
                    input: '@sh sleep $cb_options_my_nested_object_sleep'
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
        runner
            .toArray()
            .subscribe(function (xs) {
                assert.ok(xs.slice(-1)[0].stats.duration > 100);
                done();
            });
    });
    it('@npm with options env vars' , function (done) {
        const runner = utils.getRunner(['js'], {
            tasks: {
                js: {
                    input: '@sh sleep $cb_options_my_nested_object_sleep'
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
        runner
            .toArray()
            .subscribe(function (xs) {
                assert.ok(xs.slice(-1)[0].stats.duration > 100);
                done();
            });
    });
});
