var utils = require('./utils');
var basename = require('path').basename;
var objPath = require('object-path');
var Rx = require('rx');
var logger = require('./logger');

/**
 * Get a customised prefixed logger per task
 * @param {String} name
 * @param {Number} maxLength
 * @returns {string}
 */
function getLogPrefix(name, maxLength) {
    var diff = maxLength - name.length;
    if (diff > 0) {
        return new Array(diff + 1).join(' ') + name;
    }
    return name.slice(0, maxLength - 1) + '~';
}

module.exports = function (input, config) {

    /**
     * Create the flat task format
     * @param {Array} task
     * @returns {{taskName: string, subTasks: Array, modules: Array, tasks: Array}}
     */
    function flatTask(task) {
        if (!Array.isArray(task)) {
            task = [task];
        }
        return {
            taskName: task[0],
            subTasks: task.slice(1),
            modules:  utils.locateModule(config.get('cwd'), task[0]),
            tasks:    resolveTasks([], input.tasks, task[0])
        }
    }

    /**
     * @param {Array} initial
     * @param {Object} subject
     * @param {String} taskname
     * @returns {*}
     */
    function resolveTasks(initial, subject, taskname) {

        if (Object.keys(subject).indexOf(taskname) > -1) {
            return subject[taskname].map(function (item) {
                var flat = flatTask(item);
                flat.tasks = resolveTasks(flat.tasks, subject, item);
                return flat;
            });
        }

        return initial;
    }

    /**
     * A task is valid if every child eventually resolves to
     * having a module
     * @param {Object} task
     * @returns {*}
     */
    function validateTask(task) {
        var valid = task.modules.length > 0 || task.tasks.length > 0;
        if (valid && task.tasks.length) {
            return task.tasks.every(validateTask);
        }
        if (valid && !task.tasks.length) {
            return true;
        }
        return false;
    }

    var cache = {};

    var methods =  {
        /**
         * Resolve a given list of tasks (including alias)
         * @param {Array} tasks
         * @param {Object} input
         * @param {Immutable.Map} config
         * @returns {{valid: *, invalid: *}}
         */
        gather: function (tasks) {
            var hash = tasks.join('-');
            if (cache[hash]) {
                return cache[hash];
            }

            var taskList = tasks
                .map(x => x.split(':'))
                .map(x => flatTask(x));

            var out = {
                valid:   taskList.filter(validateTask),
                invalid: taskList.filter(x => !validateTask(x))
            };

            cache[hash] = out;
            return out;
        },
        createRunSequence: function (tasks) {

            return flatten([], tasks);

            function flatten (initial, items) {
                 return items.reduce((all, item) => {
                    if (item.modules.length) {
                        return all.concat(getModules(item.modules, item));
                    }
                     if (item.tasks.length) {
                         return flatten(all, item.tasks);
                     }
                    return all;
                }, initial);
            }

            function getModules (modules, item) {

                function concatModules(all, item) {
                    return all.concat(require(item).tasks);
                }

                if (!item.subTasks.length) {
                    return {
                        fns: modules.reduce(concatModules, []),
                        opts: objPath.get(input, ['config', item.taskName], {}),
                        task: item
                    };
                }

                return item.subTasks.map(function (subTask) {
                    return {
                        fns: modules.reduce(concatModules, []),
                        opts: objPath.get(input, ['config', item.taskName, subTask], {}),
                        task: item
                    };
                });
            }
        },
        /**
         * Create a Rx Observable stream
         * @param {Array} cliInput - task names such as 'js' or ['js','css']
         * @returns {Observable}
         */
        getRunner: function (cliInput, ctx) {

            var tasks    = methods.gather(cliInput);
            var sequence = methods.createRunSequence(tasks.valid);

            var seq = sequence.reduce(function (all, seq) {
                return all.concat(seq.fns.map(function (fn) {
                    return Rx.Observable.create(obs => {
                        obs.log = logger.clone(x => {
                            x.prefix = '{gray: ' + getLogPrefix(basename(seq.task.taskName), 13) + ' :: ';
                            return x;
                        });
                        fn(obs, seq.opts, ctx);
                    }).catch(e => {
                        logger.error('{red:following ERROR from task {cyan:`%s`}', seq.task.taskName);
                        return Rx.Observable.throw(e);
                    });
                }));
            }, []);

            return {
                run: Rx.Observable.fromArray(seq).mergeAll(),
                tasks: tasks,
                sequence: sequence
            }
        }
    };

    return methods;
};
