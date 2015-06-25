var prom        = require('prom-seq');
var resolve     = require('path').resolve;
var logger      = require('./logger');
var gatherTasks = require('./gather-tasks');

function gatherCopyTasks (crossbow, args) {
    return gatherTasks(crossbow, 'copy', 'src', 'dest', args);
}

function copyCommand(cli, opts, handoff) {

    var tasks    = cli.input.slice(1);
    var crossbow = opts.crossbow || {};
    var taskList = gatherCopyTasks(crossbow, tasks);

    var todo     = taskList.reduce(function (all, item) {
        all += item.dest.length;
        return all;
    }, 0);

    if (!taskList.length) {
        logger.error('No {cyan:copy} targets were found.');
        return;
    }

    logger.debug('Creating copy task from keys {cyan:%s}', tasks.join(''));

    var done = 0;

    function doCopyingShiz (deferred, previous, ctx) {
        taskList.forEach(function (task) {
            task.dest.forEach(function (dest) {
                copyFiles(task.src, dest, function (err) {
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

    function copyFiles(src, dest, cb) {
        opts.ctx.vfs.src(src)
            .pipe(opts.ctx.vfs.dest(dest))
            .on('end', function () {
                cb(null);
            })
            .on('error', cb);
    }

    if (handoff) {
        return doCopyingShiz;
    }

    prom.create([doCopyingShiz])('', opts.ctx)
        .then(function () {
            if (tasks.length) {
                logger.info('{ok: } copy task%s {cyan:%s} completed', tasks.length > 1 ? 's' : '', tasks.join(' '));
            } else {
                logger.info('{ok: } copy task completed');
            }
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

module.exports.gatherCopyTasks = gatherCopyTasks;