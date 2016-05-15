import {resolve, extname, basename, join} from 'path';
import {existsSync, readFileSync, lstatSync} from 'fs';
import {CrossbowConfiguration} from "./config";
import {CrossbowInput} from "./index";
import {TaskReportType} from "./task.runner";

const yml = require('js-yaml');
const readPkgUp = require('read-pkg-up');
const objPath = require('object-path');
const debug = require('debug')('cb:task-utils');

export interface ExternalFileInput {
    path: string
    resolved: string
    input: CrossbowInput|any,
    errors: InputError[]
}

export enum InputErrorTypes {
    InputFileNotFound = <any>"InputFileNotFound",
    NoTasksAvailable = <any>"NoTasksAvailable",
    NoWatchersAvailable = <any>"NoWatchersAvailable"
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

export interface InputError {
    type: InputErrorTypes
}

export interface InputFileNotFoundError extends InputError {
}
export interface NoTasksAvailableError extends InputError {
}
export interface NoWatchersAvailableError extends InputError {
}

export interface InputFiles {
    all: ExternalFileInput[]
    valid: ExternalFileInput[]
    invalid: ExternalFileInput[]
}

export function locateModule(cwd: string, name: string): string[] {

    const files = [
        ['tasks', name + '.js'],
        ['tasks', name],
        [name + '.js'],
        [name]
    ]
        .map(x => resolve.apply(null, [cwd].concat(x)))
        .filter(existsSync)
        .filter(x => {
            var stat = lstatSync(x);
            return stat.isFile();
        });

    return files;
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

/**
 * @param {String} item - the string to replace
 * @param {Object} root - Root object used for lookups
 * @returns {*}
 */
function replaceOne(item, root) {
    return item.replace(/\{\{(.+?)\}\}/g, function () {
        const match = objPath.get(root, arguments[1].split('.'));
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
    const defaultConfigFiles = ['crossbow.js', 'crossbow.yaml', 'crossbow.yml'];
    return readFiles(defaultConfigFiles, config.cwd);
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
    return readFiles(maybes, config.cwd);
}

export function readFiles(paths: string[], cwd: string): InputFiles {
    const inputs = getFileInputs(paths, cwd);
    const invalid = inputs.filter(x => x.input === undefined);
    const valid = inputs.filter(x => x.input !== undefined);

    return {
        all: inputs,
        valid,
        invalid
    };
}

/**
 *
 */
function getFileInputs(paths, cwd): ExternalFileInput[] {
    return paths
        .map(String)
        .map(path => ({path: path, resolved: resolve(cwd, path)}))
        .map((incoming): ExternalFileInput => {
            const resolved = incoming.resolved;
            const path = incoming.path;
            if (!existsSync(resolved)) {
                return {
                    errors: [{type: InputErrorTypes.InputFileNotFound}],
                    input: undefined,
                    path,
                    resolved
                }
            }
            if (resolved.match(/\.ya?ml$/)) {
                return {
                    errors: [],
                    input: yml.safeLoad(readFileSync(incoming.resolved)),
                    path,
                    resolved
                }
            }
            return {
                errors: [],
                input: require(incoming.resolved),
                path,
                resolved
            }
        });
}

/**
 * Attempt to use the LOCALLY installed crossbow-cli vesion
 * first, this will ensure anything registered with .task etc
 * can be picked up by global installs too.
 * @param config
 * @returns {InputFiles}
 */
export function getRequirePaths(config: CrossbowConfiguration): InputFiles {
    const local = join('node_modules', 'crossbow-cli', 'dist', 'public', 'create.js');
    const global = join(__dirname, 'public', 'create.js');
    return readFiles([local, global], config.cwd);
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
    const npmScripts = objPath.get(pkg, ['scripts'], {});

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
