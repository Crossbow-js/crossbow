#!/usr/bin/env node
import {RunComplete} from "./command.run.execute";
import {TasksCommandComplete} from "./command.tasks";
import cli from "./cli";
import handleIncoming from "./index";

const parsed = cli(process.argv.slice(2));

if (parsed.execute) {

    if (parsed.cli.command === 'run') {
        handleIncoming<RunComplete>(parsed.cli)
            .subscribe(require('./command.run.post-execution').postCliExecution);
    }

    if (parsed.cli.command === 'tasks' || parsed.cli.command === 'ls') {
        const out = handleIncoming<TasksCommandComplete>(parsed.cli);
        if (out && out.subscribe && typeof out.subscribe === 'function') {
            out.subscribe();
        }
    }
}
