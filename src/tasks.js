var utils = require('./utils');
var basename = require('path').basename;
var objPath = require('object-path');
var Rx = require('rx');
var RxNode = require('rx-node');
var logger = require('./logger');
var gruntCompat = require('./grunt-compat');

var compatAdaptors = {
    "grunt": {
        validate: () => {
            try {
                return require.resolve('grunt');
            } catch (e) {
                return false;
            }
        },
        create: gruntCompat
    }
}

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

    input.tasks = input.tasks || {};

    /**
     * Create the flat task format
     * @param {String} task
     * @returns {{taskName: string, subTasks: Array, modules: Array, tasks: Array}}
     */
    function flatTask(task) {

        if (task.match(/^\$grunt/)) {
            var out = {
                taskName: task.split(' ').slice(1),
                subTasks: [],
                modules: [],
                tasks: [],
                compat: 'grunt'
            };
            return out;
        }

        var splitTask = task.split(':');

        return {
            taskName: splitTask[0],
            subTasks: splitTask.slice(1),
            modules:  utils.locateModule(config.get('cwd'), splitTask[0]),
            tasks:    resolveTasks([], input.tasks, splitTask[0]),
            compat:   undefined
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
     * having a module or has a compat helper
     * @param {Object} task
     * @returns {Boolean}
     */
    function validateTask(task) {
        var valid = task.modules.length > 0 || task.tasks.length > 0;
        if (valid && task.tasks.length) {
            return task.tasks.every(validateTask);
        }
        if (valid && !task.tasks.length) {
            return true;
        }
        if (typeof task.compat === 'string') {
            if (compatAdaptors[task.compat]) {
                return compatAdaptors[task.compat].validate.call();
            }
            return false;
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
                    if (!item.modules.length && item.compat) {
                        return all.concat({
                            fns: [
                                compatAdaptors[item.compat].create.apply(null, [
                                    input,
                                    config,
                                    item
                                ])
                            ],
                            opts: {},
                            task: item
                        })
                    }
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

                let config = objPath.get(input, 'config', {});

                if (!item.subTasks.length) {
                    let topLevelOpts = objPath.get(input, ['config', item.taskName], {});
                    return {
                        fns: modules.reduce(concatModules, []),
                        opts: utils.transformStrings(topLevelOpts, config),
                        task: item
                    };
                }

                return item.subTasks.map(function (subTask) {
                    let subTaskOptions = objPath.get(input, ['config', item.taskName, subTask], {});
                    return {
                        fns: modules.reduce(concatModules, []),
                        opts: utils.transformStrings(subTaskOptions, config),
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

                        obs.compile = logger.compile;
                        obs.done    = obs.onCompleted.bind(obs);
                        var output  = fn.call(obs, obs, seq.opts, ctx);

                        if (output && typeof output.distinctUntilChanged === 'function') {
                            return output.do(function (x) {
                                obs.onNext(x);
                            }).subscribe(x => {}, e => obs.onError(e), x => obs.onCompleted());
                        }

                        if (output && typeof output.then === 'function') {
                            return Rx.Observable
                                .fromPromise(output)
                                .subscribe(x => {
                                    obs.onCompleted(x);
                                }, e => {
                                    obs.onError(e);
                                });
                        }

                        if (output && typeof output.pipe === 'function') {
                            RxNode.fromStream(output, 'end')
                                .subscribe(function (val) {
                                    obs.onNext(val);
                                }, function (err) {
                                    obs.onError(err);
                                }, function () {
                                    obs.onCompleted();
                                });
                        }
                    }).catch(e => {
                        var lineLength = new Array(seq.task.taskName.length).join('-');
                        logger.error('{gray:-----------------------------' + lineLength);
                        logger.error('{red:following ERROR from task {cyan:`%s`}', seq.task.taskName);
                        logger.error('{gray:-----------------------------' + lineLength);
                        e.task = seq.task;
                        return Rx.Observable.throw(e);
                    });
                }));
            }, []);

            return {
                run: Rx.Observable.from(seq).concatAll(),
                tasks: tasks,
                sequence: sequence
            }
        }
    };

    return methods;
};
