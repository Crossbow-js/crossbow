module.exports = function (opts, context, done) {
    context.shared.onNext(context.shared.getValue().setIn(['value-set.js', 'name'], 'kittie'));
    done();
};
