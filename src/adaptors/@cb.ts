import {SignalTypes, ExitSignal} from "../config";
import {CommandTrigger} from "../command.run";
import {Task} from "../task.resolve";

export default function (task: Task, trigger: CommandTrigger) {
    return () => {
        if (task.command === 'exit') {
            trigger.config.signalObserver.onNext({
                type: SignalTypes.Exit,
                data: {
                    code: 0
                } as ExitSignal
            });
        }
    }
}
