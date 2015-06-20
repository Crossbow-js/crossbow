var exists  = require('fs').existsSync;
var resolve    = require('path').resolve;
var _cli = require('./command.run.js');
var logger  = require('./logger');
var objPath  = require('object-path');


function arrarifyObj (obj) {
    return Object.keys(obj).reduce(function (newobj, key) {
        newobj[key] = arrarify(obj[key]);
        return newobj;
    }, {});
}

function arrarify (item) {
    if (Array.isArray(item)) {
        return item;
    }
    return [item];
}

/**
 * Allow config lookup via
 *  eg: 'config:something.this'
 * @param key
 * @param crossbow
 * @returns {*}
 */
function getKey(key, crossbow) {

    var match = key.match(/^(.+?):(.+)/);

    if (!match) {
        return key;
    }

    var lookup = match[1].concat('.',match[2]);

    var item = objPath.get(crossbow, lookup);

    if (!item) {
        throw new TypeError('Could not find ' + lookup);
    }

    return item;
}

/**
 * Gather tasks and flatten config
 * @param crossbow
 * @param filter
 * @returns {Array}
 */
function gatherTasks (crossbow, filter) {

    var watch = crossbow.watch;
    if (filter) {
        watch = watch[filter];
        if (!watch) {
            throw new TypeError('Could not locate watch config with key', filter);
        }
    }
    var tasks = [];

    /**
     * Look for top level (non-namespaced) watchers
     */
    if (watch.tasks) {
        /**
         * If an array is given process each.
         * eg: watch: { tasks: [task1, task2] }
         */
        if (Array.isArray(watch.tasks)) {
            watch.tasks.forEach(createTask);
        } else {
            /**
             * If an Object given, wrap in array and process the same
             * eg: watch: { tasks: { '*.js': 'babel' } }
             */
            if (Object.keys(watch.tasks).length > 0) {
                [watch.tasks].forEach(createTask);
            }
        }
    } else {
        if (Array.isArray(watch)) {
            watch.forEach(createTask);
        } else {
            /**
             * Namespaced watchers
             */
            Object.keys(watch).forEach(function (key) {
                var item = watch[key];
                if (Array.isArray(item.tasks)) {
                    item.tasks.forEach(createTask);
                } else {
                    item.forEach(createTask);
                }
            });
        }
    }

    function createTask (obj) {

        if (obj.patterns && obj.tasks) { // patterns obj
            tasks.push(arrarifyObj(obj));
        } else { // patterns as keys
            Object.keys(obj).forEach(function (key) {
                var item = obj[key];
                tasks.push(arrarifyObj({
                    patterns: getKey(key, crossbow),
                    tasks: item
                }));
            });
        }
    }

    return tasks;
}

function runWatcher (cli, opts) {

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
                logger.debug('Using Browsersync config from {yellow:%', filepath);
                bsConfig = require(filepath);
                return true;
            }
        });

    bsConfig.logPrefix = function () {
        return this.compile(logger.prefix);
    };

    logger.debug('Start Browsersync with %', bsConfig);

    /**
     * Local Server from app root
     */
    bs.init(bsConfig);

    if (!opts.pkg.crossbow.watch.tasks.length) {
        return;
    }

    opts.pkg.crossbow.watch.tasks.forEach(function (item) {

        console.log(item);
        Object.keys(item).forEach(function (key) {

            if (typeof item[key] === "string") {

                var match = item[key].match(/^bs:(.+?)$/);

                if (typeof bs[match[1]] === "function") {

                    logger.info('watching {yellow:%s} -> {cyan:%s}', key, bs[match[1]]);
                    bs.watch(key, watchConfig, bs[match[1]]);
                }

            } else { // array of tasks given

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

                var watchPatterns = getKey(key, opts);

                logger.info('watching {yellow:%s} -> {cyan:%s}', watchPatterns, regularTasks);

                bs.watch(watchPatterns, watchConfig, function (event, file) {

                    if (locked) {
                        return;
                    }

                    locked = true;
                    var start = new Date().getTime();

                    opts._ctx.trigger = {
                        type: 'watcher',
                        pattern: watchPatterns,
                        file: file,
                        event: event
                    };

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
                        })
                        .progress(function (obj) {
                            logger[obj.level].apply(logger, obj.msg);
                        })
                        .catch(function (err) {
                            locked = false;
                            if (!err.crossbow_silent) {
                                console.log(err.message);
                                console.log(err.stack);
                            }
                            bs.notify(err.message);
                        }).done();
                })
            }
        });
    });
}

module.exports = function (cli, opts) {

    var beforeTasks   = opts.pkg.crossbow.watch.before || [];
    opts.handoff = true;

    logger.info('running {cyan:%s} before watcher starts', beforeTasks);

    if (beforeTasks.length) {

        opts._ctx.trigger = {
            type:  'before',
            tasks: beforeTasks
        };
        _cli({input: ['run'].concat(beforeTasks)}, opts)
            .then(function () {
                logger.info('{ok: } {cyan:%s} completed', beforeTasks);
                runWatcher(cli, opts);
            }).catch(function (err) {
                console.log(err.message);
                console.log(err.stack);
            }).done();
    } else {
        runWatcher(cli, opts);
    }
};

module.exports.gatherTasks = gatherTasks;