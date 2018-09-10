# hubot-telegram-better

[![Build Status](https://travis-ci.org/loveonelong/hubot-telegram-butter.svg?branch=master)](https://travis-ci.org/loveonelong/hubot-telegram-better)

A better [hubot](https://hubot.github.com/docs/) adapter for interfacting with the [Telegram Bot API](https://core.telegram.org/bots/api)

## Installation & Usage

First of reading the docs on how to create a new [Telegram Bot](https://core.telegram.org/bots#botfather). Once you have a bot created, follow these steps:

* `npm install --save hubot-telegram-better`
* Set the environment variables specified in **Configuration**
* Run hubot `bin/hubot -a telegram`

## Configuration

This adapter uses the following environment variables:

**TELEGRAM_TOKEN** (required)

The token that the [BotFather](https://core.telegram.org/bots#botfather) gives you

**TELEGRAM_WEBHOOK** (optional)

You can specify a [webhook](https://core.telegram.org/bots/api#setwebhook) URL. The adapter will register TELEGRAM_WEBHOOK/TELEGRAM_TOKEN with Telegram and listen there.

**TELEGRAM_INTERVAL** (optional)

You can specify the interval (in milliseconds) in which the adapter will poll Telegram for updates. This option only applies if you are not using a [webhook](https://core.telegram.org/bots/api#setwebhook).

## Telegram Specific Functionality (ie. Stickers, Images)

If you want to create a script that relies on specific Telegram functionality that is not available to Hubot normally, you can do so by emitting the `telegram:invoke` event in your script:

``` javascript

module.exports = function (robot) {

    robot.hear(/send sticker/i, function (res) {

        # https://core.telegram.org/bots/api#sendsticker

        robot.emit('telegram:invoke', 'sendSticker', { chat_id: xxx, sticker: 'sticker_id' }, function (error, response) {
            console.log(error)
            console.log(response)
        });
    });
};

```

**Note:** An example script of how to use this is located in the `scripts/` folder

If you want to supplement your message delivery with extra features such as **markdown** syntax or **keyboard** replies, you can specify these settings on the `res.envelope` variable in your plugin.

```javascript

robot.respond(/(.*)/i, function (res) {
    res.envelope.telegram = { reply_markup: { keyboard: [["test"]] }}

    res.reply("Select the option from the keyboard specified.")
}

```

**Note:** Markdown will automatically be parsed if the supported markdown characters are included. You can override this by specifying the `parse_mode` value in the `envelope.telegram` key.

## Development

First, you need clone this repo to your local.

**install package**

```bash
npm install
```

**link**

```bash
npm run link
```

**run**

```bash
npm start
```

or

```bash
bin/hubot
```

## Test

```bash
npm run test
```