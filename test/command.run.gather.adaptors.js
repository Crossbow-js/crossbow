const assert = require('chai').assert;
const watch  = require('../lib/command.watch');
const cli    = require("../");
const errors    = require("../dist/task.errors");

describe('Gathering run tasks for `@` Adaptors', function () {
    it('can use grunt-adaptors to gather single Grunt tasks', function () {
        const runner = cli.getRunner(["@grunt jshint"], {
            gruntfile: "examples/Gruntfile.js"
        });

        assert.equal(runner.tasks.valid[0].taskName, '@grunt jshint');
        assert.equal(runner.tasks.valid[0].command, 'jshint');
        assert.equal(runner.tasks.valid[0].adaptor, 'grunt');
    });
    it('can use grunt-adaptors to gather multiple Grunt tasks', function () {
        const runner = cli.getRunner(["@grunt jshint:dev jshint:other"], {
            gruntfile: "examples/Gruntfile.js"
        });
        assert.equal(runner.tasks.valid[0].taskName, '@grunt jshint:dev jshint:other');
        assert.equal(runner.tasks.valid[0].command, 'jshint:dev jshint:other');
        assert.equal(runner.tasks.valid[0].adaptor, 'grunt');
    });
    it('can use shell-adaptors to gather shell command', function () {
        var runner = cli.getRunner(["@shell npm run es6"]);

        assert.equal(runner.sequence[0].task.adaptor, 'shell');
        assert.equal(runner.sequence[0].task.taskName, '@shell npm run es6');
        assert.equal(runner.sequence[0].task.command, 'npm run es6');
    });
    it('can flag attempted adaptors flag that does not exist', function () {
        const runner = cli.getRunner(["@gulp jshint:dev jshint:other"]);
        assert.equal(runner.tasks.invalid[0].taskName, '@gulp jshint:dev jshint:other');
        assert.equal(runner.tasks.invalid[0].errors[0].type, errors.TaskErrorTypes.AdaptorNotFound);
    });
});
