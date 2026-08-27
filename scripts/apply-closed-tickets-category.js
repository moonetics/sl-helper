require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  ChannelType,
  PermissionFlagsBits,
} = require("discord.js");

async function main() {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  console.log("Menghubungkan ke bot Discord...");
  await client.login(process.env.DISCORD_TOKEN);
  const guild = await client.guilds.fetch(process.env.GUILD_ID);

  console.log(`\n======================================================`);
  console.log(`  SINKRONISASI KATEGORI CLOSED TICKETS`);
  console.log(`  Server: ${guild.name} (${guild.id})`);
  console.log(`======================================================\n`);

  await guild.channels.fetch();
  await guild.roles.fetch();

  const botMember = guild.members.me || (await guild.members.fetchMe());
  const staffRoles = guild.roles.cache.filter((r) =>
    [
      "Founder",
      "Lead Project Developer",
      "Project Developer",
      "Head of Support",
      "Builder",
      "3D Modeler",
      "UI/UX Designer",
    ].some((k) => r.name.includes(k))
  );

  let closedCategory = guild.channels.cache.find(
    (c) => c.type === ChannelType.GuildCategory && c.name.includes("CLOSED TICKETS")
  );

  if (!closedCategory) {
    closedCategory = await guild.channels.create({
      name: "📁｜✦ CLOSED TICKETS ✦",
      type: ChannelType.GuildCategory,
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: botMember.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.ManageMessages,
          ],
        },
        ...staffRoles.map((r) => ({
          id: r.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.ManageMessages,
          ],
        })),
      ],
      reason: "Kategori arsip tiket yang ditutup",
    });
    console.log("  ✅ Kategori dibuat: 📁｜✦ CLOSED TICKETS ✦");
  } else {
    console.log("  - Kategori '📁｜✦ CLOSED TICKETS ✦' sudah ada.");
  }

  console.log(`\n======================================================`);
  console.log(`🎉 SINKRONISASI CLOSED TICKETS SELESAI!`);
  console.log(`======================================================\n`);

  client.destroy();
}

main().catch(console.error);
