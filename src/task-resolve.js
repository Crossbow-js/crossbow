var utils = require('./utils');
var merge = require('lodash.merge');
var compat = require('./compat');
var t = exports;

var adaptorKeys = Object.keys(compat.compatAdaptors);

t.validateTask = validateTask;

/**
 * A task is valid if every child eventually resolves to
 * having a module or has a compat helper
 * @param {Object} task
 * @returns {Boolean}
 */
function validateTask(task, input, config) {
    /**
     * Return early if a task has previously
     * been marked as invalid
     */
    if (task.valid === false) {
        return false;
    }

    var valid = task.modules.length > 0 || task.tasks.length > 0;
    if (valid && task.tasks.length) {
        return task.tasks.every(function (t) {
            return validateTask(t, input, config);
        });
    }
    if (valid && !task.tasks.length) {
        return true;
    }
    if (typeof task.compat === 'string') {
        if (compat.compatAdaptors[task.compat]) {
            return compat.compatAdaptors[task.compat].validate.call(null, input, config, task);
        }
        return false;
    }
    return false;
}

function TaskResolver(input, config) {
    this.config = config;
    this.input = input;
    this.cache = {};
    return this;
}

function getCompat(task) {
    return adaptorKeys.filter(x => {
        return task.match(new RegExp('\\$' + x));
    })[0];
}

var defaultTask = {
    valid: false,
    compat: undefined,
    taskName: undefined,
    subTasks: [],
    modules: [],
    tasks: [],
    parent: '',
    alias: undefined
};

function getTask(obj) {
    return merge({}, defaultTask, obj);
}

/**
 * Create the flat task format
 * @param {String} task
 * @returns {{taskName: string, subTasks: Array, modules: Array, tasks: Array, compat: String|undefined}}
 */
function compatTask(task, compat, parent) {

    if (compat) {
        return getTask({
            taskName: task.replace(/^\$(.+?) /, ''),
            rawInput: task.replace(/^\$(.+?) /, ''),
            compat: compat,
            valid: true,
            parent: parent
        });
    }

    return getTask({
        taskName: task
    });
}

/**
 * @param {Array} task
 * @returns {Object}
 */
TaskResolver.prototype.flatTask = function (task, parent) {

    var splitTask = task.split(':');

    if (task.match(/^\$/)) {
        return compatTask(task, getCompat(task), parent);
    }

    var taskName = splitTask[0];
    var mod = utils.locateModule(this.config.get('cwd'), taskName);
    var alias = undefined;

    if (!mod.length) {
        if (utils.plainObj(this.input.aliases)) {
            var matches = Object.keys(this.input.aliases).filter((key) => {
                return key === taskName;
            });
            if (matches.length) {
                var aliasName = this.input.aliases[matches[0]];
                mod = utils.locateModule(this.config.get('cwd'), aliasName);
                alias = taskName;
                taskName = aliasName;
            }
        }
    }

    return getTask({
        taskName: taskName,
        subTasks: splitTask.slice(1),
        modules: mod,
        tasks: this.resolveTasks([], this.input.tasks, taskName, parent),
        compat: undefined,
        valid: true,
        parent: parent,
        alias: alias
    });
};

/**
 * @param {Array} initial
 * @param {Object} subject
 * @param {String} taskname
 * @returns {Array}
 */
TaskResolver.prototype.resolveTasks = function resolveTasks(initial, subject, taskname, parent) {

    if (Object.keys(subject).indexOf(taskname) > -1) {
        if (parent.indexOf(taskname) > -1) {
            throw new ReferenceError(`Infinite loop detected from task: \`${taskname}\`
Parent Tasks: ${parent.join(', ')}`);
        }
        return subject[taskname].map(item => {
            var flat = this.flatTask(item, parent + ' ' + taskname);
            flat.tasks = this.resolveTasks(flat.tasks, subject, item, parent + ' ' + taskname);
            return flat;
        });
    }

    return initial;
};

TaskResolver.prototype.gather = function (tasks) {

    var hash = tasks.join('-');
    if (this.cache[hash]) {
        return this.cache[hash];
    }

    var taskList = tasks
        .map(x => this.flatTask(x, []));

    var out = {
        valid: taskList.filter(x => t.validateTask(x, this.input, this.config)),
        invalid: taskList.filter(x => !t.validateTask(x, this.input, this.config))
    };

    this.cache[hash] = out;
    return out;
};

module.exports.create = function (input, config) {
    return new TaskResolver(input, config);
};
