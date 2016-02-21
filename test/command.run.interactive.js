const assert = require('chai').assert;
const cli    = require("../");
const prompt    = require("../dist/command.run.interactive").buildPrompt;

describe.only('Creating run prompt', function () {
    it('can build from given input', function () {
        const p = prompt({
            tasks: {
                lint: "@npm lint"
            }
        });
        assert.equal(p.taskList.length, 1);
    });
});
