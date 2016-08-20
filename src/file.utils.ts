import {CrossbowConfiguration} from "./config";
import {InputFiles, InputErrorTypes, InputError} from "./task.utils";
import {readFileSync, writeFileSync, existsSync} from "fs";
import {resolve, parse, relative} from "path";
import {CrossbowInput} from "./index";
import {ParsedPath} from "path";
import {statSync} from "fs";
import {join} from "path";
import {readdirSync} from "fs";
import Rx = require('rx');
import {dirname} from "path";
import {createReadStream} from "fs";
import {createHash} from "crypto";
import {lstat, Stats} from "fs";

const hd = require('hash-dir');
const hashDirAsObservable  = Rx.Observable.fromNodeCallback(hd);
const hashFileAsObservable = Rx.Observable.fromNodeCallback(hashFile);
const lstatAsObservable    = Rx.Observable.fromNodeCallback(lstat);

const _ = require('../lodash.custom');
// todo windows support
const supportedTaskFileExtensions = ['.js', '.sh'];

export interface ExternalFile {
    path: string
    resolved: string
    relative: string
    errors: InputError[],
    parsed: ParsedPath
}

export interface FileNotFoundError extends InputError {}

export interface ExternalFileContent extends ExternalFile {
    content: string
    data?: any
}

export interface ExternalFileInput extends ExternalFile {
    input: CrossbowInput|any,
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

/**
 * Try to retrieve input files from disk.
 * This is different from regular file reading as
 * we deliver errors with context
 */
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
    const inputs = inputFiles.map(inputFile => {

        /**
         * If the file does not exist, change the error to be an InputFileNotFound error
         * as this will allow more descriptive logging when needed
         */
        if (inputFile.errors.length) {
            return _.assign({}, inputFile, {
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
        if (inputFile.parsed.ext.match(/ya?ml$/i)) {
            const yml = require('js-yaml');
            return _.assign(inputFile, {
                input: yml.safeLoad(readFileSync(inputFile.resolved, 'utf8'))
            })
        }

        /**
         * Finally assume a JS/JSON file and 'require' it as normal
         */
        return _.assign({}, inputFile, {
            input: require(inputFile.resolved)
        });
    });

    return {
        all: inputs,
        valid: inputs.filter(x => x.errors.length === 0),
        invalid: inputs.filter(x => x.errors.length > 0)
    };
}

export function readFilesFromDiskWithContent(paths: string[], cwd: string): ExternalFileContent[] {
    const files = readFilesFromDisk(paths, cwd);
    return files
        .map((x: ExternalFileContent) => {
            if (x.errors.length) return x;

            x.content = readFileSync(x.resolved, 'utf8');
            return x;
        });
}

export function writeFileToDisk(file: ExternalFile, content: string) {
    const mkdirp = require('mkdirp').sync;
    mkdirp(dirname(file.resolved));
    writeFileSync(file.resolved, content);
}

export function getStubFileWithContent(path:string, cwd:string): ExternalFileContent {
    const file : any = getStubFile(path, cwd);
    file.content = '';
    return file;
}

export function readOrCreateJsonFile (path:string, cwd: string): ExternalFileContent {
    const existing = readFilesFromDiskWithContent([path], cwd)[0];
    if (existing.errors.length) {
        if (existing.errors[0].type === InputErrorTypes.FileNotFound) {
            const stub = getStubFileWithContent(path, cwd);
            stub.content = '{}';
            stub.data    = JSON.parse(stub.content);
            return stub;
        }
    } else {
        try {
            existing.data = JSON.parse(existing.content);
        } catch (e) {
            existing.data = {};
        }
    }
    return existing;
}

export function getStubFile(path:string, cwd:string): ExternalFile {
    const resolved = resolve(cwd, path);
    return {
        errors: [],
        path: path,
        resolved,
        parsed: parse(path),
        relative: relative(cwd, resolved)
    }
}

/**
 * Take an array of paths and return file info + errors if they don't exist
 * @param paths
 * @param cwd
 * @returns {ExternalFile[]}
 */
export function readFilesFromDisk(paths: string[], cwd: string): ExternalFile[] {
    return paths
        .map(String)
        .map(x => getStubFile(x, cwd))
        .map((incoming): ExternalFile => {

            const {resolved} = incoming;

            /**
             * If the path does not exist, it's a FileNotFound error
             */
            if (!existsSync(resolved)) {
                return _.assign(incoming, {
                    errors: [{type: InputErrorTypes.FileNotFound}]
                });
            }

            /**
             * Not check it's a file & NOT a dir
             * @type {Stats}
             */
            const stat = statSync(resolved);
            if (!stat.isFile()) {
                return _.assign(incoming, {
                    errors: [{type: InputErrorTypes.NotAFile}],
                });
            }

            /**
             * At this point the file DOES exist
             */
            return incoming;
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

export function getExternalFiles (dirpaths: string[], cwd: string): ExternalFile[] {
    return dirpaths
        .map(dirpath => {
            return resolve(cwd, dirpath);
        })
        .filter(existsSync)
        .reduce(function (acc, dirPath) {
            return acc.concat(readdirSync(dirPath).map(filepath => {
                const resolved = join(dirPath, filepath);
                const parsed = parse(resolved);
                const output : ExternalFile = {
                    path: filepath,
                    resolved,
                    relative: relative(cwd, resolved),
                    parsed,
                    errors: []
                };
                return output;
            }));
        }, []);
}

export function getPossibleTasksFromDirectories(dirpaths: string[], cwd: string): string[] {
    return getExternalFiles(dirpaths, cwd)
        .filter(x => supportedTaskFileExtensions.indexOf(x.parsed.ext) > -1)
        .map(x => {
            return x.relative;
        })
}

export interface IHashItem {
    userInput: string
    resolved: string
    hash: string
    changed: boolean
}
export interface IHashInput {
    userInput: string
    pathObj: ExternalFile
}

export interface IHashResults {
    output: IHashItem[]
    markedHashes: IHashItem[]
}

export enum HashDirErrorTypes  {
    HashNotADirectory = <any>"HashNotADirectory",
    HashPathNotFound = <any>"HashPathNotFound"
}

export interface HashDirError extends Error {
    code: string
    path: string
    syscall: string
}

export function hashItems(dirs: string[], cwd:string): any {

    const existingFile = readOrCreateJsonFile(join('.crossbow', 'history.json'), cwd);

    if (!existingFile.data.hashes) {
        existingFile.data.hashes = [];
    }

    return Rx.Observable
        .from(dirs)
        .map((x): IHashInput => {
            return {
                userInput: x,
                pathObj: getStubFile(x, cwd)
            }
        })
        .distinct(x => x.pathObj.resolved)
        .flatMap(hashFileOrDir)
        .toArray()
        .map((x: IHashItem[]) => {
            return markHashes(x, existingFile.data.hashes);
        })
        // Write the hashes to disk
        .do(function (hashResults: IHashResults) {
            writeFileToDisk(existingFile, JSON.stringify({hashes: hashResults.output}, null, 2));
        });
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

function hashFile(filepath:string, fn: Function) {
    const hash = createHash('sha256');
    createReadStream(filepath)
        .on('data', function(chunk) {
            hash.update(chunk);
        })
        .on('end', function() {
            fn(null, hash.digest('hex'));
        })
        .on('error', fn);
}

function hashFileOrDir (input: IHashInput) {
    return lstatAsObservable(input.pathObj.resolved).flatMap(function (stats: Stats) {
        if (stats.isDirectory()) {
            return hashDirAsObservable(input.userInput).map((tree: {hash:string}) => {
                return {
                    userInput: input.userInput,
                    resolved: input.pathObj.resolved,
                    hash: tree.hash
                }
            });
        }
        if (stats.isFile()) {
            return hashFileAsObservable(input.userInput).map((hash: string) => {
                return {
                    userInput: input.userInput,
                    resolved: input.pathObj.resolved,
                    hash
                }
            });
        }
        return Rx.Observable.empty();
    });
}

function markHashes(newHashes: IHashItem[], existingHashes: IHashItem[]): IHashResults {

    const newHashPaths = newHashes.map(x => x.resolved);
    const markedHashes = newHashes.map(function (newHash) {
        const match  = existingHashes.filter(x => x.resolved === newHash.resolved);
        newHash.changed = (function () {
            if (match.length) {
                return match[0].hash !== newHash.hash;
            }
            return true; // return true by default so that new entries always run
        })();
        return newHash
    });

    const otherHashes = existingHashes.filter(function (hash) {
        return newHashPaths.indexOf(hash.resolved) === -1;
    });

    const output = [...otherHashes, ...newHashes].filter(Boolean);

    return {
        output,
        markedHashes
    }
}
