import {CrossbowConfiguration} from "./config";
import {InputFiles, InputErrorTypes, InputError} from "./task.utils";
import {readFileSync, writeFileSync, existsSync} from "fs";
import {resolve, parse, relative} from "path";
import {CrossbowInput} from "./index";
import {ParsedPath} from "path";
import {statSync} from "fs";
import {join} from "path";

const _    = require('../lodash.custom');
import yml = require('js-yaml');

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
            return _.assign(inputFile, {
                input: yml.safeLoad(readFileSync(inputFile.resolved))
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
    writeFileSync(file.resolved, content);
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