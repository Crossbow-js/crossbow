var SocketIO = require("socket.io");
var spawn = require("cross-spawn");
var Dashboard = require("./dashboard");

const db = new Dashboard({});

var env = process.env;

env.FORCE_COLOR = true;

// console.log('Waiting for connection');

var child = spawn('node', ['example.js'].concat(process.argv.slice(2)), {
    env: env,
    stdio: [null, null, null, null],
    detached: true
});

var port = 9838;
var server = SocketIO(port);

server.on("connection", function(socket) {
    socket.on("message", function(message) {
        db.setData(message);
    });
});

server.on("error", function(err) {
    // console.log('Socket server error', err);
});

child.on('close', function (code) {
    if (code === 0) {
        db.setData([{type: 'status', value: 'success'}]);
    } else {
        db.setData([{type: 'status', value: 'error'}]);
    }
});

child.stdout.on("data", function (data) {
    db.setData([{
        type: "log",
        value: data.toString("utf8").replace(/\n$/, '')
    }]);
});

child.stderr.on("data", function (data) {
    db.setData([{
        type: "log",
        value: data.toString("utf8").replace(/\n$/, '')
    }]);
    // console.log('x', data.toString());
    // dashboard.setData([{
    //     type: "log",
    //     value: data.toString("utf8")
    // }]);
});

process.on("exit", function () {
    if (child.exitCode === null) {
        process.kill(process.platform === "win32" ? child.pid : -child.pid);
    }
});
