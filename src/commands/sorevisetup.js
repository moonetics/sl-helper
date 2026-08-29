const {
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require("discord.js");
const {
  soreviRoleBlueprint,
  soreviChannelBlueprint,
  getChannelMarkdownContent,
} = require("../data/soreviData");
const ticketService = require("../services/ticketService");

function splitMessage(content, maxLength = 1900) {
  if (!content) return [];
  if (content.length <= maxLength) return [content];
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
    for (let i = 0; i < line.length; i += maxLength) {
      chunks.push(line.slice(i, i + maxLength));
    }
  }
  if (buffer) chunks.push(buffer);
  return chunks;
}

const data = new SlashCommandBuilder()
  .setName("sorevisetup")
  .setDescription("Reset dan bangun struktur server Sorevi Labs (sinkron dengan channel_content/*.md)")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addBooleanOption((opt) =>
    opt
      .setName("confirm")
      .setDescription("Konfirmasi untuk setup server Sorevi Labs")
      .setRequired(true)
  )
  .addBooleanOption((opt) =>
    opt
      .setName("post_content")
      .setDescription("Post isi dari folder channel_content/*.md ke channel (default: true)")
      .setRequired(false)
  )
  .addBooleanOption((opt) =>
    opt
      .setName("delete_old")
      .setDescription("Hapus channel lama sebelum membuat yang baru (default: true)")
      .setRequired(false)
  )
  .addStringOption((opt) =>
    opt
      .setName("reason")
      .setDescription("Alasan audit log")
      .setMaxLength(512)
      .setRequired(false)
  );

async function setupRoles(guild, reason) {
  const allowedRoleNames = new Set(soreviRoleBlueprint.map((r) => r.name));
  for (const role of guild.roles.cache.values()) {
    if (role.id === guild.roles.everyone.id) continue;
    if (role.managed) continue;

    if (!allowedRoleNames.has(role.name)) {
      try {
        await role.delete(reason);
      } catch {}
    }
  }

  await guild.roles.fetch();
  const rolesByName = new Map(guild.roles.cache.map((role) => [role.name, role]));
  const stats = { created: 0, updated: 0, failed: 0 };

  for (const spec of soreviRoleBlueprint) {
    let role = rolesByName.get(spec.name);
    try {
      if (!role) {
        role = await guild.roles.create({
          name: spec.name,
          color: spec.color,
          hoist: spec.hoist ?? true,
          mentionable: spec.mentionable ?? false,
          permissions: [],
          reason,
        });
        stats.created += 1;
      } else if (!role.managed) {
        await role.edit({
          color: spec.color,
          hoist: spec.hoist ?? true,
          mentionable: spec.mentionable ?? false,
          reason,
        });
        stats.updated += 1;
      }
      if (role) {
        rolesByName.set(spec.name, role);
      }
    } catch (err) {
      console.error(`Gagal setup role ${spec.name}:`, err);
      stats.failed += 1;
    }
  }

  const botHighestPosition = guild.members.me?.roles.highest.position ?? guild.roles.everyone.position;
  const lowestAllowedPosition = guild.roles.everyone.position + 1;

  for (let index = 0; index < soreviRoleBlueprint.length; index += 1) {
    const spec = soreviRoleBlueprint[index];
    const role = rolesByName.get(spec.name);
    if (!role || role.managed) continue;

    const targetPos = Math.max(lowestAllowedPosition, botHighestPosition - 1 - index);
    try {
      await role.setPosition(targetPos, { reason });
    } catch {}
  }

  return { stats, rolesByName };
}

async function execute(interaction) {
  if (!interaction.inGuild()) {
    await interaction.reply({ content: "Command ini hanya bisa dipakai di server.", flags: MessageFlags.Ephemeral });
    return;
  }

  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ content: "Kamu butuh permission Administrator.", flags: MessageFlags.Ephemeral });
    return;
  }

  const confirm = interaction.options.getBoolean("confirm", true);
  if (!confirm) {
    await interaction.reply({ content: "Setup dibatalkan. Set `confirm:true` untuk menjalankan.", flags: MessageFlags.Ephemeral });
    return;
  }

  const postContent = interaction.options.getBoolean("post_content") ?? true;
  const deleteOld = interaction.options.getBoolean("delete_old") ?? true;
  const reason = interaction.options.getString("reason") || `Sorevi Labs dynamic setup by ${interaction.user.tag}`;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  await interaction.editReply("⚙️ Memulai proses setup server Sorevi Labs (membaca dari channel_content/*.md)...");

  const guild = interaction.guild;
  const botMember = guild.members.me || await guild.members.fetchMe();

  // 1. Setup Roles
  const { rolesByName } = await setupRoles(guild, reason);

  const roleFounder = rolesByName.get("👑 ｜ Founder & Studio Lead");
  const roleLeadDev = rolesByName.get("💼 ｜ Lead Project Developer");
  const roleProjectDev = rolesByName.get("💻 ｜ Project Developer");
  const roleBuilder = rolesByName.get("🔨 ｜ Builder & Level Designer");
  const role3DModeler = rolesByName.get("🎨 ｜ 3D Modeler & Animator");
  const roleUIUX = rolesByName.get("✨ ｜ UI/UX Designer");
  const roleSupport = rolesByName.get("🛡️ ｜ Head of Support");
  const roleQA = rolesByName.get("🧪 ｜ QA & Game Tester");
  const roleClient = rolesByName.get("🤝 ｜ Verified Client");
  const rolePastClient = rolesByName.get("🏆 ｜ Past Client");

  const coreDevRoles = [roleFounder, roleLeadDev, roleProjectDev, roleBuilder, role3DModeler, roleUIUX].filter(Boolean);
  const allStaffRoles = [roleFounder, roleLeadDev, roleProjectDev, roleBuilder, role3DModeler, roleUIUX, roleSupport].filter(Boolean);

  // 2. Delete Old Channels
  if (deleteOld) {
    await guild.channels.fetch();
    const channels = Array.from(guild.channels.cache.values()).sort((a, b) => {
      if (a.type === ChannelType.GuildCategory && b.type !== ChannelType.GuildCategory) return 1;
      if (a.type !== ChannelType.GuildCategory && b.type === ChannelType.GuildCategory) return -1;
      return 0;
    });

    for (const channel of channels) {
      if (channel.deletable) {
        try {
          await channel.delete(reason);
        } catch {}
      }
    }
  }

  // 3. Create Categories & Channels
  let ticketChannel = null;

  for (const catSpec of soreviChannelBlueprint) {
    const isPrivateCat = catSpec.private === true;
    const catOverwrites = [
      {
        id: guild.roles.everyone.id,
        [isPrivateCat ? "deny" : "allow"]: [PermissionFlagsBits.ViewChannel],
      },
    ];

    if (isPrivateCat) {
      allStaffRoles.forEach((role) => {
        catOverwrites.push({
          id: role.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.ManageMessages,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.EmbedLinks,
          ],
        });
      });
      catOverwrites.push({
        id: botMember.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ManageChannels,
          PermissionFlagsBits.ManageMessages,
        ],
      });
    }

    const category = await guild.channels.create({
      name: catSpec.name,
      type: ChannelType.GuildCategory,
      permissionOverwrites: catOverwrites,
      reason,
    });

    for (const child of catSpec.channels) {
      let channelType = ChannelType.GuildText;
      if (child.type === "voice") channelType = ChannelType.GuildVoice;
      else if (child.type === "announcement") channelType = ChannelType.GuildAnnouncement;

      const childOverwrites = [];

      // Channel Permission Rules
      if (child.readOnly) {
        childOverwrites.push(
          {
            id: guild.roles.everyone.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
            deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.CreatePublicThreads, PermissionFlagsBits.CreatePrivateThreads],
          },
          ...coreDevRoles.map((r) => ({
            id: r.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks],
          }))
        );
      } else if (child.ticketPanel) {
        childOverwrites.push({
          id: guild.roles.everyone.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
          deny: [PermissionFlagsBits.SendMessages],
        });
      } else if (child.devPostOnly) {
        childOverwrites.push(
          {
            id: guild.roles.everyone.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
            deny: [PermissionFlagsBits.SendMessages],
          },
          ...coreDevRoles.map((r) => ({
            id: r.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks],
          }))
        );
      } else if (child.clientPostOnly) {
        childOverwrites.push(
          {
            id: guild.roles.everyone.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
            deny: [PermissionFlagsBits.SendMessages],
          },
          ...(roleClient ? [{ id: roleClient.id, allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] }] : []),
          ...(rolePastClient ? [{ id: rolePastClient.id, allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] }] : []),
          ...coreDevRoles.map((r) => ({ id: r.id, allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages] }))
        );
      } else if (child.qaOnly) {
        childOverwrites.push(
          {
            id: guild.roles.everyone.id,
            deny: [PermissionFlagsBits.ViewChannel],
          },
          ...(roleQA ? [{ id: roleQA.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ReadMessageHistory] }] : []),
          ...coreDevRoles.map((r) => ({ id: r.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.AttachFiles] }))
        );
      } else if (child.clientMeeting) {
        childOverwrites.push(
          {
            id: guild.roles.everyone.id,
            deny: [PermissionFlagsBits.Connect],
          },
          ...(roleClient ? [{ id: roleClient.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak] }] : []),
          ...allStaffRoles.map((r) => ({ id: r.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.MuteMembers] }))
        );
      } else if (child.staffOnlyVoice) {
        childOverwrites.push(
          {
            id: guild.roles.everyone.id,
            deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
          },
          ...allStaffRoles.map((r) => ({ id: r.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak] }))
        );
      }

      let createdChannel = null;
      try {
        createdChannel = await guild.channels.create({
          name: child.name,
          type: channelType,
          parent: category.id,
          permissionOverwrites: childOverwrites.length > 0 ? childOverwrites : undefined,
          reason,
        });
      } catch (err) {
        if (child.type === "announcement") {
          createdChannel = await guild.channels.create({
            name: child.name,
            type: ChannelType.GuildText,
            parent: category.id,
            permissionOverwrites: childOverwrites.length > 0 ? childOverwrites : undefined,
            reason,
          });
        }
      }

      if (createdChannel && child.ticketPanel) {
        ticketChannel = createdChannel;
      }

      // Membaca file .md secara dinamis
      if (postContent && createdChannel && child.contentFile) {
        const mdContent = getChannelMarkdownContent(child.contentFile);
        if (mdContent) {
          const chunks = splitMessage(mdContent);
          for (const chunk of chunks) {
            await createdChannel.send({ content: chunk, allowedMentions: { parse: [] } }).catch(() => {});
          }
        }
      }
    }
  }

  // 4. Send Ticket Panel to create-ticket channel
  if (ticketChannel) {
    const embed = ticketService.buildTicketPanelEmbed();
    const components = ticketService.buildTicketPanelComponents();
    await ticketChannel.send({ embeds: [embed], components }).catch(() => {});
  }

  await interaction.editReply(
    "**Setup Server Selesai**\n" +
    "- Seluruh Kategori, Channel, dan Hak Akses telah dibangun.\n" +
    (postContent ? "- Konten dari file `channel_content/*.md` telah disinkronisasikan.\n" : "- Channel dibuat dalam kondisi kosong bersih.\n") +
    "- Panel Tiket interaktif telah terpasang di #create-ticket."
  );
}

module.exports = {
  data,
  execute,
};
