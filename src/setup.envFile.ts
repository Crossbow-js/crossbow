import {Left, Right, readFileFromDiskWithContent, ExternalFileContent, parseEnv, tryCatch} from "./file.utils";
import * as reports from "./reporter.resolve";
import {EnvFile} from "./config";
import {InputErrorTypes, isPlainObject, InputError} from "./task.utils";
const _ = require("../lodash.custom");

function parseData(file: ExternalFileContent): {} {
    if (file.parsed.ext === '.json') {
        return JSON.parse(file.content);
    }
    return parseEnv(file.content);
}

const getLookupPath = item =>
    typeof item === 'string'
        ? item
        : item.path;

const getPrefix = (envFile, global) => {
    if (typeof envFile === 'string') {
        return global;
    }
    if (envFile.prefix) {
        return [].concat(envFile.prefix);
    }
    return global;
};

const readEnvFile = (lookupPath, cwd) =>
    Right(readFileFromDiskWithContent(lookupPath, cwd))
        .chain(result => result.errors.length
            ? Left(result)
            : Right(result));

export const getSingleEnvFile = (envFile: EnvFile, globalPrefix: string[], cwd: string): EnvFile => {

    const out = Right(envFile)
        .chain(envFileItem => Right([getLookupPath(envFileItem), getPrefix(envFileItem, globalPrefix)])
            .chain(([lookupPath, prefix]) =>
                readEnvFile(lookupPath, cwd)
                    .fold(file => {
                        return Left({
                            input: lookupPath,
                            file,
                            prefix: prefix,
                            errors: [{type: InputErrorTypes.EnvFileNotFound}]
                        })
                    }, r => Right(r))
                    .chain((file: ExternalFileContent) =>
                        tryCatch(() => parseData(file))
                            .fold(error => Left({
                                    input: lookupPath,
                                    file,
                                    prefix: prefix,
                                    errors: [{type: InputErrorTypes.EnvFileParseError, error}]
                                }),
                                  parsedData => Right({
                                    input: lookupPath,
                                    file: _.assign({}, file, {data: parsedData}),
                                    prefix: prefix,
                                    errors: []
                                })
                            ))));
    return out.fold(e => e, r => r);
};

export const getEnvFilesFromDisk = (envFile, globalPrefix, cwd) =>
    Right([].concat(envFile).map(path => getSingleEnvFile(path, globalPrefix, cwd)))
        .map(xs => {
            return {
                all: xs,
                valid: xs.filter(x => x.errors.length === 0),
                invalid: xs.filter(x => x.errors.length > 0)
            };
        });

export const getEnvFiles = (envFile: EnvFile, globalPrefix, cwd) =>
    getEnvFilesFromDisk(envFile, globalPrefix, cwd)
        .chain(x => x.invalid.length
            ? Left({type: reports.ReportTypes.EnvFileOptionError, data: x})
            : Right(x)
        );

export const addEnvFilesToObject = config => {
    return config.envFile.length
        ? getEnvFiles(config.envFile, config.envFilePrefix, config.cwd)
            .map(envFiles => {
                return _.assign({}, config, {
                    envFiles: envFiles.valid
                });
            })
        : Right(config);
};
