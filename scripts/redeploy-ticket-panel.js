require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const ticketService = require("../src/services/ticketService");

async function main() {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  });

  await client.login(process.env.DISCORD_TOKEN);
  const guild = await client.guilds.fetch(process.env.GUILD_ID);

  await guild.channels.fetch();
  const ticketChannel = guild.channels.cache.find(
    (c) => c.name.includes("create-ticket") && c.isTextBased()
  );

  if (!ticketChannel) {
    console.error("Channel create-ticket tidak ditemukan di server!");
    client.destroy();
    return;
  }

  console.log("Menemukan channel ticket panel:", ticketChannel.name, `(${ticketChannel.id})`);

  // Bersihkan pesan lama di channel create-ticket
  try {
    const msgs = await ticketChannel.messages.fetch({ limit: 50 });
    console.log(`Menghapus ${msgs.size} pesan lama di #${ticketChannel.name}...`);
    for (const msg of msgs.values()) {
      await msg.delete().catch(() => {});
    }
  } catch (err) {
    console.error("Error saat menghapus pesan lama:", err.message);
  }

  // Kirim Ticket Panel Baru (Bersih, Tanpa Emoji)
  const embed = ticketService.buildTicketPanelEmbed();
  const components = ticketService.buildTicketPanelComponents();

  const sent = await ticketChannel.send({
    embeds: [embed],
    components,
  });

  console.log("Ticket panel berhasil dideploy ulang ke #" + ticketChannel.name);
  console.log("Embed Title:", sent.embeds[0]?.title);
  console.log("Jumlah Tombol:", sent.components[0]?.components?.length);
  console.log("Label Tombol:", sent.components[0]?.components?.map((b) => b.label));

  client.destroy();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
