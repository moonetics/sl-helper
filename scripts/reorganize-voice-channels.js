require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  ChannelType,
  PermissionFlagsBits,
} = require("discord.js");

async function main() {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  console.log("Menghubungkan ke bot Discord...");
  await client.login(process.env.DISCORD_TOKEN);
  const guild = await client.guilds.fetch(process.env.GUILD_ID);

  console.log(`\n======================================================`);
  console.log(`  PEMISAHAN KATEGORI VOICE CHANNEL`);
  console.log(`  Server: ${guild.name} (${guild.id})`);
  console.log(`======================================================\n`);

  await guild.channels.fetch();
  await guild.roles.fetch();

  // Ambil role-role penting untuk permissions
  const roleClient = guild.roles.cache.find((r) => r.name.includes("Verified Client"));
  const allStaffRoles = guild.roles.cache.filter((r) =>
    [
      "Founder",
      "Lead Project Developer",
      "Project Developer",
      "Builder",
      "3D Modeler",
      "UI/UX Designer",
      "Head of Support",
    ].some((k) => r.name.includes(k))
  );

  // 1. Buat / Ambil Kategori COMMUNITY VOICE
  let commCategory = guild.channels.cache.find(
    (ch) => ch.type === ChannelType.GuildCategory && ch.name.includes("COMMUNITY VOICE")
  );
  if (!commCategory) {
    commCategory = await guild.channels.create({
      name: "🔊｜✦ COMMUNITY VOICE ✦",
      type: ChannelType.GuildCategory,
      reason: "Pemisahan Community Voice",
    });
    console.log("  ✅ Kategori Dibuat: 🔊｜✦ COMMUNITY VOICE ✦");
  }

  // 2. Buat / Ambil Kategori PROJECT & WORKSPACE VC
  let workspaceCategory = guild.channels.cache.find(
    (ch) => ch.type === ChannelType.GuildCategory && ch.name.includes("PROJECT & WORKSPACE")
  );
  if (!workspaceCategory) {
    workspaceCategory = await guild.channels.create({
      name: "💼｜✦ PROJECT & WORKSPACE VC ✦",
      type: ChannelType.GuildCategory,
      reason: "Pemisahan Project Workspace Voice",
    });
    console.log("  ✅ Kategori Dibuat: 💼｜✦ PROJECT & WORKSPACE VC ✦");
  }

  // Daftar channel per kategori
  const communityVCs = ["☕・Lounge VC", "🎮・Mabar Game 1", "🎮・Mabar Game 2"];
  const workspaceVCs = [
    { name: "🛠️・Dev Co-Working", type: "standard" },
    { name: "🔒・Meeting Room", type: "meeting" },
    { name: "🎧・Dev Sprint VC", type: "staff" },
  ];

  // Atur channel Community VC
  console.log("\n1. Mengatur channel di COMMUNITY VOICE...");
  for (const name of communityVCs) {
    let ch = guild.channels.cache.find((c) => c.isVoiceBased() && c.name === name);
    if (ch) {
      await ch.setParent(commCategory.id);
      console.log(`  + Dipindahkan ke Community Voice: ${ch.name}`);
    } else {
      ch = await guild.channels.create({
        name,
        type: ChannelType.GuildVoice,
        parent: commCategory.id,
      });
      console.log(`  + Dibuat baru di Community Voice: ${name}`);
    }
  }

  // Atur channel Project Workspace VC
  console.log("\n2. Mengatur channel di PROJECT & WORKSPACE VC...");
  for (const spec of workspaceVCs) {
    let ch = guild.channels.cache.find((c) => c.isVoiceBased() && c.name === spec.name);
    const overwrites = [];

    if (spec.type === "meeting") {
      overwrites.push(
        {
          id: guild.roles.everyone.id,
          deny: [PermissionFlagsBits.Connect],
        },
        ...(roleClient
          ? [
              {
                id: roleClient.id,
                allow: [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.Connect,
                  PermissionFlagsBits.Speak,
                ],
              },
            ]
          : []),
        ...allStaffRoles.map((r) => ({
          id: r.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.Connect,
            PermissionFlagsBits.Speak,
            PermissionFlagsBits.MuteMembers,
          ],
        }))
      );
    } else if (spec.type === "staff") {
      overwrites.push(
        {
          id: guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
        },
        ...allStaffRoles.map((r) => ({
          id: r.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.Connect,
            PermissionFlagsBits.Speak,
          ],
        }))
      );
    }

    if (ch) {
      await ch.setParent(workspaceCategory.id);
      if (overwrites.length > 0) {
        await ch.permissionOverwrites.set(overwrites);
      }
      console.log(`  + Dipindahkan ke Project Workspace: ${ch.name}`);
    } else {
      ch = await guild.channels.create({
        name: spec.name,
        type: ChannelType.GuildVoice,
        parent: workspaceCategory.id,
        permissionOverwrites: overwrites.length > 0 ? overwrites : undefined,
      });
      console.log(`  + Dibuat baru di Project Workspace: ${spec.name}`);
    }
  }

  // Hapus kategori lama jika kosong
  const oldCategory = guild.channels.cache.find(
    (ch) =>
      ch.type === ChannelType.GuildCategory &&
      ch.name === "🔊｜✦ VOICE CHANNELS ✦"
  );
  if (oldCategory) {
    const remainingChildren = guild.channels.cache.filter((c) => c.parentId === oldCategory.id);
    if (remainingChildren.size === 0) {
      await oldCategory.delete("Kategori lama kosong");
      console.log("\n  🧹 Kategori lama '🔊｜✦ VOICE CHANNELS ✦' dihapus.");
    }
  }

  console.log(`\n======================================================`);
  console.log(`🎉 PEMISAHAN VOICE CHANNEL SELESAI!`);
  console.log(`======================================================\n`);

  client.destroy();
}

main().catch((err) => {
  console.error("Fatal Error:", err);
  process.exit(1);
});
