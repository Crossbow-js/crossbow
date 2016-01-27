const createContext = require('./ctx');
const debug         = require('debug')('command:run');

/**
 * @param {{input: Array, flags: Object}} cli - raw input from meow
 * @param {Object} input
 * @param {Immutable.Map} config
 * @param {Function} [cb]
 */
module.exports = function (cli, input, config, cb) {

    const cliInput = cli.input.slice(1);
    const crossbow = Object.assign({tasks: {}}, input.crossbow || {});

    const ctx      = createContext(input);

    ctx.trigger = {
        type: 'command',
        cli: cli,
        input: input,
        config: config
    };

    const taskResolver = require('./tasks')(crossbow, config);
    const runner       = taskResolver.getRunner(cliInput, ctx);

    runner.config = config.toJS(); // for user-land
    runner.ctx    = ctx;

    if (config.get('handoff')) {
        debug('handing off runner');
        return runner;
    } else {
        if (runner.tasks.invalid.length) {
            debug(`${runner.tasks.invalid.length} invalid tasks`);
            throw new ReferenceError([
                'Invalid tasks:',
                runner.tasks.invalid.map((x, i) => ' ' + String(i + 1) + ' ' + x.taskName).join('\n'),
                '',
                'Please check for typos/missing files etc'
            ].join('\n'));
        }
    }

    debug(`+ ${runner.tasks.valid.length} valid tasks`);

    ((runMode) => {
        debug(`> Running mode: ${runMode}`);
        return runner[runMode].call();
    })(config.get('runMode'))
        .do(x => {
            debug(`> Received a value from a task ${x.from.task.taskName}:`);
            debug(`> ${x.value}`);
        })
        .toArray()
        .subscribe(() => {
            // todo: what to do with received values?
            //logger.info('got a value', x);
        },
        e => {
            if (e._cbDisplayed) {
                return cb(e);
            }
            if (e.stack) {
                console.log(e.stack);
            } else {
                console.log(e);
            }
            cb(e);
        },
        () => {
            require('./reporter')(runner, config);
            cb(null, runner, config);
        }
    );
};
