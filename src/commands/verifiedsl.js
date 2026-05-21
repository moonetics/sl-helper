const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { buildVerifiedRosterMessage } = require("../services/rosterService");
const { readMemberPairs } = require("../services/membersService");

const VERIFIED_ROLE_ID = "1501704753166680186";
const VERIFIED_ROLE_NAME = "SL〡Verified Roster";

const data = new SlashCommandBuilder()
  .setName("verifiedsl")
  .setDescription("POST VERIFIED SQUAD LIMPUL")
  .addStringOption((option) =>
    option
      .setName("tag")
      .setDescription("Tag user Discord? yes = mention, no = non-mention")
      .addChoices(
        { name: "yes", value: "yes" },
        { name: "no", value: "no" }
      )
  );

function splitMessage(content, maxLength = 1900) {
  const lines = content.split("\n");
  const chunks = [];
  let buffer = "";

  for (const line of lines) {
    const candidate = buffer ? `${buffer}\n${line}` : line;
    if (candidate.length > maxLength) {
      if (buffer) {
        chunks.push(buffer);
      }
      buffer = line;
      continue;
    }
    buffer = candidate;
  }

  if (buffer) {
    chunks.push(buffer);
  }

  return chunks;
}

async function execute(interaction) {
  if (!interaction.inGuild()) {
    await interaction.reply({
      content: "Command ini hanya bisa dipakai di server.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const tagMode = interaction.options.getString("tag") || "no";
  const shouldTag = tagMode === "yes";
  const guild = interaction.guild;
  await guild.roles.fetch();
  const role =
    guild.roles.cache.get(VERIFIED_ROLE_ID) ||
    guild.roles.cache.find((item) => item.name === VERIFIED_ROLE_NAME);

  if (!role) {
    throw new Error(`Role ${VERIFIED_ROLE_NAME} (${VERIFIED_ROLE_ID}) tidak ditemukan di server ini.`);
  }

  const pairs = await readMemberPairs();
  const uniqueDiscordIds = [...new Set(pairs.map((pair) => pair.discordId))];
  const activeDiscordIds = new Set(uniqueDiscordIds);
  const roleNotFoundIds = new Set();
  const roleSync = {
    added: 0,
    alreadyHas: 0,
    notFound: 0,
    addFailed: 0,
    removed: 0,
    removeFailed: 0,
  };

  for (const discordId of uniqueDiscordIds) {
    const member = await guild.members.fetch(discordId).catch(() => null);
    if (!member) {
      roleSync.notFound += 1;
      roleNotFoundIds.add(discordId);
      continue;
    }

    if (member.roles.cache.has(role.id)) {
      roleSync.alreadyHas += 1;
      continue;
    }

    try {
      await member.roles.add(role.id);
      roleSync.added += 1;
    } catch (error) {
      roleSync.addFailed += 1;
      console.error(`Gagal menambahkan role ke ${discordId}:`, error);
    }
  }

  await guild.members.fetch();
  for (const member of role.members.values()) {
    if (activeDiscordIds.has(member.id)) {
      continue;
    }

    try {
      await member.roles.remove(role.id);
      roleSync.removed += 1;
    } catch (error) {
      roleSync.removeFailed += 1;
      console.error(`Gagal menghapus role dari ${member.id}:`, error);
    }
  }

  const usernameCache = new Map();
  const usernameNotFoundIds = new Set();
  const resolveDiscordUsername = async (discordId) => {
    if (usernameCache.has(discordId)) {
      return usernameCache.get(discordId);
    }

    let username = null;

    if (interaction.guild) {
      const member = await interaction.guild.members.fetch(discordId).catch(() => null);
      if (member?.user?.username) {
        username = member.user.username;
      }
    }

    if (!username) {
      const user = await interaction.client.users.fetch(discordId).catch(() => null);
      if (user?.username) {
        username = user.username;
      }
    }

    if (!username) {
      usernameNotFoundIds.add(discordId);
    }

    usernameCache.set(discordId, username);
    return username;
  };

  const content = await buildVerifiedRosterMessage({
    resolveDiscordUsername,
    mentionUsers: shouldTag,
    wrapTagInCode: !shouldTag,
  });
  const channel = interaction.channel;

  if (!channel) {
    throw new Error("Channel tidak ditemukan untuk mengirim roster.");
  }

  const chunks = splitMessage(content);
  for (const chunk of chunks) {
    await channel.send({ content: chunk });
  }

  const roleSummary = [
    `Role <@&${role.id}>: ${roleSync.added} ditambahkan`,
    `${roleSync.alreadyHas} sudah punya`,
    `${roleSync.removed} dihapus (tidak ada di members.txt)`,
    `${roleSync.notFound} tidak ditemukan`,
    `${roleSync.addFailed} gagal tambah`,
    `${roleSync.removeFailed} gagal hapus`,
  ].join(", ");

  const missingIds = [...new Set([...roleNotFoundIds, ...usernameNotFoundIds])];
  const missingIdsSet = new Set(missingIds);
  const missingMembersById = new Map();
  for (const pair of pairs) {
    if (!missingIdsSet.has(pair.discordId) || missingMembersById.has(pair.discordId)) {
      continue;
    }

    missingMembersById.set(
      pair.discordId,
      pair.note ? `${pair.note} (userid ${pair.userId})` : `userid ${pair.userId}`
    );
  }

  const missingPreviewLimit = 20;
  const missingPreview = missingIds
    .slice(0, missingPreviewLimit)
    .map((discordId) => `<@${discordId}>`)
    .join(", ");
  const missingRemainder = missingIds.length - missingPreviewLimit;
  const missingIdsSummary =
    missingIds.length > 0
      ? ` Discord ID tidak ditemukan (${missingIds.length}): ${missingPreview}${
          missingRemainder > 0 ? `, +${missingRemainder} lainnya` : ""
        }.`
      : "";

  const missingDetailPreview = missingIds
    .slice(0, missingPreviewLimit)
    .map(
      (discordId) =>
        `<@${discordId}> -> ${missingMembersById.get(discordId) || "tanpa keterangan"}`
    )
    .join("; ");
  const missingDetailSummary =
    missingIds.length > 0 ? ` Detail: ${missingDetailPreview}.` : "";

  await interaction.editReply(
    `Roster berhasil dikirim ke channel ini. ${roleSummary}.${missingIdsSummary}${missingDetailSummary}`
  );
}

module.exports = {
  data,
  execute,
};
