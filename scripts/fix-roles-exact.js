require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");

const targetLeadRoleId = "1542413266389827596";

async function main() {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  await client.login(process.env.DISCORD_TOKEN);
  const guild = await client.guilds.fetch(process.env.GUILD_ID);

  console.log(`\n======================================================`);
  console.log(`  MEMPERBAIKI ROLE LEAD PROJECT DEVELOPER`);
  console.log(`  Server: ${guild.name} (${guild.id})`);
  console.log(`======================================================\n`);

  await guild.roles.fetch();

  // 1. Ubah role ID 1542413266389827596 menjadi 💼 ｜ Lead Project Developer
  try {
    const leadRole = await guild.roles.fetch(targetLeadRoleId);
    if (leadRole) {
      await leadRole.edit({
        name: "💼 ｜ Lead Project Developer",
        color: "#9B59B6",
        hoist: true,
        mentionable: true,
      });
      console.log(`  ✅ Berhasil mengubah role (${leadRole.id}) menjadi: 💼 ｜ Lead Project Developer (Color: #9B59B6, Hoist: ON)`);
    } else {
      console.log(`  x Role ID ${targetLeadRoleId} tidak ditemukan.`);
    }
  } catch (err) {
    console.log("  x Error saat edit role Lead:", err.message);
  }

  // 2. Tampilkan semua role di server untuk verifikasi
  console.log("\n--- Daftar Role Server Saat Ini ---");
  const sortedRoles = Array.from(guild.roles.cache.values()).sort((a, b) => b.position - a.position);
  sortedRoles.forEach((r) => {
    console.log(`  Pos ${r.position}: ${r.name} (ID: ${r.id}, Color: ${r.hexColor}, Hoist: ${r.hoist})`);
  });

  client.destroy();
}

main().catch(console.error);
