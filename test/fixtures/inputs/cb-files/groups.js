const cb = require('../../../../');

cb.group("js", {
    build: [
        '@sh rm -rf ./app',
        '@npm webpack --optimize'
    ],
    deploy: [
        'js:build',
        'rsync'
    ]
});

cb.task('rsync', [
    '@sh rsync -pav root@192.168.01 -'
]);