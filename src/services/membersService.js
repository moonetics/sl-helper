const fs = require("fs/promises");
const path = require("path");

const membersFilePath = path.resolve(__dirname, "..", "..", "members.txt");

async function readMemberPairs(filePath = membersFilePath) {
  const content = await fs.readFile(filePath, "utf8");
  const lines = content.split(/\r?\n/);

  const pairs = [];
  for (const lineRaw of lines) {
    const line = lineRaw.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    // Support inline comments: userid,discordid,displayname # nonaktif sementara
    const sanitized = line.replace(/\s+#.*$/, "").trim();
    if (!sanitized) {
      continue;
    }

    const tokens = sanitized
      .split(",")
      .map((value) => value?.trim())
      .filter(Boolean);

    if (tokens.length < 2) {
      continue;
    }

    const userIdRaw = tokens[0];
    const userId = Number(userIdRaw);
    if (!Number.isInteger(userId) || userId <= 0) {
      continue;
    }

    const remaining = tokens.slice(1);
    const discordIndex = remaining.findIndex((token) => /^\d{15,22}$/.test(token));
    if (discordIndex === -1) {
      continue;
    }

    const discordId = remaining[discordIndex];
    const displayName = remaining.filter((_, index) => index !== discordIndex).join(", ") || null;

    pairs.push({
      userId,
      discordId,
      displayName,
      note: displayName,
    });
  }

  return pairs;
}

module.exports = {
  membersFilePath,
  readMemberPairs,
};
