module.exports = {
  async reqs (client, db) {
    db.prepare(
      'CREATE TABLE IF NOT EXISTS customs (guild TEXT, name TEXT, type TEXT, command TEXT, PRIMARY KEY(`guild`,`name`))'
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

    add: {
      desc: 'Adds a new custom command.',
      usage: 'add [simple/webhook/embed] <name> <link>',
      async execute (client, message, param, db) {
        var name = param[2].toLowerCase()
        var type = param[1].toLowerCase()

        if (!['simple', 'webhook', 'embed'].includes(type)) return message.channel.send('Invalid type')
        param = param.slice(3)

        let command = db
          .prepare('SELECT type FROM customs WHERE guild=? AND name=?')
          .get(message.guild.id, param[0].toLowerCase())

        if (command !== undefined) {
          db.prepare(
            'INSERT INTO customs (guild, name, type, command) VALUES (?,?,?,?)'
          ).run(message.guild.id, name, type,
            param
              .join(' ')
              .split('\\n')
              .join('\n'))
          message.reply('Command added')
        } else {
          return message.reply(
            'That command already exists, choose another name'
          )
        }
      }
    },

    remove: {
      usage: 'remove <name>',
      desc: 'Deletes a custom command.',
      async execute (client, message, param, db) {
        var exCommand = db
          .prepare('SELECT command FROM customs WHERE guild=? AND name=?')
          .get(message.guild.id, param[1].toLowerCase())
        if (exCommand !== undefined) {
          db.prepare('DELETE FROM customs WHERE guild=? AND name=?').run(
            message.guild.id,
            param[1].toLowerCase()
          )

          message.reply('Command removed')
        } else {
          message.reply('Command doesnt exist')
        }
      }
    }
  }
}
