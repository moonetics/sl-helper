const {
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require("discord.js");
const ticketService = require("../services/ticketService");

const data = new SlashCommandBuilder()
  .setName("ticket")
  .setDescription("Sistem pembuatan dan panel tiket Sorevi Labs")
  .addSubcommand((sub) =>
    sub
      .setName("panel")
      .setDescription("Pasang panel pembuatan tiket interaktif di channel saat ini")
  )
  .addSubcommand((sub) =>
    sub
      .setName("create")
      .setDescription("Buka tiket manual untuk seorang member (khusus staff)")
      .addUserOption((opt) =>
        opt
          .setName("user")
          .setDescription("Target member yang dibuatkan tiket")
          .setRequired(true)
      )
  );

async function execute(interaction) {
  if (!interaction.inGuild()) {
    return interaction.reply({
      content: "Command ini hanya bisa digunakan di dalam server.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const sub = interaction.options.getSubcommand();

  // 1. SUBCOMMAND: PANEL
  if (sub === "panel") {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
      return interaction.reply({
        content: "Anda membutuhkan permission `Manage Channels` untuk memasang panel tiket.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const embed = ticketService.buildTicketPanelEmbed();
    const components = ticketService.buildTicketPanelComponents();

    await interaction.channel.send({
      embeds: [embed],
      components,
    });

    return interaction.reply({
      content: "Panel tiket berhasil dipasang di channel ini.",
      flags: MessageFlags.Ephemeral,
    });
  }

  // 2. SUBCOMMAND: CREATE (Manual oleh Staff)
  if (sub === "create") {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
      return interaction.reply({
        content: "Anda membutuhkan permission `Manage Channels` untuk membuat tiket manual.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const targetUser = interaction.options.getUser("user");
    const components = ticketService.buildManualTicketButtons(targetUser.id);

    return interaction.reply({
      content: `Pilih kategori tiket yang ingin dibuatkan untuk <@${targetUser.id}>:`,
      components,
      flags: MessageFlags.Ephemeral,
    });
  }
}

module.exports = {
  data,
  execute,
};
