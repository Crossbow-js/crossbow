const Rx          = require('rx');
const cb          = require('../dist/index').default;
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

module.exports.run = (cli, input) => {
    const scheduler  = new Rx.TestScheduler();
    const output     = new Rx.ReplaySubject(100);

    cli.flags                = cli.flags || {};
    cli.flags.outputObserver = output;
    cli.flags.scheduler      = scheduler;

    const runner       = cb(cli, input);
    const subscription = scheduler.startScheduler(() => {
        return runner.flatMap(x => {
            return x.update$;
        });
    }, {created: 0, subscribed: 0, disposed: 200000});
    return {subscription, output};
};

module.exports.getSetup = (cli) => {
    const scheduler  = new Rx.TestScheduler();
    const results   = scheduler.startScheduler(() => cb(cli).pluck('runSetup'));

    return results.messages[0].value.value;
};

module.exports.getRunner = (args, input, config) => {
    const output = new Rx.ReplaySubject(100);
    const cli    = {};

    cli.input                = ['run'].concat(args);
    cli.flags                = config || {};
    cli.flags.handoff        = true;
    cli.flags.outputObserver = output;

    return cb.default(cli, input);
};

module.exports.getWatcher = (args, input, config) => {
    const scheduler  = new Rx.TestScheduler();
    const output     = new Rx.ReplaySubject(100);
    const cli        = {};

    cli.input                = ['watch'].concat(args);
    cli.flags                = cli.flags || config || {};
    cli.flags.outputObserver = output;

    const runner       = cb.default(cli, input);
    const subscription = scheduler.startScheduler(() => runner, {created: 0, subscribed: 0, disposed: 200000});
    const firstValue   = subscription.messages[0].value.value;
    return firstValue.data;
};

module.exports.watch = (args, input, config) => {
    const scheduler  = new Rx.TestScheduler();
    const output     = new Rx.ReplaySubject(100);
    const cli        = {};

    cli.input                = ['watch'].concat(args);
    cli.flags                = cli.flags || config || {};
    cli.flags.outputObserver = output;

    const runner       = cb.default(cli, input);
    const subscription = scheduler.startScheduler(() => runner, {created: 0, subscribed: 0, disposed: 200000});
    return {subscription, output}
};

module.exports.executeRun = (args, input, config) => {
    const output         = new Rx.ReplaySubject(100);
    const cli            = {};

    cli.input                = ['run'].concat(args);
    cli.flags                = config || {};
    cli.flags.outputObserver = output;

    return cb.default(cli, input);
};

module.exports.nullOutput = () => new Rx.ReplaySubject(100);

module.exports.delay       = (time, scheduler) => Oempty().delay(time, scheduler);
module.exports.getOutput   = (runner) => runner.subscription.messages[0].value.value;

module.exports.getReports  = (runner) => runner.subscription.messages
    .filter(x => x.value.kind === 'N')
    .map(x => x.value.value);

module.exports.getComplete = (runner) =>
    runner.subscription.messages
        .filter(x => x.value.kind === 'N')
        .filter(x => x.value.value.type === 'Complete')
        .map(x => x.value.value.data)[0];

module.exports.getFileWatcher = (args, input, fileEvents, config) => {

    const scheduler = new Rx.TestScheduler();
    const output    = new Rx.ReplaySubject(100);
    const cli       = {};
    config          = config || {};

    const fileEventsObservable = scheduler.createHotObservable.apply(scheduler, fileEvents);

    cli.input = ['watch'].concat(args);
    cli.flags = {
        scheduler: scheduler,
        outputObserver: output,
        fileChangeObserver: fileEventsObservable
    };

    Object.keys(config).forEach(function (key) {
        cli.flags[key] = config[key];
    });

    const runner = cb.default(cli, input);

    const subscription = scheduler.startScheduler(() => {
        return runner;
    }, {created: 0, subscribed: 0, disposed: 2000000});

    return {subscription, output};
};
