// Description:
// This script uses custom Telegram functionality to deliver a photo
// to a user using the Telegram sendPhoto call

const fs = require('fs')
const path = require('path')

module.exports = function (robot) {
  robot.hear(/send photo/i, function (res) {
    robot.emit('telegram:invoke', 'sendPhoto', {
      chat_id: res.message.room,
      photo: fs.createReadStream(path.resolve(__dirname, '/image.png'))
    }, function (error, response) {
      console.log(error)
      console.log(response)
    })
  })
}
