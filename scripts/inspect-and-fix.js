require("dotenv").config();
const { REST, Routes, Client, GatewayIntentBits } = require("discord.js");

const token = process.env.DISCORD_TOKEN;
const guildId = process.env.GUILD_ID;
const targetRulesChannelId = "1504374228919783495";

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(normalized + padding, "base64").toString("utf8");
}

function resolveClientId() {
  if (process.env.CLIENT_ID) return process.env.CLIENT_ID;
  return decodeBase64Url(token.split(".")[0]);
}

async function main() {
  const clientId = resolveClientId();
  const rest = new REST({ version: "10" }).setToken(token);

  console.log(`\n======================================================`);
  console.log(`  MEMERIKSA COMMANDS DI DISCORD API`);
  console.log(`======================================================`);

  // 1. Cek Global Commands
  const globalCmds = await rest.get(Routes.applicationCommands(clientId));
  console.log(`\n[Global Commands] Total: ${globalCmds.length}`);
  globalCmds.forEach((c) => console.log(`  - /${c.name} (ID: ${c.id})`));

  if (globalCmds.length > 0) {
    console.log("  🧹 Menghapus semua Global Commands...");
    await rest.put(Routes.applicationCommands(clientId), { body: [] });
    console.log("  ✅ Semua Global Commands dihapus.");
  }

  // 2. Cek Guild Commands
  const guildCmds = await rest.get(Routes.applicationGuildCommands(clientId, guildId));
  console.log(`\n[Guild Commands di Server ${guildId}] Total: ${guildCmds.length}`);
  guildCmds.forEach((c) => console.log(`  - /${c.name} (ID: ${c.id})`));

  // 3. Login bot untuk memeriksa Channel Rules 1504374228919783495 dan memposting rules
  const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
  await client.login(token);
  const guild = await client.guilds.fetch(guildId);

  console.log(`\n======================================================`);
  console.log(`  MEMERIKSA CHANNEL RULES: ${targetRulesChannelId}`);
  console.log(`======================================================`);

  try {
    const rulesChannel = await guild.channels.fetch(targetRulesChannelId);
    if (rulesChannel) {
      console.log(`  ✅ Channel ditemukan: #${rulesChannel.name} (Type: ${rulesChannel.type})`);
      
      const fs = require("fs");
      const path = require("path");
      const rulesFile = path.resolve(__dirname, "../channel_content/rules-and-tos.md");
      if (fs.existsSync(rulesFile)) {
        const content = fs.readFileSync(rulesFile, "utf-8").trim();
        
        // Bersihkan pesan lama
        const old = await rulesChannel.messages.fetch({ limit: 20 });
        if (old.size > 0) {
          await rulesChannel.bulkDelete(old, true).catch(() => {});
        }

        await rulesChannel.send({ content, allowedMentions: { parse: [] } });
        console.log(`  ✅ Konten rules-and-tos.md berhasil diposting ke #${rulesChannel.name} (${rulesChannel.id})!`);
      }
    } else {
      console.log(`  x Channel dengan ID ${targetRulesChannelId} tidak ditemukan.`);
    }
  } catch (err) {
    console.log(`  x Error fetch channel ${targetRulesChannelId}:`, err.message);
  }

  client.destroy();
}

main().catch(console.error);
