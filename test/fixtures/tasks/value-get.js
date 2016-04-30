module.exports = function (opts, context, done) {
    console.log(context.shared.getValue().getIn('value-set', 'name'));
    done();
};
