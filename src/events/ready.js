const { Events, ActivityType } = require("discord.js");
const { config } = require("../config");
const warrantyService = require("../services/warrantyService");

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`Bot online sebagai ${client.user.tag}`);
    client.user.setActivity(config.activityName, { type: ActivityType.Watching });

    // 1. Cek masa garansi yang sudah expired saat bot startup
    try {
      await warrantyService.checkExpiredWarranties(client);
    } catch (err) {
      console.error("Error initial checkExpiredWarranties:", err.message);
    }

    // 2. Interval pengecekan berkala setiap 30 detik (30.000 ms) - optimal, hemat resource & responsif
    setInterval(async () => {
      try {
        await warrantyService.checkExpiredWarranties(client);
      } catch (err) {
        console.error("Error periodic checkExpiredWarranties:", err.message);
      }
    }, 30 * 1000);
  },
};

