require("dotenv").config();

const {
  ChannelType,
  Client,
  GatewayIntentBits,
  PermissionFlagsBits,
} = require("discord.js");
const {
  soreviRoleBlueprint,
  soreviChannelBlueprint,
  getChannelMarkdownContent,
} = require("../src/data/soreviData");
const ticketService = require("../src/services/ticketService");

const token = process.env.DISCORD_TOKEN;
const guildId = process.env.GUILD_ID;

if (!token || !guildId) {
  console.error("DISCORD_TOKEN dan GUILD_ID wajib diisi di file .env");
  process.exit(1);
}

function resolveChannelMentions(content, guildChannels) {
  if (!content) return content;
  return content.replace(/<#([a-zA-Z0-9_-]+)>/g, (match, slug) => {
    if (/^\d+$/.test(slug)) return match;
    const cleanSlug = slug.toLowerCase();
    const found = guildChannels.find(
      (ch) =>
        ch.name.toLowerCase() === cleanSlug ||
        ch.name.toLowerCase().endsWith(cleanSlug) ||
        ch.name.toLowerCase().includes(cleanSlug)
    );
    return found ? `<#${found.id}>` : match;
  });
}

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

async function main() {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  console.log("Menghubungkan ke bot Discord...");
  await client.login(token);
  const guild = await client.guilds.fetch(guildId);
  console.log(`\n======================================================`);
  console.log(`  MEMULAI SETUP SERVER SOREVI LABS`);
  console.log(`  (Sinkronisasi Otomatis dari folder channel_content/*.md)`);
  console.log(`  Server: ${guild.name} (${guild.id})`);
  console.log(`======================================================\n`);

  const reason = "Sorevi Labs Dynamic MD Setup";

  // 1. Mengatur Role
  console.log("1. Mengatur Role Sorevi Labs...");
  await guild.roles.fetch();
  const allowedRoleNames = new Set(soreviRoleBlueprint.map((r) => r.name));

  for (const role of guild.roles.cache.values()) {
    if (role.id === guild.roles.everyone.id) continue;
    if (role.managed) continue;

    if (!allowedRoleNames.has(role.name)) {
      try {
        await role.delete(reason);
        console.log(`  - Deleted old role: "${role.name}"`);
      } catch (err) {
        console.log(`  ! Skipped role "${role.name}": ${err.message}`);
      }
    }
  }

  await guild.roles.fetch();
  const rolesByName = new Map(guild.roles.cache.map((r) => [r.name, r]));

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
        console.log(`  + Created role: ${spec.name}`);
      } else if (!role.managed) {
        await role.edit({
          color: spec.color,
          hoist: spec.hoist ?? true,
          mentionable: spec.mentionable ?? false,
          reason,
        });
        console.log(`  ~ Updated role: ${spec.name}`);
      }
      if (role) rolesByName.set(spec.name, role);
    } catch (err) {
      console.error(`  x Error setup role ${spec.name}:`, err.message);
    }
  }

  // Sort Hierarchy
  console.log("\n2. Mengurutkan hierarki role...");
  const botHighestPosition = guild.members.me?.roles.highest.position ?? guild.roles.everyone.position;
  const lowestAllowedPosition = guild.roles.everyone.position + 1;

  for (let index = 0; index < soreviRoleBlueprint.length; index += 1) {
    const spec = soreviRoleBlueprint[index];
    const role = rolesByName.get(spec.name);
    if (!role || role.managed) continue;

    const targetPos = Math.max(lowestAllowedPosition, botHighestPosition - 1 - index);
    try {
      await role.setPosition(targetPos, { reason });
    } catch (err) {
      console.log(`  ! Role position notice for ${spec.name}: ${err.message}`);
    }
  }

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

  // 3. Reset Channel
  console.log("\n3. Mereset channel...");
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
        console.log(`  - Deleted: ${channel.name}`);
      } catch (err) {
        console.log(`  x Gagal delete ${channel.name}: ${err.message}`);
      }
    }
  }

  // 4. Membangun Kategori, Channel, dan Mengambil Konten dari file .md
  console.log("\n4. Membangun Kategori, Channel, & Membaca Konten dari channel_content/*.md...");
  const botMember = guild.members.me || await guild.members.fetchMe();
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
    console.log(`\n📁 Kategori: ${catSpec.name}`);

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
        console.log(`  + Channel Dibuat: ${child.name}`);
      } catch (err) {
        if (child.type === "announcement") {
          createdChannel = await guild.channels.create({
            name: child.name,
            type: ChannelType.GuildText,
            parent: category.id,
            permissionOverwrites: childOverwrites.length > 0 ? childOverwrites : undefined,
            reason,
          });
          console.log(`  + Channel Dibuat (text fallback): ${child.name}`);
        }
      }

      if (createdChannel && child.ticketPanel) {
        ticketChannel = createdChannel;
      }

      // Membaca file .md jika ada
      if (createdChannel && child.contentFile) {
        const mdContent = getChannelMarkdownContent(child.contentFile);
        if (mdContent) {
          const chunks = splitMessage(mdContent);
          for (const chunk of chunks) {
            await createdChannel.send({ content: chunk, allowedMentions: { parse: [] } }).catch(() => {});
          }
          console.log(`    📄 Konten dimuat dari: ${child.contentFile}`);
        }
      }
    }
  }

  // 5. POST PANEL TIKET INTERAKTIF
  if (ticketChannel) {
    console.log("\n5. Memasang Panel Tiket Interaktif di # 📩・create-ticket...");
    const embed = ticketService.buildTicketPanelEmbed();
    const components = ticketService.buildTicketPanelComponents();
    await ticketChannel.send({ embeds: [embed], components });
    console.log("  ✅ Panel tiket berhasil diposting!");
  }

  console.log(`\n======================================================`);
  console.log(`🎉 SETUP SELESAI! SEMUA KONTEN .MD BERHASIL DISINKRONISASIKAN!`);
  console.log(`======================================================\n`);

  client.destroy();
}

main().catch((err) => {
  console.error("Fatal Error:", err);
  process.exit(1);
});
