const rx = require('rx');
const cli = require('./dist/index');
const seq = require('./dist/task.sequence.factories');
const d = require('./dist/reporters/defaultReporter').default;
const SocketIOClient = require("socket.io-client");

var port = this.port;
var taskCount      = 0;
var completedCount = 0;
var startCount      = 0;
var host = "127.0.0.1";
var socket = SocketIOClient("http://127.0.0.1:" + "9838");

const c = require('./dist/cli.parse');

const parsed = c.default(process.argv.slice(2));

parsed.flags.reporters = [d, reporter];

socket.on("connect", function() {
    socket.emit('message', [{type: 'status', value: 'running'}]);
    cli.default({
        input: parsed.input,
        flags: parsed.flags
    }).catch(x => {
        process.exit(1);
    }).subscribeOnCompleted(function () {
        // here everything worked correctly
        // submit to socket, or not?
        process.exit();
    });
});

function reporter (name) {
    if (name === 'TaskErrors') {
        // console.log('Task Errors');
    }
    if (name === 'TaskList') {
        const seq      = arguments[1];
        if (seq.length) {
            const seqItems = countSeqItems(seq, []);
            taskCount      = seqItems.length;
        }
        // console.log('>>> items to run', seqItems.length);
    }
    if (name === 'TaskReport') {
        const report = arguments[1];
        // console.log('>>> report:', report.type);
        if (report.type === 'end') {
            completedCount++;
            // console.log('completed count', completedCount);
            socket.emit('message', [{type: 'progress', value: completedCount*100/taskCount}]);
        }
    }
}

function countSeqItems (seq, initial) {
    return seq.reduce(function (count, item) {
        if (item.type === 'Task') {
            return count.concat(item);
        }
        if (item.items.length) {
            return count.concat(countSeqItems(item.items, []));
        }
        return count;
    }, initial);
}
