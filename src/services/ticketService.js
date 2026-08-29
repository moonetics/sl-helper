const crypto = require("crypto");
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

const TRANSCRIPTS_DIR = path.resolve(__dirname, "../../transcripts");
if (!fs.existsSync(TRANSCRIPTS_DIR)) {
  fs.mkdirSync(TRANSCRIPTS_DIR, { recursive: true });
}

const TICKET_TYPES = {
  commission: {
    id: "commission",
    label: "Order Project",
    description: "Order sistem game, map building, model 3D, atau custom project",
    color: 0x3498db,
    prefix: "order",
  },
  bug: {
    id: "bug",
    label: "Bantuan Teknis",
    description: "Konsultasi error script, bug teknis, atau penyesuaian sistem",
    color: 0xe74c3c,
    prefix: "support",
  },
  partner: {
    id: "partner",
    label: "Partnership & Bisnis",
    description: "Kerjasama antar studio, sponsorship, creator, atau investor",
    color: 0xf1c40f,
    prefix: "partner",
  },
  general: {
    id: "general",
    label: "Bantuan Umum / Tanya-tanya",
    description: "Pertanyaan seputar server, role, atau konsultasi umum",
    color: 0x2ecc71,
    prefix: "help",
  },
};

function generateTicketCode() {
  return crypto.randomBytes(4).toString("hex").toLowerCase();
}

function buildTicketPanelEmbed() {
  return new EmbedBuilder()
    .setTitle("🎫 PUSAT LAYANAN & TICKETING SOREVI LABS")
    .setDescription(
      `Selamat datang di **Helpdesk Resmi Sorevi Labs**!\n\n` +
      `Silakan pilih kategori tiket yang sesuai dengan kebutuhan Anda melalui tombol di bawah. Sistem akan membuatkan saluran komunikasi privat langsung dengan tim developer Sorevi Labs.\n\n` +
      `**Kategori Layanan:**\n` +
      `• 🛠️ **Order Project:** Pembuatan sistem, map obstacle/race, model 3D, atau custom project.\n` +
      `• 🔧 **Bantuan Teknis:** Konsultasi error script, bug teknis, atau penyesuaian sistem.\n` +
      `• 🤝 **Partnership & Bisnis:** Penawaran kerjasama dan kolaborasi studio/creator.\n` +
      `• ❓ **Bantuan Umum:** Pertanyaan seputar server atau konsultasi umum.\n\n` +
      `_Harap persiapkan detail pertanyaan atau kebutuhan proyek Anda dengan jelas._`
    )
    .setColor(0x5865f2)
    .setFooter({
      text: "Sorevi Labs • Roblox Development & Service Hub",
    })
    .setTimestamp();
}

function buildTicketPanelComponents() {
  const rowButtons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_open_commission")
      .setLabel("Order Project")
      .setEmoji("🛠️")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("ticket_open_bug")
      .setLabel("Bantuan Teknis")
      .setEmoji("🔧")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("ticket_open_partner")
      .setLabel("Partnership")
      .setEmoji("🤝")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("ticket_open_general")
      .setLabel("Bantuan Umum")
      .setEmoji("❓")
      .setStyle(ButtonStyle.Success)
  );

  return [rowButtons];
}

function buildManualTicketButtons(targetUserId) {
  const rowButtons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`ticket_manual_open_commission_${targetUserId}`)
      .setLabel("Order Project")
      .setEmoji("🛠️")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`ticket_manual_open_bug_${targetUserId}`)
      .setLabel("Bantuan Teknis")
      .setEmoji("🔧")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`ticket_manual_open_partner_${targetUserId}`)
      .setLabel("Partnership")
      .setEmoji("🤝")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`ticket_manual_open_general_${targetUserId}`)
      .setLabel("Bantuan Umum")
      .setEmoji("❓")
      .setStyle(ButtonStyle.Success)
  );

  return [rowButtons];
}

function buildTicketModal(typeKey) {
  const type = TICKET_TYPES[typeKey] || TICKET_TYPES.general;
  const modal = new ModalBuilder()
    .setCustomId(`modal_ticket_submit_${type.id}`)
    .setTitle(`Buat Tiket: ${type.label}`.slice(0, 45));

  const subjectInput = new TextInputBuilder()
    .setCustomId("input_subject")
    .setLabel("Judul / Topik Singkat")
    .setPlaceholder("Contoh: Order Map Summit Kit / Error race timer")
    .setStyle(TextInputStyle.Short)
    .setMaxLength(100)
    .setRequired(true);

  const gameOrProjectInput = new TextInputBuilder()
    .setCustomId("input_project")
    .setLabel("Nama Game / Proyek Terkait (Opsional)")
    .setPlaceholder("Contoh: Project Speed / Custom Racing")
    .setStyle(TextInputStyle.Short)
    .setMaxLength(100)
    .setRequired(false);

  const descriptionInput = new TextInputBuilder()
    .setCustomId("input_description")
    .setLabel("Detail Keterangan / Masalah")
    .setPlaceholder(
      type.id === "commission"
        ? "Contoh: Layanan yang dipesan, catatan request khusus, metode transfer..."
        : "Jelaskan detail kendala, kronologi langkah terjadinya error, atau pertanyaan..."
    )
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(1000)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(subjectInput),
    new ActionRowBuilder().addComponents(gameOrProjectInput),
    new ActionRowBuilder().addComponents(descriptionInput)
  );

  return modal;
}

function buildManualTicketModal(typeKey, targetUserId) {
  const type = TICKET_TYPES[typeKey] || TICKET_TYPES.general;
  const modal = new ModalBuilder()
    .setCustomId(`modal_manual_ticket_submit_${type.id}_${targetUserId}`)
    .setTitle(`Buat Tiket: ${type.label}`.slice(0, 45));

  const subjectInput = new TextInputBuilder()
    .setCustomId("input_subject")
    .setLabel("Judul / Topik Singkat")
    .setPlaceholder("Contoh: Order Map Obstacle / Konsultasi Sistem")
    .setStyle(TextInputStyle.Short)
    .setMaxLength(100)
    .setRequired(true);

  const gameOrProjectInput = new TextInputBuilder()
    .setCustomId("input_project")
    .setLabel("Nama Game / Proyek (Opsional)")
    .setPlaceholder("Contoh: Sorevi Speed / Map Project")
    .setStyle(TextInputStyle.Short)
    .setMaxLength(100)
    .setRequired(false);

  const descriptionInput = new TextInputBuilder()
    .setCustomId("input_description")
    .setLabel("Detail Keterangan / Scope Tiket")
    .setPlaceholder("Catatan tiket pengerjaan yang dibuat oleh staff...")
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(1000)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(subjectInput),
    new ActionRowBuilder().addComponents(gameOrProjectInput),
    new ActionRowBuilder().addComponents(descriptionInput)
  );

  return modal;
}

function buildCloseTicketModal() {
  const modal = new ModalBuilder()
    .setCustomId("modal_ticket_close_submit")
    .setTitle("Konfirmasi Penutupan Tiket");

  const reasonInput = new TextInputBuilder()
    .setCustomId("input_close_reason")
    .setLabel("Alasan Penutupan Tiket (Opsional)")
    .setPlaceholder("Contoh: Masalah terselesaikan / Project telah selesai")
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(500)
    .setRequired(false);

  modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
  return modal;
}

function buildTicketControls() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_accept")
      .setLabel("Accept Project")
      .setEmoji("🚀")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("ticket_transcript")
      .setLabel("Export Transkrip")
      .setEmoji("📑")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("ticket_close")
      .setLabel("Tutup Tiket")
      .setEmoji("🔒")
      .setStyle(ButtonStyle.Danger)
  );
}

function buildAcceptTicketModal(defaultProjectName = "") {
  const modal = new ModalBuilder()
    .setCustomId("modal_ticket_accept_submit")
    .setTitle("Terima Proyek & Mulai Pengerjaan");

  const nameInput = new TextInputBuilder()
    .setCustomId("input_accept_name")
    .setLabel("Nama Project")
    .setPlaceholder("Contoh: Mount DRP / Speed Racing")
    .setValue(defaultProjectName.slice(0, 100) || "")
    .setStyle(TextInputStyle.Short)
    .setMaxLength(100)
    .setRequired(true);

  const totalInput = new TextInputBuilder()
    .setCustomId("input_accept_total")
    .setLabel("Total Biaya Proyek")
    .setPlaceholder("Contoh: 500k / 500.000 / 1.5jt")
    .setStyle(TextInputStyle.Short)
    .setMaxLength(50)
    .setRequired(true);

  const dpInput = new TextInputBuilder()
    .setCustomId("input_accept_dp")
    .setLabel("Nominal DP / Terbayar Saat Ini")
    .setPlaceholder("Contoh: 250k (Kosongkan jika langsung lunas)")
    .setStyle(TextInputStyle.Short)
    .setMaxLength(50)
    .setRequired(false);

  const estimationInput = new TextInputBuilder()
    .setCustomId("input_accept_estimation")
    .setLabel("Estimasi Pengerjaan")
    .setPlaceholder("Contoh: 5-7 hari kerja")
    .setValue("5-7 hari kerja")
    .setStyle(TextInputStyle.Short)
    .setMaxLength(100)
    .setRequired(false);

  const notesInput = new TextInputBuilder()
    .setCustomId("input_accept_notes")
    .setLabel("Scope & Catatan Detail Pengerjaan")
    .setPlaceholder("Contoh: 10 CP obstacle, Summit kit + Leaderboard, garansi 7 hari...")
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(1000)
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder().addComponents(nameInput),
    new ActionRowBuilder().addComponents(totalInput),
    new ActionRowBuilder().addComponents(dpInput),
    new ActionRowBuilder().addComponents(estimationInput),
    new ActionRowBuilder().addComponents(notesInput)
  );

  return modal;
}

async function findStaffRoles(guild) {
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

async function getOrCreateActiveTicketsCategory(guild) {
  await guild.channels.fetch().catch(() => {});
  let targetCategory = guild.channels.cache.find(
    (c) => c.type === ChannelType.GuildCategory && c.name.includes("ACTIVE TICKETS")
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
      name: "🎫 ｜ ACTIVE TICKETS",
      type: ChannelType.GuildCategory,
      permissionOverwrites: catOverwrites,
      reason: "Auto-create Active Tickets category",
    });
  }

  return targetCategory;
}

async function getOrCreateClosedTicketsCategory(guild) {
  await guild.channels.fetch().catch(() => {});
  let targetCategory = guild.channels.cache.find(
    (c) => c.type === ChannelType.GuildCategory && c.name.includes("CLOSED TICKETS")
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
        ],
      })),
    ];

    targetCategory = await guild.channels.create({
      name: "🔒 ｜ CLOSED TICKETS",
      type: ChannelType.GuildCategory,
      permissionOverwrites: catOverwrites,
      reason: "Auto-create Closed Tickets category",
    });
  }

  return targetCategory;
}

async function logToTicketLogs(guild, embed) {
  try {
    const logChannel = guild.channels.cache.find(
      (c) => c.isTextBased() && c.name.includes("ticket-logs")
    );
    if (logChannel) {
      await logChannel.send({ embeds: [embed] });
    }
  } catch (error) {
    console.error("Gagal mengirim log ke ticket-logs:", error.message);
  }
}

async function logToBotLogs(guild, { action, userId, channelId, details }) {
  try {
    const logChannel = guild.channels.cache.find(
      (c) => c.isTextBased() && c.name.includes("bot-logs")
    );
    if (logChannel) {
      const logEmbed = new EmbedBuilder()
        .setTitle("Log Aktivitas Bot")
        .addFields(
          { name: "Aksi", value: action || "Unknown", inline: true },
          { name: "User", value: userId ? `<@${userId}>` : "System", inline: true },
          { name: "Channel", value: channelId ? `<#${channelId}>` : "N/A", inline: true }
        )
        .setColor(0x5865f2)
        .setTimestamp();

      if (details) {
        logEmbed.addFields({ name: "Keterangan", value: details, inline: false });
      }

      await logChannel.send({ embeds: [logEmbed] });
    }
  } catch (error) {
    console.error("Gagal mengirim log ke bot-logs:", error.message);
  }
}

function isTicketChannel(channel) {
  if (!channel || !channel.isTextBased() || channel.isVoiceBased()) return false;
  const isInTicketCategory =
    channel.parent &&
    (channel.parent.name.includes("ACTIVE TICKETS") ||
      channel.parent.name.includes("ACTIVE WARRANTY") ||
      channel.parent.name.includes("CLOSED TICKETS") ||
      channel.parent.name.includes("HELPDESK"));
  const hasTicketPrefix = /^🎫・sl-|^sl-|^order-|^support-|^partner-|^help-|^closed-sl-|^🔒・sl-/i.test(
    channel.name
  );

  return isInTicketCategory || hasTicketPrefix;
}

async function createTicketChannel(guild, user, typeKey, formData = {}) {
  const type = TICKET_TYPES[typeKey] || TICKET_TYPES.general;
  const ticketCode = generateTicketCode();
  const channelName = `🎫・sl-${ticketCode}`;

  const staffRoles = await findStaffRoles(guild);
  const botMember = guild.members.me || (await guild.members.fetchMe());
  const activeCategory = await getOrCreateActiveTicketsCategory(guild);

  const permissionOverwrites = [
    {
      id: guild.roles.everyone?.id || guild.id,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    {
      id: user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
      ],
    },
    {
      id: botMember.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
      ],
    },
    ...staffRoles.map((role) => ({
      id: role.id,
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

  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: activeCategory ? activeCategory.id : null,
    permissionOverwrites,
    topic: `Tiket ID: ${ticketCode.toUpperCase()} | Pembuat: ${user.tag} (${user.id}) | Kategori: ${type.label}`,
    reason: `Tiket baru dibuka oleh ${user.tag}`,
  });

  const embed = new EmbedBuilder()
    .setTitle(`TIKET: ${type.label.toUpperCase()} [${ticketCode.toUpperCase()}]`)
    .setDescription(
      `Halo <@${user.id}>, selamat datang di saluran komunikasi tiket Anda!\n\n` +
      `Tim developer kami telah diberitahu dan akan segera merespon kebutuhan Anda. Silakan sampaikan pertanyaan atau detail proyek Anda dengan jelas.`
    )
    .addFields(
      { name: "📋 Pembuat Tiket", value: `<@${user.id}> (\`${user.tag}\`)`, inline: true },
      { name: "🏷️ Kategori", value: `${type.label}`, inline: true },
      { name: "🔑 Kode Tiket", value: `\`${ticketCode.toUpperCase()}\``, inline: true }
    )
    .setColor(type.color)
    .setFooter({ text: "Sorevi Labs • Helpdesk & Ticketing" })
    .setTimestamp();

  if (formData.subject) {
    embed.addFields({ name: "📌 Judul / Topik", value: formData.subject, inline: false });
  }
  if (formData.project) {
    embed.addFields({ name: "🎮 Nama Game / Proyek", value: formData.project, inline: true });
  }
  if (formData.description) {
    embed.addFields({ name: "📝 Catatan / Keterangan", value: formData.description, inline: false });
  }

  const projectDevRole = guild.roles.cache.find(
    (r) => r.name.includes("Project Developer") && !r.name.includes("Lead")
  ) || staffRoles.first();

  const pingContent = `<@${user.id}> ${projectDevRole ? `<@&${projectDevRole.id}>` : ""}`;

  await channel.send({
    content: pingContent.trim(),
    embeds: [embed],
  });

  const logEmbed = new EmbedBuilder()
    .setTitle("Tiket Baru Dibuka")
    .addFields(
      { name: "Kode Tiket", value: `\`${ticketCode.toUpperCase()}\``, inline: true },
      { name: "Channel", value: `<#${channel.id}>`, inline: true },
      { name: "Kategori", value: type.label, inline: true },
      { name: "Pembuat", value: `${user.tag} (<@${user.id}>)`, inline: false }
    )
    .setColor(type.color)
    .setTimestamp();

  await logToTicketLogs(guild, logEmbed);

  return channel;
}

async function exportTranscriptMarkdown(channel) {
  let allMessages = [];
  let lastId;

  while (true) {
    const options = { limit: 100 };
    if (lastId) options.before = lastId;

    const messages = await channel.messages.fetch(options);
    if (messages.size === 0) break;

    allMessages.push(...messages.values());
    lastId = messages.last().id;

    if (messages.size < 100) break;
  }

  allMessages.reverse();

  let mdText = `# Transkrip Tiket SOREVI LABS: #${channel.name}\n\n`;
  mdText += `* **Topik:** ${channel.topic || "Tidak ada"}\n`;
  mdText += `* **Waktu Export:** ${new Date().toISOString()}\n`;
  mdText += `* **Total Pesan:** ${allMessages.length}\n\n`;
  mdText += `---\n\n`;

  for (const msg of allMessages) {
    const time = msg.createdAt.toISOString();
    const author = `${msg.author.tag} (${msg.author.id})`;
    const content = msg.content || "(Embed / Attachment)";
    mdText += `### [${time}] ${author}\n${content}\n\n`;
  }

  const safeName = channel.name.replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = `transcript-${safeName}.md`;
  const filePath = path.join(TRANSCRIPTS_DIR, fileName);
  fs.writeFileSync(filePath, mdText, "utf-8");

  return { fileName, filePath, count: allMessages.length };
}

async function closeTicket(interaction, reason = "Tidak ada alasan yang diberikan") {
  if (!isTicketChannel(interaction.channel)) {
    return interaction.reply({
      content: "Command ini hanya bisa digunakan di dalam channel tiket aktif.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const channel = interaction.channel;
  const guild = interaction.guild;

  await interaction.reply({
    content: "Tiket sedang ditutup dan diarsipkan ke kategori Closed. Transkrip chat .md sedang disimpan...",
  });

  try {
    const transcriptInfo = await exportTranscriptMarkdown(channel);
    const closedCategory = await getOrCreateClosedTicketsCategory(guild);

    const staffRoles = await findStaffRoles(guild);
    const botMember = guild.members.me || (await guild.members.fetchMe());

    const closedOverwrites = [
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
        ],
      })),
    ];

    const cleanName = channel.name.replace(/^[^\w-]+・?/, "");
    await channel.edit({
      name: `🔒・${cleanName}`,
      parent: closedCategory ? closedCategory.id : null,
      permissionOverwrites: closedOverwrites,
      reason: `Tiket ditutup oleh ${interaction.user.tag}: ${reason}`,
    });

    const closeEmbed = new EmbedBuilder()
      .setTitle("Tiket Telah Ditutup & Diarsipkan")
      .setDescription(
        `Tiket ini telah resmi ditutup oleh <@${interaction.user.id}>.\n` +
        `Hak akses member telah dicabut dan riwayat percakapan telah disimpan di server lokal.`
      )
      .addFields(
        { name: "Alasan Penutupan", value: reason, inline: false },
        { name: "File Transkrip Lokal", value: `\`transcripts/${transcriptInfo.fileName}\``, inline: false }
      )
      .setColor(0x7f8c8d)
      .setTimestamp();

    await channel.send({ embeds: [closeEmbed] });

    const logEmbed = new EmbedBuilder()
      .setTitle("Tiket Ditutup & Diarsipkan")
      .addFields(
        { name: "Nama Channel", value: `<#${channel.id}> (\`#${channel.name}\`)`, inline: true },
        { name: "Ditutup Oleh", value: `${interaction.user.tag} (<@${interaction.user.id}>)`, inline: true },
        { name: "Alasan", value: reason, inline: false },
        { name: "Transkrip Disimpan", value: `\`transcripts/${transcriptInfo.fileName}\` (${transcriptInfo.count} pesan)`, inline: false }
      )
      .setColor(0xe74c3c)
      .setTimestamp();

    await logToTicketLogs(guild, logEmbed);

    await logToBotLogs(guild, {
      action: "Tutup Tiket",
      userId: interaction.user.id,
      channelId: channel.id,
      details: `Alasan: ${reason}`,
    });

    try {
      const warrantyService = require("./warrantyService");
      warrantyService.handleManualTicketClose(channel.id);
    } catch {}
  } catch (err) {
    console.error("Gagal menutup tiket:", err);
    await channel.send({
      content: `Terjadi error saat mengarsipkan tiket: ${err.message}`,
    });
  }
}

async function acceptTicketAsProject(interaction, { projectName, estimation, totalPrice, dpPaid, picUserId, notes }) {
  const channel = interaction.channel;
  const guild = interaction.guild;

  if (!isTicketChannel(channel)) {
    return interaction.reply({
      content: "Aksi ini hanya bisa dijalankan di dalam channel tiket aktif.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const { calculatePaymentDetails } = require("../utils/currencyUtils");
  const paymentInfo = calculatePaymentDetails(totalPrice, dpPaid);
  const projectService = require("./projectService");

  // Deteksi pembuat tiket dari channel topic
  let clientUser = null;
  if (channel.topic) {
    const match = channel.topic.match(/Pembuat:\s*.*?\((\d{16,20})\)/i);
    if (match) {
      clientUser = await guild.client.users.fetch(match[1]).catch(() => null);
    }
  }

  // Jika tidak ditemukan dari topic, cari dari permission overwrites non-bot
  if (!clientUser) {
    const nonStaffOverwrite = channel.permissionOverwrites.cache.find(
      (po) => po.type === 1 && po.id !== guild.client.user.id
    );
    if (nonStaffOverwrite) {
      clientUser = await guild.client.users.fetch(nonStaffOverwrite.id).catch(() => null);
    }
  }

  // Tentukan PIC
  let picUser = interaction.user;
  if (picUserId) {
    const cleanId = picUserId.replace(/[<@!>]/g, "").trim();
    if (cleanId) {
      const fetchedPic = await guild.client.users.fetch(cleanId).catch(() => null);
      if (fetchedPic) picUser = fetchedPic;
    }
  }

  // Dapatkan Kategori ACTIVE PROJECTS
  const activeProjectsCategory = await projectService.getOrCreateActiveProjectsCategory(guild);

  // 1. Pindahkan dan rename channel yang sama ke 🚀・prj-<slug>
  const slug = projectName
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .slice(0, 30) || "custom-project";
  const newChannelName = `🚀・prj-${slug}`;

  const channelTopic = `Project: ${projectName} | Client: ${clientUser ? `${clientUser.tag} (${clientUser.id})` : "N/A"} | PIC: ${picUser ? `${picUser.tag} (${picUser.id})` : "N/A"} | Estimasi: ${estimation || "5-7 hari kerja"} | Biaya: ${paymentInfo.totalFormatted}`;

  await channel.edit({
    name: newChannelName,
    parent: activeProjectsCategory ? activeProjectsCategory.id : null,
    topic: channelTopic.slice(0, 1024),
    reason: `Tiket di-accept menjadi project aktif oleh ${interaction.user.tag}`,
  });

  // 2. Beri role Verified Client ke klien
  if (clientUser) {
    await projectService.assignVerifiedClientRole(guild, clientUser.id);
  }

  // 3. Kirim embed pengerjaan di dalam channel (tanpa bocoran /controls)
  const projectAcceptEmbed = new EmbedBuilder()
    .setTitle(`PROJECT WORKSPACE: ${projectName.toUpperCase()}`)
    .setDescription(
      `Pesanan proyek **${projectName}** telah resmi masuk ke slot pengerjaan Sorevi Labs.\n` +
      `Channel ini telah dialihkan ke kategori **ACTIVE PROJECTS**. Klien dan tim developer dapat berkolaborasi di sini.\n\n` +
      `📌 **Status Pengerjaan:** Dalam Pengerjaan (In Progress)\n` +
      `⏱️ **Estimasi Pengerjaan:** \`${estimation || "5-7 hari kerja"}\`\n` +
      `💻 **Developer PIC:** <@${picUser.id}> (\`${picUser.tag}\`)\n` +
      `💰 **Total Biaya:** \`${paymentInfo.totalFormatted}\`\n` +
      `💵 **DP / Terbayar:** \`${paymentInfo.dpFormatted}\`\n` +
      `📊 **Sisa Tagihan:** \`${paymentInfo.sisaFormatted}\`\n` +
      `💳 **Status Tagihan:** ${paymentInfo.statusText}\n` +
      `📝 **Catatan / Scope:** ${notes || "Sesuai diskusi tiket"}\n\n` +
      `_Tim developer kami akan terus membagikan pembaruan progres di saluran ini._`
    )
    .setColor(paymentInfo.isLunas ? 0x2ecc71 : 0x3498db)
    .setFooter({ text: "Sorevi Labs • Active Project Workspace" })
    .setTimestamp();

  await channel.send({
    content: clientUser ? `<@${clientUser.id}>` : undefined,
    embeds: [projectAcceptEmbed],
  });

  // 4. Log ke ticket-logs & bot-logs
  const logEmbed = new EmbedBuilder()
    .setTitle("Project Dimulai")
    .addFields(
      { name: "Nama Project", value: projectName, inline: true },
      { name: "Channel", value: `<#${channel.id}> (\`#${newChannelName}\`)`, inline: true },
      { name: "Client", value: clientUser ? `<@${clientUser.id}>` : "N/A", inline: true },
      { name: "PIC", value: `<@${picUser.id}>`, inline: true },
      { name: "Total Biaya", value: paymentInfo.totalFormatted, inline: true },
      { name: "DP", value: paymentInfo.dpFormatted, inline: true }
    )
    .setColor(0x3498db)
    .setTimestamp();

  await logToTicketLogs(guild, logEmbed);

  await logToBotLogs(guild, {
    action: "Accept Project",
    userId: interaction.user.id,
    channelId: channel.id,
    details: `Project "${projectName}" dipindahkan ke Active Projects`,
  });

  if (interaction.deferred || interaction.replied) {
    await interaction.editReply({
      content: `Proyek **${projectName}** berhasil diterima. Channel telah dipindahkan ke kategori **ACTIVE PROJECTS** (#${newChannelName}).`,
    });
  } else {
    await interaction.reply({
      content: `Proyek **${projectName}** berhasil diterima. Channel telah dipindahkan ke kategori **ACTIVE PROJECTS** (#${newChannelName}).`,
      flags: MessageFlags.Ephemeral,
    });
  }
}

async function handoverTicket(interaction, { projectName, notes, durationDays }) {
  const channel = interaction.channel;
  const guild = interaction.guild;

  if (!isTicketChannel(channel)) {
    return interaction.reply({
      content: "Aksi ini hanya bisa dijalankan di dalam channel tiket aktif.",
      flags: MessageFlags.Ephemeral,
    });
  }

  let clientUser = null;
  if (channel.topic) {
    const match = channel.topic.match(/Pembuat:\s*.*?\((\d{16,20})\)/i);
    if (match) {
      clientUser = await guild.client.users.fetch(match[1]).catch(() => null);
    }
  }
  if (!clientUser) {
    const nonStaffOverwrite = channel.permissionOverwrites.cache.find(
      (po) => po.type === 1 && po.id !== guild.client.user.id
    );
    if (nonStaffOverwrite) {
      clientUser = await guild.client.users.fetch(nonStaffOverwrite.id).catch(() => null);
    }
  }

  const warrantyService = require("./warrantyService");
  const pName = projectName || (channel.topic?.match(/Topik:\s*([^|]+)/i)?.[1]?.trim()) || channel.name.replace(/^sl-/, "Project ");

  await warrantyService.startWarranty(guild, {
    ticketChannel: channel,
    clientUser,
    picUser: interaction.user,
    projectName: pName,
    notes: notes || "Ownership place / project telah diserahterimakan kepada klien.",
    durationDays: durationDays || 7,
    actorUser: interaction.user,
  });

  if (interaction.deferred || interaction.replied) {
    await interaction.editReply({
      content: `Masa garansi & full support resmi diaktifkan selama ${durationDays || 7} hari untuk **${pName}**.`,
    });
  } else {
    await interaction.reply({
      content: `Masa garansi & full support resmi diaktifkan selama ${durationDays || 7} hari untuk **${pName}**.`,
      flags: MessageFlags.Ephemeral,
    });
  }
}

function buildActiveTicketControlsEmbed(channel) {
  return new EmbedBuilder()
    .setTitle("🎫 KONTROL TIKET OPERASIONAL (ADMIN/STAFF)")
    .setDescription(
      `Panel manajemen operasional untuk channel tiket <#${channel.id}> (\`#${channel.name}\`).\n\n` +
      `• **🚀 Accept Project:** Terima pesanan & pindahkan channel ke Active Projects.\n` +
      `• **📑 Export Transkrip:** Simpan riwayat percakapan ke file Markdown.\n` +
      `• **🔒 Tutup Tiket:** Tutup tiket & pindahkan ke Closed Tickets jika non-proyek.`
    )
    .setColor(0x3498db)
    .setFooter({ text: "Sorevi Labs • Ticket Controls (Ephemeral)" });
}

function buildClosedTicketControls() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_transcript")
      .setLabel("Download Transkrip")
      .setEmoji("📑")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("closed_ticket_delete")
      .setLabel("Hapus Channel Permanen")
      .setEmoji("🗑️")
      .setStyle(ButtonStyle.Danger)
  );
}

function buildClosedTicketControlsEmbed(channel) {
  return new EmbedBuilder()
    .setTitle("🔒 KONTROL ARSIP TIKET (CLOSED)")
    .setDescription(
      `Channel ini merupakan tiket yang telah ditutup (<#${channel.id}>).\n\n` +
      `Gunakan tombol di bawah untuk mengunduh riwayat transkrip atau menghapus channel secara permanen jika sudah selesai.`
    )
    .setColor(0x7f8c8d)
    .setFooter({ text: "Sorevi Labs • Closed Ticket Controls" });
}

async function deleteClosedTicket(interaction) {
  const channel = interaction.channel;
  const isClosed =
    channel.name.startsWith("closed-") ||
    (channel.parent && channel.parent.name.includes("CLOSED TICKETS"));

  if (!isClosed) {
    return interaction.reply({
      content: "Hanya channel tiket yang sudah ditutup/diarsipkan yang dapat dihapus.",
      flags: MessageFlags.Ephemeral,
    });
  }

  await interaction.reply({
    content: "Channel tiket ini akan dihapus secara permanen dalam 5 detik...",
  });

  setTimeout(async () => {
    try {
      await channel.delete("Dihapus permanen oleh staff");
    } catch (err) {
      console.error("Gagal menghapus closed ticket:", err.message);
    }
  }, 5000);
}

module.exports = {
  TICKET_TYPES,
  buildTicketPanelEmbed,
  buildTicketPanelComponents,
  buildManualTicketButtons,
  buildTicketModal,
  buildManualTicketModal,
  buildCloseTicketModal,
  buildTicketControls,
  buildActiveTicketControlsEmbed,
  buildClosedTicketControls,
  buildClosedTicketControlsEmbed,
  buildAcceptTicketModal,
  acceptTicketAsProject,
  handoverTicket,
  createTicketChannel,
  exportTranscriptMarkdown,
  closeTicket,
  deleteClosedTicket,
  isTicketChannel,
  logToBotLogs,
  logToTicketLogs,
};
