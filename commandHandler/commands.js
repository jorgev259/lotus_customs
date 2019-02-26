const Discord = require('discord.js')
var util = require('../../utilities.js')

module.exports = {
  async reqs (client, db) {
    db.prepare(
      'CREATE TABLE IF NOT EXISTS customs (guild TEXT, name TEXT, type TEXT, command TEXT, PRIMARY KEY(`guild`,`name`))'
    ).run()
    db.prepare(
      'CREATE TABLE IF NOT EXISTS embeds (guild TEXT, name TEXT, content TEXT)'
    ).run()
  },

  commands: {
    custom: {
      desc: 'Displays all custom commands for this server',
      async execute (client, message, param, db) {
        let commands = db
          .prepare('SELECT name FROM customs WHERE guild=?')
          .all(message.guild.id)
        message.channel.send(
          `Available commands: ${commands.map(e => e.name).join(', ')}`
        )
      }
    },

    simple: {
      execute (client, message, param, db) {
        let command = db
          .prepare('SELECT command FROM customs WHERE guild=? AND name=?')
          .get(message.guild.id, param[0].toLowerCase())
        message.channel.send(command.command)
      }
    },

    webhook: {
      async execute (client, message, param, db) {
        let command = db
          .prepare('SELECT command FROM customs WHERE guild=? AND name=?')
          .get(message.guild.id, param[0].toLowerCase())
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
      }
    },

    embed: {
      execute (client, message, param, db) {
        let command = db
          .prepare(
            'SELECT content FROM embeds WHERE guild=? AND name=? ORDER BY RANDOM() LIMIT 1'
          )
          .get(message.guild.id, param[0].toLowerCase())

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
      }
    },

    add: {
      desc: 'Adds a new command to Akira. Usage: >add <type> <name> <link>',
      async execute (client, message, param, db) {
        var name = param[2].toLowerCase()
        var type = param[1].toLowerCase()
        param = param.slice(3)

        let command = db
          .prepare('SELECT type FROM customs WHERE guild=? AND name=?')
          .get(message.guild.id, param[0].toLowerCase())
        db.prepare('BEGIN TRANSACTION').run()
        if (command !== undefined && type === 'embed') {
          db.prepare(
            'INSERT INTO embeds (guild, name, content) VALUES (?,?,?)'
          ).run(message.guild.id, name, param.join(' '))
          message.reply('Command udpated')
        } else if (command === undefined) {
          let content
          if (type === 'embed') {
            content = ''
            db.prepare(
              'INSERT INTO embeds (guild, name, content) VALUES (?,?,?)'
            ).run(
              message.guild.id,
              name,
              param
                .join(' ')
                .split('\\n')
                .join('\n')
            )
          } else {
            content = param
              .join(' ')
              .split('\\n')
              .join('\n')
          }

          db.prepare(
            'INSERT INTO customs (guild, name, type, command) VALUES (?,?,?,?)'
          ).run(message.guild.id, name, type, content)
          message.reply('Command added')
        } else {
          return message.reply(
            'That command already exists, choose another name'
          )
        }
        db.prepare('COMMIT').run()
      }
    },

    remove: {
      desc: 'Deletes an embed command. Usage: >remove <name>',
      async execute (client, message, param, db) {
        var exCommand = db
          .prepare('SELECT command FROM customs WHERE guild=? AND name=?')
          .get(message.guild.id, param[1].toLowerCase())
        if (exCommand !== undefined) {
          db.prepare('BEGIN TRANSACTION').run()
          db.prepare('DELETE FROM customs WHERE guild=? AND name=?').run(
            message.guild.id,
            param[1].toLowerCase()
          )
          db.prepare('DELETE FROM embeds WHERE guild=? AND name=?').run(
            message.guild.id,
            param[1].toLowerCase()
          )
          db.prepare('COMMIT').run()
          message.reply('Command removed')
        } else {
          message.reply('Command doesnt exist')
        }
      }
    }
  }
}
