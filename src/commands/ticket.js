const {
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require("discord.js");
const ticketService = require("../services/ticketService");

const data = new SlashCommandBuilder()
  .setName("ticket")
  .setDescription("Manajemen sistem ticketing Sorevi Labs")
  .addSubcommand((sub) =>
    sub
      .setName("panel")
      .setDescription("Kirim panel embed pembuat tiket di channel saat ini")
  )
  .addSubcommand((sub) =>
    sub
      .setName("create")
      .setDescription("Buat tiket baru secara manual untuk member tertentu")
      .addUserOption((opt) =>
        opt
          .setName("user")
          .setDescription("Member yang ingin dibuatkan tiket")
          .setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("close")
      .setDescription("Tutup tiket saat ini dan arsipkan")
      .addStringOption((opt) =>
        opt
          .setName("reason")
          .setDescription("Alasan penutupan tiket")
          .setRequired(false)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("add")
      .setDescription("Tambahkan member ke tiket saat ini")
      .addUserOption((opt) =>
        opt
          .setName("user")
          .setDescription("Member yang ingin ditambahkan ke tiket")
          .setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("remove")
      .setDescription("Keluarkan member dari tiket saat ini")
      .addUserOption((opt) =>
        opt
          .setName("user")
          .setDescription("Member yang ingin dikeluarkan dari tiket")
          .setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("claim")
      .setDescription("Klaim tiket saat ini oleh developer")
  );

async function execute(interaction) {
  if (!interaction.inGuild()) {
    return interaction.reply({
      content: "Command ini hanya bisa digunakan di dalam server.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const sub = interaction.options.getSubcommand();
  const guild = interaction.guild;
  const channel = interaction.channel;

  // 1. SUBCOMMAND: PANEL
  if (sub === "panel") {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
      return interaction.reply({
        content: "Anda membutuhkan permission `Manage Channels` untuk mengirim panel tiket.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const embed = ticketService.buildTicketPanelEmbed();
    const components = ticketService.buildTicketPanelComponents();
    await interaction.channel.send({ embeds: [embed], components });

    await ticketService.logToBotLogs(guild, {
      action: "/ticket panel",
      userId: interaction.user.id,
      channelId: channel.id,
      details: "Panel tiket dipasang",
    });

    return interaction.reply({
      content: "✅ Panel tiket berhasil dikirim ke channel ini.",
      flags: MessageFlags.Ephemeral,
    });
  }

  // 2. SUBCOMMAND: CREATE (Manual by staff)
  if (sub === "create") {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({
        content: "Anda membutuhkan permission `Manage Messages` untuk membuatkan tiket bagi member lain.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const targetUser = interaction.options.getUser("user");
    if (!targetUser) {
      return interaction.reply({
        content: "Member target tidak ditemukan.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const buttons = ticketService.buildManualTicketButtons(targetUser.id);
    return interaction.reply({
      content: `Pilih kategori tiket yang ingin dibuatkan untuk <@${targetUser.id}> (\`${targetUser.tag}\`):`,
      components: buttons,
      flags: MessageFlags.Ephemeral,
    });
  }

  // VALIDASI KETAT: Subcommand di bawah ini HANYA bisa dijalankan di dalam channel tiket aktif!
  if (!ticketService.isTicketChannel(channel)) {
    return interaction.reply({
      content: "❌ Command ini hanya bisa digunakan di dalam channel tiket aktif (`sl-xxxxxxxx`).",
      flags: MessageFlags.Ephemeral,
    });
  }

  // 3. SUBCOMMAND: CLOSE
  if (sub === "close") {
    const reason = interaction.options.getString("reason") || "Pengerjaan selesai / Masalah teratasi";
    return ticketService.closeTicket(interaction, reason);
  }

  // 4. SUBCOMMAND: ADD
  if (sub === "add") {
    const targetUser = interaction.options.getUser("user");
    if (!targetUser) {
      return interaction.reply({
        content: "User tidak ditemukan.",
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      await channel.permissionOverwrites.edit(targetUser.id, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
        AttachFiles: true,
        EmbedLinks: true,
      });

      await interaction.reply({
        content: `✅ <@${targetUser.id}> telah ditambahkan ke dalam tiket ini oleh <@${interaction.user.id}>.`,
      });

      await ticketService.logToBotLogs(guild, {
        action: "/ticket add",
        userId: interaction.user.id,
        channelId: channel.id,
        details: `Menambahkan <@${targetUser.id}>`,
      });
    } catch (err) {
      return interaction.reply({
        content: `Gagal menambahkan member: ${err.message}`,
        flags: MessageFlags.Ephemeral,
      });
    }
    return;
  }

  // 5. SUBCOMMAND: REMOVE
  if (sub === "remove") {
    const targetUser = interaction.options.getUser("user");
    if (!targetUser) {
      return interaction.reply({
        content: "User tidak ditemukan.",
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      await channel.permissionOverwrites.delete(targetUser.id);

      await interaction.reply({
        content: `✅ <@${targetUser.id}> telah dikeluarkan dari tiket ini oleh <@${interaction.user.id}>.`,
      });

      await ticketService.logToBotLogs(guild, {
        action: "/ticket remove",
        userId: interaction.user.id,
        channelId: channel.id,
        details: `Mengeluarkan <@${targetUser.id}>`,
      });
    } catch (err) {
      return interaction.reply({
        content: `Gagal mengeluarkan member: ${err.message}`,
        flags: MessageFlags.Ephemeral,
      });
    }
    return;
  }

  // 6. SUBCOMMAND: CLAIM
  if (sub === "claim") {
    return ticketService.claimTicket(interaction);
  }
}

module.exports = {
  data,
  execute,
};
