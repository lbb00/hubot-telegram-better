// Create a basic Hubot stub object so
// we don't have to include the Hubot dependency
// in our tests

var noop = function () {}

module.exports = {
  name: 'TestBot',
  alias: 'TestAliasBot',
  logger: {
    info: noop,
    warning: noop,
    error: noop,
    debug: noop
  },
  brain: {}
}
