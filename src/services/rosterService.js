const { readMemberPairs } = require("./membersService");
const { getUsersByIds } = require("./robloxService");

function escapeUnderscore(text) {
  return String(text).replace(/([\\_])/g, "\\$1");
}

function buildRosterText(rows) {
  return [
    "# :military_medal: VERIFIED SQUAD LIMPUL ROSTER",
    "_The verified Squad Limpul (SL) lineup._",
    "",
    "> `Tag` | **Display Name** _(@Username)_",
    "",
    ...rows,
  ].join("\n");
}

async function buildVerifiedRosterMessage(options = {}) {
  const resolveDiscordUsername = options.resolveDiscordUsername;
  const mentionUsers = options.mentionUsers === true;
  const wrapTagInCode = options.wrapTagInCode !== false;
  const pairs = await readMemberPairs();
  if (pairs.length === 0) {
    throw new Error("members.txt kosong atau format tidak valid (userid,iddiscord).");
  }

  const userIds = [...new Set(pairs.map((pair) => pair.userId))];
  const users = await getUsersByIds(userIds);
  const usersById = new Map(users.map((user) => [user.id, user]));

  const rows = await Promise.all(
    pairs.map(async (pair, index) => {
      let discordTag = `<@${pair.discordId}>`;

      if (!mentionUsers && typeof resolveDiscordUsername === "function") {
        const username = await resolveDiscordUsername(pair.discordId);
        if (username) {
          discordTag = `@${String(username)}`;
        }
      }

      const user = usersById.get(pair.userId);
      const displayName = String(user?.displayName ?? "Unknown");
      const name = escapeUnderscore(user?.name ?? "unknown");
      const renderedTag = wrapTagInCode ? `\`${discordTag}\`` : discordTag;
      return `${index + 1}. ${renderedTag}〡**${displayName}** _(@${name})_`;
    })
  );

  return buildRosterText(rows);
}

module.exports = {
  buildVerifiedRosterMessage,
};
