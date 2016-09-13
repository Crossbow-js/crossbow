import {Task} from "./task.resolve";
import {CommandTrigger} from "./command.run";
import * as file from "./file.utils";
import * as utils from "./task.utils";
import {HashDirErrorTypes} from "./file.utils";
import {ReportTypes, HashDirErrorReport} from "./reporter.resolve";
import Rx = require('rx');

export function createHashes(tasks: Task[], trigger: CommandTrigger): Rx.Observable<any> {

    const ifLookups = utils.concatProps(tasks, [], "ifChanged");

    if (!ifLookups.length) return Rx.Observable.empty();

    return file.hashItems(ifLookups, trigger.config.cwd)
        .map(function (hashResults: file.IHashResults) {
            // Send in the marked hashes to the run context
            // so that matching tasks can be ignored
            return {
                "ifChanged": hashResults.markedHashes
            };
        })
        .take(1)
        .catch(function (e) {
            if (e.code === 'ENOTDIR') e.type = HashDirErrorTypes.HashNotADirectory;
            if (e.code === 'ENOENT')  e.type = HashDirErrorTypes.HashPathNotFound;

            trigger.reporter({
                type: ReportTypes.HashDirError,
                data: {
                    error: e,
                    cwd: trigger.config.cwd
                }
            } as HashDirErrorReport);

            return Rx.Observable.just(Immutable.Map({}));
        });
}
