import {RunCommandCompletionReport} from "./command.run.execute";
import {TaskErrorStats} from "./task.runner";

export function postCliExecution(complete: RunCommandCompletionReport) {
    const {errors, config} = complete;
    /**
     * If an error occurred, we need to exit the process
     * with any error codes if given
     */
    if (errors.length > 0 && config.fail) {

        const lastError = errors[errors.length-1];
        const stats: TaskErrorStats = lastError.stats;

        if (stats.cbExitCode !== undefined) {
            process.exit(stats.cbExitCode);
        }

        process.exit(1);
    }
}
