require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  ChannelType,
  PermissionFlagsBits,
} = require("discord.js");

const token = process.env.DISCORD_TOKEN;
const guildId = process.env.GUILD_ID;

if (!token || !guildId) {
  console.error("DISCORD_TOKEN dan GUILD_ID wajib diisi di file .env");
  process.exit(1);
}

async function main() {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  console.log("Menghubungkan ke bot Discord...");
  await client.login(token);
  const guild = await client.guilds.fetch(guildId);

  console.log(`\n======================================================`);
  console.log(`  SINKRONISASI KATEGORI PROJECT & GARANSI DISCORD`);
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
      "QA",
    ].some((k) => r.name.toLowerCase().includes(k.toLowerCase()))
  );

  const privateCatOverwrites = [
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
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
      ],
    },
    ...staffRoles.map((r) => ({
      id: r.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
      ],
    })),
  ];

  const targetCategories = [
    { name: "🎫｜✦ ACTIVE TICKETS ✦", reason: "Kategori Tiket Aktif" },
    { name: "🛡️｜✦ ACTIVE WARRANTY ✦", reason: "Kategori Tiket Masa Garansi 7 Hari" },
    { name: "📁｜✦ CLOSED TICKETS ✦", reason: "Kategori Arsip Tiket Ditutup" },
    { name: "🏗️｜✦ ACTIVE PROJECTS ✦", reason: "Kategori Workspace Project Internal Aktif" },
    { name: "📁｜✦ COMPLETED PROJECTS ✦", reason: "Kategori Arsip Project Selesai" },
  ];

  for (const cat of targetCategories) {
    let found = guild.channels.cache.find(
      (c) => c.type === ChannelType.GuildCategory && c.name.toLowerCase().includes(cat.name.replace(/[^a-zA-Z]/g, "").toLowerCase())
    );

    if (!found) {
      found = await guild.channels.create({
        name: cat.name,
        type: ChannelType.GuildCategory,
        permissionOverwrites: privateCatOverwrites,
        reason: cat.reason,
      });
      console.log(`  + Dibuat Kategori: ${cat.name}`);
    } else {
      console.log(`  ✓ Kategori Sudah Ada: ${found.name}`);
    }
  }

  console.log(`\n======================================================`);
  console.log(`🎉 SINKRONISASI KATEGORI PROJECT SELESAI!`);
  console.log(`======================================================\n`);

  client.destroy();
}

main().catch((err) => {
  console.error("Fatal Error:", err);
  process.exit(1);
});
