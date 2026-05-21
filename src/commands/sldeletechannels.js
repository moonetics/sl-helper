const {
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require("discord.js");

const randomNameChars = "abcdefghijklmnopqrstuvwxyz0123456789";
const randomChannelCount = 15;
const randomChannelNameLength = 9;

const data = new SlashCommandBuilder()
  .setName("sldeletechannels")
  .setDescription("Delete semua channel yang bisa dihapus bot lalu buat channel random")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addBooleanOption((option) =>
    option
      .setName("confirm")
      .setDescription("Wajib true untuk delete semua channel")
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName("reason")
      .setDescription("Alasan delete channel untuk audit log")
      .setMaxLength(512)
  );

function buildRandomChannelName(existingNames = new Set()) {
  let name = "";
  do {
    name = Array.from({ length: randomChannelNameLength }, () =>
      randomNameChars[Math.floor(Math.random() * randomNameChars.length)]
    ).join("");
  } while (existingNames.has(name));

  existingNames.add(name);
  return name;
}

function previewLines(items, limit = 20) {
  if (items.length === 0) {
    return "";
  }

  const preview = items.slice(0, limit).map((item) => `- ${item}`).join("\n");
  const remaining = items.length - limit;
  return remaining > 0 ? `${preview}\n- +${remaining} lainnya` : preview;
}

function sortChannelsForDeletion(channels) {
  return [...channels].sort((a, b) => {
    if (a.type === ChannelType.GuildCategory && b.type !== ChannelType.GuildCategory) {
      return 1;
    }

    if (a.type !== ChannelType.GuildCategory && b.type === ChannelType.GuildCategory) {
      return -1;
    }

    return (b.rawPosition ?? b.position ?? 0) - (a.rawPosition ?? a.position ?? 0);
  });
}

async function execute(interaction) {
  if (!interaction.inGuild()) {
    await interaction.reply({
      content: "Command ini hanya bisa dipakai di server.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({
      content: "Kamu butuh permission Administrator untuk memakai command ini.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
    await interaction.reply({
      content: "Kamu butuh permission Manage Channels untuk memakai command ini.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const confirm = interaction.options.getBoolean("confirm", true);
  if (!confirm) {
    await interaction.reply({
      content: "Delete semua channel dibatalkan. Jalankan `/sldeletechannels confirm:true` kalau benar-benar ingin menghapus semua channel yang bisa dihapus bot.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const guild = interaction.guild;
  const botMember = guild.members.me || await guild.members.fetchMe();
  if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels)) {
    await interaction.reply({
      content: "Bot butuh permission Manage Channels untuk delete dan create channel.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  await interaction.editReply(`Delete semua channel dimulai. Bot akan skip channel yang tidak bisa dihapus, lalu membuat ${randomChannelCount} channel random.`);

  const reason = interaction.options.getString("reason") || `SL delete channels by ${interaction.user.tag || interaction.user.id}`;
  await guild.channels.fetch();

  const channels = sortChannelsForDeletion(guild.channels.cache.values());
  const stats = {
    checked: 0,
    deleted: 0,
    skipped: 0,
    failed: 0,
  };
  const skipped = [];
  const failed = [];

  for (const channel of channels) {
    stats.checked += 1;

    if (!channel.deletable) {
      stats.skipped += 1;
      skipped.push(`${channel.name || channel.id}: tidak bisa dihapus bot`);
      continue;
    }

    try {
      await channel.delete(reason);
      stats.deleted += 1;
    } catch (error) {
      stats.failed += 1;
      failed.push(`${channel.name || channel.id}: ${error.message}`);
    }
  }

  const createdChannels = [];
  const generatedNames = new Set();
  for (let index = 0; index < randomChannelCount; index += 1) {
    const newChannelName = buildRandomChannelName(generatedNames);
    try {
      const createdChannel = await guild.channels.create({
        name: newChannelName,
        type: ChannelType.GuildText,
        reason,
      });
      createdChannels.push(createdChannel);
    } catch (error) {
      failed.push(`create ${newChannelName}: ${error.message}`);
      stats.failed += 1;
    }
  }

  const parts = [
    "Delete channel selesai.",
    `Dicek: ${stats.checked}`,
    `Berhasil delete: ${stats.deleted}`,
    `Skip: ${stats.skipped}`,
    `Gagal: ${stats.failed}`,
    `Channel baru dibuat: ${createdChannels.length}/${randomChannelCount}`,
    createdChannels.length > 0
      ? `List channel baru: ${createdChannels.map((channel) => `<#${channel.id}>`).join(", ")}`
      : "List channel baru: gagal dibuat",
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

  const summary = parts.join("\n");
  const reportChannel = createdChannels[0];
  if (reportChannel?.send) {
    await reportChannel.send(summary).catch(() => {});
  }

  await interaction.editReply(summary).catch(() => {});
}

module.exports = {
  data,
  execute,
};
