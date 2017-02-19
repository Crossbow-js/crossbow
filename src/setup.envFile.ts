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

export const getSingleEnvFile = (envFile: EnvFile, cwd: string): EnvFile => {
    const lookupPath = (function() {
        if (typeof envFile === 'string') {
            return envFile;
        }
        return envFile.path;
    })();

    const prefix = (function() {
        if (typeof envFile === 'string') {
            return [];
        }
        if (envFile.prefix) {
            return [].concat(envFile.prefix);
        }
        return [];
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

export const getEnvFilesFromDisk = (envFile, cwd) =>
    Right([].concat(envFile).map(path => getSingleEnvFile(path, cwd)))
        .map(xs => {
            return {
                all: xs,
                valid: xs.filter(x => x.errors.length === 0),
                invalid: xs.filter(x => x.errors.length > 0)
            };
        });

export const getEnvFiles = (envFile: EnvFile, cwd) =>
    getEnvFilesFromDisk(envFile, cwd)
        .chain(x => x.invalid.length
            ? Left({type: reports.ReportTypes.EnvFileOptionError, data: x})
            : Right(x)
        );

export const addEnvFilesToObject = config => {
    return config.envFile.length
        ? getEnvFiles(config.envFile, config.cwd)
            .map(envFiles => {
                return _.assign({}, config, {
                    envFiles: envFiles.valid
                });
            })
        : Right(config);
};
