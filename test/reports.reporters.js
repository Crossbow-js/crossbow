const assert = require("chai").assert;
const _      = require('../lodash.custom');
const Rx     = require("rx");
const cli    = require("../dist/index").default;
const ReportNames = require('../dist/reporter.resolve').ReportNames;

describe('Reporter checks', function () {
    it('calls with using Config file... etc', function () {
        var sub = new Rx.Subject();
        sub.take(2).toArray().subscribe(function (value) {
            assert.equal(value[0].name, ReportNames.UsingConfigFile);
            assert.equal(value[1].name, ReportNames.SimpleTaskList);
        });
        cli({
            input: ['tasks'],
            flags: {
                handoff: true,
                reporters: [function () {
                    sub.onNext({
                        name: arguments[0],
                        args: _.toArray(arguments).slice(1)
                    })
                }]
            }
        });
    });
});
