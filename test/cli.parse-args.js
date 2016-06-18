const assert = require('chai').assert;
const parse = require("../dist/cli.parse").default;

describe('cli parser', function () {
    it('handles simple commands', function () {
        const input = 'run task-1 task2';
        const output = parse(input);
        assert.deepEqual(output.command, 'run');
        assert.deepEqual(output.input, ['task-1', 'task2']);
    });
    it.only('handles simple commands with flag', function () {
        const input = 'run task1 task2 -p 8000 -name=kittie -- task3';
        const output = parse(input);
        console.log(output.input);
        console.log(output.rawFlags);
        // console.log(JSON.stringify(output.flags, null, 2));
        // console.log(output);
        // assert.deepEqual(output.command, 'run');
        // assert.deepEqual(output.input, ['task-1', 'task2']);
        // assert.deepEqual(output.flags.p, ['true']);
    });
});
