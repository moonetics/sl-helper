require("dotenv").config();

const { Client, GatewayIntentBits } = require("discord.js");
const { backupGuild } = require("../src/services/backupService");

const token = process.env.DISCORD_TOKEN;
const guildId = process.env.GUILD_ID;
const enableMessageContentIntent = process.env.ENABLE_MESSAGE_CONTENT_INTENT === "true";

if (!token || !guildId) {
  console.error("DISCORD_TOKEN dan GUILD_ID wajib ada di .env");
  process.exit(1);
}

async function runBackup() {
  const intents = [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ];

  if (enableMessageContentIntent) {
    intents.push(GatewayIntentBits.MessageContent);
  }

  const client = new Client({ intents });

  console.log("Menghubungkan ke Discord bot...");
  await client.login(token);

  console.log(`Mengambil data guild ID: ${guildId}...`);
  const guild = await client.guilds.fetch(guildId);

  console.log(`Memulai proses backup seluruh channel pada server "${guild.name}"...`);
  console.log("Proses ini akan mengekspor seluruh channel ke format HTML, aset, dan file ZIP di folder backups/...\n");

  const manifest = await backupGuild(guild, {
    requestedById: client.user.id,
    messageContentIntentEnabled: enableMessageContentIntent,
  });

  console.log("\n==========================================");
  console.log("        BACKUP SERVER SELESAI SUKSES      ");
  console.log("==========================================");
  console.log(`Folder Output : ${manifest.output.directory}`);
  console.log(`File ZIP      : ${manifest.output.zip}`);
  console.log(`Index HTML    : ${manifest.output.index}`);
  console.log(`Channel OK    : ${manifest.totals.channelsOk} / ${manifest.totals.channelsFound}`);
  console.log(`Channel Skip  : ${manifest.totals.channelsSkipped}`);
  console.log(`Total Pesan   : ${manifest.totals.messages}`);
  console.log(`Attachments   : ${manifest.totals.attachmentsDownloaded} didownload (${manifest.totals.attachmentsFailed} gagal)`);
  console.log("==========================================\n");

  client.destroy();
}

runBackup().catch((err) => {
  console.error("Gagal melakukan backup:", err);
  process.exit(1);
});
