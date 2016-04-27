module.exports = function (opts, context) {
    context.shared.onNext(context.shared.getValue().setIn(['value-set.js', 'name'], 'kittie'));
};