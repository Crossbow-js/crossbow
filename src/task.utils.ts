import {resolve, extname, basename} from 'path';
import {existsSync, readFileSync} from 'fs';
import {CrossbowConfiguration} from "./config";
import {CrossbowInput} from "./index";

const yml = require('js-yaml');

const objPath  = require('object-path');

export function locateModule (cwd: string, name: string): string[] {
    if (name.indexOf(':') > -1) {
        name = name.split(':')[0];
    }
    return [
        ['tasks', name + '.js'],
        ['tasks', name],
        [name + '.js'],
        [name],
        ['node_modules', 'crossbow-' + name]
    ]
        .map(x => resolve.apply(null, [cwd].concat(x)))
        .filter(existsSync);
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

    return [configFlag, ...maybes]
        .filter(x => x !== undefined)
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
