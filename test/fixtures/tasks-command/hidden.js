module.exports = {
    tasks: {
        _merkle: '@npm hash-dir',
        build: ['_merkle', 'deploy'],
        deploy: ['@sh rsync some-server']
    }
};