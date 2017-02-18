import {Left, Right, readFileFromDiskWithContent, ExternalFileContent} from "./file.utils";
import * as reports from "./reporter.resolve";
import {EnvFile} from "./config";
const _ = require("../lodash.custom");

function addParsedData(file: ExternalFileContent): ExternalFileContent {
    return _.assign({}, file, {data: JSON.parse(file.content)});
}

export const getSingleEnvFile = (envFile: EnvFile, cwd: string) => {
    if (typeof envFile === 'string') {
        return Right(readFileFromDiskWithContent(envFile, cwd))
            .chain(result => {
                return result.errors.length
                    ? Left(result)
                    : Right(addParsedData(result))
            })
            .fold(error => {
                return {
                    errors: [error],
                    input: envFile
                }
            }, result => {
                console.log('-->',result);
            })
        // return joinPath(String(envFile), cwd)
        //     .chain(resolved => Right(resolved)
        //          .chain(resolved => {
        //              return envFileExists(resolved);
        //          })
        //          .map(resolved => {
        //              return readFileFromDiskWithContent(resolved, cwd);
        //          })
        //          .fold(error => {
        //              return {
        //                  errors: [error],
        //                  resolved,
        //                  input: envFile
        //              }
        //          }, result => {
        //              console.log(result);
        //          })
        //     )

    }
};

export const getEnvFilesFromDisk = (envFile, cwd) =>
    Right([].concat(envFile).map(path => getSingleEnvFile(path, cwd)))
        .chain(xs => {
            return {
                all: xs,
                valid: xs.filter(x => x.errors.length === 0),
                invalid: xs.filter(x => x.errors.length > 0)
            };
        });

const getEnvFiles = (envFile, cwd) =>
    Right(getEnvFilesFromDisk(envFile, cwd))
        .chain(x => x.invalid.length
            ? Left({type: reports.ReportTypes.BinOptionError, data: x})
            : Right(x)
        );

const addEnvFiles = config => {
    return config.envFile.length
        ? getEnvFiles(config.envFile, config.cwd)
            .map(envFiles => {
                return _.assign({}, config, {
                    envFiles: envFiles.valid
                });
            })
        : Right(config);
};

