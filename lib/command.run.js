const createContext = require('./ctx');
const report        = require('../reporters/default');
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
    }

    if (runner.tasks.invalid.length) {
        debug(`${runner.tasks.invalid.length} invalid tasks`);
        report.outputErrorMessages(runner.tasks);
        //process.exit();
    }

    debug(`+ ${runner.tasks.valid.length} valid tasks`);

    /**
     * Mark the time in which the tasks begin executing
     * @type {number}
     */
    const now = new Date().getTime();

    ((runMode) => {

        debug(`> Running mode: ${runMode}`);

        /**
         * Choose either 'series' or 'parallel' based
         * on which options were given
         */
        return runner[runMode].call();

    })(config.get('runMode'))
        /**
         * As well as completing, tasks can emit values.
         * Here we can receive them (although we're not using them just yet)
         */
        .do(x => {
            debug(`> Received a value from a task ${x.from.task.taskName}:`);
            debug(`> ${x.value}`);
        })
        /**
         * Calling toArray will force the completion callback
         * to only fire once each task/observable signals completion
         */
        .toArray()
        .subscribe(() => {
            // noop
        },
        e => {
            if (e._cbDisplayed) {
                return cb(e);
            }
            //if (e.stack) {
            //    console.log(e.stack);
            //} else {
            //    console.log(e);
            //}
            cb(e);
        },
        () => {
            /**
             * At this point, every single task must of completed without
             * error.
             */
            require('../reporters/default')(runner, config, new Date().getTime() - now);
            cb(null, runner, config);
        }
    );
};
