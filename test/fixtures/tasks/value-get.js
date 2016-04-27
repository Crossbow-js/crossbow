module.exports = function (opts, context) {
    console.log(context.shared.getValue().getIn('value-set', 'name'));
};