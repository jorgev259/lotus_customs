module.exports = {
  async reqs (client, db) {
    db.prepare(
      'CREATE TABLE IF NOT EXISTS customs (guild TEXT, name TEXT, type TEXT, command TEXT)'
    ).run()
  },

  commands: {
    custom: {
      desc: 'Displays all custom commands for this server',
      async execute (client, message, param, db) {
        let commands = db
          .prepare('SELECT name FROM customs WHERE guild=? GROUP BY name')
          .all(message.guild.id)
        message.channel.send(
          `Available commands: ${commands.map(e => e.name).join(', ')}`
        )
      }
    },

    add: {
      desc: 'Adds a new custom command.',
      usage: 'add [simple/webhook/embed] <name> <link>',
      async execute (client, message, param, db) {
        var name = param[2].toLowerCase()
        var type = param[1].toLowerCase()

        if (!['simple', 'webhook', 'embed'].includes(type)) return message.channel.send('Invalid type')
        param = param.slice(3)

        let command = db
          .prepare('SELECT type FROM customs WHERE guild=? AND name=? LIMIT 1')
          .all(message.guild.id, name)

        db.prepare(
          'INSERT INTO customs (guild, name, type, command) VALUES (?,?,?,?)'
        ).run(message.guild.id, name, type,
          param
            .join(' ')
            .split('\\n')
            .join('\n'))
        if (command.length === 0) message.reply('Command added')
        else message.reply('Command updated')
      }
    },

    remove: {
      usage: 'remove [simple/webhook/embed] <name> <content>',
      desc: 'Deletes a custom command.',
      async execute (client, message, param, db) {
        var name = param[2].toLowerCase()
        var type = param[1].toLowerCase()

        if (!['simple', 'webhook', 'embed'].includes(type)) return message.channel.send('Invalid type')
        param = param.slice(3)

        let command = param
          .join(' ')
          .split('\\n')
          .join('\n')

        var exCommand = db
          .prepare('SELECT command FROM customs WHERE guild=? AND name=? AND type=? AND command=?')
          .all(message.guild.id, name, type, command)
        if (exCommand.length > 0) {
          db.prepare('DELETE FROM customs WHERE guild=? AND name=? AND type=? AND command=?').run(message.guild.id, name, type, command)

          message.reply('Command removed')
        } else {
          message.reply('Command not found')
        }
      }
    }
  }
}
