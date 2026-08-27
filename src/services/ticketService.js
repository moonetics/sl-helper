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
    emoji: "🛠️",
    description: "Order sistem game, map building, model 3D, atau custom project",
    color: 0x3498db,
    prefix: "order",
  },
  bug: {
    id: "bug",
    label: "Bantuan Teknis",
    emoji: "🔧",
    description: "Konsultasi error script, bug teknis, atau penyesuaian sistem",
    color: 0xe74c3c,
    prefix: "support",
  },
  partner: {
    id: "partner",
    label: "Partnership & Bisnis",
    emoji: "🤝",
    description: "Kerjasama antar studio, sponsorship, creator, atau investor",
    color: 0xf1c40f,
    prefix: "partner",
  },
  general: {
    id: "general",
    label: "Bantuan Umum / Tanya-tanya",
    emoji: "❓",
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
      `Silakan pilih kategori tiket yang sesuai dengan kebutuhan Anda melalui tombol di bawah. Sistem kami akan membuatkan saluran komunikasi privat langsung dengan tim developer Sorevi Labs.\n\n` +
      `**Kategori Layanan:**\n` +
      `🛠️ **Order Project:** Pembuatan sistem, map obstacle/race, model 3D, atau custom project.\n` +
      `🔧 **Bantuan Teknis:** Konsultasi error script, bug teknis, atau penyesuaian sistem.\n` +
      `🤝 **Partnership & Bisnis:** Penawaran kerjasama dan kolaborasi studio/creator.\n` +
      `❓ **Bantuan Umum:** Pertanyaan seputar server atau konsultasi umum.\n\n` +
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
    .setTitle(`${type.emoji} Buat Tiket: ${type.label}`.slice(0, 45));

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
    .setLabel("Catatan / Keterangan (Opsional)")
    .setPlaceholder("Tuliskan catatan tambahan untuk tiket ini...")
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(1000)
    .setRequired(false);

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
    .setLabel("Alasan Penutupan Tiket")
    .setPlaceholder("Contoh: Pengerjaan selesai / Masalah teratasi / Dibatalkan")
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(300)
    .setRequired(false);

  modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
  return modal;
}

function buildTicketControls() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_claim")
      .setLabel("Claim Tiket")
      .setEmoji("🙋‍♂️")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("ticket_transcript")
      .setLabel("Export Transcript")
      .setEmoji("📑")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("ticket_close")
      .setLabel("Tutup Tiket")
      .setEmoji("🔒")
      .setStyle(ButtonStyle.Danger)
  );
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
  ];

  return guild.roles.cache.filter((role) =>
    staffRoleKeywords.some((keyword) => role.name.toLowerCase().includes(keyword))
  );
}

async function getOrCreateActiveTicketsCategory(guild) {
  let targetCategory = guild.channels.cache.find(
    (c) => c.type === ChannelType.GuildCategory && c.name.includes("ACTIVE TICKETS")
  );

  if (!targetCategory) {
    const staffRoles = await findStaffRoles(guild);
    const botMember = guild.members.me || (await guild.members.fetchMe());

    const catOverwrites = [
      {
        id: guild.roles.everyone.id,
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
      name: "🎫｜✦ ACTIVE TICKETS ✦",
      type: ChannelType.GuildCategory,
      permissionOverwrites: catOverwrites,
      reason: "Auto-create Active Tickets category",
    });
  }

  return targetCategory;
}

async function getOrCreateClosedTicketsCategory(guild) {
  let targetCategory = guild.channels.cache.find(
    (c) => c.type === ChannelType.GuildCategory && c.name.includes("CLOSED TICKETS")
  );

  if (!targetCategory) {
    const staffRoles = await findStaffRoles(guild);
    const botMember = guild.members.me || (await guild.members.fetchMe());

    const catOverwrites = [
      {
        id: guild.roles.everyone.id,
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
      name: "📁｜✦ CLOSED TICKETS ✦",
      type: ChannelType.GuildCategory,
      permissionOverwrites: catOverwrites,
      reason: "Auto-create Closed Tickets category",
    });
  }

  return targetCategory;
}

function isTicketChannel(channel) {
  if (!channel || !channel.isTextBased() || channel.isVoiceBased()) return false;
  const isCodeName = /^sl-[a-z0-9]{6,12}$/i.test(channel.name);
  const isClosedCodeName = /^closed-sl-[a-z0-9]{6,12}$/i.test(channel.name);
  const isInTicketCategory =
    channel.parent &&
    (channel.parent.name.includes("ACTIVE TICKETS") ||
      channel.parent.name.includes("CLOSED TICKETS") ||
      channel.parent.name.includes("HELPDESK & TICKETING") ||
      channel.parent.name.includes("TICKETING"));

  return isCodeName || isClosedCodeName || isInTicketCategory;
}

/**
 * Mengelompokkan log ke # 📊・bot-logs (maks 10 baris per embed)
 */
async function logToBotLogs(guild, entry) {
  try {
    const logChannel = guild.channels.cache.find(
      (c) => c.name.includes("bot-logs") && c.isTextBased()
    );
    if (!logChannel) return;

    const timeStr = `<t:${Math.floor(Date.now() / 1000)}:T>`;
    const logLine = `• **[${timeStr}]** \`${entry.action}\` oleh <@${entry.userId}> di <#${entry.channelId}>${entry.details ? ` (${entry.details})` : ""}`;

    const recentMessages = await logChannel.messages.fetch({ limit: 5 });
    const botMsg = recentMessages.find((m) => m.author.id === guild.client.user.id && m.embeds.length > 0);

    if (botMsg && botMsg.embeds.length > 0) {
      const currentEmbed = botMsg.embeds[0];
      const existingLines = currentEmbed.description ? currentEmbed.description.split("\n").filter((l) => l.trim().length > 0) : [];

      if (existingLines.length < 10) {
        existingLines.push(logLine);
        const updatedEmbed = EmbedBuilder.from(currentEmbed)
          .setDescription(existingLines.join("\n\n"))
          .setTimestamp();
        await botMsg.edit({ embeds: [updatedEmbed] });
        return;
      }
    }

    // Jika belum ada pesan atau sudah mencapai 10 entri, buat pesan embed baru
    const newEmbed = new EmbedBuilder()
      .setTitle("📊 AUDIT & BOT COMMAND LOGS")
      .setDescription(logLine)
      .setColor(0x5865f2)
      .setFooter({ text: "Sorevi Labs • Realtime Audit Log" })
      .setTimestamp();

    await logChannel.send({ embeds: [newEmbed] });
  } catch (err) {
    console.error("Gagal mencatat log ke bot-logs:", err.message);
  }
}

async function logToTicketLogs(guild, embed) {
  try {
    const logChannel = guild.channels.cache.find(
      (c) => c.name.includes("ticket-logs") && c.isTextBased()
    );
    if (logChannel) {
      await logChannel.send({ embeds: [embed] });
    }
  } catch (err) {
    console.error("Gagal mengirim log ke ticket-logs:", err.message);
  }
}

async function createTicketChannel(guild, user, typeKey, formData = {}) {
  const type = TICKET_TYPES[typeKey] || TICKET_TYPES.general;
  const staffRoles = await findStaffRoles(guild);
  const botMember = guild.members.me || (await guild.members.fetchMe());
  const targetCategory = await getOrCreateActiveTicketsCategory(guild);

  const ticketCode = generateTicketCode();
  const channelName = `sl-${ticketCode}`;

  const permissionOverwrites = [
    {
      id: guild.roles.everyone.id,
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
    parent: targetCategory ? targetCategory.id : null,
    permissionOverwrites,
    topic: `Tiket ID: ${ticketCode.toUpperCase()} | Pembuat: ${user.tag} (${user.id}) | Kategori: ${type.label}`,
    reason: `Tiket baru dibuka oleh ${user.tag}`,
  });

  const embed = new EmbedBuilder()
    .setTitle(`${type.emoji} TIKET: ${type.label.toUpperCase()} [${ticketCode.toUpperCase()}]`)
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
    .setFooter({ text: "Sorevi Labs • Gunakan tombol di bawah untuk mengelola tiket" })
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

  // Ping HANYA user pembuat dan role Project Developer
  const projectDevRole = guild.roles.cache.find(
    (r) => r.name.includes("Project Developer") && !r.name.includes("Lead")
  ) || staffRoles.first();

  const pingContent = `<@${user.id}> ${projectDevRole ? `<@&${projectDevRole.id}>` : ""}`;

  await channel.send({
    content: pingContent.trim(),
    embeds: [embed],
    components: [buildTicketControls()],
  });

  // Log ke ticket-logs
  const logEmbed = new EmbedBuilder()
    .setTitle("🎫 Tiket Baru Dibuka")
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

async function claimTicket(interaction) {
  if (!isTicketChannel(interaction.channel)) {
    return interaction.reply({
      content: "Command ini hanya bisa digunakan di dalam channel tiket aktif.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const claimEmbed = new EmbedBuilder()
    .setDescription(`🙋‍♂️ Tiket ini telah **diklaim** oleh <@${interaction.user.id}> (\`${interaction.user.tag}\`). Tim developer kami akan segera mendampingi kebutuhan Anda.`)
    .setColor(0x2ecc71)
    .setTimestamp();

  await interaction.reply({ embeds: [claimEmbed] });

  // Log ke bot-logs
  await logToBotLogs(interaction.guild, {
    action: "Claim Tiket",
    userId: interaction.user.id,
    channelId: interaction.channel.id,
    details: "Tiket diklaim",
  });
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

  const fileName = `transcript-${channel.name}.md`;
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
    content: "🔒 Tiket sedang ditutup dan diarsipkan ke kategori Closed. Transkrip chat `.md` sedang disimpan...",
  });

  try {
    // 1. Export Transkrip ke file .md lokal
    const transcriptInfo = await exportTranscriptMarkdown(channel);

    // 2. Dapatkan / Buat Kategori Closed Tickets
    const closedCategory = await getOrCreateClosedTicketsCategory(guild);

    // 3. Cabut hak akses member pembuat tiket (semua member non-staff)
    const staffRoles = await findStaffRoles(guild);
    const botMember = guild.members.me || (await guild.members.fetchMe());

    const closedOverwrites = [
      {
        id: guild.roles.everyone.id,
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

    // Pindahkan channel ke kategori Closed dan set izin baru
    await channel.edit({
      parent: closedCategory ? closedCategory.id : null,
      permissionOverwrites: closedOverwrites,
      reason: `Tiket ditutup oleh ${interaction.user.tag}: ${reason}`,
    });

    // 4. Kirim embed konfirmasi penutupan di channel tiket
    const closeEmbed = new EmbedBuilder()
      .setTitle("📁 Tiket Telah Ditutup & Diarsipkan")
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

    // 5. Kirim log penutupan ke # 📊・ticket-logs
    const logEmbed = new EmbedBuilder()
      .setTitle("🔒 Tiket Ditutup & Diarsipkan")
      .addFields(
        { name: "Nama Channel", value: `<#${channel.id}> (\`#${channel.name}\`)`, inline: true },
        { name: "Ditutup Oleh", value: `${interaction.user.tag} (<@${interaction.user.id}>)`, inline: true },
        { name: "Alasan", value: reason, inline: false },
        { name: "Transkrip Disimpan", value: `\`transcripts/${transcriptInfo.fileName}\` (${transcriptInfo.count} pesan)`, inline: false }
      )
      .setColor(0xe74c3c)
      .setTimestamp();

    await logToTicketLogs(guild, logEmbed);

    // 6. Log aksi ke # 📊・bot-logs
    await logToBotLogs(guild, {
      action: "Tutup Tiket",
      userId: interaction.user.id,
      channelId: channel.id,
      details: `Alasan: ${reason}`,
    });
  } catch (err) {
    console.error("Gagal menutup tiket:", err);
    await channel.send({
      content: `⚠️ Terjadi error saat mengarsipkan tiket: ${err.message}`,
    });
  }
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
  createTicketChannel,
  claimTicket,
  exportTranscriptMarkdown,
  closeTicket,
  isTicketChannel,
  logToBotLogs,
  logToTicketLogs,
};
