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
const ticketService = require("./ticketService");
const { calculatePaymentDetails, formatRupiah, parseCurrency } = require("../utils/currencyUtils");

const TRANSCRIPTS_DIR = path.resolve(__dirname, "../../transcripts");
if (!fs.existsSync(TRANSCRIPTS_DIR)) {
  fs.mkdirSync(TRANSCRIPTS_DIR, { recursive: true });
}

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .slice(0, 30);
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

async function getOrCreateActiveProjectsCategory(guild) {
  await guild.channels.fetch().catch(() => {});
  let targetCategory = guild.channels.cache.find(
    (c) => c.type === ChannelType.GuildCategory && c.name.includes("ACTIVE PROJECTS")
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
      name: "🚀 ｜ ACTIVE PROJECTS",
      type: ChannelType.GuildCategory,
      permissionOverwrites: catOverwrites,
      reason: "Auto-create Active Projects category",
    });
  }

  return targetCategory;
}

async function getOrCreateCompletedProjectsCategory(guild) {
  await guild.channels.fetch().catch(() => {});
  let targetCategory = guild.channels.cache.find(
    (c) => c.type === ChannelType.GuildCategory && c.name.includes("COMPLETED PROJECTS")
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
      name: "📁 ｜ COMPLETED PROJECTS",
      type: ChannelType.GuildCategory,
      permissionOverwrites: catOverwrites,
      reason: "Auto-create Completed Projects category",
    });
  }

  return targetCategory;
}

function isProjectChannel(channel) {
  if (!channel || !channel.isTextBased() || channel.isVoiceBased()) return false;
  const isInProjectCategory =
    channel.parent &&
    (channel.parent.name.includes("ACTIVE PROJECTS") ||
      channel.parent.name.includes("COMPLETED PROJECTS"));
  const hasProjectPrefix = /^🚀・prj-|^prj-|^📁・prj-|^🛡️・prj-/i.test(channel.name);

  return isInProjectCategory || hasProjectPrefix;
}

async function assignVerifiedClientRole(guild, userId) {
  try {
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return;

    const verifiedRole = guild.roles.cache.find((r) =>
      r.name.includes("Verified Client")
    );
    if (verifiedRole && !member.roles.cache.has(verifiedRole.id)) {
      await member.roles.add(verifiedRole, "Project accepted / active");
    }
  } catch (err) {
    console.error("Gagal memberi role Verified Client:", err.message);
  }
}

function buildProjectControls() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("project_payment")
      .setLabel("Update Pembayaran")
      .setEmoji("💳")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("project_handover")
      .setLabel("Serah Terima & Garansi")
      .setEmoji("🛡️")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("project_complete")
      .setLabel("Selesaikan Proyek")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("project_transcript")
      .setLabel("Export Transkrip")
      .setEmoji("📑")
      .setStyle(ButtonStyle.Secondary)
  );
}

function buildCompleteProjectModal() {
  const modal = new ModalBuilder()
    .setCustomId("modal_project_complete_submit")
    .setTitle("Konfirmasi Penyelesaian Project");

  const notesInput = new TextInputBuilder()
    .setCustomId("input_complete_notes")
    .setLabel("Catatan Penyelesaian / Serah Terima")
    .setPlaceholder("Contoh: Project selesai 100%, ownership map telah ditransfer ke klien...")
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(500)
    .setRequired(false);

  modal.addComponents(new ActionRowBuilder().addComponents(notesInput));
  return modal;
}

function buildPaymentUpdateModal(currentTotal = "", currentDp = "") {
  const modal = new ModalBuilder()
    .setCustomId("modal_project_payment_submit")
    .setTitle("Update Biaya & Pembayaran Project");

  const totalInput = new TextInputBuilder()
    .setCustomId("input_payment_total")
    .setLabel("Total Biaya Proyek")
    .setPlaceholder("Contoh: 500k / 500.000 / 1.5jt")
    .setValue(currentTotal ? currentTotal.toString() : "")
    .setStyle(TextInputStyle.Short)
    .setMaxLength(50)
    .setRequired(true);

  const dpInput = new TextInputBuilder()
    .setCustomId("input_payment_dp")
    .setLabel("Nominal Terbayar / DP Saat Ini")
    .setPlaceholder("Contoh: 250k / 500.000 (Kosongkan jika lunas)")
    .setValue(currentDp ? currentDp.toString() : "")
    .setStyle(TextInputStyle.Short)
    .setMaxLength(50)
    .setRequired(false);

  const notesInput = new TextInputBuilder()
    .setCustomId("input_payment_notes")
    .setLabel("Catatan Perubahan (Add-on / Pelunasan)")
    .setPlaceholder("Contoh: Pelunasan sisa 50% via BCA / + Add-on Team System 300K")
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(500)
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder().addComponents(totalInput),
    new ActionRowBuilder().addComponents(dpInput),
    new ActionRowBuilder().addComponents(notesInput)
  );

  return modal;
}

async function createProjectChannel(guild, {
  projectName,
  clientUser,
  picUser,
  estimation = "5-7 hari kerja",
  totalPrice = "Sesuai kesepakatan",
  dpPaid = null,
  notes = "Tidak ada catatan khusus",
  sourceTicketChannel = null,
  creatorUser = null,
}) {
  const staffRoles = await findStaffRoles(guild);
  const botMember = guild.members.me || (await guild.members.fetchMe());
  const activeCategory = await getOrCreateActiveProjectsCategory(guild);

  const cleanSlug = slugify(projectName) || "custom-project";
  const channelName = `prj-${cleanSlug}`;

  const permissionOverwrites = [
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

  const paymentInfo = calculatePaymentDetails(totalPrice, dpPaid);

  const channelTopic = `Project: ${projectName} | Client: ${clientUser ? `${clientUser.tag} (${clientUser.id})` : "N/A"} | PIC: ${picUser ? `${picUser.tag} (${picUser.id})` : "N/A"} | Estimasi: ${estimation} | Biaya: ${paymentInfo.totalFormatted}`;

  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: activeCategory ? activeCategory.id : null,
    permissionOverwrites,
    topic: channelTopic.slice(0, 1024),
    reason: `Project channel dibuat untuk ${projectName} oleh ${creatorUser ? creatorUser.tag : "Staff"}`,
  });

  const projectEmbed = new EmbedBuilder()
    .setTitle(`INTERNAL PROJECT WORKSPACE: ${projectName.toUpperCase()}`)
    .setDescription(
      `Channel internal koordinasi untuk project **${projectName}**.\n` +
      `Gunakan channel ini untuk tracking progress pengerjaan, file build/place roblox, koordinasi tim developer, dan pencatatan pembayaran.`
    )
    .addFields(
      {
        name: "Client / Pemesan",
        value: clientUser ? `<@${clientUser.id}> (\`${clientUser.tag}\`)` : "Tidak ditentukan",
        inline: true,
      },
      {
        name: "Developer PIC",
        value: picUser ? `<@${picUser.id}> (\`${picUser.tag}\`)` : `<@${creatorUser?.id}>`,
        inline: true,
      },
      {
        name: "Estimasi Pengerjaan",
        value: `\`${estimation}\``,
        inline: true,
      },
      {
        name: "Total Biaya",
        value: `\`${paymentInfo.totalFormatted}\``,
        inline: true,
      },
      {
        name: "DP / Terbayar",
        value: `\`${paymentInfo.dpFormatted}\``,
        inline: true,
      },
      {
        name: "Sisa Tagihan",
        value: `\`${paymentInfo.sisaFormatted}\``,
        inline: true,
      },
      {
        name: "Status Pembayaran",
        value: `${paymentInfo.statusText}`,
        inline: false,
      },
      {
        name: "Channel Tiket Asal",
        value: sourceTicketChannel ? `<#${sourceTicketChannel.id}> (\`#${sourceTicketChannel.name}\`)` : "Dibuat Manual",
        inline: true,
      },
      {
        name: "Scope & Catatan Pengerjaan",
        value: notes || "Tidak ada catatan khusus",
        inline: false,
      }
    )
    .setColor(paymentInfo.isLunas ? 0x2ecc71 : 0x3498db)
    .setFooter({
      text: "Sorevi Labs • Internal Project Workspace",
    })
    .setTimestamp();

  const pingRole = guild.roles.cache.find(
    (r) => r.name.includes("Project Developer") && !r.name.includes("Lead")
  );

  const pings = [
    picUser ? `<@${picUser.id}>` : null,
    pingRole ? `<@&${pingRole.id}>` : null,
  ].filter(Boolean).join(" ");

  await channel.send({
    content: pings.length > 0 ? pings : undefined,
    embeds: [projectEmbed],
  });

  if (clientUser) {
    await assignVerifiedClientRole(guild, clientUser.id);
  }

  const logEmbed = new EmbedBuilder()
    .setTitle("Project Baru Dimulai")
    .addFields(
      { name: "Nama Project", value: projectName, inline: true },
      { name: "Channel Internal", value: `<#${channel.id}>`, inline: true },
      { name: "Client", value: clientUser ? `<@${clientUser.id}> (\`${clientUser.tag}\`)` : "N/A", inline: true },
      { name: "Total Biaya", value: paymentInfo.totalFormatted, inline: true },
      { name: "DP Terbayar", value: paymentInfo.dpFormatted, inline: true },
      { name: "Status Pembayaran", value: paymentInfo.statusText, inline: true }
    )
    .setColor(0x3498db)
    .setTimestamp();

  await ticketService.logToTicketLogs(guild, logEmbed);

  if (creatorUser) {
    await ticketService.logToBotLogs(guild, {
      action: "Start Project",
      userId: creatorUser.id,
      channelId: channel.id,
      details: `Project "${projectName}" (Total: ${paymentInfo.totalFormatted}, DP: ${paymentInfo.dpFormatted})`,
    });
  }

  return channel;
}

async function updateProjectPayment(interaction, { totalInput, dpInput, notes }) {
  const channel = interaction.channel;
  const guild = interaction.guild;

  if (!isProjectChannel(channel)) {
    return interaction.reply({
      content: "Command ini hanya bisa digunakan di dalam channel project internal.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const paymentInfo = calculatePaymentDetails(totalInput, dpInput);

  const updateEmbed = new EmbedBuilder()
    .setTitle("PEMBARUAN RINCIAN PEMBAYARAN PROYEK")
    .setDescription(`Rincian pembayaran untuk project ini telah diperbarui oleh <@${interaction.user.id}>.`)
    .addFields(
      { name: "Total Biaya Baru", value: `\`${paymentInfo.totalFormatted}\``, inline: true },
      { name: "DP / Total Terbayar", value: `\`${paymentInfo.dpFormatted}\``, inline: true },
      { name: "Sisa Tagihan", value: `\`${paymentInfo.sisaFormatted}\``, inline: true },
      { name: "Status Pembayaran", value: `${paymentInfo.statusText}`, inline: false },
      { name: "Catatan Perubahan", value: notes || "Penyesuaian biaya / pembayaran oleh tim developer", inline: false }
    )
    .setColor(paymentInfo.isLunas ? 0x2ecc71 : 0xf1c40f)
    .setFooter({ text: "Sorevi Labs • Financial Tracker" })
    .setTimestamp();

  await channel.send({ embeds: [updateEmbed] });

  if (channel.topic) {
    const updatedTopic = channel.topic.replace(/Biaya:\s*[^|]+/i, `Biaya: ${paymentInfo.totalFormatted}`);
    await channel.setTopic(updatedTopic.slice(0, 1024)).catch(() => {});
  }

  if (channel.topic) {
    const matchTicket = channel.topic.match(/sl-[a-z0-9]+/i);
    if (matchTicket) {
      const ticketCh = guild.channels.cache.find((c) => c.name.toLowerCase() === matchTicket[0].toLowerCase());
      if (ticketCh && ticketCh.isTextBased()) {
        const ticketNotifyEmbed = new EmbedBuilder()
          .setTitle("PEMBARUAN RINCIAN PEMBAYARAN PROYEK")
          .setDescription(`Tim developer telah memperbarui rincian tagihan / status pembayaran proyek Anda:`)
          .addFields(
            { name: "Total Biaya", value: `\`${paymentInfo.totalFormatted}\``, inline: true },
            { name: "Terbayar", value: `\`${paymentInfo.dpFormatted}\``, inline: true },
            { name: "Sisa Tagihan", value: `\`${paymentInfo.sisaFormatted}\``, inline: true },
            { name: "Status", value: `${paymentInfo.statusText}`, inline: false },
            { name: "Keterangan", value: notes || "Penyesuaian tagihan / konfirmasi pelunasan", inline: false }
          )
          .setColor(paymentInfo.isLunas ? 0x2ecc71 : 0xf1c40f)
          .setTimestamp();

        await ticketCh.send({ embeds: [ticketNotifyEmbed] }).catch(() => {});
      }
    }
  }

  const logEmbed = new EmbedBuilder()
    .setTitle("Rincian Pembayaran Diperbarui")
    .addFields(
      { name: "Channel", value: `<#${channel.id}> (\`#${channel.name}\`)`, inline: true },
      { name: "Diperbarui Oleh", value: `${interaction.user.tag} (<@${interaction.user.id}>)`, inline: true },
      { name: "Total Baru", value: paymentInfo.totalFormatted, inline: true },
      { name: "Terbayar", value: paymentInfo.dpFormatted, inline: true },
      { name: "Sisa", value: paymentInfo.sisaFormatted, inline: true },
      { name: "Status", value: paymentInfo.statusText, inline: true },
      { name: "Catatan", value: notes || "Tidak ada catatan", inline: false }
    )
    .setColor(0x3498db)
    .setTimestamp();

  await ticketService.logToTicketLogs(guild, logEmbed);

  await ticketService.logToBotLogs(guild, {
    action: "Update Payment",
    userId: interaction.user.id,
    channelId: channel.id,
    details: `Total: ${paymentInfo.totalFormatted}, Terbayar: ${paymentInfo.dpFormatted}, Sisa: ${paymentInfo.sisaFormatted}`,
  });

  if (interaction.deferred || interaction.replied) {
    await interaction.editReply({
      content: `Rincian pembayaran berhasil diperbarui. Status: **${paymentInfo.statusText}**`,
    });
  } else {
    await interaction.reply({
      content: `Rincian pembayaran berhasil diperbarui. Status: **${paymentInfo.statusText}**`,
      flags: MessageFlags.Ephemeral,
    });
  }
}

async function exportProjectTranscriptMarkdown(channel) {
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

  let mdText = `# Transkrip Project Internal SOREVI LABS: #${channel.name}\n\n`;
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

  const fileName = `transcript-project-${channel.name.replace(/[^a-zA-Z0-9_-]/g, "")}.md`;
  const filePath = path.join(TRANSCRIPTS_DIR, fileName);
  fs.writeFileSync(filePath, mdText, "utf-8");

  return { fileName, filePath, count: allMessages.length };
}

async function completeProject(interaction, notes = "Project selesai & serah terima berhasil") {
  const channel = interaction.channel;
  const guild = interaction.guild;

  if (!isProjectChannel(channel)) {
    return interaction.reply({
      content: "Command ini hanya bisa digunakan di dalam channel project internal.",
      flags: MessageFlags.Ephemeral,
    });
  }

  await interaction.reply({
    content: "Sedang menyelesaikan project, menyimpan transkrip, dan memindahkan ke kategori Completed Projects...",
  });

  try {
    const transcriptInfo = await exportProjectTranscriptMarkdown(channel);
    const completedCategory = await getOrCreateCompletedProjectsCategory(guild);

    const cleanSlug = channel.name.replace(/^[^\w-]+・?/, "").replace(/^prj-/, "");
    await channel.edit({
      name: `📁・prj-${cleanSlug}`,
      parent: completedCategory ? completedCategory.id : null,
      reason: `Project diselesaikan oleh ${interaction.user.tag}: ${notes}`,
    });

    let clientId = null;
    if (channel.topic) {
      const match = channel.topic.match(/Client:\s*.*?\((\d{16,20})\)/i);
      if (match) {
        clientId = match[1];
      }
    }

    if (clientId) {
      await assignVerifiedClientRole(guild, clientId);
    }

    const completeEmbed = new EmbedBuilder()
      .setTitle("PROJECT SELESAI & DIARSIPKAN")
      .setDescription(
        `Project ini telah dinyatakan **SELESAI (Completed)** oleh <@${interaction.user.id}>.\n` +
        `Channel telah dipindahkan ke kategori **COMPLETED PROJECTS**.`
      )
      .addFields(
        { name: "Catatan Penyelesaian", value: notes || "Tidak ada catatan", inline: false },
        { name: "Transkrip Percakapan", value: `\`transcripts/${transcriptInfo.fileName}\` (${transcriptInfo.count} pesan)`, inline: false },
        { name: "Client", value: clientId ? `<@${clientId}>` : "N/A", inline: true }
      )
      .setColor(0x2ecc71)
      .setFooter({ text: "Sorevi Labs • Project Archive" })
      .setTimestamp();

    await channel.send({ embeds: [completeEmbed] });

    const logEmbed = new EmbedBuilder()
      .setTitle("Project Telah Selesai")
      .addFields(
        { name: "Channel", value: `<#${channel.id}> (\`#${channel.name}\`)`, inline: true },
        { name: "Diselesaikan Oleh", value: `${interaction.user.tag} (<@${interaction.user.id}>)`, inline: true },
        { name: "Catatan", value: notes, inline: false },
        { name: "Transkrip Disimpan", value: `\`transcripts/${transcriptInfo.fileName}\``, inline: false }
      )
      .setColor(0x2ecc71)
      .setTimestamp();

    await ticketService.logToTicketLogs(guild, logEmbed);

    await ticketService.logToBotLogs(guild, {
      action: "Complete Project",
      userId: interaction.user.id,
      channelId: channel.id,
      details: `Catatan: ${notes}`,
    });
  } catch (err) {
    console.error("Gagal menyelesaikan project:", err);
    await channel.send({
      content: `Terjadi kesalahan saat menyelesaikan project: ${err.message}`,
    });
  }
}

async function listActiveProjects(guild) {
  const activeCategory = guild.channels.cache.find(
    (c) => c.type === ChannelType.GuildCategory && c.name.includes("ACTIVE PROJECTS")
  );

  if (!activeCategory) {
    return new EmbedBuilder()
      .setTitle("DAFTAR ONGOING PROJECTS SOREVI LABS")
      .setDescription("Kategori Active Projects belum dibuat atau tidak ada project aktif saat ini.")
      .setColor(0x3498db)
      .setTimestamp();
  }

  const projectChannels = guild.channels.cache.filter(
    (c) => c.parentId === activeCategory.id && c.isTextBased()
  );

  if (projectChannels.size === 0) {
    return new EmbedBuilder()
      .setTitle("DAFTAR ONGOING PROJECTS SOREVI LABS")
      .setDescription("Saat ini **tidak ada project aktif** yang sedang berjalan.")
      .setColor(0x3498db)
      .setTimestamp();
  }

  const embed = new EmbedBuilder()
    .setTitle("DAFTAR ONGOING PROJECTS SOREVI LABS")
    .setDescription(`Terdapat **${projectChannels.size} project aktif** yang sedang dikerjakan oleh tim:`)
    .setColor(0x3498db)
    .setFooter({ text: "Sorevi Labs • Active Projects Monitor" })
    .setTimestamp();

  projectChannels.forEach((ch) => {
    const topic = ch.topic || "Tidak ada detail topik";
    embed.addFields({
      name: `#${ch.name}`,
      value: `<#${ch.id}>\n${topic}`,
      inline: false,
    });
  });

  return embed;
}

function buildActiveProjectControlsEmbed(channel) {
  return new EmbedBuilder()
    .setTitle("🚀 KONTROL WORKSPACE PROYEK (ADMIN/STAFF)")
    .setDescription(
      `Panel manajemen proyek untuk channel <#${channel.id}> (\`#${channel.name}\`).\n\n` +
      `• **💳 Update Pembayaran:** Perbarui total harga, catat DP / pelunasan biaya.\n` +
      `• **🛡️ Serah Terima & Garansi:** Serahkan ownership proyek & aktifkan masa garansi (hari/jam).\n` +
      `• **✅ Selesaikan Proyek:** Tandai selesai langsung & pindahkan ke Completed Projects.\n` +
      `• **📑 Export Transkrip:** Simpan riwayat proyek ke file Markdown.`
    )
    .setColor(0x3498db)
    .setFooter({ text: "Sorevi Labs • Project Controls (Ephemeral)" });
}

function buildCompletedProjectControlsEmbed(channel) {
  return new EmbedBuilder()
    .setTitle("📁 KONTROL ARSIP PROYEK (COMPLETED)")
    .setDescription(
      `Channel ini merupakan arsip proyek yang telah selesai (<#${channel.id}>).\n\n` +
      `Gunakan tombol di bawah untuk mengunduh riwayat transkrip atau menghapus channel secara permanen jika sudah selesai.`
    )
    .setColor(0x2ecc71)
    .setFooter({ text: "Sorevi Labs • Completed Project Controls" });
}

module.exports = {
  getOrCreateActiveProjectsCategory,
  getOrCreateCompletedProjectsCategory,
  isProjectChannel,
  assignVerifiedClientRole,
  buildProjectControls,
  buildActiveProjectControlsEmbed,
  buildCompletedProjectControlsEmbed,
  buildCompleteProjectModal,
  buildPaymentUpdateModal,
  updateProjectPayment,
  createProjectChannel,
  exportProjectTranscriptMarkdown,
  completeProject,
  listActiveProjects,
};
