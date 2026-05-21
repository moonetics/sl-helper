require("dotenv").config();

const config = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID || null,
  enableMessageContentIntent: process.env.ENABLE_MESSAGE_CONTENT_INTENT === "true",
  activityName: "SL Members",
};

module.exports = { config };
