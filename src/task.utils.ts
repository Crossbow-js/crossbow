import {relative, resolve, join, parse} from 'path';
import {existsSync, lstatSync} from 'fs';
import {CrossbowConfiguration} from "./config";
import {TaskReportType} from "./task.runner";
import {CommandTrigger} from "./command.run";
import {ExternalFileInput, ExternalFile} from "./file.utils";
import {Task, TaskTypes, TaskRunModes} from "./task.resolve";
import {CrossbowInput} from "./index";
const _ = require('../lodash.custom');
const debug = require('debug')('cb:task-utils');

export enum InputErrorTypes {
    InputFileNotFound   = <any>"InputFileNotFound",
    NoTasksAvailable    = <any>"NoTasksAvailable",
    NoWatchersAvailable = <any>"NoWatchersAvailable",
    FileNotFound        = <any>"FileNotFound",
    NotAFile            = <any>"NotAFile",
    InvalidYaml         = <any>"InvalidYaml",
    InvalidInput        = <any>"InvalidInput",
    InvalidJson         = <any>"InvalidJson"
}

export interface InputFileNotFoundError extends InputError {}
export interface NoTasksAvailableError extends InputError {}
export interface NoWatchersAvailableError extends InputError {}
export interface InputError {
    type: InputErrorTypes
}

export interface InputFiles {
    all: ExternalFileInput[]
    valid: ExternalFileInput[]
    invalid: ExternalFileInput[]
}

export function locateModule(config: CrossbowConfiguration, taskName: string): ExternalFile[] {

    const tasksByName = locateExternalTask(config, taskName);
    
    /**
     * Exit early if this file exists
     * TODO - allow this lookup to be cached to prevent future file IO
     * TODO - skip file/node look-ups when key matches top-level task definition
     */
    if (tasksByName.length) return tasksByName;

    const tasksByRequire = locateNodeModule(config, taskName);

    if (tasksByRequire.length) return tasksByRequire;

    return [];
}

export function getChildTaskNames (task: Task): string[] {
    return task.tasks.map(x => `${task.baseTaskName}:${x.baseTaskName}`);
}

function locateExternalTask (config: CrossbowConfiguration, name: string): ExternalFile[] {

    const dirLookups = config.tasksDir.reduce((acc, dir) => {
        return acc.concat([[dir, name + '.js'], [dir, name]]);
    }, []);

    const lookups = [
        ...dirLookups,
        [name + '.js'],
        [name]
    ];

    return lookups
        .map(x => resolve.apply(null, [config.cwd].concat(x)))
        .filter(existsSync)
        .filter(x => lstatSync(x).isFile())
        .map((resolvedFilePath: string): ExternalFile => {
            return {
                rawInput: name,
                parsed:   parse(resolvedFilePath),
                resolved: resolvedFilePath,
                relative: relative(config.cwd, resolvedFilePath),
                errors: []
            }
        });
}

function locateNodeModule (config: CrossbowConfiguration, name: string): ExternalFile[] {
    try {
        const maybe   = join(config.cwd, ...config.nodeModulesPaths, name);
        const required = require.resolve(maybe);
        return [{
            rawInput: name,
            parsed:   parse(required),
            resolved: required,
            relative: relative(config.cwd, required),
            errors: []
        }];
    } catch (e) {
        if (e.code !== 'MODULE_NOT_FOUND') {
            throw e;
        }
        debug(`lookup for ${name} failed`, e.message);
        return [];
    }
}

// /**
//  * Look at an object of any depth and perform string substitutions
//  * from things like {paths.root}
//  * @param {Object} item
//  * @param {Object} root
//  * @returns {Object}
//  */
// const traverse = require('traverse');
// export function transformStrings(item, root) {
//     return traverse(item).map(function () {
//         if (this.isLeaf) {
//             if (typeof this.node === 'string') {
//                 this.update(replaceOne(this.node, root));
//             }
//             this.update(this.node);
//         }
//     });
// }

const traverse = require('traverse');
/**
 * Convert a JS object into ENV vars
 * eg:
 *    var obj = {
 *      options: {
 *        docker: {
 *          port: 8000
 *        }
 *      }
 *    }
 * ->
 *    envifyObject(obj, 'CB', 'OPTIONS')
 * ->
 *    CB_OPTIONS_DOCKER_PORT=8000
 */
export function envifyObject(object:any, prefix:string, objectKeyName: string) {
    const subject = _.cloneDeep(object);
    return traverse(subject).reduce(function (acc, x) {
        if (this.level > 4) {
            this.remove();
            return acc;
        }
        if (this.circular) {
            this.remove();
            return acc;
        }
        if (this.isLeaf) {
            acc[[prefix, objectKeyName, ...this.path].join('_').toUpperCase()] = String(this.node);
        }
        return acc;
    }, {});
}

const merge = require('../lodash.custom').merge;

export function excludeKeys(input: any, blacklist: string[]): any {
    return Object.keys(input).filter(x => blacklist.indexOf(x) === -1).reduce(function(acc, key) {
        acc[key] = input[key];
        return acc;
    }, {});
}

/**
 * Currently we add the following from the toplevel of inputs
 * 1. options
 * 2. config
 * 3. CLI trailing args + command
 * 4. env
 */
const configBlacklist = ['outputObserver','fileChangeObserver','signalObserver','scheduler'];

export function getCBEnv (trigger: CommandTrigger): {} {
    const prefix = trigger.config.envPrefix;

    // 1. Crossbow options (from cbfile etc)
    const cbOptionsEnv = envifyObject(trigger.input.options, prefix, 'options');

    // 2. Crossbow config (from config key or CLI flags)
    const cbConfigEnv  = envifyObject(excludeKeys(trigger.config, configBlacklist), prefix, 'config');

    // 3. command + trailing cli args
    const {trailing, command} = trigger.cli;
    const cbCliEnv     = envifyObject({trailing, command}, prefix, 'cli');

                                                      // 4. env key from input file
    return merge(cbOptionsEnv, cbConfigEnv, cbCliEnv, trigger.input.env);
}

/**
 * @param {String} item - the string to replace
 * @param {Object} root - Root object used for lookups
 * @returns {*}
 */
function replaceOne(item, root) {
    return item.replace(/\{\{(.+?)\}\}/g, function () {
        const match = _.get(root, arguments[1].split('.'));
        if (typeof match === 'string') {
            return replaceOne(match, root);
        }
        return match;
    });
}

export function getFunctionName (fn) {
    if (fn.name !== '') {
        return `[Function: ${fn.name}]`;
    }
    return '[Function]';
}
export const removeNewlines = (x: string) => x.replace(/\n|\r/g, ' ').trim();
export const escapeNewLines = (x: string) => x.replace(/\n|\r/g, '\\n').trim();
export const removeTrailingNewlines = (x: string) => x.replace(/(\n|\r)$/, ' ').trim();
export function stringifyObj (incoming: any, max = 100): string {
    const asString = (function () {
        if (typeof incoming !== 'string') {
            return JSON.stringify(incoming);
        }
        return incoming;
    })()
    if (asString.length > max || asString) {
        return asString.slice(0, (max - 3)) + (function () {
            if (asString.length - max > -3) return '...';
            return '';
        })();
    }
    if (asString.length > process.stdout.columns) {
        return asString.slice(0, process.stdout.columns - 3) + '...';
    }
    return asString;
}

const toStringTypes = {
    'obj': '[object Object]',
    'string': '[object String]',
    'array': '[object Array]',
    'function': '[object Function]'
};

function testType(com: string, val: any): boolean {
    return Object.prototype.toString.call(val) === com;
}

export function isPlainObject(val: any): boolean {
    return testType(toStringTypes['obj'], val);
}

export function isString(val: any): boolean {
    return testType(toStringTypes['string'], val);
}

export function isFunction (val:any): boolean {
    return testType(toStringTypes['function'], val);
}

export function isReport(report: any) {
    return report && isString(report.type) &&
        report.type === TaskReportType.start ||
        report.type === TaskReportType.end ||
        report.type === TaskReportType.error
}

export function isPrivateTask (taskName: string): boolean {
    return taskName[0] === '_';
}

export function isPublicTask (taskName: string): boolean {
    return taskName[0] !== '_';
}

export function isParentGroupName (name: string): RegExpMatchArray {
    return name.match(/^\((.+?)\)$/);
}

export function isParentRef (name: string, names: string[]): boolean {
    if (names.indexOf(name) > -1)        return true;
    if (names.indexOf(`(${name})`) > -1) return true;
    return false;
}

export function getChildItems (name:string, input) {
    if (isParentGroupName(name)) {
        return _.get(input, [name], {});
    }
    return _.get(input, [`(${name})`], {});
}

export function getPossibleTaskNames (input: CrossbowInput) {
    const allNames          = Object.keys(input.tasks);
    const possibleParents   = allNames.filter(x => isParentGroupName(x));
    const possibleDefaults  = allNames.filter(x => !isParentGroupName(x));
    const parents           = possibleParents.reduce((acc, key) => {
        const childKeys   = Object.keys(getChildItems(key, input.tasks));
        const plainName   = key.slice(1, -1);
        return acc.concat(childKeys.map(childKey => `${plainName}:${childKey}`));
    }, []);
    return [...possibleDefaults, ...parents];
}

export function getChildName (name) {
    if (isParentGroupName(name)) return name;
    return `(${name})`;
}

export function isInternal (incoming: string): boolean {
    return /_internal_fn_\d{0,10}$/.test(incoming);
}

const supportedFileExtensions = ['.js'];
export function isSupportedFileType (incoming): boolean {
    return supportedFileExtensions.indexOf(incoming.toLowerCase()) > -1;
}

export function _e(x) {
    return x
        .replace(/\n|\r/g, '')
        .replace(/\{/g, '\\\{')
        .replace(/}/g, '\\\}');
}

export function __e(x) {
    return x
        .replace(/\{/g, '\\\{')
        .replace(/}/g, '\\\}');
}

export function longestString (col: string[]): number {
    return col.reduce((val, item) => item.length > val ? item.length : val, 0);
}

export function getLongestTaskName (tasks: Task[]): number {
    return longestString(tasks.reduce((acc, task) => {

        if (task.type === TaskTypes.ParentGroup) {
            return acc.concat(getChildTaskNames(task));
        }

        if (task.runMode === TaskRunModes.parallel) {
            return acc.concat(task.baseTaskName + ' <p>');
        }

        return acc.concat(task.baseTaskName);
    }, []));
}

export function padLine(incoming, max?) {
    if (incoming.length <= max) {
        return incoming + new Array(max-incoming.length+1).join(' ');
    }
    return incoming;
}

export function concatProps(tasks, initial: string[], propname: string): string[] {
    return tasks.reduce(function (acc, task) {
        if (task.tasks.length) {
            return acc.concat(concatProps(task.tasks, [], propname));
        }
        if (task[propname].length) return acc.concat(task[propname]);
        return acc;
    }, initial);
}
