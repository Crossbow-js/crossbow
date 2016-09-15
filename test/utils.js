const Rx          = require('rx');
const cli            = require('../dist/index');
const Oempty      = Rx.Observable.empty;
const Othrow      = Rx.Observable.throw;
const Ojust       = Rx.Observable.just;
const defaultTime = 100;

module.exports.task = (time) =>
    (options, ctx) => Oempty()
        .delay(time || defaultTime, ctx.config.scheduler);

module.exports.error = (time) =>
    (options, ctx) => Ojust('kittie')
        .delay(time || defaultTime, ctx.config.scheduler)
        .flatMap(Othrow('oops'));

module.exports.run = (input, config) => {
    const scheduler  = new Rx.TestScheduler();
    const output     = new Rx.ReplaySubject(100);

    input.flags                = input.flags || {};
    input.flags.outputObserver = output;
    input.flags.scheduler      = scheduler;

    const runner = cli.default(input, config);
    const subscription = scheduler.startScheduler(() => runner, {created: 0, subscribed: 0, disposed: 4000});
    return {subscription, output};
};

module.exports.nullOutput = () => new Rx.ReplaySubject(100);
