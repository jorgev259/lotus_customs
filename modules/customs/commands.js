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

    add: {
      desc: 'Adds a new custom command.',
      usage: 'add <type> <name> <link>',
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
      usage: 'remove <name>',
      desc: 'Deletes a custom command.',
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
