const assert = require("chai").assert;
const _      = require('../lodash.custom');
const Rx     = require("rx");
const cli    = require("../dist/index").default;
const ReportNames = require('../dist/reporter.resolve').ReportNames;

describe('Reporter checks', function () {
    it('calls with using Config file... etc', function () {
        var sub = new Rx.Subject();
        sub.take(2).toArray().subscribe(function (value) {
            assert.equal(value[0].name, ReportNames.UsingInputFile);
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
    it.skip('doesnt show internal prefixes on functions', function (done) {
        const output = new Rx.Subject();

        output.subscribe(x => {
            console.log('CAPTURED', x);
        });

        cli({
            input: ['shane'],
            flags: {
                cbfile: 'test/fixtures/inputs/cb-files/anon-functions.js',
                progress: true,
                outputObserver: output
            }
        }).subscribe(function (out) {
            console.log('values');
        }, function () {

        }, function () {
            done()
        })
    });
});
