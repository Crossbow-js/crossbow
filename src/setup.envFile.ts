import {Left, Right, readFileFromDiskWithContent, ExternalFileContent, parseEnv, tryCatch} from "./file.utils";
import * as reports from "./reporter.resolve";
import {EnvFile} from "./config";
import {InputErrorTypes} from "./task.utils";
const _ = require("../lodash.custom");

/**
 * Wrapper for reading the env file from disk.
 * The result could have an 'errors' property so we
 * wrap this in the Either type
 */
const readEnvFile = (lookupPath: string, cwd: string) =>
    Right(readFileFromDiskWithContent(lookupPath, cwd))
        .chain(result => result.errors.length
            ? Left(result)
            : Right(result));

/**
 * Given a single `envFile` option, try to read & parse
 * a file from disk.
 */
export const getSingleEnvFile = (envFile: EnvFile, globalPrefix: string[], cwd: string): EnvFile => {

    return Right(envFile)
        // Get an array of 'lookupPath' and 'prefix' in the same scope
        .chain(envFileItem => Right([getLookupPath(envFileItem), getPrefix(envFileItem, globalPrefix)])
            // destructure previous results
            .chain(([lookupPath, prefix]) =>
                // Now attempt to read the file from disk
                readEnvFile(lookupPath, cwd)
                    // If an error occurs here, delegate to a `EnvFileNotFound` error
                    .fold(file => {
                        return Left({
                            input: lookupPath,
                            file,
                            prefix: prefix,
                            errors: [{type: InputErrorTypes.EnvFileNotFound}]
                        })
                    }, r => Right(r)) // <-- otherwise continue with the result
                    // Now we have a file successfully read from disk, keep it in scope
                    .chain((file: ExternalFileContent) =>
                        // Try to parse the data from it. (JSON/env could throw)
                        tryCatch(() => parseData(file))
                            // If an error occurs in parsing, defer to `EnvFileParseError` error
                            .fold(error => Left({
                                    input: lookupPath,
                                    file,
                                    prefix: prefix,
                                    errors: [{type: InputErrorTypes.EnvFileParseError, error}]
                                }),
                                  // If the content parsed without error, return the final result
                                parsedData => Right({
                                    input: lookupPath,
                                    file: _.assign({}, file, {data: parsedData}),
                                    prefix: prefix, errors: []
                                })
                            )))).fold(e => e, r => r); // finally fold as we could've exited early todo: could this be removed?
};

/**
 * If the user has specified any `envFile` options,
 * we need to read each file from disk and parse it's data.
 * Finally we save the results on the incoming config object
 */
export const addEnvFilesToObject = config => {
    return config.envFile.length
        // Take the `config.envFile` array and resolve each
        ? getEnvFiles(config.envFile, config.envFilePrefix, config.cwd)
            // Add `envFiles` to config object
            .map(envFiles => {
                return _.assign({}, config, {
                    envFiles: envFiles
                });
            })
        : Right(config);
};

/**
 * Either wrapper to handle the fact that 1 or more of the envFile
 * options could've resulted in an error.
 * If that's the case, we want to return a Left that has the report type
 * `EnvFileOptionError` so that a nice error can be printed
 */
export const getEnvFiles = (envFile: EnvFile, globalPrefix: string[], cwd: string) =>
    Right([].concat(envFile).map(path => getSingleEnvFile(path, globalPrefix, cwd)))
        .map(xs => {
            return {
                all: xs,
                valid: xs.filter(x => x.errors.length === 0),
                invalid: xs.filter(x => x.errors.length > 0)
            };
        })
        .chain(x => x.invalid.length
            ? Left({type: reports.ReportTypes.EnvFileOptionError, data: x})
            : Right(x.valid));

/**
 * Parse either json or regular .env file
 * @param file
 * @returns {any}
 */
function parseData(file: ExternalFileContent): {} {
    if (file.parsed.ext === '.json') {
        return JSON.parse(file.content);
    }
    return parseEnv(file.content);
}

/**
 * `envFile` could be either a string or object, so
 * we need to decide where to get the lookup path from
 *
 * -> envFile: package.json
 * -> envFile:
 *      path: package.json
 *      prefix: [npm, package]
 */
const getLookupPath = (envFile: EnvFile) : string =>
    typeof envFile === 'string'
        ? envFile
        : envFile.path;

/**
 * envFiles can either have their own prefixes array, or
 * it will inherit from the global if not set.
 * @param envFile
 * @param globalPrefixes
 * @returns {any}
 */
const getPrefix = (envFile: EnvFile, globalPrefixes: string[]): string[] => {
    if (typeof envFile === 'string') {
        return globalPrefixes;
    }
    if (envFile.prefix && envFile.prefix.length) {
        return [].concat(envFile.prefix);
    }
    return globalPrefixes;
};

