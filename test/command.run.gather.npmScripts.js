const assert = require('chai').assert;
const cli = require("../");
const TaskOriginTypes = require("../dist/task.resolve").TaskOriginTypes;

describe('Gathering run tasks with npmScripts', function () {
    it('accepts npm scripts task name', function () {
        var runner = cli.getRunner(['lint', 'webpack'], {
            npmScripts: {
                lint: "@shell sometask"
            },
            tasks: {
                webpack: "@npm webpack"
            }
        });
        assert.equal(runner.tasks.valid[0].tasks[0].origin, TaskOriginTypes.NpmScripts);
        assert.equal(runner.tasks.valid[1].tasks[0].origin, TaskOriginTypes.CrossbowConfig);
    });
});
