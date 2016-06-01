import {relative, resolve, extname, basename, join, parse} from 'path';
import {existsSync, readFileSync, lstatSync} from 'fs';
import {CrossbowConfiguration} from "./config";
import {CrossbowInput} from "./index";
import {TaskReportType} from "./task.runner";
import {CommandTrigger} from "./command.run";
import {ParsedPath} from "path";
import {statSync} from "fs";
import {Tasks} from "./task.resolve.d";

const yml = require('js-yaml');
const readPkgUp = require('read-pkg-up');
const _ = require('../lodash.custom');
const debug = require('debug')('cb:task-utils');


export interface ExternalFile {
    path: string
    resolved: string
    errors: InputError[],
    parsed: ParsedPath
}

export interface ExternalFileInput extends ExternalFile {
    input: CrossbowInput|any,
}

export enum InputErrorTypes {
    InputFileNotFound = <any>"InputFileNotFound",
    NoTasksAvailable = <any>"NoTasksAvailable",
    NoWatchersAvailable = <any>"NoWatchersAvailable",
    FileNotFound = <any>"FileNotFound",
    NotAFile = <any>"NotAFile"
}

export interface InputFileNotFoundError extends InputError {}
export interface FileNotFoundError extends InputError {}
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

export function locateModule(config: CrossbowConfiguration, taskName: string): ExternalTask[] {

    const tasksByName = locateExternalTask(config, taskName);

    /**
     * Exit early if this file exists
     * TODO - allow this lookup to be cached to prevent future calls
     * TODO - skip file/node look-ups when key matches top-level task definition
     */
    if (tasksByName.length) return tasksByName;

    const tasksByRequire = locateNodeModule(config, taskName);

    if (tasksByRequire.length) return tasksByRequire;

    return [];
}

export interface ExternalTask {
    rawInput: string
    parsed: ParsedPath
    resolved: string
    relative: string
}

function locateExternalTask (config:CrossbowConfiguration, name:string): ExternalTask[] {
    const lookups = [
        ['tasks', name + '.js'],
        ['tasks', name],
        [name + '.js'],
        [name]
    ];

    return lookups
        .map(x => resolve.apply(null, [config.cwd].concat(x)))
        .filter(existsSync)
        .filter(x => lstatSync(x).isFile())
        .map((resolvedFilePath: string): ExternalTask => {
            return {
                rawInput: name,
                parsed:   parse(resolvedFilePath),
                resolved: resolvedFilePath,
                relative: relative(config.cwd, resolvedFilePath)
            }
        });
}

function locateNodeModule (config:CrossbowConfiguration, name:string): ExternalTask[] {
    try {
        const maybe   = join(config.cwd, 'node_modules', name);
        const required = require.resolve(maybe);
        return [{
            rawInput: name,
            parsed:   parse(required),
            resolved: required,
            relative: relative(config.cwd, required)
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
export function envifyObject(object:any, prefix:string, topLevel: string) {
    return traverse(object).reduce(function (acc, x) {
        if (this.circular) {
            this.remove();
            return acc;
        }
        if (this.isLeaf) {
            acc[[prefix, topLevel, ...this.path].join('_').toUpperCase()] = String(this.node);
        }
        return acc;
    }, {});
}

const merge = require('../lodash.custom').merge;
/**
 * Currently we add the following from the toplevel of inputs
 * 1. options
 * 2. config
 * 3. env
 */
export function getCBEnv (trigger: CommandTrigger): {} {
    const cbOptionsEnv = envifyObject(trigger.input.options, trigger.config.envPrefix, 'options');
    const cbConfigEnv  = envifyObject(trigger.config, trigger.config.envPrefix, 'config');
    return merge(cbOptionsEnv, cbConfigEnv, trigger.input.env);
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

/**
 * Try to auto-load configuration files
 * from the users CWD
 */
export function retrieveDefaultInputFiles(config: CrossbowConfiguration): InputFiles {
    const defaultConfigFiles = ['crossbow.yaml', 'crossbow.js', 'crossbow.yml', 'crossbow.json'];
    return readInputFiles(defaultConfigFiles, config.cwd);
}

/**
 * Try to load cbfiles (like gulp) from the users
 * working directory
 * @param config
 * @returns {InputFiles}
 */
export function retrieveCBFiles(config: CrossbowConfiguration): InputFiles {
    const defaultCBFiles = ['cbfile.js', 'crossbowfile.js'];
    const maybes = (function () {
    	if (config.cbfile) {
            return [config.cbfile];
        }
        return defaultCBFiles;
    })();
    return readInputFiles(maybes, config.cwd);
}

export function readInputFiles(paths: string[], cwd: string): InputFiles {

    /**
     * Get files that exist on disk
     * @type {ExternalFile[]}
     */
    const inputFiles = readFilesFromDisk(paths, cwd);

    /**
     * Add parsed input keys to them
     * @type {}
     */
    const inputs = inputFiles.map(file => {

        /**
         * If the file does not exist, change the error to be an InputFileNotFound error
         * as this will allow more descriptive logging when needed
         */
        if (file.errors.length) {
            return _.assign({}, file, {
                // here there may be any types of file error,
                // but we only care that was an error, and normalise it
                // here for logging. We can added nice per-error messages later.
                errors: [{type: InputErrorTypes.InputFileNotFound}],
                input: undefined
            });
        }

        /**
         * If the input file was yaml, load it & translate to JS
         */
        if (file.parsed.ext.match(/ya?ml$/i)) {
            return _.assign(file, {
                input: yml.safeLoad(readFileSync(file.resolved))
            })
        }

        /**
         * Finally assume a JS/JSON file and 'require' it as normal
         */
        return _.assign({}, file, {
            input: require(file.resolved)
        });
    });

    return {
        all: inputs,
        valid: inputs.filter(x => x.errors.length === 0),
        invalid: inputs.filter(x => x.errors.length > 0)
    };
}

/**
 * Take an array of paths and return file info + erros if they don't exist
 * @param paths
 * @param cwd
 * @returns {ExternalFile[]}
 */
export function readFilesFromDisk(paths: string[], cwd: string): ExternalFile[] {
    return paths
        .map(String)
        .map(path => ({
            path: path,
            resolved: resolve(cwd, path),
            parsed: parse(path)
        }))
        .map((incoming): ExternalFile => {

            const {resolved, path, parsed} = incoming;

            if (!existsSync(resolved)) {
                return {
                    errors: [{type: InputErrorTypes.FileNotFound}],
                    path,
                    parsed,
                    resolved
                }
            }
            const stat = statSync(resolved);
            if (!stat.isFile()){
                return {
                    errors: [{type: InputErrorTypes.NotAFile}],
                    path,
                    parsed,
                    resolved
                }
            }
            return {
                errors: [],
                path,
                parsed,
                resolved
            }
        });
}

/**
 * Attempt to use the LOCALLY installed crossbow-cli version
 * first, this will ensure anything registered with .task etc
 * can be picked up by global installs too.
 * @param config
 * @returns {InputFiles}
 */
export function getRequirePaths(config: CrossbowConfiguration): InputFiles {
    const local = join('node_modules', 'crossbow-cli', 'dist', 'public', 'create.js');
    const global = join(__dirname, 'public', 'create.js');
    return readInputFiles([local, global], config.cwd);
}

/**
 * @param cwd
 * @returns {{}}
 */
export function createCrossbowTasksFromNpmScripts(cwd: string): any {
    /**
     * Ready package.json from current project
     */
    const pkg = readPkgUp.sync({
        cwd: cwd,
        normalize: false
    }).pkg;

    /**
     * Try to retrieve `scripts`
     */
    const npmScripts = _.get(pkg, ['scripts'], {});

    /**
     * Return if anything failed with package.json or scripts prop
     */
    if (!isPlainObject(npmScripts)) {
        return {};
    }

    /**
     * Now create @npm adaptor tasks for each script found
     */
    const transformed = Object.keys(npmScripts)
        .reduce((acc, key) => {
            acc[key] = '@npm ' + npmScripts[key];
            return acc;
        }, {});

    return transformed;
}

export function getFunctionName (fn) {
    if (fn.name !== '') {
        return `[Function: ${fn.name}]`;
    }
    return '[Function]';
}
export const removeNewlines = (x: string) => x.replace(/\n|\r/g, ' ').trim();
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

export function isInternal (incoming) {
    return incoming.match(/_internal_fn_\d{0,10}$/);
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

export function getTaskTree(tasks: Tasks, depth = 1) {
    
    const gathered = gather(tasks, [], 1);
    
    return gathered;
    
    function gather(items, initial, currentDepth) {
        return items.reduce((acc, task) => {
            if (currentDepth === depth) {
                task.tasks = [];
                return acc.concat(task);
            }
            if (currentDepth < depth) {
                task.tasks = gather(task.tasks, [], currentDepth + 1);
                return acc.concat(task);
            }
            return acc;
        }, initial);
    }
}
