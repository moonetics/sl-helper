require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");

async function main() {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
    ],
  });

  console.log("Menghubungkan ke bot Discord...");
  await client.login(process.env.DISCORD_TOKEN);
  const guild = await client.guilds.fetch(process.env.GUILD_ID);

  console.log(`Server ditemukan: ${guild.name} (${guild.id})`);

  // 1. Update Nama dan Deskripsi Server
  console.log("\n1. Memperbarui identitas server (Nama & Deskripsi)...");
  try {
    await guild.setName("Sorevi Labs");
    console.log("  ✅ Nama server diubah menjadi: Sorevi Labs");
  } catch (err) {
    console.log("  x Gagal ubah nama server:", err.message);
  }

  try {
    await guild.setDescription("Official Roblox Game Development & Commission Hub • Sorevi Labs");
    console.log("  ✅ Deskripsi server berhasil diperbarui.");
  } catch (err) {
    console.log("  ! Notice deskripsi server (memerlukan level Community Server):", err.message);
  }

  // 2. Berikan role Sorevi Community ke seluruh member
  console.log("\n2. Memberikan role '⭐ ｜ Sorevi Community' ke seluruh members...");
  await guild.roles.fetch();
  const communityRole = guild.roles.cache.find(
    (r) =>
      r.name.includes("Sorevi Community") ||
      r.name.toLowerCase().includes("community")
  );

  if (!communityRole) {
    console.error("  x Role '⭐ ｜ Sorevi Community' tidak ditemukan di server!");
  } else {
    console.log(`  Role target: ${communityRole.name} (${communityRole.id})`);
    const members = await guild.members.fetch();
    let assignedCount = 0;

    for (const [id, member] of members) {
      if (!member.roles.cache.has(communityRole.id)) {
        try {
          await member.roles.add(communityRole.id, "Auto-assign Sorevi Community role");
          console.log(`  + Memberikan role ke: ${member.user.tag}`);
          assignedCount++;
        } catch (err) {
          console.log(`  x Gagal assign role ke ${member.user.tag}: ${err.message}`);
        }
      } else {
        console.log(`  - Sudah memiliki role: ${member.user.tag}`);
      }
    }
    console.log(`  ✅ Berhasil memberikan role ke ${assignedCount} member.`);
  }

  client.destroy();
}

main().catch((err) => {
  console.error("Fatal Error:", err);
  process.exit(1);
});
