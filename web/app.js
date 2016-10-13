(function (io, angular, Rx) {

    const runnerTemplate = `
<div class="runnable-list">
    <ol>
        <li ng-repeat="seq in task.runner.sequence track by $index">
            <pre>{{seq|json}}</pre>
        </li>
    </ol>
    <div ng-show="ctrl.complete"><button ng-click="ctrl.reset()">Back to tasks</button></div>
</div>
`;
    const template = `
<ul class="task-list">
    <li ng-repeat="task in ctrl.tasks track by task.task.name" class="task-list__item" ng-class="{'task-list__item--expanded': task.expanded}">
        <code>{{task.task.name}}</code>
        <span class="svg-icon" ng-click="ctrl.expand(task)">
            <svg viewBox="0 0 100 100"><path d="M 10,50 L 60,100 L 70,90 L 30,50  L 70,10 L 60,0 Z" class="arrow"></path></svg>
        </span>
        <runnable-list task="task.task" ng-if="task.expanded"></runnable-list>
    </li>
</ul>`;

    
    angular
        .module('crossbow', [])
        .service('Tasks', TasksService)
        .directive('runnableList', function () {
            return {
                template: runnerTemplate,
                controllerAs: 'ctrl',
                restrict: 'E',
                replace: true,
                scope: {
                    task: "="
                },
                controller: ['$timeout', '$scope', 'Tasks', function ($timeout, $scope) {
                    console.log($scope.task.name);
                }]
            }
        })
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
                ctrl.tasks = x.map(function (task) {
                    return {
                        task: task,
                        expanded: false
                    }
                });
            });
        });

        ctrl.expand = function (task) {
            ctrl.tasks.forEach(function (_task) {
                if (_task.task.name === task.task.name) {
                    _task.expanded = !_task.expanded;
                } else {
                    _task.expanded = false;
                }
            });
        };

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
