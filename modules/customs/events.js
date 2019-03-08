var util = require('../../utilities.js')
const config = require('../../data/config.js')

module.exports = {
  events: {
    async message (client, db, moduleName, message) {
      if (!message.member) return
      var prefix = config.prefix

      if (message.content.startsWith(prefix) || message.content.startsWith('<@' + client.user.id + '>')) {
        var param = message.content.split(' ')

        if (message.content.startsWith(prefix)) {
          param[0] = param[0].split(prefix)[1]
        } else {
          param.splice(0, 1)
        }

        const commandName = param[0].toLowerCase()
        var command = db.prepare('SELECT * FROM customs WHERE guild=? AND name=?').get(message.guild.id, commandName)
        if (!command) return

        if (!client.commands.has(command.type)) return

        if (await util.permCheck(message, command.module, commandName, client, db)) {
          client.commands.get(command.type).execute(client, message, param, db, command.module)
        }
      }
    }
  }
}
