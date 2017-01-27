const assert = require('chai').assert;
const exec = require('child_process').exec;
const execSync = require('child_process').execSync;

describe("list available tasks", function () {
    it("lists tasks in simple format", function (done) {
        exec(`node dist/cb tasks -i examples/crossbow.js`, function (err, stdout, stderr) {
            assert.include(stdout, 'webpack        [ @npm sleep 1 ]');
            done();
        });
    });
    it("lists tasks in verbose format", function (done) {
        exec(`node dist/cb tasks -i examples/crossbow.js -v`, function (err, stdout, stderr) {
            assert.include(stdout, '├─┬ webpack\n');
            done();
        });
    });
    it('Should show tasks from current CWD + /tasks', function (done) {
        exec('node dist/cb tasks --cwd test/fixtures/tasks-command', function (err, stdout) {
            assert.include(stdout, 'tasks/test-01.js   Run via: test-01');
            assert.include(stdout, 'tasks/test-02.sh   Run via: test-02');
            done();
        });
    });
    it('Should show sub-set of tasks', function (done) {
        exec('node dist/cb tasks build-js --cbfile test/fixtures/cbfile.js', function (err, stdout) {
            assert.include(stdout, 'build-js');
            done();
        });
    });
    it('Should show tasks from configured task dir', function (done) {
        exec('node dist/cb tasks --tasksDir test/fixtures/tasks-command/tasks-02', function (err, stdout) {
            assert.include(stdout, 'test/fixtures/tasks-command/tasks-02/task-2-01.js   Run via: task-2-01');
            done();
        });
    });
    it('Should show tasks from configured task dir + configured cwd', function (done) {
        exec('node dist/cb ls --cwd test/fixtures/tasks-command --tasksDir tasks-02', function (err, stdout) {
            assert.include(stdout, 'tasks-02/task-2-01.js   Run via: task-2-01');
            done();
        });
    });
    it('Should exclude _ prefixed tasks from simple task list', function () {
        const output = execSync('node dist/cb tasks -i test/fixtures/tasks-command/hidden.js');
        // console.log(output.toString());
        const expected = `Using: test/fixtures/tasks-command/hidden.js

Default Tasks
build     [ _merkle, deploy ]
deploy    [ @sh rsync some-server ]
`;
        assert.equal(output.toString(), expected);
    });
    it('Should include flags for tasks & aliases (short)', function () {

        const output = execSync('node dist/cb tasks -i=test/fixtures/tasks-command/flags.js');
        const expected = `Using: test/fixtures/tasks-command/flags.js

Default Tasks
css   [ js --production ]
js    [ @npm webpack ]
`;

        assert.equal(output.toString(), expected);
    });
    it('Should include flags for tasks & aliases (verbose)', function () {
        const output = execSync('node dist/cb tasks -v -i=test/fixtures/tasks-command/flags.js');
        const expected = `Using: test/fixtures/tasks-command/flags.js

Available Tasks: 
├─┬ css
│ └─┬ js --production
│   └── @npm webpack
└─┬ js
  └── @npm webpack
✔ 0 errors found
`;

        assert.equal(output.toString(), expected);
    });
    it('Should render task lists for cbfile', function () {
        const output = execSync('node dist/cb tasks --cbfile=test/fixtures/tasks-command/cbfile.js');
        const expected = `Using: test/fixtures/tasks-command/cbfile.js

Default Tasks
rx-task          [ [Function: myFunction] ]
array            [ rx-task ]
inline-object    [ @npm webpack ]
with-desc        My Awesome Task
inline-fn        [ [Function: tasks] ]
parallel-tasks   [ rx-task, ParallelGroup(with-desc,inline-fn... ]

docker
docker:up        [ @sh docker-compose up -d ]
`;
        assert.equal(output.toString(), expected);
    });
    it('Should render task lists for cbfile (verbose)', function () {
        const output = execSync('node dist/cb tasks --cbfile=test/fixtures/tasks-command/cbfile.js -v');
        const expected = `Using: test/fixtures/tasks-command/cbfile.js

Available Tasks: 
├─┬ rx-task
│ └── [Function: myFunction]
├─┬ array
│ └─┬ rx-task
│   └── [Function: myFunction]
├─┬ inline-object
│ └── @npm webpack
├─┬ with-desc
│ └── @npm webpack
├─┬ inline-fn
│ └── [Function: tasks]
├─┬ parallel-tasks
│ ├─┬ rx-task
│ │ └── [Function: myFunction]
│ └─┬ ParallelGroup(with-desc,inline-fn...
│   ├─┬ with-desc
│   │ └── @npm webpack
│   └─┬ inline-fn
│     └── [Function: tasks]
└─┬ docker:up
  └── @sh docker-compose up -d
✔ 0 errors found
`;
        assert.equal(output.toString(), expected);
    });
});
