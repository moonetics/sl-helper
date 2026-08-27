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
  console.log(`  SINKRONISASI UPGRADE TIKET, LOGS, & WELCOME/FAREWELL`);
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

  // 1. Dapatkan / Buat Kategori SOREVI LABS INFO
  let infoCategory = guild.channels.cache.find(
    (c) => c.type === ChannelType.GuildCategory && c.name.includes("SOREVI LABS INFO")
  );

  // 2. Dapatkan / Buat Kategori STUDIO INTERNAL
  let internalCategory = guild.channels.cache.find(
    (c) => c.type === ChannelType.GuildCategory && c.name.includes("STUDIO INTERNAL")
  );

  // 3. Dapatkan / Buat Kategori ACTIVE TICKETS
  let activeTicketsCat = guild.channels.cache.find(
    (c) => c.type === ChannelType.GuildCategory && c.name.includes("ACTIVE TICKETS")
  );
  if (!activeTicketsCat) {
    activeTicketsCat = await guild.channels.create({
      name: "🎫｜✦ ACTIVE TICKETS ✦",
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
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.EmbedLinks,
          ],
        })),
      ],
      reason: "Kategori khusus room tiket aktif",
    });
    console.log("  ✅ Kategori dibuat: 🎫｜✦ ACTIVE TICKETS ✦");
  } else {
    console.log("  - Kategori '🎫｜✦ ACTIVE TICKETS ✦' sudah ada.");
  }

  // 4. Buat / Periksa channel # 👋・welcome
  let welcomeChannel = guild.channels.cache.find((c) => c.name.includes("welcome"));
  if (!welcomeChannel) {
    welcomeChannel = await guild.channels.create({
      name: "👋・welcome",
      type: ChannelType.GuildText,
      parent: infoCategory?.id,
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
          deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.CreatePublicThreads],
        },
      ],
      reason: "Channel Welcome publik",
    });
    console.log("  ✅ Channel dibuat: #👋・welcome (Publik Read-Only)");
  } else {
    console.log("  - Channel '#👋・welcome' sudah ada.");
  }

  // 5. Buat / Periksa channel # 🚪・farewell (Hidden from everyone, Admin/Staff only)
  let farewellChannel = guild.channels.cache.find((c) => c.name.includes("farewell"));
  if (!farewellChannel) {
    farewellChannel = await guild.channels.create({
      name: "🚪・farewell",
      type: ChannelType.GuildText,
      parent: infoCategory?.id,
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
            PermissionFlagsBits.ReadMessageHistory,
          ],
        },
        ...staffRoles.map((r) => ({
          id: r.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.ReadMessageHistory,
          ],
        })),
      ],
      reason: "Channel Farewell staff only",
    });
    console.log("  ✅ Channel dibuat: #🚪・farewell (Staff/Admin Only)");
  } else {
    console.log("  - Channel '#🚪・farewell' sudah ada.");
  }

  // 6. Buat / Periksa channel # 📊・bot-logs di STUDIO INTERNAL
  let botLogsChannel = guild.channels.cache.find((c) => c.name.includes("bot-logs"));
  if (!botLogsChannel) {
    botLogsChannel = await guild.channels.create({
      name: "📊・bot-logs",
      type: ChannelType.GuildText,
      parent: internalCategory?.id,
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
            PermissionFlagsBits.ReadMessageHistory,
          ],
        },
        ...staffRoles.map((r) => ({
          id: r.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.ReadMessageHistory,
          ],
        })),
      ],
      reason: "Channel audit bot-logs",
    });
    console.log("  ✅ Channel dibuat: #📊・bot-logs (Staff/Admin Only)");
  } else {
    console.log("  - Channel '#📊・bot-logs' sudah ada.");
  }

  console.log(`\n======================================================`);
  console.log(`🎉 SINKRONISASI UPGRADE SERVER SELESAI!`);
  console.log(`======================================================\n`);

  client.destroy();
}

main().catch(console.error);
