const fs = require("fs/promises");
const path = require("path");

const membersFilePath = path.join(__dirname, "members.txt");
const url = "https://users.roblox.com/v1/users";

async function readMembersFile(filePath) {
  const content = await fs.readFile(filePath, "utf8");
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));

  const pairs = [];
  for (const line of lines) {
    const [userIdRaw, discordIdRaw] = line.split(",").map((v) => v?.trim());
    if (!userIdRaw || !discordIdRaw) {
      continue;
    }

    const userId = Number(userIdRaw);
    if (!Number.isInteger(userId) || userId <= 0) {
      continue;
    }

    pairs.push({
      userId,
      discordId: discordIdRaw,
    });
  }

  return pairs;
}

async function main() {
  if (typeof fetch !== "function") {
    throw new Error("Node.js Anda belum mendukung fetch bawaan. Gunakan Node.js 18+.");
  }

  const pairs = await readMembersFile(membersFilePath);
  if (pairs.length === 0) {
    throw new Error("members.txt kosong atau format tidak valid. Gunakan format: userid,iddiscord");
  }

  const userIds = [...new Set(pairs.map((pair) => pair.userId))];

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ userIds }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Request gagal (${response.status}): ${body}`);
  }

  const payload = await response.json();
  const users = Array.isArray(payload?.data) ? payload.data : [];
  const usersById = new Map(users.map((user) => [user.id, user]));

  console.log(
    JSON.stringify(
      pairs.map((pair) => {
        const user = usersById.get(pair.userId);
        return {
          userId: pair.userId,
          discordId: pair.discordId,
          name: user?.name ?? null,
          displayName: user?.displayName ?? null,
        };
      }),
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
