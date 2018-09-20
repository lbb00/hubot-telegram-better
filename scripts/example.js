module.exports = robot => {
  robot.respond(/bot/i, res => {
    res.send('Is me')
  })

  robot.hear(/bot/i, res => {
    res.send('I am here')
  })

  /**
   * Push message
   */
  robot.router.post('/push', (req, res) => {
    // Adapter.push(message, config)
    //
    // message - string
    // config - [{ rule, type = 'all'|'group'|'friend', reg = true }={}]
    robot.adapter.push(`${new Date()} This is a push.`, {
      rule: name => {
        return name.match('bot')
      }
    }).then(msg => {
      res.send({ code: 0, err_msg: '' })
    }).catch(err => {
      res.send({ code: -1, err_msg: `Error: ${err}` })
    })
  })
}
