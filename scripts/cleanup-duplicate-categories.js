require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  ChannelType,
} = require("discord.js");
const { soreviChannelBlueprint } = require("../src/data/soreviData");

const token = process.env.DISCORD_TOKEN;
const guildId = process.env.GUILD_ID;

if (!token || !guildId) {
  console.error("DISCORD_TOKEN dan GUILD_ID wajib diisi di file .env");
  process.exit(1);
}

function normalizeCategoryName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

async function main() {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  console.log("Menghubungkan ke bot Discord...");
  await client.login(token);
  const guild = await client.guilds.fetch(guildId);

  console.log(`\n======================================================`);
  console.log(`  CLEANUP DUPLICATE CATEGORIES & ORGANIZE ORDER`);
  console.log(`  Server: ${guild.name} (${guild.id})`);
  console.log(`======================================================\n`);

  await guild.channels.fetch();

  // 1. Group categories by normalized name
  const categories = guild.channels.cache.filter((c) => c.type === ChannelType.GuildCategory);
  const catGroups = new Map();

  for (const cat of categories.values()) {
    const norm = normalizeCategoryName(cat.name);
    if (!catGroups.has(norm)) {
      catGroups.set(norm, []);
    }
    catGroups.get(norm).push(cat);
  }

  // 2. Resolve duplicates
  for (const [normName, list] of catGroups.entries()) {
    if (list.length > 1) {
      console.log(`\n🔍 Ditemukan ${list.length} duplikat untuk kategori "${list[0].name}"`);
      // Keep the one that has channels, or the first one
      let keepCat = list.find((c) => {
        const children = guild.channels.cache.filter((ch) => ch.parentId === c.id);
        return children.size > 0;
      }) || list[0];

      console.log(`  -> Menjaga kategori ID=${keepCat.id} (${keepCat.name})`);

      for (const cat of list) {
        if (cat.id === keepCat.id) continue;

        // Pindahkan channel anak jika ada
        const childChannels = guild.channels.cache.filter((ch) => ch.parentId === cat.id);
        for (const child of childChannels.values()) {
          console.log(`  -> Memindahkan channel #${child.name} ke kategori ${keepCat.name}`);
          await child.setParent(keepCat.id, { lockPermissions: false }).catch(() => {});
        }

        // Hapus kategori duplikat yang kosong
        try {
          await cat.delete("Cleanup duplicate category");
          console.log(`  ❌ Menghapus kategori duplikat: ID=${cat.id} (${cat.name})`);
        } catch (err) {
          console.error(`  ! Gagal menghapus kategori ${cat.name}:`, err.message);
        }
      }
    }
  }

  // 3. Rapikan urutan posisi kategori sesuai soreviChannelBlueprint
  console.log("\n📐 Menata urutan posisi kategori...");
  await guild.channels.fetch();

  const desiredOrder = soreviChannelBlueprint.map((b) => normalizeCategoryName(b.name));

  const allRemainingCats = Array.from(
    guild.channels.cache.filter((c) => c.type === ChannelType.GuildCategory).values()
  );

  allRemainingCats.sort((a, b) => {
    const idxA = desiredOrder.indexOf(normalizeCategoryName(a.name));
    const idxB = desiredOrder.indexOf(normalizeCategoryName(b.name));
    const posA = idxA === -1 ? 999 : idxA;
    const posB = idxB === -1 ? 999 : idxB;
    return posA - posB;
  });

  for (let i = 0; i < allRemainingCats.length; i++) {
    const cat = allRemainingCats[i];
    try {
      await cat.setPosition(i, { reason: "Organize category layout" });
      console.log(`  [${i + 1}] ${cat.name}`);
    } catch (err) {
      console.log(`  ! Notice positioning ${cat.name}: ${err.message}`);
    }
  }

  console.log(`\n======================================================`);
  console.log(`🎉 BERHASIL MEMBERSIHKAN DUPLIKAT & MENATA URUTAN KATEGORI!`);
  console.log(`======================================================\n`);

  client.destroy();
}

main().catch((err) => {
  console.error("Fatal Error:", err);
  process.exit(1);
});
