var exists  = require('fs').existsSync;
var resolve    = require('path').resolve;
var _cli = require('./command.run.js');
var logger  = require('./logger');

module.exports = function (cli, opts) {

    var bs          = require('browser-sync').create();
    var watchConfig = {ignoreInitial: true};
    var bsConfig = {
        server: './public'
    };

    var confexists = [
        opts.pkg.crossbow.watch['bs-config'],
        'bs-config.js'
    ].some(function (file) {
            if (!file) {
                return;
            }
            var filepath = resolve(file);
            if (exists(filepath)) {
                bsConfig = require(filepath);
                return true;
            }
        });

    bsConfig.logPrefix = function () {
        return this.compile(logger.prefix);
    };

    /**
     * Local Server from app root
     */
    bs.init(bsConfig);

    if (!opts.pkg.crossbow.watch.tasks.length) {
        return;
    }

    opts.pkg.crossbow.watch.tasks.forEach(function (item) {

        Object.keys(item).forEach(function (key) {

            if (typeof item[key] === "string") {

                var match = item[key].match(/^bs:(.+?)$/);

                if (typeof bs[match[1]] === "function") {

                    bs.watch(key, watchConfig, bs[match[1]]);
                }

            } else {

                var locked       = false;
                var tasks        = item[key];
                var regularTasks = tasks[0];
                var bsTask;

                if (tasks.length > 1) {
                    regularTasks = tasks.slice(0, -1);
                    bsTask       = tasks[tasks.length - 1];
                } else {
                    regularTasks = [regularTasks];
                }

                var bsMethod;
                var bsArgs;

                if (bsTask && bsTask.match(/^bs:/)) {
                    bsMethod = bsTask.split(":")[1];
                    bsArgs   = bsTask.split(":").slice(2);
                }

                bs.watch(key, watchConfig, function () {

                    if (locked) {
                        return;
                    }

                    locked = true;
                    var start = new Date().getTime();
                    opts.handoff = true;

                    _cli({input: ['run'].concat(regularTasks)}, opts)
                        .then(function () {
                            logger.info('{yellow:%s} {cyan:::} %sms', regularTasks.join(' -> '), new Date().getTime() - start);

                            if (typeof bs[bsMethod] === 'function') {
                                if (bsArgs.length) {
                                    bs[bsMethod].apply(bs, bsArgs);
                                } else {
                                    bs[bsMethod].apply(bs);
                                }
                            }
                            locked = false;
                        }).catch(function (err) {
                            locked = false;
                            console.log(err.message);
                            bs.notify(err.message);
                        }).done();
                })
            }
        });
    });
};