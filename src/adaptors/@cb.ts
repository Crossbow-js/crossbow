import {SignalTypes, ExitSignal} from "../config";
import {CommandTrigger} from "../command.run";
import {Task} from "../task.resolve";
import Rx = require("rx");

export default function (task: Task, trigger: CommandTrigger) {
    return (options, ctx, done) => {
        if (task.command === "exit") {
            trigger.config.signalObserver.onNext({
                type: SignalTypes.Exit,
                data: {
                    code: 0
                } as ExitSignal
            });
            process.nextTick(function () {
                done();
            });
            return;
        }
        if (task.command.indexOf("delay") === 0) {
            const split = task.command.split(" ");
            if (split.length !== 2) {
                return done(new Error("Incorrect usage. Try: @cb <number>"));
            } else {
                const isNum = split[1].match(/^[\d]+$/);
                if (!isNum) {
                    return done(new Error("Incorrect usage. Try: @cb <number>"));
                }
                return Rx.Observable.empty().delay(Number(split[1]), ctx.config.scheduler);
            }
        }

        return done(new Error("Command not supported"));
    };
}
