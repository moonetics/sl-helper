const { membersFilePath, readMemberPairs } = require("../src/services/membersService");

async function main() {
  const pairs = await readMemberPairs();
  const byUserId = new Map();

  for (const pair of pairs) {
    const list = byUserId.get(pair.userId) || [];
    list.push(pair);
    byUserId.set(pair.userId, list);
  }

  const duplicates = [...byUserId.entries()].filter(([, list]) => list.length > 1);

  if (duplicates.length === 0) {
    console.log(`OK: tidak ada duplicate userid di ${membersFilePath}`);
    return;
  }

  console.log(`Ditemukan ${duplicates.length} userid duplikat di ${membersFilePath}:`);
  for (const [userId, list] of duplicates) {
    const discordIds = list.map((item) => item.discordId).join(", ");
    console.log(`- userid ${userId} muncul ${list.length}x -> discordid: ${discordIds}`);
  }

  process.exitCode = 1;
}

main().catch((error) => {
  console.error("Gagal cek duplicate userid:", error);
  process.exit(1);
});
