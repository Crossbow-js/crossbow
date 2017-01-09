import {RunCommandCompletionReport} from "./command.run.execute";
import {TaskErrorStats} from "./task.runner";

export function postCliExecution(complete: RunCommandCompletionReport) {

    const {taskErrors, config} = complete;

    /**
     * If an error occurred, we need to exit the process
     * with any error codes if given
     */
    if (taskErrors.length > 0 && config.fail) {

        const lastError = taskErrors[taskErrors.length-1];

        const stats: TaskErrorStats = lastError.stats;

        if (stats.cbExitCode !== undefined) {
            process.exit(stats.cbExitCode);
        }

        process.exit(1);
    }
}
