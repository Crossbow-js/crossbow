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

cb.task('other', ['@cb delay 1000', '@sh echo "3rd"']);

cb.task('serve', function () {
    cb.watch('*.json', [
        '@npm sleep',
    ]);
    cb.watcher('*.js', [
        '@npm sleep 1',
    ]).subscribe();
});