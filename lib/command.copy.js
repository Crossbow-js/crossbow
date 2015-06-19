var prom = require('prom-seq');
var resolve = require('path').resolve;
var logger = require('./logger');

function copyCommand(cli, opts, handoff) {

    var tasks = cli.input.slice(1);
    var taskList = [];
    var crossbow = opts.pkg.crossbow || {};
    var copy = crossbow.copy;
    var todo = 0;

    /**
     * multi/single task given on CLI
     */
    if (tasks.length) {
        taskList = tasks
            .filter(function (key) {
                return crossbow.copy[key];
            })
            .map(function (key) {
                return makeCopyTask(key, crossbow.copy[key]);
            });

    } else {
        taskList = Object.keys(copy).map(function (key) {
            tasks.push(key);
            var item = copy[key];
            return makeCopyTask(key, item);
        });
    }

    if (!taskList.length) {
        logger.error('No {cyan:copy} targets were found.');
        return;
    }

    logger.debug('Creating copy task from keys {cyan:%s}', tasks.join(''));

    var done = 0;

    function doCopyingShiz (deferred, previous, ctx) {
        taskList.forEach(function (task) {
            task.tasks.forEach(function (task) {
                copyFiles(task, function (err, success) {
                    if (err) {
                        deferred.reject(err);
                    } else {
                        done += 1;
                        if (done === todo) {
                            deferred.resolve();
                        }
                    }
                });
            });
        });
    }

    function copyFiles (task, cb) {
        opts._ctx.vfs.src(task.src)
            .pipe(opts._ctx.vfs.dest(task.dest))
            .on('end', function () {
                cb(null);
            })
            .on('error', cb);
    }

    function makeCopyTask(key, item) {
        todo += 1;
        return {
            name: key,
            tasks: gather(item, opts)
        };
    }

    function gather (item, opts) {
        var tasks = [];
        if (Array.isArray(item)) {
            tasks = item.map(split);
        }
        return tasks;
    }

    function split (item) {
        var segs = item.split(':');
        return {
            src: resolve(opts.cwd, segs[0]),
            dest: resolve(opts.cwd, segs[1])
        }
    }

    if (handoff) {
        return doCopyingShiz;
    }

    prom.create([doCopyingShiz])('', opts._ctx)
        .then(function () {
            logger.info('{ok: } copy task%s {cyan:%s} completed', tasks.length > 1 ? 's' : '', tasks.join(' '));
            opts.cb(null);
        })
        .catch(function (err) {
            opts.cb(err);
            logger.error(err.message);
            console.log(err.stack);
        });
}

module.exports = copyCommand;

module.exports.makeCopyTask = function (name, opts) {
    return copyCommand({input:['run'].concat(name)}, opts, true);
};