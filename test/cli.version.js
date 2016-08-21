const assert = require('chai').assert;
const exec = require('child_process').exec;
const current = require('../package.json').version;
const cli = require('../dist/index');

describe("Prints the version", function () {
    it("via --version flag", function (done) {
        exec(`node dist/index --version`, function (err, stdout) {
            assert.equal(stdout, `${current}\n`);
            done();
        });
    });
    it("reports tasks with @p ", function () {
        const reports = [];
        cli.default({
            input: ['tasks'],
            flags: {
                reporters: [
                    function (name, args) {
                        if (name === 'SimpleTaskList') reports.push(args);
                    }
                ]
            }
        }, {
            tasks: {
                'build@p': ['css', 'js'],
                css: function cssTask() {

                },
                js: function jsTask() {

                }
            }
        });

        assert.include(reports[0].join('\n'), 'build <p>');
    });
});
