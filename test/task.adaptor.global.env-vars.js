const assert = require('chai').assert;
const cli = require("../");
const TaskTypes = require("../dist/task.resolve").TaskTypes;
const TaskRunModes = require("../dist/task.resolve").TaskRunModes;
const SequenceItemTypes = require("../dist/task.sequence.factories").SequenceItemTypes;

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
                            sleep: 0.3
                        }
                    }
                }
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
                            sleep: 0.3
                        }
                    }
                }
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
});
