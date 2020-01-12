const { inspect } = require("util");
const format = require("../modules/format.js");
const moment = require("moment");
const guildquests = require("../guildquests");

const actions = {
  add: {name: "add", desc: "Add a guild quest to the list."},
  channel: {name: "channel", desc: "Select a channel to post the mission list in."}
};

exports.conf = {
  name: "gq",
  enabled: true,
  guildOnly: true,
  aliases: ["guildquest"],
  permLevel: "User"
};

exports.help = {
  category: "Quests",
  description: "Manage your guild quests",
  usage: `${exports.conf.name} [${Object.values(actions).map((v, _) => v.name).join("|")}] ...`,
};

exports.run = async (client, message, [action, ...value], level) => { // eslint-disable-line no-unused-vars
  const settings = client.getSettings(message.guild);

  // Adding a new key adds it to every guild (it will be visible to all of them)
  async function add() {
    if (value.length < 2) return message.reply("Please specify the name and server of the mission.");
    const [server, name] = value;

    const serverOptions = guildquests.getServers(server);
    const questOptions = guildquests.getMissions(name);

    if (serverOptions.length > 1){
      return message.reply(`Unclear server name ${server}.`);
    } else if (serverOptions.length == 0){
      return message.reply(`Unknown server ${server}.`);
    }
    
    var r;
    if (questOptions.length > 1){
      let msg = `Multiple options found:\n`;
      questOptions.forEach((v, idx) => msg += `<${idx + 1}> ${v}\n`);
      msg += `Select one by typing the number in the chat.`
      const response = await client.awaitReply(message, msg, {code: "asciidoc"});
      const idx = parseInt(response);
      if (idx > 0 && idx <= questOptions.length){
        r = questOptions[idx-1];
      }else{
        return message.reply("Invalid value.");
      }
    }else if (questOptions.length == 1){
      r = questOptions[0];
    }else{
      return message.reply(`No quest found for ${name}.`);
    }

    const quest = {
      server: serverOptions[0],
      desc: r[0],
      end: moment().add(r[1], 'minutes')
    };
    const gqs = client.gq.lists.get(message.guild) || [];
    gqs.push(quest);
    client.gq.lists.set(message.guild, gqs);
    
    message.reply(`Add guild mission ${quest.desc} on server ${quest.server}.`);
  };

  async function channel() {
    const update = value[0];
    const r = new RegExp(/<#(\d+)>/);
    if (update){
      const resolved = r.exec(update)[1];
      const ch = message.guild.channels.find(c => c.id == resolved && c.type == `text`);
      if (ch){
        settings.quests.channel = ch.id;
        client.settings.set(message.guild.id, settings);
        return message.reply(`Set channel for quest messages to <#${settings.quests.channel}>.`)
      }
    }else{
      return message.reply(`Channel for quest messages is: <#${settings.quests.channel}>.`);
    }
  }

  if (!action){
    return message.reply(format.formatUsage(actions));
  }

  switch(action){
    case actions.add.name: add(); break;
    case actions.channel.name: channel(); break;
    default:
      return message.reply(`Unknown action ${action}. Usage:\n${format.formatUsage(actions)}`);
  }
};

