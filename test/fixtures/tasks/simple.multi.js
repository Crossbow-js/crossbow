var utils = require('../../utils');

function simple (opts, ctx) {
    return utils.delay(100, ctx.config.scheduler);
}

function simple2 (opts, ctx) {
    return utils.delay(2000, ctx.config.scheduler);
}

module.exports.tasks = [simple, simple2];
