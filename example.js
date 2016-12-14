module.exports = {
    tasks: {
        docker: {
            description: 'My cool task',
            options: {
                prod: {name: 'kittie'},
                dev: {name: 'shane'},
            },
            tasks: function(opts) {
                console.log(opts);
            }
        },
        '(sh)': {
            shane: [
                function (opts, ctx) {
                    console.log('opts', opts);
                },
                '@npm sleep 1'
            ],
            runSass: 'docker',
            ls: {
                description: "my other task",
                options: {},
                tasks: [function (opts) {
                    console.log('ere', opts);
                }]
            }
        },
        '(css)': {
            dev: [
                function () {
                    console.log('1');
                },
                function () {
                    console.log('2')
                },
                function () {
                    console.log('3')
                }
            ]
        }
    }
};
