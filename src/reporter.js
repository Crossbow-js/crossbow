var logger        = require('./logger');

module.exports = function (runner, config) {
    handleCompletion(runner.tasks.valid, runner.sequence, config);
}

/**
 * Logging for task completion
 */
function handleCompletion(tasks, sequence, config) {

    function logTask(tasks) {
        tasks.forEach(function (task) {
            logger.info('{gray:- %s', task.taskName);
            if (task.tasks.length) {
                logTask(task.tasks);
            }
        });
    }

    var short = config.get('summary') === 'short';

    var totalTime = sequence.reduce(function (all, seq) {
        //console.log(seq);
        return seq.seq.taskItems.reduce(function (all, task, i) {
            return all + task.duration;
            //logger.info('{gray: %s:} %sms ', i + 1, task.duration);
        }, 0);
    }, []);

    var logTasks = sequence.reduce(function (all, seq) {

        var output = [{
            level: "info",
            msgs: [
                ["{ok: } {cyan:%s}", seq.task.taskName]
            ]
        }];

        if (short) {
            return all.concat(output);
        }

        return all.concat(output.concat({
            level: "info",
            msgs: seq.seq.taskItems.map(function (task, i) {
                return ["{gray:%s:} %sms", i + 1, task.duration];
            }, [])
        }));
    }, []);

    //logTasks.forEach(function (log) {
    //    log.msgs.forEach(function (item) {
    //        logger[log.level].apply(logger, item);
    //    });
    //});

    var short = config.get('summary') === 'short';
}