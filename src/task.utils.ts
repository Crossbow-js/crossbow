import {resolve, extname, basename} from 'path';
import {existsSync, readFileSync} from 'fs';
import {CrossbowConfiguration} from "./config";

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

/**
 * Try to auto-load configuration
 * @param flags
 * @param config
 * @returns {*}
 */
export function retrieveExternalInputFiles (config: CrossbowConfiguration): any[] {

    const validExts = ['.js', '.json', '.yaml', '.yml'];
    const maybes    = ['crossbow.js', 'crossbow.yaml', 'crossbow.yml', 'package.json'];
    const cwd       = config.cwd;

    /**
     * Was the --config flag given? if so, use the that
     * value to lookup a configuration file
     */
    if (config.config) {
        return filterFiles([config.config]).map(importConfig);
    } else {
        return getFiles(filterFiles(maybes));
    }

    function importConfig(filepath: string): any {
        var ext = extname(filepath);
        if (validExts.indexOf(ext) > -1) {
            if (ext.match(/ya?ml$/)) {
                return yml.safeLoad(readFileSync(filepath));
            }
            return require(filepath);
        }
        return {};
    }

    /**
     * Get a file
     * @param input
     * @returns {*}
     */
    function getFiles(input: string[]) : string[] {
        var out = []
            .concat(input)
            .map(x => {
                if (basename(x) === 'crossbow.js') {
                    return require(x);
                } else if (x.match(/yml|yaml$/)) {
                    return yml.safeLoad(readFileSync(x));
                } else {
                    var mod = require(x);
                    if (mod.crossbow) {
                        return mod.crossbow;
                    }
                }
                return false;
            })
            .filter(x => x);

        return out;
    }

    function filterFiles(input: string[]|any[]): string[] {
        return input
            .map(x => resolve(cwd, x))
            .filter(existsSync);
    }
}
