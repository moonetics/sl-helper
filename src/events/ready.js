const { Events, ActivityType } = require("discord.js");
const { config } = require("../config");

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`Bot online sebagai ${client.user.tag}`);
    client.user.setActivity(config.activityName, { type: ActivityType.Watching });
  },
};
