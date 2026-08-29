const {
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require("discord.js");
const ticketService = require("../services/ticketService");
const projectService = require("../services/projectService");
const warrantyService = require("../services/warrantyService");

const data = new SlashCommandBuilder()
  .setName("controls")
  .setDescription("Munculkan tombol panel kontrol interaktif (Khusus Admin/Staff, Ephemeral)")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);

async function execute(interaction) {
  if (!interaction.inGuild()) {
    return interaction.reply({
      content: "Command ini hanya bisa digunakan di dalam server.",
      flags: MessageFlags.Ephemeral,
    });
  }

  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
    return interaction.reply({
      content: "Anda membutuhkan permission `Manage Channels` untuk memunculkan panel kontrol.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const channel = interaction.channel;
  const parentName = channel.parent?.name || "";

  // 1. Deteksi ACTIVE WARRANTY
  if (parentName.includes("ACTIVE WARRANTY")) {
    const embed = warrantyService.buildWarrantyControlsEmbed(channel);
    const components = warrantyService.buildWarrantyControls();
    return interaction.reply({
      embeds: [embed],
      components: [components],
      flags: MessageFlags.Ephemeral,
    });
  }

  // 2. Deteksi COMPLETED PROJECTS
  if (parentName.includes("COMPLETED PROJECTS")) {
    const embed = projectService.buildCompletedProjectControlsEmbed(channel);
    const components = ticketService.buildClosedTicketControls();
    return interaction.reply({
      embeds: [embed],
      components: [components],
      flags: MessageFlags.Ephemeral,
    });
  }

  // 3. Deteksi ACTIVE PROJECTS
  if (
    parentName.includes("ACTIVE PROJECTS") ||
    channel.name.includes("prj-")
  ) {
    const embed = projectService.buildActiveProjectControlsEmbed(channel);
    const components = projectService.buildProjectControls();
    return interaction.reply({
      embeds: [embed],
      components: [components],
      flags: MessageFlags.Ephemeral,
    });
  }

  // 4. Deteksi CLOSED TICKETS
  if (
    parentName.includes("CLOSED TICKETS") ||
    channel.name.startsWith("closed-") ||
    channel.name.startsWith("🔒・")
  ) {
    const embed = ticketService.buildClosedTicketControlsEmbed(channel);
    const components = ticketService.buildClosedTicketControls();
    return interaction.reply({
      embeds: [embed],
      components: [components],
      flags: MessageFlags.Ephemeral,
    });
  }

  // 5. Deteksi ACTIVE TICKETS
  if (
    parentName.includes("ACTIVE TICKETS") ||
    ticketService.isTicketChannel(channel)
  ) {
    const embed = ticketService.buildActiveTicketControlsEmbed(channel);
    const components = ticketService.buildTicketControls();
    return interaction.reply({
      embeds: [embed],
      components: [components],
      flags: MessageFlags.Ephemeral,
    });
  }

  // 6. Channel Tidak Valid
  return interaction.reply({
    content:
      "Command /controls hanya dapat digunakan di dalam channel operasional:\n" +
      "• Channel Tiket Aktif (#sl-...)\n" +
      "• Channel Active Projects (#prj-...)\n" +
      "• Channel Active Warranty\n" +
      "• Channel Completed Projects\n" +
      "• Channel Closed Tickets",
    flags: MessageFlags.Ephemeral,
  });
}

module.exports = {
  data,
  execute,
};
