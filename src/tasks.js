var utils = require('./utils');

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

    return {
        /**
         * Resolve a given list of tasks (including alias)
         * @param {Array} tasks
         * @param {Object} input
         * @param {Immutable.Map} config
         * @returns {{valid: *, invalid: *}}
         */
        gather: function (tasks) {

            var taskList = tasks
                .map(x => x.split(':'))
                .map(x => flatTask(x));

            return {
                valid:   taskList.filter(validateTask),
                invalid: taskList.filter(x => !validateTask(x))
            };
        }
    }
};
