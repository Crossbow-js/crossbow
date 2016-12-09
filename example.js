module.exports = {
    tasks: {
        '(sh)': {
            shane: function (opts) {
                console.log('opts', opts);
            }
        },
        '(css)': {
            dev: [
                function () {
                    console.log('1')
                },
                function () {
                    console.log('2')
                }
            ]
        }
    }
};