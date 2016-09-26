const assert = require('chai').assert;
const parse = require("../../../dist/cli.parse").default;
const CliFlagTypes = require("../../../dist/cli.parse").CliFlagTypes;

describe('cli parser', function () {
    it('handles simple command + 2 inputs', function () {
        const input = 'run task-1 task2';
        const output = parse(input);
        assert.deepEqual(output.command, 'run');
        assert.deepEqual(output.input, ['run', 'task-1', 'task2']);
    });
    it('handles simple command + input + flag', function () {
        const input = 'run task-1 -v';
        const output = parse(input);
        assert.deepEqual(output.input, ['run', 'task-1']);
        assert.deepEqual(output.flagValues.v.values[0], true);
    });
    it('multiple boolean flags', function () {
        const input = 'run task-1 -vsq';
        const output = parse(input);
        assert.deepEqual(output.command, 'run');
        assert.deepEqual(output.input, ['run', 'task-1']);
        assert.deepEqual(output.flagValues.v.values[0], true);
        assert.deepEqual(output.flagValues.s.values[0], true);
        assert.deepEqual(output.flagValues.q.values[0], true);
    });
    it('setters', function () {
        const input = 'run task-1 --name=shane -c example.js -ab --log';
        const output = parse(input);
        assert.deepEqual(output.command, 'run');
        assert.deepEqual(output.input, ['run', 'task-1']);
        assert.deepEqual(output.flagValues.name.values[0], 'shane');
        assert.deepEqual(output.flagValues.c.values[0], 'example.js');
        assert.deepEqual(output.flagValues.a.values[0], true);
        assert.deepEqual(output.flagValues.b.values[0], true);
        assert.deepEqual(output.flagValues.log.values[0], true);
    });
    it('adds input after cut off', function () {
        const input = 'run task-1 -p 8080 -- task2 task3';
        const output = parse(input);
        assert.deepEqual(output.command, 'run');
        assert.deepEqual(output.trailing, 'task2 task3');
        assert.deepEqual(output.input, ['run', 'task-1']);
        assert.deepEqual(output.flagValues.p.values[0], '8080');
    });
    it('Works with alias in opts', function () {
        const input = 'run task-1 -p 8080';
        const output = parse(input, {
            port: {
                alias: 'p'
            }
        });
        assert.deepEqual(output.flagValues.port.values[0], '8080');
    });
    it('Works with multiple values (-vvv) etc', function () {
        const input = 'run task-1 -vvv';
        const output = parse(input, {
            verbose: {
                alias: 'v'
            }
        });
        assert.deepEqual(output.flagValues.verbose.values[0], true);
        assert.deepEqual(output.flagValues.verbose.values[1], true);
        assert.deepEqual(output.flagValues.verbose.values[2], true);
    });
    it('handle multi input + multi mixed flags', function () {
        const input = 'run task1 task2 -p 8000 -q -vvv -name=kittie -b task3 task4 --server ./app ./tmp';
        const output = parse(input, {
            'port': {
                alias: 'p',
                type: 'number'
            },
            "server": {
                alias: 's',
                type: 'array'
            },
            "before": {
                alias: 'b',
                type: 'array'
            }
        });
        assert.deepEqual(output.input, ['run', 'task1', 'task2']);
        assert.deepEqual(output.flagValues.port.values[0], '8000'); // -p 8000
        assert.deepEqual(output.flagValues.v.values[0], true); // -vvv
        assert.deepEqual(output.flagValues.v.values[1], true); // -vvv
        assert.deepEqual(output.flagValues.v.values[2], true); // -vvv
        assert.deepEqual(output.flagValues.name.values[0], 'kittie');  // -name=kittie
        assert.deepEqual(output.flagValues.before.values[0], 'task3'); // -b task3 task4
        assert.deepEqual(output.flagValues.before.values[1], 'task4'); // -b task3 task4
        assert.deepEqual(output.flagValues.server.values[0], './app'); // --server ./app ./tmp
        assert.deepEqual(output.flagValues.server.values[1], './tmp'); // --server ./app ./tmp
    });
    it('flattens strings', function () {
        const input = 'run task-1 -v=verbose';
        const output = parse(input);
        assert.deepEqual(output.command, 'run');
        assert.deepEqual(output.input, ['run', 'task-1']);
        assert.deepEqual(output.flags.v, 'verbose');
    });
    it('flattens booleans', function () {
        const input = 'run task-1 -v --logger';
        const output = parse(input);
        assert.deepEqual(output.flags.v, true);
        assert.deepEqual(output.flags.logger, true);
    });
    it('flattens multi arg', function () {
        const input = 'run task-1 -vvv --before t1 t2';
        const output = parse(input, {before: {type: 'array'}});
        assert.deepEqual(output.flags.v[0], true);
        assert.deepEqual(output.flags.v[1], true);
        assert.deepEqual(output.flags.v[2], true);
        assert.deepEqual(output.flags.before[0], 't1');
        assert.deepEqual(output.flags.before[1], 't2');
    });
    it('uses count to tally up amount of values for a flag', function () {
        const input = 'run task-1 -vvv --before t1 t2';
        const output = parse(input, {
            v: {
                type: CliFlagTypes.Count
            },
            before: {
                type: CliFlagTypes.Array
            }
        });
        assert.deepEqual(output.flags.v, 3);
        assert.deepEqual(output.flags.before, ['t1', 't2']);
    });
    it('converts to number', function () {
        const input = 'run task-1 -p 8000 -v 10 20 30';
        const output = parse(input, {
            port: {
                alias: 'p',
                type: CliFlagTypes.Number
            },
            v: {
                type: CliFlagTypes.Array
            }
        });

        assert.deepEqual(output.flags.v[0], '10');
        assert.deepEqual(output.flags.v[1], '20');
        assert.deepEqual(output.flags.v[2], '30');
    });
    it('converts to boolean', function () {
        const input = 'run task-1 --doc=true';
        const output = parse(input, {
            doc: {
                type: CliFlagTypes.Boolean
            }
        });
        assert.deepEqual(output.flags.doc, true);
    });
    it('converts to string', function () {
        const input = 'run task-1 --doc';
        const output = parse(input, {
            doc: {
                type: CliFlagTypes.String
            }
        });
        assert.deepEqual(output.flags.doc, 'true');
    });
    it('ensures an array', function () {
        const input = 'run task-1 -c example.js';
        const output = parse(input, {
            config: {
                alias: 'c',
                type: CliFlagTypes.Array
            }
        });
        assert.deepEqual(output.flags.config[0], 'example.js');
    });
    it('Allows array of alias', function () {
        const input = 'run task-1 --conf example.js -c another.js -r out.js';
        const output = parse(input, {
            config: {
                alias: ['c', 'conf'],
                type: CliFlagTypes.Array
            },
            reporters: {
                type: CliFlagTypes.Array,
                alias: ['r']
            }
        });
        assert.deepEqual(output.flags.config[0], 'example.js');
        assert.deepEqual(output.flags.config[1], 'another.js');
    });
    it('strips opts that were not present in the command', function () {
        const input = 'run task-1 --conf example.js';
        const output = parse(input, {
            config: {
                alias: ['c', 'conf'],
                type: CliFlagTypes.Array
            },
            reporters: {
                type: CliFlagTypes.Boolean,
                alias: ['r']
            }
        });
        assert.deepEqual(output.flags.config[0], 'example.js');
        assert.isUndefined(output.flags.reporters);
    });
    it('Allows flag-first', function () {
        const input = 'run --conf example.js task-1';
        const output = parse(input, {
            reporter: {
                type: "array"
            }
        });

        assert.deepEqual(output.flags.conf, 'example.js');
    });
    it('Stops parsing after `--` ', function () {
        const input = 'run --conf example.js task-1 task-2 -- composer update --config';
        const output = parse(input);
        assert.deepEqual(output.input, ['run', 'task-1', 'task-2']);
        assert.deepEqual(output.flags.conf, 'example.js');
        assert.deepEqual(output.trailing, 'composer update --config');
    });
    it('Works with negated props ', function () {
        const input = 'run task1 task2 --no-fail --other';
        const output = parse(input);
        assert.deepEqual(output.flags.fail, false);
        assert.deepEqual(output.flags.other, true);
    });
});
