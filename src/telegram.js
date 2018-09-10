const { Adapter, TextMessage, EnterMessage, LeaveMessage, TopicMessage, CatchAllMessage } = require('hubot/es2015')

const Telegrambot = require('telegrambot')

class TelegrambotAdapter extends Adapter {
  constructor () {
    super(...arguments)
    this.token = process.env['TELEGRAM_TOKEN'] || ''
    this.webhook = process.env['TELEGRAM_WEBHOOK'] || ''
    this.interval = +process.env['TELEGRAM_INTERVAL'] || 500
    this.offset = 0
    this.api = new Telegrambot(this.token)
    this.robot.logger.info(`Telegram Adapter Bot ${this.token} Loaded...`)

    // Get the bot information
    this.api.invoke('getMe', {}, (err, result) => {
      if (err) {
        this.emit('error', err)
      } else {
        this.bot_id = result.id
        this.bot_username = result.username
        this.bot_firstname = result.first_name
        this.robot.logger.info(`Telegram Bot Identified: ${this.bot_firstname}`)

        if (this.bot_username !== this.robot.name) {
          this.robot.logger.warning(`It is advised to use the same bot name as your Telegram Bot: ${this.bot_username}`)
          this.robot.logger.warning('Having a different bot name can result in an inconsistent experience when using @mentions')
        }
      }
    })
  }

  run () {
    if (!this.token) {
      this.emit('error', new Error('The environment variable "TELEGRAM_TOKEN" is required.'))
    }

    // Listen for Telegram API invokes from other scripts
    this.robot.on('telegram:invoke', (method, opts, cb) => this.api.invoke(method, opts, cb))

    if (this.webhook) {
      const endpoint = this.webhook + '/' + this.token
      this.robot.logger.debug(`Listening on ${endpoint}`)

      this.api.invoke('setWebHook', { url: endpoint }, (err, result) => {
        if (err) {
          this.emit('error', err)
        }
      })

      this.robot.router.post(`/${this.token}`, (req, res) => {
        if (req.body.message) {
          this.handleUpdate(req.body)
        }

        res.send('OK')
      })
    } else {
      // Clear Webhook
      this.api.invoke('setWebHook', { url: '' }, (err, result) => {
        if (err) {
          this.emit('error', err)
        }
      })
      this.getUpdate()
    }

    this.emit('connected')
    this.robot.logger.info('Telegram Adapter Started...')
  }

  /**
   * Clean up the message text to remove duplicate mentions of the
   * bot name and to strip Telegram specific characters such as the usage
   * of / when addressing a bot in privacy mode
   *
   * @param string text
   * @param int    chat_id
   *
   * @return string
   */
  cleanMessageText (text, chat_id) {
    // If it is a private chat, automatically prepend the bot name if it does not exist already.
    if (chat_id > 0) {
      // Strip out the stuff we don't need.
      text = text.replace(/^\//g, '').trim()

      text = text.replace(new RegExp(`^@?${this.robot.name.toLowerCase()}`, 'gi'), '')
      if (this.robot.alias) { text = text.replace(new RegExp(`^@?${this.robot.alias.toLowerCase()}`, 'gi'), '') }
      text = this.robot.name + ' ' + text.trim()
    } else {
      text = text.trim()
    }
    return text
  }

  /**
   * Add extra options to the message packet before deliver. The extra options
   * will be pulled from the message envelope
   *
   * @param object message
   * @param object extra
   *
   * @return object
   */
  applyExtraOptions (message, extra) {
    const { text } = message
    const autoMarkdown = /\*.+\*/.test(text) || /_.+_/.test(text) || /\[.+\]\(.+\)/.test(text) || /`.+`/.test(text)

    if (autoMarkdown) {
      message.parse_mode = 'Markdown'
    }

    if (extra != null) {
      for (let key in extra) {
        const value = extra[key]
        message[key] = value
      }
    }

    return message
  }

  /**
   * Get the last offset + 1, this will allow
   * the Telegram API to only return new relevant messages
   *
   * @return int
   */
  getLastOffset () {
    return parseInt(this.offset) + 1
  }

  /**
   * Create a new user in relation with a chat_id
   *
   * @param object user
   * @param object chat
   *
   * @return object
   */
  createUser (user, chat) {
    const opts = user
    opts.name = opts.username
    opts.room = chat.id
    opts.telegram_chat = chat

    const result = this.robot.brain.userForId(user.id, opts)
    const current = result.first_name + result.last_name + result.username
    const update = user.first_name + user.last_name + user.username

    // Check for any changes, if the first or lastname updated...we will
    // user the new user object instead of the one from the brain
    if (current !== update) {
      this.robot.brain.data.users[user.id] = user
      this.robot.logger.info(`User ${user.id} regenerated. Persisting new user object.`)
      return user
    }

    return result
  }

  /**
   * Abstract send interaction with the Telegram API
   */
  apiSend (opts, cb) {
    const chunks = opts.text.match(/[^]{1,4096}/g)

    this.robot.logger.debug(`Message length: ${opts.text.length}`)
    this.robot.logger.debug(`Message parts: ${chunks.length}`)

    // Chunk message delivery when required
    var send = cb => {
      if (chunks.length !== 0) {
        const current = chunks.shift()
        opts.text = current
        this.api.invoke('sendMessage', opts, (err, message) => {
          // Forward the callback to the original handler
          cb.apply(this, [err, message])
          send(cb)
        })
      }
    }

    // Start the recursive chunking cycle
    send(cb)
  }

  /**
   * Send a message to a specific room via the Telegram API
   */
  send (envelope, ...strings) {
    const text = strings.join()
    const data = this.applyExtraOptions({ chat_id: envelope.room, text }, envelope.telegram)
    this.apiSend(data, (err, message) => {
      if (err) {
        this.emit('error', err)
      } else {
        this.robot.logger.info(`Sending message to room: ${envelope.room}`)
      }
    })
  }

  /**
   * The only difference between send() and reply() is that we add the "reply_to_message_id" parameter when
   * calling the API
   */
  reply (envelope, ...strings) {
    const self = this
    const text = strings.join()
    const data = this.applyExtraOptions({
      chat_id: envelope.room,
      text,
      reply_to_message_id: envelope.message.id
    }, envelope.telegram)

    this.apiSend(data, (err, message) => {
      if (err) {
        self.emit('error', err)
      } else {
        self.robot.logger.info(`Reply message to room/message: ${envelope.room}/${envelope.message.id}`)
      }
    })
  }

  /**
   * "Private" method to handle a new update received via a webhook
   * or poll update.
   */
  handleUpdate (update) {
    let text, user
    this.robot.logger.debug(update)

    const message = update.message || update.edited_message || update.callback_query
    this.robot.logger.info(`Receiving message_id: ${message.message_id}`)
    if (this.robot.brain.get(`handled${message.message_id}`) === true) {
      this.robot.logger.warning(`Message ${message.message_id} already handled.`)
      return
    }
    this.robot.brain.set(`handled${message.message_id}`, true)

    // Text event
    if (message.text) {
      text = this.cleanMessageText(message.text, message.chat.id)

      this.robot.logger.debug(`Received message: ${message.from.username} said '${text}'`)

      user = this.createUser(message.from, message.chat)
      this.receive(new TextMessage(user, text, message.message_id))
      // Callback query
    } else if (message.data) {
      text = this.cleanMessageText(message.data, message.message.chat.id)

      this.robot.logger.debug(`Received callback query: ${message.from.username} said '${text}'`)

      user = this.createUser(message.from, message.message.chat)

      this.api.invoke('answerCallbackQuery', { callback_query_id: message.id }, function (err, result) {
        if (err) {
          this.emit('error', err)
        }
      })

      this.receive(new TextMessage(user, text, message.message.message_id))

      // Join event
    } else if (message.new_chat_member) {
      user = this.createUser(message.new_chat_member, message.chat)
      this.robot.logger.info(`User ${user.id} joined chat ${message.chat.id}`)
      this.receive(new EnterMessage(user, null, message.message_id))

      // Exit event
    } else if (message.left_chat_member) {
      user = this.createUser(message.left_chat_member, message.chat)
      this.robot.logger.info(`User ${user.id} left chat ${message.chat.id}`)
      this.receive(new LeaveMessage(user, null, message.message_id))

      // Chat topic event
    } else if (message.new_chat_title) {
      user = this.createUser(message.from, message.chat)
      this.robot.logger.info(`User ${user.id} changed chat ${message.chat.id} title: ${message.new_chat_title}`)
      this.receive(new TopicMessage(user, message.new_chat_title, message.message_id))
    } else {
      message.user = this.createUser(message.from, message.chat)
      this.receive(new CatchAllMessage(message))
    }
  }
  getUpdate () {
    setTimeout(() =>
      this.api.invoke('getUpdates', { offset: this.getLastOffset(), limit: 10 }, (err, result) => {
        if (err) {
          this.emit('error', err)
        } else {
          if (result.length) { this.offset = result[result.length - 1].update_id }
          Array.from(result).map(msg => this.handleUpdate(msg))
        }
        this.getUpdate()
      })
    , this.interval)
  }
}

exports.use = robot => new TelegrambotAdapter(robot)
