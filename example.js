module.exports = {
    tasks: {
        docker: [
            '@npm sleep 1'
        ],
        '(sh)': {
            shane: [
                function (opts) {
                    console.log('opts', opts);
                },
                '@npm sleep 1'
            ]
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
