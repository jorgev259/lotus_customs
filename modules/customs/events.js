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

        var command = db.prepare('SELECT * FROM customs WHERE guild=? AND name=?').get(message.guild.id, param[0].toLowerCase())
        if (!command) return

        if (await util.permCheck(message, 'customs', command.name, client, db)) {
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
                .send(new Discord.MessageAttachment(command.content))
                .catch(function (error) {
                  util.log(
                    client,
                    param[0] + ' failed with ' + error + '\n ' + command.content
                  )
                  if (error === 'Error: 403 Forbidden') {
                    util.log(
                      client,
                      'removed ' + command.content + ' from ' + param[0].toLowerCase()
                    )
                    db.prepare(
                      'DELETE FROM embeds WHERE guild=? AND name=? and content=?'
                    ).run(message.guild.id, param[0].toLowerCase(), command.content)
                  }
                })
              break
          }
        }
      }
    }
  }
}
