require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const { soreviRoleBlueprint } = require("../src/data/soreviData");

async function main() {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  });

  console.log("Menghubungkan ke bot Discord...");
  await client.login(process.env.DISCORD_TOKEN);
  const guild = await client.guilds.fetch(process.env.GUILD_ID);

  console.log(`\n======================================================`);
  console.log(`  UPDATE SERVER IDENTITY & ROLE HOISTING`);
  console.log(`  Server: ${guild.name} (${guild.id})`);
  console.log(`======================================================\n`);

  // 1. Update Server Name to ALL CAPS
  console.log("1. Mengubah nama server menjadi huruf kapital semua...");
  try {
    await guild.setName("SOREVI LABS");
    console.log("  ✅ Nama server berhasil diubah: SOREVI LABS");
  } catch (err) {
    console.log("  x Gagal ubah nama server:", err.message);
  }

  // 2. Update Server Description (jika didukung)
  console.log("\n2. Mengatur deskripsi server...");
  try {
    if (typeof guild.edit === "function") {
      await guild.edit({
        description: "Official Roblox Development & Commission Hub • SOREVI LABS",
      });
      console.log("  ✅ Deskripsi server berhasil diperbarui.");
    }
  } catch (err) {
    console.log("  ! Info deskripsi:", err.message);
  }

  // 3. Update Semua Role: hoist = true (View online as separate members) & Color
  console.log("\n3. Memperbarui seluruh role (Hoist: ON & Color Update)...");
  await guild.roles.fetch();

  for (const roleSpec of soreviRoleBlueprint) {
    const role = guild.roles.cache.find(
      (r) =>
        r.name === roleSpec.name ||
        r.name.toLowerCase().includes(roleSpec.name.replace(/^[^\w-]+｜?/, "").trim().toLowerCase())
    );

    if (role) {
      try {
        await role.edit({
          name: roleSpec.name,
          color: roleSpec.color,
          hoist: true, // Display role members separately
          mentionable: roleSpec.mentionable ?? false,
        });
        console.log(`  ✅ Updated role: ${role.name} (Color: ${roleSpec.color}, Hoist: ON)`);
      } catch (err) {
        console.log(`  x Gagal update role ${role.name}: ${err.message}`);
      }
    }
  }

  // 4. Bersihkan pesan dari # 🔍・talent-recruitment
  console.log("\n4. Membersihkan pesan di channel # 🔍・talent-recruitment...");
  await guild.channels.fetch();
  const talentChannel = guild.channels.cache.find(
    (ch) => ch.name.includes("talent-recruitment")
  );

  if (talentChannel && talentChannel.isTextBased()) {
    try {
      const msgs = await talentChannel.messages.fetch({ limit: 50 });
      if (msgs.size > 0) {
        await talentChannel.bulkDelete(msgs, true);
        console.log(`  ✅ Berhasil menghapus ${msgs.size} pesan dari #${talentChannel.name}.`);
      } else {
        console.log(`  - #${talentChannel.name} sudah dalam keadaan bersih.`);
      }
    } catch (err) {
      console.log(`  x Gagal clear #${talentChannel.name}: ${err.message}`);
    }
  }

  console.log(`\n======================================================`);
  console.log(`🎉 SEMUA IDENTITAS, ROLE HOISTING, & PEMBERSIHAN SELESAI!`);
  console.log(`======================================================\n`);

  client.destroy();
}

main().catch((err) => {
  console.error("Fatal Error:", err);
  process.exit(1);
});
