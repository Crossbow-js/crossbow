import {SignalTypes, ExitSignal} from "../config";
import {CommandTrigger} from "../command.run";
import {Task} from "../task.resolve";

export default function (task: Task, trigger: CommandTrigger) {
    return (options, ctx, done) => {
        if (task.command === 'exit') {
            process.nextTick(function () {
                trigger.config.signalObserver.onNext({
                    type: SignalTypes.Exit,
                    data: {
                        code: 0
                    } as ExitSignal
                });
            });
            done();
        }
    }
}
