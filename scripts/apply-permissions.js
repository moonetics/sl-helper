require("dotenv").config();

const {
  ChannelType,
  Client,
  GatewayIntentBits,
  PermissionFlagsBits,
} = require("discord.js");

const token = process.env.DISCORD_TOKEN;
const guildId = process.env.GUILD_ID;

const roleNames = {
  bot: "SL〡BOT",
  orchestrator: "SL〡Orchestrator",
  council: "SL〡Council",
  admin: "SL〡Admin",
  verifiedRoster: "SL〡Verified Roster",
  speedDivision: "SL〡Speed Division",
  ladies: "SL〡Ladies",
  streamer: "SL〡Streamer",
  members: "SL〡Members",
  players: "SL〡Players",
};

const categoryIds = {
  foundation: "1501708257201225892",
  administration: "1501708264323158028",
  lobby: "1501708278495973436",
  information: "1501708286553096253",
  mapEcosystem: "1501708310368227349",
  hangout: "1501708316840038450",
  coreAccess: "1501708325061005363",
  girlsCorner: "1501708331625091275",
  contentStream: "1501708343964860456",
  voiceChannel: "1501708361518026873",
};

const channelIds = {
  clipsAndHighlight: "1501708352785350737",
};

const rolePermissionPlan = {
  [roleNames.orchestrator]: [
    "ViewAuditLog",
    "ManageGuild",
    "ManageRoles",
    "ManageChannels",
    "ManageMessages",
    "KickMembers",
    "BanMembers",
    "ModerateMembers",
    "ManageNicknames",
    "ManageWebhooks",
    "MentionEveryone",
  ],
  [roleNames.council]: [
    "ViewAuditLog",
    "ManageRoles",
    "ManageChannels",
    "ManageMessages",
    "KickMembers",
    "ModerateMembers",
    "ManageNicknames",
  ],
  [roleNames.admin]: [
    "ViewAuditLog",
    "ManageMessages",
    "KickMembers",
    "ModerateMembers",
    "ManageNicknames",
  ],
  [roleNames.bot]: [
    "ViewChannel",
    "SendMessages",
    "ReadMessageHistory",
    "ManageRoles",
    "ManageChannels",
    "ManageMessages",
    "KickMembers",
    "ModerateMembers",
    "Connect",
    "Speak",
    "AttachFiles",
    "EmbedLinks",
  ],
  [roleNames.verifiedRoster]: [],
  [roleNames.speedDivision]: [],
  [roleNames.ladies]: [],
  [roleNames.streamer]: [],
  [roleNames.members]: [],
  [roleNames.players]: [],
};

const allow = (...names) => names.map((name) => PermissionFlagsBits[name]);

const permissions = {
  viewRead: allow("ViewChannel", "ReadMessageHistory"),
  hiddenDeny: allow("ViewChannel"),
  lockedTextDeny: allow(
    "SendMessages",
    "SendMessagesInThreads",
    "CreatePublicThreads",
    "CreatePrivateThreads",
    "AddReactions"
  ),
  textSend: allow(
    "ViewChannel",
    "ReadMessageHistory",
    "SendMessages",
    "SendMessagesInThreads",
    "CreatePublicThreads",
    "CreatePrivateThreads",
    "AddReactions",
    "AttachFiles",
    "EmbedLinks"
  ),
  staffTextSend: allow(
    "ViewChannel",
    "ReadMessageHistory",
    "SendMessages",
    "SendMessagesInThreads",
    "CreatePublicThreads",
    "CreatePrivateThreads",
    "AddReactions",
    "AttachFiles",
    "EmbedLinks",
    "ManageMessages"
  ),
  voiceUse: allow("ViewChannel", "Connect", "Speak", "Stream", "UseVAD"),
  staffVoiceUse: allow("ViewChannel", "Connect", "Speak", "Stream", "UseVAD", "MoveMembers"),
  manageChannel: allow("ManageChannels"),
  fullChannel: allow(
    "ViewChannel",
    "ReadMessageHistory",
    "SendMessages",
    "SendMessagesInThreads",
    "CreatePublicThreads",
    "CreatePrivateThreads",
    "AddReactions",
    "AttachFiles",
    "EmbedLinks",
    "ManageMessages",
    "ManageChannels",
    "ManageWebhooks",
    "Connect",
    "Speak",
    "Stream",
    "UseVAD",
    "MoveMembers"
  ),
  botChannel: allow(
    "ViewChannel",
    "ReadMessageHistory",
    "SendMessages",
    "SendMessagesInThreads",
    "AddReactions",
    "AttachFiles",
    "EmbedLinks",
    "ManageMessages",
    "ManageChannels",
    "Connect",
    "Speak"
  ),
};

function requireEnv() {
  if (!token) {
    throw new Error("DISCORD_TOKEN belum di-set di .env");
  }

  if (!guildId) {
    throw new Error("GUILD_ID belum di-set di .env");
  }
}

function toPermissionBits(permissionNames) {
  return permissionNames.map((name) => {
    const bit = PermissionFlagsBits[name];
    if (!bit) {
      throw new Error(`PermissionFlagsBits.${name} tidak ditemukan`);
    }
    return bit;
  });
}

function findRequiredRole(guild, name) {
  const role = guild.roles.cache.find((item) => item.name === name);
  if (!role) {
    throw new Error(`Role wajib tidak ditemukan: ${name}`);
  }
  return role;
}

function findRequiredChannel(guild, id, label) {
  const channel = guild.channels.cache.get(id);
  if (!channel) {
    throw new Error(`Channel/category wajib tidak ditemukan: ${label} (${id})`);
  }
  return channel;
}

function roleIds(guild) {
  return Object.fromEntries(
    Object.entries(roleNames).map(([key, name]) => [key, findRequiredRole(guild, name).id])
  );
}

function overwrite(id, allowPermissions = [], denyPermissions = []) {
  return {
    id,
    allow: allowPermissions,
    deny: denyPermissions,
  };
}

function buildOverwrites(guild, roles, mode) {
  const everyoneId = guild.roles.everyone.id;
  const staffAllow = permissions.staffTextSend.concat(permissions.staffVoiceUse);

  const commonBot = overwrite(roles.bot, permissions.botChannel);
  const orchestrator = overwrite(roles.orchestrator, permissions.fullChannel);

  if (mode === "foundation") {
    return [
      overwrite(everyoneId, permissions.viewRead, permissions.lockedTextDeny),
      commonBot,
      orchestrator,
      overwrite(roles.council, permissions.staffTextSend.concat(permissions.manageChannel)),
      overwrite(roles.admin, permissions.viewRead, permissions.lockedTextDeny),
    ];
  }

  if (mode === "staff") {
    return [
      overwrite(everyoneId, [], permissions.hiddenDeny),
      commonBot,
      orchestrator,
      overwrite(roles.council, staffAllow),
      overwrite(roles.admin, staffAllow),
    ];
  }

  if (mode === "lockedPublic") {
    return [
      overwrite(everyoneId, permissions.viewRead, permissions.lockedTextDeny),
      commonBot,
      orchestrator,
      overwrite(roles.council, permissions.staffTextSend),
      overwrite(roles.admin, permissions.staffTextSend),
    ];
  }

  if (mode === "globalText") {
    return [
      overwrite(everyoneId, permissions.textSend),
      commonBot,
      orchestrator,
      overwrite(roles.council, permissions.staffTextSend),
      overwrite(roles.admin, permissions.staffTextSend),
    ];
  }

  if (mode === "verifiedOnly") {
    return [
      overwrite(everyoneId, [], permissions.hiddenDeny),
      commonBot,
      orchestrator,
      overwrite(roles.council, permissions.staffTextSend),
      overwrite(roles.admin, permissions.staffTextSend),
      overwrite(roles.verifiedRoster, permissions.textSend),
    ];
  }

  if (mode === "ladiesOnly") {
    return [
      overwrite(everyoneId, [], permissions.hiddenDeny),
      commonBot,
      orchestrator,
      overwrite(roles.council, staffAllow),
      overwrite(roles.admin, staffAllow),
      overwrite(roles.ladies, permissions.textSend.concat(permissions.voiceUse)),
    ];
  }

  if (mode === "streamerOnly") {
    return [
      overwrite(everyoneId, [], permissions.hiddenDeny),
      commonBot,
      orchestrator,
      overwrite(roles.council, staffAllow),
      overwrite(roles.admin, staffAllow),
      overwrite(roles.streamer, permissions.textSend.concat(permissions.voiceUse)),
    ];
  }

  if (mode === "globalVoice") {
    return [
      overwrite(everyoneId, permissions.voiceUse),
      commonBot,
      orchestrator,
      overwrite(roles.council, permissions.staffVoiceUse),
      overwrite(roles.admin, permissions.staffVoiceUse),
    ];
  }

  throw new Error(`Mode overwrite tidak dikenal: ${mode}`);
}

function childChannelsForCategory(guild, categoryId) {
  return guild.channels.cache
    .filter((channel) => channel.parentId === categoryId)
    .sort((a, b) => (a.rawPosition ?? a.position ?? 0) - (b.rawPosition ?? b.position ?? 0));
}

async function applyRolePermissions(guild) {
  const changed = [];
  const skipped = [];

  for (const [roleName, permissionNames] of Object.entries(rolePermissionPlan)) {
    const role = findRequiredRole(guild, roleName);

    if (role.managed) {
      skipped.push(`${role.name}: managed role`);
      continue;
    }

    await role.setPermissions(toPermissionBits(permissionNames), "SL permission apply");
    changed.push(`${role.name}: ${permissionNames.length > 0 ? permissionNames.join(", ") : "(none)"}`);
  }

  for (const botManagedRoleName of ["SL Helper", "Koya"]) {
    const role = guild.roles.cache.find((item) => item.name === botManagedRoleName);
    if (role?.managed) {
      skipped.push(`${role.name}: bot-managed, tidak diedit`);
    }
  }

  return { changed, skipped };
}

async function applyOverwritesToChannel(channel, overwrites, label) {
  await channel.permissionOverwrites.set(overwrites, `SL overwrite apply: ${label}`);
  return `${label}: ${channel.name} (${channel.id})`;
}

async function applyCategoryWithChildren(guild, roles, categoryId, mode, label, options = {}) {
  const category = findRequiredChannel(guild, categoryId, label);
  if (category.type !== ChannelType.GuildCategory) {
    throw new Error(`${label} (${categoryId}) bukan category`);
  }

  const overwrites = buildOverwrites(guild, roles, mode);
  const changed = [await applyOverwritesToChannel(category, overwrites, label)];
  const skipChildIds = new Set(options.skipChildIds || []);

  for (const child of childChannelsForCategory(guild, categoryId).values()) {
    if (skipChildIds.has(child.id)) {
      continue;
    }
    changed.push(await applyOverwritesToChannel(child, overwrites, `${label} child`));
  }

  return changed;
}

async function main() {
  requireEnv();

  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  await client.login(token);

  try {
    const guild = await client.guilds.fetch(guildId);
    await guild.roles.fetch();
    await guild.channels.fetch();
    const roles = roleIds(guild);

    console.log("SL Permission Apply");
    console.log("Mode: live apply, mengubah role permission dan channel overwrites");
    console.log(`Guild: ${guild.name} (${guild.id})`);
    console.log("");

    const roleResult = await applyRolePermissions(guild);
    const overwriteChanges = [];

    overwriteChanges.push(
      ...(await applyCategoryWithChildren(guild, roles, categoryIds.foundation, "foundation", "SL FOUNDATION"))
    );
    overwriteChanges.push(
      ...(await applyCategoryWithChildren(guild, roles, categoryIds.administration, "staff", "ADMINISTRATION"))
    );
    overwriteChanges.push(
      ...(await applyCategoryWithChildren(guild, roles, categoryIds.lobby, "lockedPublic", "LOBBY"))
    );
    overwriteChanges.push(
      ...(await applyCategoryWithChildren(guild, roles, categoryIds.information, "lockedPublic", "INFORMATION"))
    );
    overwriteChanges.push(
      ...(await applyCategoryWithChildren(guild, roles, categoryIds.mapEcosystem, "lockedPublic", "SL MAP ECOSYSTEM"))
    );
    overwriteChanges.push(
      ...(await applyCategoryWithChildren(guild, roles, categoryIds.hangout, "globalText", "HANGOUT"))
    );
    overwriteChanges.push(
      ...(await applyCategoryWithChildren(guild, roles, categoryIds.coreAccess, "verifiedOnly", "SL CORE ACCESS"))
    );
    overwriteChanges.push(
      ...(await applyCategoryWithChildren(guild, roles, categoryIds.girlsCorner, "ladiesOnly", "GIRLS CORNER"))
    );
    overwriteChanges.push(
      ...(await applyCategoryWithChildren(guild, roles, categoryIds.contentStream, "streamerOnly", "CONTENT & STREAM", {
        skipChildIds: [channelIds.clipsAndHighlight],
      }))
    );
    overwriteChanges.push(
      await applyOverwritesToChannel(
        findRequiredChannel(guild, channelIds.clipsAndHighlight, "clips-and-highlight"),
        buildOverwrites(guild, roles, "globalText"),
        "clips-and-highlight"
      )
    );
    overwriteChanges.push(
      ...(await applyCategoryWithChildren(guild, roles, categoryIds.voiceChannel, "globalVoice", "VOICE CHANNEL"))
    );

    console.log("Role permissions changed:");
    for (const item of roleResult.changed) {
      console.log(`- ${item}`);
    }

    console.log("");
    console.log("Skipped roles:");
    for (const item of roleResult.skipped) {
      console.log(`- ${item}`);
    }

    console.log("");
    console.log(`Channel/category overwrites changed: ${overwriteChanges.length}`);
    for (const item of overwriteChanges) {
      console.log(`- ${item}`);
    }

    console.log("");
    console.log("Selesai. Jalankan `npm run roles:check` untuk verifikasi role permissions.");
  } finally {
    client.destroy();
  }
}

main().catch((error) => {
  console.error("Permission apply gagal:", error);
  process.exit(1);
});
