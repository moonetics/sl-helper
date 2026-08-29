const fs = require("fs");
const path = require("path");
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  MessageFlags,
  ModalBuilder,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const ticketService = require("./ticketService");
const projectService = require("./projectService");
const { parseDuration, modifyDuration } = require("../utils/currencyUtils");

const DB_PATH = path.resolve(__dirname, "../data/warranties.json");

function loadWarranties() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
      fs.writeFileSync(DB_PATH, JSON.stringify([], null, 2), "utf-8");
      return [];
    }
    const raw = fs.readFileSync(DB_PATH, "utf-8");
    return JSON.parse(raw) || [];
  } catch (err) {
    console.error("Gagal membaca warranties.json:", err.message);
    return [];
  }
}

function saveWarranties(data) {
  try {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Gagal menyimpan warranties.json:", err.message);
  }
}

async function findStaffRoles(guild) {
  await guild.roles.fetch().catch(() => {});
  const staffRoleKeywords = [
    "founder",
    "lead project developer",
    "project developer",
    "head of support",
    "builder",
    "3d modeler",
    "ui/ux",
    "qa",
  ];

  return guild.roles.cache.filter((role) =>
    staffRoleKeywords.some((keyword) => role.name.toLowerCase().includes(keyword))
  );
}

async function getOrCreateActiveWarrantyCategory(guild) {
  await guild.channels.fetch().catch(() => {});
  let targetCategory = guild.channels.cache.find(
    (c) => c.type === ChannelType.GuildCategory && c.name.includes("ACTIVE WARRANTY")
  );

  if (!targetCategory) {
    const staffRoles = await findStaffRoles(guild);
    const botMember = guild.members.me || (await guild.members.fetchMe());

    const catOverwrites = [
      {
        id: guild.roles.everyone?.id || guild.id,
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: botMember.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ManageChannels,
          PermissionFlagsBits.ManageMessages,
        ],
      },
      ...staffRoles.map((r) => ({
        id: r.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageMessages,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks,
        ],
      })),
    ];

    targetCategory = await guild.channels.create({
      name: "🛡️ ｜ ACTIVE WARRANTY",
      type: ChannelType.GuildCategory,
      permissionOverwrites: catOverwrites,
      reason: "Auto-create Active Warranty category",
    });
  }

  return targetCategory;
}

function buildHandoverModal(defaultProjectName = "") {
  const modal = new ModalBuilder()
    .setCustomId("modal_handover_submit")
    .setTitle("Serah Terima Proyek & Garansi");

  const projectNameInput = new TextInputBuilder()
    .setCustomId("input_handover_name")
    .setLabel("Nama Proyek")
    .setPlaceholder("Contoh: Mount DRP / Speed Racing")
    .setValue(defaultProjectName.slice(0, 100) || "")
    .setStyle(TextInputStyle.Short)
    .setMaxLength(100)
    .setRequired(true);

  const durationInput = new TextInputBuilder()
    .setCustomId("input_handover_days")
    .setLabel("Durasi Garansi (Hari / Jam)")
    .setPlaceholder("Contoh: 7d / 7 hari / 24h / 48 jam / 12h")
    .setValue("7d")
    .setStyle(TextInputStyle.Short)
    .setMaxLength(20)
    .setRequired(false);

  const notesInput = new TextInputBuilder()
    .setCustomId("input_handover_notes")
    .setLabel("Catatan Serah Terima (Link Place / File)")
    .setPlaceholder("Contoh: Ownership place Roblox telah ditransfer ke akun klien, file backup terlampir...")
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(1000)
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder().addComponents(projectNameInput),
    new ActionRowBuilder().addComponents(durationInput),
    new ActionRowBuilder().addComponents(notesInput)
  );

  return modal;
}

function buildWarrantyModifyModal() {
  const modal = new ModalBuilder()
    .setCustomId("modal_warranty_modify_submit")
    .setTitle("Sesuaikan Masa Garansi Proyek");

  const durationInput = new TextInputBuilder()
    .setCustomId("input_modify_duration")
    .setLabel("Penyesuaian Durasi (+ / - / set)")
    .setPlaceholder("Contoh: +3d, -24h, set 14d, atau 7d")
    .setStyle(TextInputStyle.Short)
    .setMaxLength(50)
    .setRequired(true);

  const reasonInput = new TextInputBuilder()
    .setCustomId("input_modify_reason")
    .setLabel("Catatan / Alasan Penyesuaian")
    .setPlaceholder("Contoh: Kompensasi revisi tambahan / perbaikan bug")
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(500)
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder().addComponents(durationInput),
    new ActionRowBuilder().addComponents(reasonInput)
  );

  return modal;
}

function buildWarrantyControls() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("warranty_status")
      .setLabel("Sisa Waktu Garansi")
      .setEmoji("⏱️")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("warranty_modify")
      .setLabel("Sesuaikan Masa Garansi")
      .setEmoji("⏳")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("warranty_complete")
      .setLabel("Selesaikan Garansi & Selesai")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("ticket_transcript")
      .setLabel("Export Transkrip")
      .setEmoji("📑")
      .setStyle(ButtonStyle.Secondary)
  );
}

function buildWarrantyControlsEmbed(channel) {
  const warranties = loadWarranties();
  const activeWar = warranties.find(
    (w) => w.channelId === channel.id && w.status === "active"
  );

  const expiryTimestamp = activeWar
    ? `<t:${Math.floor(activeWar.expiryTime / 1000)}:R>`
    : "Sesuai jadwal serah terima";

  return new EmbedBuilder()
    .setTitle("🛡️ KONTROL MASA GARANSI & SUPPORT (ADMIN/STAFF)")
    .setDescription(
      `Channel ini sedang berada dalam masa **Garansi & Full Support Resmi**.\n\n` +
      `⏳ **Batas Akhir Garansi:** ${expiryTimestamp}\n\n` +
      `• **⏱️ Sisa Waktu Garansi:** Cek sisa waktu garansi yang sedang berjalan.\n` +
      `• **⏳ Sesuaikan Masa Garansi:** Tambah, kurangi, atau atur ulang total durasi garansi.\n` +
      `• **✅ Selesaikan Garansi & Selesai:** Selesaikan masa garansi & arsipkan ke Completed Projects.\n` +
      `• **📑 Export Transkrip:** Simpan riwayat transkrip ke file Markdown.`
    )
    .setColor(0x2ecc71)
    .setFooter({ text: "Sorevi Labs • Warranty Controls (Ephemeral)" });
}

async function startWarranty(guild, {
  channel,
  clientUser,
  picUser,
  projectName = "Custom Project",
  notes = "Ownership map / asset telah diserahkan ke klien.",
  durationInput = "7d",
  actorUser = null,
}) {
  const durationInfo = parseDuration(durationInput);
  const now = Date.now();
  const expiryTime = now + durationInfo.ms;
  const expirySeconds = Math.floor(expiryTime / 1000);

  const warrantyCategory = await getOrCreateActiveWarrantyCategory(guild);

  const cleanSlug = channel.name.replace(/^[^\w-]+・?/, "").replace(/^prj-/, "");
  const newChannelName = `🛡️・prj-${cleanSlug}`;

  try {
    await channel.edit({
      parent: warrantyCategory ? warrantyCategory.id : null,
      reason: `Proyek diserahterimakan, masa garansi ${durationInfo.durationText} dimulai oleh ${actorUser ? actorUser.tag : "Staff"}`,
    });
  } catch (err) {
    console.error("Gagal memindahkan parent channel ke ACTIVE WARRANTY:", err.message);
  }

  if (channel.name !== newChannelName) {
    try {
      await channel.setName(newChannelName, "Rename channel to warranty");
    } catch (err) {
      console.warn("Info: Discord rename rate limit (2x per 10 menit), nama channel akan di-update otomatis nanti.");
    }
  }

  const warrantyEmbed = new EmbedBuilder()
    .setTitle("🛡️ MASA GARANSI & FULL SUPPORT RESMI DIAKTIFKAN")
    .setDescription(
      `Halo ${clientUser ? `<@${clientUser.id}>` : "Klien"}! Proyek **${projectName}** telah resmi diserahterimakan.\n\n` +
      `Sesuai komitmen layanan Sorevi Labs, channel ini kini dialihkan ke masa **Garansi & Full Support Resmi selama ${durationInfo.durationText}**.\n\n` +
      `⏳ **Batas Akhir Garansi:** <t:${expirySeconds}:F> (<t:${expirySeconds}:R>)\n` +
      `💻 **Developer PIC:** ${picUser ? `<@${picUser.id}>` : "Tim Sorevi Labs"}\n\n` +
      `**Cakupan Garansi & Full Support:**\n` +
      `• Penanganan perbaikan bug / error script tanpa biaya tambahan.\n` +
      `• Bantuan penyesuaian teknis & konsultasi pengoperasian sistem.\n` +
      `• Pendampingan hingga sistem berjalan stabil di game Anda.\n\n` +
      `**Catatan Serah Terima:**\n` +
      `${notes}\n\n` +
      `_Channel ini akan tetap aktif untuk diskusi selama masa garansi. Setelah masa garansi selesai, channel akan dipindahkan ke kategori COMPLETED PROJECTS (Read-Only)._`
    )
    .setColor(0x2ecc71)
    .setFooter({
      text: `Sorevi Labs • ${durationInfo.durationText} Official Warranty & Support`,
    })
    .setTimestamp();

  await channel.send({
    content: clientUser ? `<@${clientUser.id}>` : undefined,
    embeds: [warrantyEmbed],
  });

  const warranties = loadWarranties();
  // Deactivate any existing active record for this channel
  for (const w of warranties) {
    if (w.channelId === channel.id && w.status === "active") {
      w.status = "superseded";
    }
  }

  const warrantyRecord = {
    id: `war_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    channelId: channel.id,
    projectName,
    clientId: clientUser ? clientUser.id : null,
    picId: picUser ? picUser.id : actorUser?.id,
    startTime: now,
    expiryTime,
    durationText: durationInfo.durationText,
    notes,
    status: "active",
  };

  warranties.push(warrantyRecord);
  saveWarranties(warranties);

  const logEmbed = new EmbedBuilder()
    .setTitle("Masa Garansi Diaktifkan")
    .addFields(
      { name: "Nama Project", value: projectName, inline: true },
      { name: "Channel", value: `<#${channel.id}> (\`#${newChannelName}\`)`, inline: true },
      { name: "Client", value: clientUser ? `<@${clientUser.id}>` : "N/A", inline: true },
      { name: "Masa Garansi", value: `${durationInfo.durationText} (s/d <t:${expirySeconds}:R>)`, inline: false },
      { name: "PIC", value: picUser ? `<@${picUser.id}>` : "N/A", inline: true }
    )
    .setColor(0x2ecc71)
    .setTimestamp();

  await ticketService.logToTicketLogs(guild, logEmbed);

  if (actorUser) {
    await ticketService.logToBotLogs(guild, {
      action: "Start Warranty",
      userId: actorUser.id,
      channelId: channel.id,
      details: `Project "${projectName}" garansi ${durationInfo.durationText}`,
    });
  }

  return warrantyRecord;
}

async function modifyWarranty(guild, { channel, inputStr, reason, actorUser }) {
  const warranties = loadWarranties();
  const activeWar = warranties.find(
    (w) => w.channelId === channel.id && w.status === "active"
  );

  if (!activeWar) {
    throw new Error("Tidak ditemukan catatan garansi aktif untuk channel ini.");
  }

  const modResult = modifyDuration(activeWar.expiryTime, inputStr);
  activeWar.expiryTime = modResult.newExpiryMs;
  saveWarranties(warranties);

  const newExpirySec = Math.floor(modResult.newExpiryMs / 1000);

  const notifyEmbed = new EmbedBuilder()
    .setTitle("🛡️ PEMBARUAN MASA GARANSI PROYEK")
    .setDescription(
      `Masa garansi untuk proyek **${activeWar.projectName}** telah disesuaikan oleh <@${actorUser.id}>.\n\n` +
      `📊 **Penyesuaian:** \`${modResult.changeText}\`\n` +
      `⏳ **Batas Akhir Garansi Baru:** <t:${newExpirySec}:F> (<t:${newExpirySec}:R>)\n` +
      `📝 **Alasan / Catatan:** ${reason || "Penyesuaian jadwal garansi oleh staf"}`
    )
    .setColor(0x3498db)
    .setFooter({ text: "Sorevi Labs • Warranty Schedule Updated" })
    .setTimestamp();

  await channel.send({ embeds: [notifyEmbed] });

  const logEmbed = new EmbedBuilder()
    .setTitle("Masa Garansi Disesuaikan")
    .addFields(
      { name: "Project", value: activeWar.projectName, inline: true },
      { name: "Channel", value: `<#${channel.id}> (\`#${channel.name}\`)`, inline: true },
      { name: "Disesuaikan Oleh", value: `${actorUser.tag} (<@${actorUser.id}>)`, inline: true },
      { name: "Perubahan", value: modResult.changeText, inline: true },
      { name: "Batas Baru", value: `<t:${newExpirySec}:R>`, inline: true },
      { name: "Alasan", value: reason || "Tidak ada alasan", inline: false }
    )
    .setColor(0x3498db)
    .setTimestamp();

  await ticketService.logToTicketLogs(guild, logEmbed);

  await ticketService.logToBotLogs(guild, {
    action: "Modify Warranty",
    userId: actorUser.id,
    channelId: channel.id,
    details: `Project "${activeWar.projectName}" -> ${modResult.changeText}`,
  });

  return modResult;
}

async function completeWarrantyAndArchiveToCompleted(channel, guild, { projectName, clientId, actorUser = null, notes = "" }) {
  const completedCategory = await projectService.getOrCreateCompletedProjectsCategory(guild);
  const staffRoles = await findStaffRoles(guild);
  const botMemberId = guild.client?.user?.id || guild.members.me?.id;

  // Set Overwrites: Client Read-Only, Staff Full Manage, Everyone Deny
  const completedOverwrites = [
    {
      id: guild.roles.everyone?.id || guild.id,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    {
      id: botMemberId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ManageMessages,
      ],
    },
    ...staffRoles.map((r) => ({
      id: r.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageMessages,
      ],
    })),
  ];

  if (clientId) {
    completedOverwrites.push({
      id: clientId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.ReadMessageHistory,
      ],
      deny: [
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.AddReactions,
        PermissionFlagsBits.CreatePublicThreads,
        PermissionFlagsBits.CreatePrivateThreads,
        PermissionFlagsBits.SendMessagesInThreads,
      ],
    });

    await projectService.assignVerifiedClientRole(guild, clientId);
  }

  let transcriptInfo = { fileName: "transcript.md", count: 0 };
  try {
    transcriptInfo = await ticketService.exportTranscriptMarkdown(channel);
  } catch (err) {
    console.error("Gagal export transcript saat penyelesaian garansi:", err.message);
  }

  const cleanSlug = channel.name.replace(/^[^\w-]+・?/, "").replace(/^prj-/, "");
  const newChannelName = `📁・prj-${cleanSlug}`;

  // 1. Pindahkan parent kategori
  if (completedCategory) {
    try {
      await channel.setParent(completedCategory.id, { lockPermissions: false });
    } catch (err) {
      console.error("Gagal setParent channel:", err.message);
    }
  }

  // 2. Set permission overwrites Read-Only
  try {
    await channel.permissionOverwrites.set(completedOverwrites);
  } catch (err) {
    console.error("Gagal set permissionOverwrites channel:", err.message);
  }

  // 3. Rename channel secara terpisah (graceful jika kena Discord rename rate-limit 2x/10m)
  if (channel.name !== newChannelName) {
    try {
      await channel.setName(newChannelName, "Rename channel to completed");
    } catch (err) {
      console.warn("Info: Discord rename rate limit (2x per 10 menit), nama channel akan di-update otomatis nanti.");
    }
  }

  // 4. Pastikan status di warranties.json menjadi completed
  const warranties = loadWarranties();
  let warUpdated = false;
  for (const w of warranties) {
    if (w.channelId === channel.id && w.status === "active") {
      w.status = "completed";
      warUpdated = true;
    }
  }
  if (warUpdated) {
    saveWarranties(warranties);
  }

  const completeEmbed = new EmbedBuilder()
    .setTitle("✅ PROJECT SELESAI & DIARSIPKAN")
    .setDescription(
      `Masa garansi dan pengerjaan untuk proyek **${projectName}** telah resmi **SELESAI**.\n` +
      `Channel ini telah dialihkan ke kategori **COMPLETED PROJECTS** dengan akses **Read-Only** untuk klien agar riwayat diskusi dan file serah terima tetap dapat dibaca.\n\n` +
      `Terima kasih telah mempercayakan pengerjaan proyek Roblox Anda kepada **Sorevi Labs**!`
    )
    .addFields(
      { name: "Status Channel", value: "Diarsipkan (Read-Only)", inline: true },
      { name: "Transkrip Percakapan", value: `\`transcripts/${transcriptInfo.fileName}\` (${transcriptInfo.count} pesan)`, inline: false },
      { name: "Catatan Akhir", value: notes || "Pengerjaan & masa garansi selesai secara tuntas", inline: false }
    )
    .setColor(0x2ecc71)
    .setFooter({ text: "Sorevi Labs • Completed Project Archive" })
    .setTimestamp();

  await channel.send({ embeds: [completeEmbed] });

  const logEmbed = new EmbedBuilder()
    .setTitle("Project Selesai & Diarsipkan")
    .addFields(
      { name: "Project", value: projectName, inline: true },
      { name: "Channel", value: `<#${channel.id}> (\`#${newChannelName}\`)`, inline: true },
      { name: "Client", value: clientId ? `<@${clientId}>` : "N/A", inline: true },
      { name: "Transkrip Disimpan", value: `\`transcripts/${transcriptInfo.fileName}\``, inline: false }
    )
    .setColor(0x2ecc71)
    .setTimestamp();

  await ticketService.logToTicketLogs(guild, logEmbed);

  await ticketService.logToBotLogs(guild, {
    action: "Complete Project Warranty",
    userId: actorUser ? actorUser.id : guild.client.user.id,
    channelId: channel.id,
    details: `Project "${projectName}" selesai & diarsipkan ke COMPLETED PROJECTS`,
  });
}

function handleManualTicketClose(channelId) {
  const warranties = loadWarranties();
  let modified = false;

  for (const w of warranties) {
    if (w.channelId === channelId && w.status === "active") {
      w.status = "closed";
      modified = true;
    }
  }

  if (modified) {
    saveWarranties(warranties);
  }
}

async function checkExpiredWarranties(client) {
  const warranties = loadWarranties();
  const now = Date.now();
  let modified = false;

  for (const item of warranties) {
    if (item.status !== "active") continue;
    if (now < item.expiryTime) continue;

    console.log(`[Warranty] Masa garansi berakhir untuk project: "${item.projectName}" (channel: ${item.channelId}). Memindahkan ke COMPLETED PROJECTS...`);
    item.status = "completed";
    modified = true;

    try {
      if (!item.channelId) continue;
      const channel = await client.channels.fetch(item.channelId).catch(() => null);
      if (!channel || !channel.isTextBased()) continue;

      const guild = channel.guild;
      if (!guild) continue;

      await completeWarrantyAndArchiveToCompleted(channel, guild, {
        projectName: item.projectName,
        clientId: item.clientId,
        actorUser: null,
        notes: "Masa garansi berakhir secara otomatis",
      });
      console.log(`[Warranty] Sukses memindahkan channel #${channel.name} ke COMPLETED PROJECTS.`);
    } catch (err) {
      console.error(`Error auto-expiring warranty untuk channel ${item.channelId}:`, err.message);
    }
  }

  if (modified) {
    saveWarranties(warranties);
  }
}

async function endWarrantyEarly(interaction) {
  const channel = interaction.channel;
  const guild = interaction.guild;

  const warranties = loadWarranties();
  const activeWar = warranties.find(
    (w) => w.channelId === channel.id && w.status === "active"
  );

  let pName = activeWar?.projectName || channel.name.replace(/^🛡️・prj-|^prj-/, "").replace(/-/g, " ");
  let cId = activeWar?.clientId || null;

  if (!cId && channel.topic) {
    const cMatch = channel.topic.match(/Client:\s*.*?\((\d{16,20})\)/i);
    if (cMatch) cId = cMatch[1];
  }

  if (activeWar) {
    activeWar.status = "completed";
    saveWarranties(warranties);
  }

  await interaction.reply({
    content: "Sedang menyelesaikan garansi dan memindahkan channel ke COMPLETED PROJECTS (Read-Only untuk klien)...",
    flags: MessageFlags.Ephemeral,
  });

  try {
    await completeWarrantyAndArchiveToCompleted(channel, guild, {
      projectName: pName,
      clientId: cId,
      actorUser: interaction.user,
      notes: `Masa garansi diselesaikan lebih awal oleh ${interaction.user.tag}`,
    });

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({
        content: `Masa garansi project **${pName}** telah selesai. Channel telah dipindahkan ke **COMPLETED PROJECTS**.`,
      });
    }
  } catch (err) {
    console.error("Gagal menyelesaikan garansi:", err);
    await interaction.editReply({
      content: `Terjadi error saat menyelesaikan garansi: ${err.message}`,
    });
  }
}

function getWarrantyStatus(channelId) {
  const warranties = loadWarranties();
  return warranties.find(
    (w) => w.channelId === channelId && w.status === "active"
  );
}

module.exports = {
  getOrCreateActiveWarrantyCategory,
  buildHandoverModal,
  buildWarrantyModifyModal,
  buildWarrantyControls,
  buildWarrantyControlsEmbed,
  startWarranty,
  modifyWarranty,
  completeWarrantyAndArchiveToCompleted,
  endWarrantyEarly,
  getWarrantyStatus,
  handleManualTicketClose,
  checkExpiredWarranties,
};
