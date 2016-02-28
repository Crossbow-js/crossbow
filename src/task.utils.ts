import {resolve, extname, basename} from 'path';
import {existsSync, readFileSync, lstatSync} from 'fs';
import {CrossbowConfiguration} from "./config";
import {CrossbowInput} from "./index";

const yml = require('js-yaml');
const readPkgUp = require('read-pkg-up');
const objPath  = require('object-path');

export function locateModule (cwd: string, name: string): string[] {

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

    if (files.length === 0) {
        try {
            files.push(require.resolve(name));
        } catch (e) {
            if (e.code !== 'MODULE_NOT_FOUND') {
                throw e;
            }
        }
    }

    return files;
}

/**
 * Look at an object of any depth and perform string substitutions
 * from things like {paths.root}
 * @param {Object} item
 * @param {Object} root
 * @returns {Object}
 */
const traverse = require('traverse');
export function transformStrings(item, root) {
    return traverse(item).map(function () {
        if (this.isLeaf) {
            if (typeof this.node === 'string') {
                this.update(replaceOne(this.node, root));
            }
            this.update(this.node);
        }
    });
}

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

export interface ExternalFileInput {
    path: string
    input: CrossbowInput|any
}
/**
 * Try to auto-load configuration
 * @param flags
 * @param config
 * @returns {*}
 */
export function retrieveExternalInputFiles (config: CrossbowConfiguration): ExternalFileInput[] {

    const maybes     = ['crossbow.js', 'crossbow.yaml', 'crossbow.yml'];
    const cwd        = config.cwd;
    const configFlag = config.config;

    const configFiles = readFiles([configFlag, ...maybes], cwd);
    return configFiles;
}

/**
 * @param paths
 * @param cwd
 * @returns {any}
 */
function readFiles (paths, cwd) {
    return paths
        .filter(x => x)
        .map(x => resolve(cwd, x))
        .filter(existsSync)
        .map(x => {
            if (x.match(/\.ya?ml$/)) {
                return <ExternalFileInput> {
                    path: x,
                    input: yml.safeLoad(readFileSync(x))
                }
            }
            return <ExternalFileInput> {
                path: x,
                input: require(x)
            }
        });
}

/**
 * @param cwd
 * @returns {{}}
 */
export function createCrossbowTasksFromNpmScripts (cwd:string): any {
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
    'array': '[object Array]'
};

function testType (com:string, val:any): boolean {
    return Object.prototype.toString.call(val) === com;
}

export function isPlainObject (val:any): boolean {
    return testType(toStringTypes['obj'], val);
}
