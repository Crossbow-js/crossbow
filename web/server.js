// Setup basic express server
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const port = process.env.PORT || 4000;
const cli            = require('../dist/index');
const Rx             = require('rx');
const outputObserver = new Rx.Subject();
const signalObserver = new Rx.Subject();


server.listen(port, function () {
    console.log('Server listening at port %d', port);
});

// Routing
app.use(require('compression')());
app.use(express.static(__dirname));
app.use(express.static('./'));

// Chatroom

// var numUsers = 0;
//
io.on('connection', function (socket) {
    const prepared = cli.prepareInput({input: [], flags: {}}, null, outputObserver, signalObserver);

    if (prepared.errors.length) {
        console.log(prepared.errors);
    }

    const input = prepared.userInput.inputs[0].tasks;
    socket.emit('TopLevelTasks', Object.keys(input));

    socket.on('execute', function (incoming) {
        const prepared = cli.prepareInput(incoming.cli, null, outputObserver, signalObserver);
        if (prepared.errors.length) {
            console.log(prepared.errors);
        } else {
            const out = cli.handleIncoming(prepared);
            out.subscribe(x => {
                if (x.type === 'TaskReport' && x.data.type === 'error') {
                    const errors = x.data.stats.errors;
                    x.data.stats.errors = x.data.stats.errors.map(x => {
                        return x.toString();
                    });
                }
                socket.emit('execute-report', {origin: incoming.id, data: x});
            });
        }
    });
});