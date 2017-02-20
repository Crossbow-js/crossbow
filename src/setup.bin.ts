import {Left, Right} from "./file.utils";
import * as reports from "./reporter.resolve";
import {InputErrorTypes} from "./task.utils";
const _ = require("../lodash.custom");
import {statSync} from "fs";
import {BinDirectoryLookup} from "./reporter.resolve";
import {readdirSync} from "fs";
import {join} from "path";
import {existsSync} from "fs";

/**
 * If the user has specified the `bin` option,
 * we need to ensure these paths are valid directories
 * and read the executables from them
 */
export const addBinLookupsToObject = config =>
    config.bin.length
        // take the `config.bin` array and resolve each
        ? getBins(config.bin, config.cwd)
            // if successful, add the directories and executables
            .map(bindirs => {
                return _.assign({}, config, {
                    binDirectories: bindirs.valid,
                    binExecutables: getExecutables(bindirs.valid)
                });
            })
        : Right(config);

/**
 * Resolve many bin paths
 */
export const getBinLookups = (paths: string[], cwd: string) =>
    Right([].concat(paths).map(path => getBinLookup(path, cwd)))
        .chain(xs => {
            return {
                all: xs,
                valid: xs.filter(x => x.errors.length === 0),
                invalid: xs.filter(x => x.errors.length > 0)
            };
        });

export const getBinLookup = (path: string, cwd: string) =>
    joinPath(String(path), cwd)
        .chain(resolved => Right(resolved)
            .chain(resolved => binDirectoryExists(resolved))
            .chain(resolved => isDirectory(resolved))
            .fold(error => {
                return {
                    errors: [error],
                    resolved,
                    input: path
                }
            }, resolved => {
                return {
                    errors: [],
                    resolved,
                    input: path
                }
            }));

export const getBins = (dir, cwd) =>
    Right(getBinLookups(dir, cwd))
        .chain(x => x.invalid.length
            ? Left({type: reports.ReportTypes.BinOptionError, data: x})
            : Right(x)
        );

export const getExecutables = (dirs) =>
    dirs.reduce((acc, lookup: BinDirectoryLookup) => {
        const items = readdirSync(lookup.resolved);
        return acc.concat(items.filter(dir => {
            try {
                return statSync(join(lookup.resolved, dir)).isFile()
            } catch (e) {
                return false;
            }
        }));
    }, []);

const binDirectoryExists = path =>
    existsSync(path)
        ? Right(path)
        : Left({type: InputErrorTypes.BinDirectoryNotFound});

const isDirectory = path =>
    statSync(path).isDirectory()
        ? Right(path)
        : Left({type: InputErrorTypes.BinPathNotADirectory});

const joinPath = (path, cwd) => Right(join(cwd, path));
