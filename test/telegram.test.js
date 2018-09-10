const hubot = require('./hubot.stub')
const expect = require('chai').expect

let telegram = require('./../src/telegram').use(hubot)
describe('Telegram', function () {
  describe('#cleanMessageText()', function () {
    it('private chat: should remove any leading / characters from commands', function () {
      let input, text

      input = '/ship it'
      text = telegram.cleanMessageText(input, 1)
      expect(/\/ship it/.test(text)).to.equal(false)

      input = '/ship it'
      text = telegram.cleanMessageText(input, 1)
      expect(text.split(' ')[1].substr(0, 1)).to.not.equal('/')
    })

    // eg. ship it => BotName ship it
    it('private chat: should auto prepend the bot name to message text', function () {
      let input = 'ship it'
      let text = telegram.cleanMessageText(input, 1)
      expect(hubot.name + ' ' + input).to.equal(text)
    })

    // eg. BotName ship it => BotName ship it
    it('private chat: should not prepend bot name if has already been provided', function () {
      let input, text
      input = 'ship it'

      text = telegram.cleanMessageText(hubot.name + ' ' + input, 1)
      expect(hubot.name + ' ' + input).to.equal(text)

      text = telegram.cleanMessageText(hubot.name.toLowerCase() + ' ' + input, 1)
      expect(hubot.name + ' ' + input).to.equal(text)

      text = telegram.cleanMessageText('@' + hubot.name.toLowerCase() + ' ' + input, 1)
      expect(hubot.name + ' ' + input).to.equal(text)
    })

    // eg. BotAliasName ship it => BotAliasName ship it
    it('private chat: should not prepend bot name if an alias has already been provided', function () {
      let input, text
      input = 'ship it'

      text = telegram.cleanMessageText(hubot.alias + ' ' + input, 1)
      expect(hubot.name + ' ' + input).to.equal(text)

      text = telegram.cleanMessageText(hubot.alias.toLowerCase() + ' ' + input, 1)
      expect(hubot.name + ' ' + input).to.equal(text)

      text = telegram.cleanMessageText('@' + hubot.alias.toLowerCase() + ' ' + input, 1)
      expect(hubot.name + ' ' + input).to.equal(text)
    })
  })

  describe('#applyExtraOptions()', function () {
    it('should automatically add the markdown option if the text contains markdown characters', function () {
      let message = { text: 'normal' }

      message = telegram.applyExtraOptions(message)
      expect(message.parse_mode).to.a('undefined')

      message = { text: 'markdown *message*' }
      message = telegram.applyExtraOptions(message)
      expect(message.parse_mode).to.equal('Markdown')

      message = { text: 'markdown _message_' }
      message = telegram.applyExtraOptions(message)
      expect(message.parse_mode).to.equal('Markdown')

      message = { text: 'markdown `message`' }
      message = telegram.applyExtraOptions(message)
      expect(message.parse_mode).to.equal('Markdown')

      message = { text: 'markdown [message](http://link.com)' }
      message = telegram.applyExtraOptions(message)
      expect(message.parse_mode).to.equal('Markdown')
    })

    it('should apply any extra options passed the message envelope', function () {
      let message = { text: 'test' }
      let extra = { extra: true, nested: { extra: true }, nullObject: null }
      message = telegram.applyExtraOptions(message, extra)

      expect(extra.extra).to.equal(message.extra)
      expect(extra.nested.extra).to.equal(message.nested.extra)
      expect(extra.nullObject).to.equal(message.nullObject)

      // Mock the API object
      telegram.api = {
        invoke: function (method, opts, cb) {
          expect(extra.extra).to.equal(opts.extra)
          expect(extra.nested.extra).to.equal(opts.nested.extra)
          cb.apply(this, [null, {}])
        }
      }

      telegram.send({ telegram: extra }, 'text')
    })
  })

  describe('#createUser()', function () {
    it('should use the new user object if the first_name or last_name changed', function () {
      telegram.robot.brain.data = { users: [] }

      let original = {
        id: 1234,
        first_name: 'Firstname',
        last_name: 'Surname',
        username: 'username'
      }

      telegram.robot.brain.userForId = function () {
        return original
      }

      let user = {
        id: 1234,
        first_name: 'Updated',
        last_name: 'Surname',
        username: 'username'
      }
      let result
      result = telegram.createUser(original, 1)
      expect(original.first_name).to.equal(result.first_name)

      result = telegram.createUser(user, 1)
      expect(user.first_name).to.equal(result.first_name)
    })

    it('should use the new user object if the username changed', function () {
      telegram.robot.brain.data = { users: [] }

      let original = {
        id: 1234,
        first_name: 'Firstname',
        last_name: 'Surname',
        username: 'old'
      }

      telegram.robot.brain.userForId = function () {
        return original
      }

      let user = {
        id: 1234,
        first_name: 'Firstname',
        last_name: 'Surname',
        username: 'username'
      }

      let result = telegram.createUser(user, 1)
      expect(user.username).to.equal(result.username)
    })
  })

  describe('#send()', function () {
    it('should not split messages below or equal to 4096 characters', function () {
      let called = 0

      let message = ''
      for (let i = 0; i < 4096; i++) message += 'a'

      // Mock the API object
      telegram.api = {
        invoke: function (method, opts, cb) {
          expect(opts.text.length).to.equal(4096)
          called++
          cb.apply(this, [null, {}])
        }
      }

      telegram.send({ room: 1 }, message)
      expect(called).to.equal(1)
    })

    it('should split messages when they are above 4096 characters', function () {
      let called = 0

      let message = ''
      for (let i = 0; i < 5000; i++) message += 'a'

      // Mock the API object
      telegram.api = {
        invoke: function (method, opts, cb) {
          let offset = called * 4096
          expect(opts.text.length).to.equal(message.substring(offset, offset + 4096).length)
          called++
          cb.apply(this, [null, {}])
        }
      }

      telegram.send({ room: 1 }, message)
      expect(called).to.equal(2)
    })

    it('should not split messages on new line characters', function () {
      let called = 0

      let message = ''
      for (let i = 0; i < 1000; i++) message += 'a'
      message += '\n'
      for (let i = 0; i < 1000; i++) message += 'b'
      message += '\n'
      for (let i = 0; i < 1000; i++) message += 'c'
      message += '\n'
      for (let i = 0; i < 1000; i++) message += 'd'
      message += '\n'
      for (let i = 0; i < 1000; i++) message += 'e'
      message += '\n'

      // Mock the API object
      telegram.api = {
        invoke: function (method, opts, cb) {
          let offset = called * 4096
          expect(opts.text.length).to.equal(message.substring(offset, offset + 4096).length)
          called++
          cb.apply(this, [null, {}])
        }
      }

      telegram.send({ room: 1 }, message)
      expect(called).to.equal(2)
    })
  })
})
