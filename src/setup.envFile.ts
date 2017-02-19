import {Left, Right, readFileFromDiskWithContent, ExternalFileContent, parseEnv} from "./file.utils";
import * as reports from "./reporter.resolve";
import {EnvFile} from "./config";
import {InputErrorTypes, isPlainObject} from "./task.utils";
const _ = require("../lodash.custom");

function addParsedData(file: ExternalFileContent): ExternalFileContent {
    if (file.parsed.ext === '.json') {
        return _.assign({}, file, {data: JSON.parse(file.content)});
    }
    return _.assign({}, file, {data: parseEnv(file.content)});
}

export const getSingleEnvFile = (envFile: EnvFile, globalPrefix: string[], cwd: string): EnvFile => {
    const lookupPath = (function() {
        if (typeof envFile === 'string') {
            return envFile;
        }
        return envFile.path;
    })();

    /**
     * 1. If a string was given, use global prefix
     * 2. If a prefix was given, use that in place of global
     * 3. default to using global
     */
    const prefix = (function() {
        if (typeof envFile === 'string') {
            return globalPrefix;
        }
        if (envFile.prefix) {
            return [].concat(envFile.prefix);
        }
        return globalPrefix;
    })();

    const result = readFileFromDiskWithContent(lookupPath, cwd);
    if (result.errors.length) {
        return {
            input: lookupPath,
            file: result,
            prefix: prefix,
            errors: [{type: InputErrorTypes.EnvFileNotFound}]
        }
    }
    return {
        input: lookupPath,
        file: addParsedData(result),
        prefix: prefix,
        errors: []
    }
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
