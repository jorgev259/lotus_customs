var util = require('../../utilities.js')
const Discord = require('discord.js')

module.exports = {
  config: {
    default: true
  },
  events: {
    async message (client, db, moduleName, message) {
      if (!message.member) return
      var prefix = db.prepare('SELECT value FROM config WHERE guild=? AND type=?').get(message.guild.id, 'prefix').value

      if (message.content.startsWith(prefix) || message.content.startsWith('<@' + client.user.id + '>')) {
        var param = message.content.split(' ')

        if (message.content.startsWith(prefix)) {
          param[0] = param[0].split(prefix)[1]
        } else {
          param.splice(0, 1)
        }

        if (!param[0]) return
        var command = db.prepare('SELECT * FROM customs WHERE guild=? AND name=?').all(message.guild.id, param[0].toLowerCase())

        if (command.length > 0) command = command[Math.floor(Math.random() * command.length)]
        else return

        if (await util.permCheck(message, false, command.name, client, db)) {
          switch (command.type) {
            case 'simple':
              message.channel.send(command.command)
              break

            case 'webhook':
              let hooks = (await message.channel.fetchWebhooks()).filter(
                h => h.name === 'simple'
              )

              let hook
              if (hooks.size === 0) {
                hook = await message.channel.createWebhook('simple', {
                  avatar: message.author.displayAvatarURL()
                })
              } else {
                hook = hooks.first()
                await hook.edit({ avatar: message.author.displayAvatarURL() })
              }
              message.delete()
              hook
                .sendSlackMessage({
                  username: message.member.displayName,
                text: eval('`' + command.command + '`'), // eslint-disable-line
                })
                .catch(console.error)
              break

            case 'embed':
              message.channel
                .send(new Discord.MessageAttachment(command.command))
                .catch(function (error) {
                  util.log(
                    client,
                    param[0] + ' failed with ' + error + '\n ' + command.command
                  )
                  if (error === 'Error: 403 Forbidden') {
                    util.log(
                      client,
                      'removed ' + command.command + ' from ' + param[0].toLowerCase()
                    )
                    db.prepare(
                      'DELETE FROM customs WHERE WHERE guild=? AND name=?'
                    ).run(message.guild.id, param[0].toLowerCase())
                  }
                })
              break
          }
        }
      }
    }
  }
}
