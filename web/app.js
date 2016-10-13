(function (io, angular, Rx) {

    const template = `
<div ng-show="ctrl.current.runnables.length">
    <ol>
        <li ng-repeat="runnable in ctrl.current.runnables track by runnable.seqUID">
            <pre>{{runnable.task.taskName}}</pre>
            <pre>{{runnable.task}}</pre>
            <span ng-show="runnable.stats.started && !runnable.stats.completed">started</span>
            <span ng-show="runnable.stats.completed">done {{runnable.stats.duration/1000}}s</span>
            <span style="color: red" ng-show="runnable.stats.errors.length">Failed {{runnable.stats.errors[0]}}</span>
        </li>
    </ol>
    <div ng-show="ctrl.current.complete"><button ng-click="ctrl.reset()">Back to tasks</button></div>
</div>
<ul ng-show="!ctrl.current.runnables.length">
    <li ng-repeat="task in ctrl.tasks track by $index">
        <code>{{task}}</code> 
        <a href="" ng-click="ctrl.execute(task)">Run</a>
    </li>
</ul>`;

    angular
        .module('crossbow', [])
        .service('Tasks', TasksService)
        .directive('taskList', function () {
            return {
                template,
                controllerAs: 'ctrl',
                restrict: 'E',
                controller: ['$timeout', '$scope', 'Tasks', taskListController]
            }
        });

    function taskListController ($timeout, $scope, Tasks) {
        var ctrl     = this;
        ctrl.tasks   = [];
        ctrl.current = {
            runnables: [],
            completed: [],
            errors:    [],
            complete:  false
        };

        ctrl.reset = function () {
            ctrl.current = {
                runnables: [],
                completed: [],
                errors:    [],
                complete:  false
            };
        };

        ctrl.applyStats = function (seqUID, stats) {
            ctrl.current.runnables
                .filter(runnable => runnable.seqUID === seqUID)[0]
                .stats = stats;
        };

        Tasks.task$.subscribe(x => {
            $timeout(function () {
                ctrl.tasks = x;
            });
        });

        ctrl.execute = function (task) {

            const runner = Tasks.execute(task);

            runner.do(x => console.log(x.type)).subscribe(x => {

                if (x.type === 'Setup') {
                    ctrl.current.runnables = collectRunnableTasks(x.data.sequence, []);
                    console.log(`Setup ${ctrl.current.runnables.length}`);
                }

                if (x.type === 'TaskReport') {
                    if (x.data.type === 'start') {
                        ctrl.applyStats(x.data.item.seqUID, x.data.stats);
                    }
                    if (x.data.type === 'end') {
                        ctrl.current.completed.push(x.data);
                        ctrl.applyStats(x.data.item.seqUID, x.data.stats);
                    }
                    if (x.data.type === 'error') {
                        ctrl.current.errors.push(x.data);
                        ctrl.applyStats(x.data.item.seqUID, x.data.stats);
                    }
                }

                if (x.type === 'Complete') {
                    ctrl.current.complete = true;
                }

                $scope.$digest();
            });
        }
    }

    function TasksService () {
        var socket   = io();
        var task$    = new Rx.BehaviorSubject([]);

        socket.on('TopLevelTasks', function (_tasks) {
            task$.onNext(_tasks);
        });

        const execReport$ = Rx.Observable.fromEvent(socket, 'execute-report');
        const complete$   = execReport$.filter(x => x.data.type === 'Complete');

        function execute (tasks) {

            const id = '01';

            return Rx.Observable
                .just(true)
                .do(x => {
                    socket.emit('execute', {
                        id,
                        cli: {
                            input: ['run'].concat(tasks),
                            flags: {}
                        }
                    });
                })
                .flatMap(function () {
                    return execReport$
                        .filter(x => x.origin === id)
                        .takeUntil(complete$.filter(x => x.origin === id));
                }).map(x => x.data);
        }

        return {
            task$,
            execute
        }
    }

    function collectRunnableTasks (items, initial) {
        return items.reduce(function (acc, item) {
            if (item.type === 'Task') {
                return acc.concat(item);
            }
            return acc.concat(collectRunnableTasks(item.items, []));
        }, initial);
    }

})(io, angular, Rx);
