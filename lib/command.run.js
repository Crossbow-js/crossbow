const logger        = require('./logger');
const createContext = require('./ctx');

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

    if (config.get('handoff')) {
        return runner;
    } else {
        if (runner.tasks.invalid.length) {
            throw new ReferenceError([
                'Invalid tasks:',
                runner.tasks.invalid.map((x, i) => ' ' + String(i + 1) + ' ' + x.taskName).join('\n'),
                '',
                'Please check for typos/missing files etc'
            ].join('\n'));
        }
    }

    runner
        .run
        .subscribe(
            x => {
                logger.debug('got a value', x);
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
                cb(null, runner);
            }
    );

    ///**
    // * Run each function as quickly as possible
    // * Don't wait for previous ones to complete
    // * @param {Array} items - functions to call
    // */
    //function runInParallel(items) {
    //
    //    Rx.Observable
    //        .forkJoin
    //        .apply(null, items)
    //        .subscribe(
    //            x => {
    //                console.log(x);
    //            },
    //            e => cb(e),
    //            s => {
    //                cb(null, {tasks, runSequence: seq, sequence: sequence});
    //            }
    //        );
    //}
};
