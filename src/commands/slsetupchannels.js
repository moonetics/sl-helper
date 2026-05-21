const {
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require("discord.js");
const { slSetupChannelMessages } = require("../data/slSetupChannelMessages");

const previewLimit = 20;

const roleBlueprint = [
  { name: "SL | Helper", color: "#F1C40F" },
  { name: "SL | Orchestrator", color: "#9B59B6" },
  { name: "SL | Council", color: "#E74C3C" },
  { name: "SL | Admin", color: "#3498DB" },
  { name: "SL | Verified Roster", color: "#2ECC71" },
  { name: "SL | Speed Division", color: "#1ABC9C" },
  { name: "SL | Ladies", color: "#FF69B4" },
  { name: "SL | Streamer", color: "#E91E63" },
  { name: "SL | Members", color: "#95A5A6" },
  { name: "SL | Players", color: "#808080" },
  { name: "SL | BOT", color: "#5865F2" },
];

const channelBlueprint = [
  {
    name: "🏛｜✦ SL FOUNDATION ✦",
    channels: [
      { type: "text", name: "🤝・community-system", messageKey: "communitySystem" },
      { type: "text", name: "📌〡sl-vision-mission", messageKey: "slVisionMission" },
    ],
  },
  {
    name: "🛡｜✦ ADMINISTRATION ✦",
    channels: [
      { type: "voice", name: "🗣️・Staff Lounge" },
      { type: "voice", name: "🔒・Private VC / 1-on-1" },
      { type: "text", name: "📝・staff-chat" },
      { type: "text", name: "🧰・staff-commands" },
      { type: "text", name: "📒・mod-log" },
      { type: "text", name: "🗃️・archives" },
      { type: "text", name: "telemetry" },
    ],
  },
  {
    name: "🚪｜✦ LOBBY ✦",
    channels: [
      { type: "text", name: "👋・welcome" },
      { type: "text", name: "😳・farewell" },
      { type: "text", name: "🏷️・self-roles" },
      { type: "text", name: "📜・rules", messageKey: "rules" },
    ],
  },
  {
    name: "ℹ️｜✦ INFORMATION ✦",
    channels: [
      { type: "announcement", name: "📢・official-announcement" },
      { type: "text", name: "📢・sub-announcement" },
      { type: "text", name: "🧨・pengunaan-tag-sl", messageKey: "pengunaanTagSl" },
      { type: "text", name: "📰・event-results" },
      { type: "text", name: "🤝・partnership-info" },
      { type: "text", name: "🏁・warlink-balap" },
      { type: "text", name: "💜・server-boosters" },
      { type: "text", name: "🏁・sl-speed-division" },
      { type: "text", name: "🧨・verified-sl-roster" },
    ],
  },
  {
    name: "🏗｜SL MAP ECOSYSTEM",
    channels: [
      { type: "text", name: "📋・change-log" },
      { type: "text", name: "🛒・map-catalog" },
      { type: "text", name: "🧪・bug-reports" },
    ],
  },
  {
    name: "💬｜✦ HANGOUT ✦",
    channels: [
      { type: "text", name: "💬・general-chat" },
      { type: "text", name: "🎊・community-events" },
      { type: "text", name: "📸・media-drop" },
      { type: "text", name: "🔗・limpul-sharelink" },
    ],
  },
  {
    name: "🔒｜SL CORE ACCESS",
    channels: [
      { type: "text", name: "📢・verified-announcement" },
      { type: "text", name: "📊・fund-report" },
      { type: "text", name: "💬・core-chat" },
    ],
  },
  {
    name: "✨｜✦ GIRLS CORNER ✦",
    channels: [
      { type: "voice", name: "💋・ladies-corner" },
      { type: "text", name: "📜・ladies-rules", messageKey: "ladiesRules" },
      { type: "text", name: "🎖️・benefit-sl-ladies", messageKey: "benefitSlLadies" },
      { type: "text", name: "🌸・ladies-chat" },
      { type: "text", name: "💅・beauty-lifestyle" },
      { type: "text", name: "💖・warlink-ladies" },
    ],
  },
  {
    name: "🖊｜✦ CONTENT & STREAM ✦",
    channels: [
      { type: "voice", name: "🎙️・creator-corner" },
      { type: "text", name: "🎖️・benefit-sl-streamer", messageKey: "benefitSlStreamer" },
      { type: "text", name: "🎬・official-sl-streamer" },
      { type: "text", name: "🎥・stream-alerts" },
      { type: "text", name: "📺・clips-and-highlight" },
    ],
  },
  {
    name: "🔊｜✦ CUSTOM VOICE ✦",
    channels: [
      { type: "voice", name: "✝️ Creator Channel" },
      { type: "text", name: "🎶・requests-music" },
      { type: "text", name: "✨・interface" },
    ],
  },
  {
    name: "🔊｜✦ VOICE CHANNEL ✦",
    channels: [
      { type: "voice", name: "⚔️・Squad VC 1" },
      { type: "voice", name: "🛡️・Squad VC 2" },
      { type: "voice", name: "🎙️・Caster 1" },
      { type: "voice", name: "🎙️・Caster 2" },
    ],
  },
];

const data = new SlashCommandBuilder()
  .setName("slsetupchannels")
  .setDescription("Reset dan buat ulang struktur channel SL")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addBooleanOption((option) =>
    option
      .setName("confirm")
      .setDescription("Wajib true untuk reset dan setup channel")
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName("reason")
      .setDescription("Alasan reset/setup channel untuk audit log")
      .setMaxLength(512)
  );

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

function resolveChannelType(type) {
  if (type === "voice") {
    return ChannelType.GuildVoice;
  }

  if (type === "announcement") {
    return ChannelType.GuildAnnouncement;
  }

  return ChannelType.GuildText;
}

function buildEveryoneViewOverwrites(guild) {
  return [
    {
      id: guild.roles.everyone.id,
      allow: [PermissionFlagsBits.ViewChannel],
    },
  ];
}

function splitMessage(content, maxLength = 1900) {
  if (content.length <= maxLength) {
    return [content];
  }

  const chunks = [];
  let buffer = "";

  for (const line of content.split("\n")) {
    const candidate = buffer ? `${buffer}\n${line}` : line;
    if (candidate.length <= maxLength) {
      buffer = candidate;
      continue;
    }

    if (buffer) {
      chunks.push(buffer);
      buffer = "";
    }

    if (line.length <= maxLength) {
      buffer = line;
      continue;
    }

    for (let index = 0; index < line.length; index += maxLength) {
      chunks.push(line.slice(index, index + maxLength));
    }
  }

  if (buffer) {
    chunks.push(buffer);
  }

  return chunks;
}

async function postSetupMessages(createdMessageChannels) {
  const stats = {
    sent: 0,
    failed: 0,
  };
  const failures = [];

  for (const [messageKey, channel] of createdMessageChannels.entries()) {
    const messages = slSetupChannelMessages[messageKey] || [];
    if (!channel?.send || messages.length === 0) {
      continue;
    }

    for (const message of messages) {
      const chunks = splitMessage(message);
      for (const chunk of chunks) {
        try {
          await channel.send({
            content: chunk,
            allowedMentions: { parse: [] },
          });
          stats.sent += 1;
        } catch (error) {
          stats.failed += 1;
          failures.push(`${channel.name} / ${messageKey}: ${error.message}`);
        }
      }
    }
  }

  return { stats, failures };
}

async function setupRoles(guild, reason) {
  const stats = {
    created: 0,
    updated: 0,
    positionsUpdated: 0,
    failed: 0,
    skipped: 0,
  };
  const failures = [];
  const skipped = [];
  const rolesByName = new Map(guild.roles.cache.map((role) => [role.name, role]));

  for (const roleSpec of roleBlueprint) {
    let role = rolesByName.get(roleSpec.name);

    try {
      if (!role) {
        role = await guild.roles.create({
          name: roleSpec.name,
          color: roleSpec.color,
          hoist: false,
          mentionable: false,
          permissions: [],
          reason,
        });
        stats.created += 1;
      } else if (role.managed) {
        stats.skipped += 1;
        skipped.push(`${roleSpec.name}: managed role tidak bisa diupdate`);
      } else {
        await role.edit({
          color: roleSpec.color,
          hoist: false,
          mentionable: false,
          permissions: [],
          reason,
        });
        stats.updated += 1;
      }

      if (role) {
        rolesByName.set(roleSpec.name, role);
      }
    } catch (error) {
      stats.failed += 1;
      failures.push(`${roleSpec.name}: ${error.message}`);
    }
  }

  const botHighestPosition = guild.members.me?.roles.highest.position ?? guild.roles.everyone.position;
  const lowestAllowedPosition = guild.roles.everyone.position + 1;
  for (let index = 0; index < roleBlueprint.length; index += 1) {
    const roleSpec = roleBlueprint[index];
    const role = rolesByName.get(roleSpec.name);
    if (!role || role.managed) {
      continue;
    }

    const targetPosition = Math.max(lowestAllowedPosition, botHighestPosition - 1 - index);
    try {
      await role.setPosition(targetPosition, { reason });
      stats.positionsUpdated += 1;
    } catch (error) {
      stats.failed += 1;
      failures.push(`${roleSpec.name} position: ${error.message}`);
    }
  }

  return { stats, failures, skipped };
}

async function createChildChannel(guild, category, child, reason) {
  const baseOptions = {
    name: child.name,
    type: resolveChannelType(child.type),
    parent: category.id,
    permissionOverwrites: buildEveryoneViewOverwrites(guild),
    reason,
  };

  if (child.type !== "announcement") {
    return {
      channel: await guild.channels.create(baseOptions),
      fallback: null,
    };
  }

  try {
    return {
      channel: await guild.channels.create(baseOptions),
      fallback: null,
    };
  } catch (error) {
    return {
      channel: await guild.channels.create({
        ...baseOptions,
        type: ChannelType.GuildText,
      }),
      fallback: `${child.name}: announcement fallback ke text (${error.message})`,
    };
  }
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
      content: "Setup channel dibatalkan. Jalankan `/slsetupchannels confirm:true` kalau benar-benar ingin reset channel dan membuat struktur SL.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const guild = interaction.guild;
  const botMember = guild.members.me || await guild.members.fetchMe();
  if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels)) {
    await interaction.reply({
      content: "Bot butuh permission Manage Channels untuk reset dan membuat channel.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
    await interaction.reply({
      content: "Bot butuh permission Manage Roles untuk membuat dan mengatur role SL.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  await interaction.editReply("Reset channel dimulai. Bot akan hapus channel lama yang bisa dihapus, lalu membuat struktur SL sesuai blueprint.");

  const reason = interaction.options.getString("reason") || `SL setup channels by ${interaction.user.tag || interaction.user.id}`;
  const stats = {
    checked: 0,
    deleted: 0,
    deleteSkipped: 0,
    deleteFailed: 0,
    categoriesCreated: 0,
    channelsCreated: 0,
    createFailed: 0,
    rolesCreated: 0,
    rolesUpdated: 0,
    rolePositionsUpdated: 0,
    roleSetupFailed: 0,
    roleSetupSkipped: 0,
  };
  const deleteSkipped = [];
  const deleteFailed = [];
  const createFailed = [];
  const fallbacks = [];
  const createdMessageChannels = new Map();
  let reportChannel = null;
  let fallbackReportChannel = null;

  const roleSetupResult = await setupRoles(guild, reason);
  stats.rolesCreated = roleSetupResult.stats.created;
  stats.rolesUpdated = roleSetupResult.stats.updated;
  stats.rolePositionsUpdated = roleSetupResult.stats.positionsUpdated;
  stats.roleSetupFailed = roleSetupResult.stats.failed;
  stats.roleSetupSkipped = roleSetupResult.stats.skipped;

  await guild.channels.fetch();
  for (const channel of sortChannelsForDeletion(guild.channels.cache.values())) {
    stats.checked += 1;

    if (!channel.deletable) {
      stats.deleteSkipped += 1;
      deleteSkipped.push(`${channel.name || channel.id}: tidak bisa dihapus bot`);
      continue;
    }

    try {
      await channel.delete(reason);
      stats.deleted += 1;
    } catch (error) {
      stats.deleteFailed += 1;
      deleteFailed.push(`${channel.name || channel.id}: ${error.message}`);
    }
  }

  for (const categorySpec of channelBlueprint) {
    let category = null;
    try {
      category = await guild.channels.create({
        name: categorySpec.name,
        type: ChannelType.GuildCategory,
        permissionOverwrites: buildEveryoneViewOverwrites(guild),
        reason,
      });
      stats.categoriesCreated += 1;
    } catch (error) {
      stats.createFailed += 1;
      createFailed.push(`${categorySpec.name}: gagal buat category (${error.message})`);
      continue;
    }

    for (const child of categorySpec.channels) {
      try {
        const result = await createChildChannel(guild, category, child, reason);
        stats.channelsCreated += 1;

        if (!fallbackReportChannel && result.channel?.isTextBased?.()) {
          fallbackReportChannel = result.channel;
        }

        if (!reportChannel && !child.messageKey && result.channel?.isTextBased?.()) {
          reportChannel = result.channel;
        }

        if (child.messageKey && result.channel?.send) {
          createdMessageChannels.set(child.messageKey, result.channel);
        }

        if (result.fallback) {
          fallbacks.push(result.fallback);
        }
      } catch (error) {
        stats.createFailed += 1;
        createFailed.push(`${categorySpec.name} / ${child.name}: ${error.message}`);
      }
    }
  }

  const messagePostResult = await postSetupMessages(createdMessageChannels);
  stats.setupMessagesSent = messagePostResult.stats.sent;
  stats.setupMessageFailed = messagePostResult.stats.failed;

  const parts = [
    "Setup channel selesai.",
    `Channel dicek: ${stats.checked}`,
    `Channel lama deleted: ${stats.deleted}`,
    `Delete skipped: ${stats.deleteSkipped}`,
    `Delete failed: ${stats.deleteFailed}`,
    `Category dibuat: ${stats.categoriesCreated}/${channelBlueprint.length}`,
    `Channel dibuat: ${stats.channelsCreated}`,
    `Create failed: ${stats.createFailed}`,
    `Setup messages sent: ${stats.setupMessagesSent}`,
    `Setup message failed: ${stats.setupMessageFailed}`,
    `Roles created: ${stats.rolesCreated}`,
    `Roles updated: ${stats.rolesUpdated}`,
    `Role positions updated: ${stats.rolePositionsUpdated}`,
    `Role setup skipped: ${stats.roleSetupSkipped}`,
    `Role setup failed: ${stats.roleSetupFailed}`,
    `Reason: ${reason}`,
  ];

  const deleteSkippedPreview = previewLines(deleteSkipped);
  if (deleteSkippedPreview) {
    parts.push("", "Delete skipped preview:", deleteSkippedPreview);
  }

  const deleteFailedPreview = previewLines(deleteFailed);
  if (deleteFailedPreview) {
    parts.push("", "Delete failed preview:", deleteFailedPreview);
  }

  const fallbackPreview = previewLines(fallbacks);
  if (fallbackPreview) {
    parts.push("", "Fallback preview:", fallbackPreview);
  }

  const createFailedPreview = previewLines(createFailed);
  if (createFailedPreview) {
    parts.push("", "Create failed preview:", createFailedPreview);
  }

  const messageFailedPreview = previewLines(messagePostResult.failures);
  if (messageFailedPreview) {
    parts.push("", "Setup message failed preview:", messageFailedPreview);
  }

  const roleSkippedPreview = previewLines(roleSetupResult.skipped);
  if (roleSkippedPreview) {
    parts.push("", "Role skipped preview:", roleSkippedPreview);
  }

  const roleFailedPreview = previewLines(roleSetupResult.failures);
  if (roleFailedPreview) {
    parts.push("", "Role failed preview:", roleFailedPreview);
  }

  const summary = parts.join("\n");
  const summaryChannel = reportChannel || fallbackReportChannel;
  if (summaryChannel?.send) {
    await summaryChannel.send(summary).catch(() => {});
  }

  await interaction.editReply(summary).catch(() => {});
}

module.exports = {
  data,
  execute,
  roleBlueprint,
};
