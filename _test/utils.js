const Rx          = require('rx');
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
