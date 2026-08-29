require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Client, GatewayIntentBits } = require("discord.js");
const ticketService = require("../src/services/ticketService");

const DB_PATH = path.resolve(__dirname, "../src/data/warranties.json");

async function main() {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  });

  await client.login(process.env.DISCORD_TOKEN);
  const guild = await client.guilds.fetch(process.env.GUILD_ID);

  console.log(`Connected to Guild: ${guild.name} (${guild.id})`);
  await guild.channels.fetch();

  const operationalKeywords = [
    "ACTIVE TICKETS",
    "ACTIVE PROJECTS",
    "ACTIVE WARRANTY",
    "COMPLETED PROJECTS",
    "CLOSED TICKETS",
  ];

  let deletedCount = 0;

  // 1. Delete all channels under operational categories
  for (const catKeyword of operationalKeywords) {
    const cat = guild.channels.cache.find(
      (c) => c.type === 4 && c.name.includes(catKeyword)
    );

    if (cat) {
      const children = guild.channels.cache.filter((c) => c.parentId === cat.id);
      console.log(`Category [${cat.name}] has ${children.size} child channels:`);
      for (const ch of children.values()) {
        try {
          console.log(`  - Deleting #${ch.name} (${ch.id})...`);
          await ch.delete("Clearing operational test channels");
          deletedCount++;
        } catch (err) {
          console.error(`  ! Gagal menghapus #${ch.name}:`, err.message);
        }
      }
    }
  }

  // 2. Delete any orphaned test ticket/project channels
  for (const ch of guild.channels.cache.values()) {
    if (ch.type === 0 && (ch.name.includes("sl-") || ch.name.includes("prj-") || ch.name.includes("project-"))) {
      try {
        console.log(`  - Deleting channel #${ch.name} (${ch.id})...`);
        await ch.delete("Clearing operational channel");
        deletedCount++;
      } catch (err) {
        // channel might have already been deleted
      }
    }
  }

  console.log(`\nTotal channels deleted: ${deletedCount}`);

  // 3. Reset warranties database
  fs.writeFileSync(DB_PATH, JSON.stringify([], null, 2), "utf-8");
  console.log("Database warranties.json reset to empty array [].");

  // 4. Redeploy fresh Ticket Panel in create-ticket channel
  await guild.channels.fetch();
  const ticketChannel = guild.channels.cache.find(
    (c) => c.name.includes("create-ticket") && c.isTextBased()
  );

  if (ticketChannel) {
    try {
      const msgs = await ticketChannel.messages.fetch({ limit: 50 });
      for (const msg of msgs.values()) {
        await msg.delete().catch(() => {});
      }

      const embed = ticketService.buildTicketPanelEmbed();
      const components = ticketService.buildTicketPanelComponents();
      await ticketChannel.send({ embeds: [embed], components });
      console.log(`Ticket panel refreshed in #${ticketChannel.name}.`);
    } catch (err) {
      console.error("Gagal refresh ticket panel:", err.message);
    }
  }

  console.log("\nCleanup completed successfully!");
  client.destroy();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
