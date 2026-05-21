const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require("discord.js");

const previewLimit = 20;

const data = new SlashCommandBuilder()
  .setName("slkick")
  .setDescription("Kick member server")
  .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
  .addSubcommand((subcommand) =>
    subcommand
      .setName("user")
      .setDescription("Kick satu member")
      .addUserOption((option) =>
        option
          .setName("target")
          .setDescription("Member yang akan dikick")
          .setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName("reason")
          .setDescription("Alasan kick untuk audit log")
          .setMaxLength(512)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("all")
      .setDescription("Kick semua member yang bisa dikick bot")
      .addBooleanOption((option) =>
        option
          .setName("confirm")
          .setDescription("Wajib true untuk menjalankan mass kick")
          .setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName("reason")
          .setDescription("Alasan kick untuk audit log")
          .setMaxLength(512)
      )
  );

function defaultReason(interaction) {
  return `SL kick by ${interaction.user.tag || interaction.user.id}`;
}

function formatMember(member) {
  const tag = member.user?.tag || member.user?.username || "unknown";
  return `${tag} (${member.id})`;
}

function reasonForNotKickable(member, guild, botMember) {
  if (member.id === guild.ownerId) {
    return "server owner";
  }

  if (member.id === botMember.id) {
    return "bot sendiri";
  }

  if (!member.kickable) {
    return "role lebih tinggi/equal atau bot tidak punya akses";
  }

  return null;
}

function previewLines(items) {
  if (items.length === 0) {
    return "";
  }

  const preview = items
    .slice(0, previewLimit)
    .map((item) => `- ${item}`)
    .join("\n");
  const remaining = items.length - previewLimit;
  return remaining > 0 ? `${preview}\n- +${remaining} lainnya` : preview;
}

async function requireGuildAndPermission(interaction) {
  if (!interaction.inGuild()) {
    await interaction.reply({
      content: "Command ini hanya bisa dipakai di server.",
      flags: MessageFlags.Ephemeral,
    });
    return false;
  }

  if (!interaction.memberPermissions?.has(PermissionFlagsBits.KickMembers)) {
    await interaction.reply({
      content: "Kamu butuh permission Kick Members untuk memakai command ini.",
      flags: MessageFlags.Ephemeral,
    });
    return false;
  }

  const botMember = interaction.guild.members.me || await interaction.guild.members.fetchMe();
  if (!botMember.permissions.has(PermissionFlagsBits.KickMembers)) {
    await interaction.reply({
      content: "Bot butuh permission Kick Members untuk menjalankan command ini.",
      flags: MessageFlags.Ephemeral,
    });
    return false;
  }

  return true;
}

async function executeUser(interaction) {
  const guild = interaction.guild;
  const targetUser = interaction.options.getUser("target", true);
  const reason = interaction.options.getString("reason") || defaultReason(interaction);
  const botMember = guild.members.me || await guild.members.fetchMe();
  const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

  if (!targetMember) {
    await interaction.reply({
      content: `Target ${targetUser.tag || targetUser.id} tidak ditemukan di server ini.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const skipReason = reasonForNotKickable(targetMember, guild, botMember);
  if (skipReason) {
    await interaction.reply({
      content: `Tidak bisa kick ${formatMember(targetMember)}: ${skipReason}.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  await targetMember.kick(reason);
  await interaction.editReply(`Berhasil kick ${formatMember(targetMember)}. Reason: ${reason}`);
}

async function executeAll(interaction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({
      content: "Mass kick `/slkick all` hanya boleh dipakai oleh Administrator.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const confirm = interaction.options.getBoolean("confirm", true);
  if (!confirm) {
    await interaction.reply({
      content: "Mass kick dibatalkan. Jalankan `/slkick all confirm:true` kalau benar-benar ingin kick semua member yang bisa dikick bot.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const guild = interaction.guild;
  const reason = interaction.options.getString("reason") || defaultReason(interaction);
  const botMember = guild.members.me || await guild.members.fetchMe();

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  await interaction.editReply("Mass kick dimulai. Bot akan kick semua member yang bisa dikick dan skip sisanya.");

  const members = await guild.members.fetch();
  const stats = {
    checked: 0,
    kicked: 0,
    skipped: 0,
    failed: 0,
  };
  const skipped = [];
  const failed = [];

  for (const member of members.values()) {
    stats.checked += 1;

    const skipReason = reasonForNotKickable(member, guild, botMember);
    if (skipReason) {
      stats.skipped += 1;
      skipped.push(`${formatMember(member)}: ${skipReason}`);
      continue;
    }

    try {
      await member.kick(reason);
      stats.kicked += 1;
    } catch (error) {
      stats.failed += 1;
      failed.push(`${formatMember(member)}: ${error.message}`);
    }
  }

  const parts = [
    "Mass kick selesai.",
    `Dicek: ${stats.checked}`,
    `Berhasil kick: ${stats.kicked}`,
    `Skip: ${stats.skipped}`,
    `Gagal: ${stats.failed}`,
    `Reason: ${reason}`,
  ];

  const skippedPreview = previewLines(skipped);
  if (skippedPreview) {
    parts.push("", "Skipped preview:", skippedPreview);
  }

  const failedPreview = previewLines(failed);
  if (failedPreview) {
    parts.push("", "Failed preview:", failedPreview);
  }

  await interaction.editReply(parts.join("\n"));
}

async function execute(interaction) {
  if (!(await requireGuildAndPermission(interaction))) {
    return;
  }

  const subcommand = interaction.options.getSubcommand(true);
  if (subcommand === "user") {
    await executeUser(interaction);
    return;
  }

  if (subcommand === "all") {
    await executeAll(interaction);
  }
}

module.exports = {
  data,
  execute,
};
