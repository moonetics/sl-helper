const {
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require("discord.js");
const projectService = require("../services/projectService");

const data = new SlashCommandBuilder()
  .setName("project")
  .setDescription("Manajemen dan monitoring project Sorevi Labs")
  .addSubcommand((sub) =>
    sub
      .setName("list")
      .setDescription("Lihat semua daftar project aktif yang sedang berjalan")
  )
  .addSubcommand((sub) =>
    sub
      .setName("create")
      .setDescription("Buat channel project internal baru di bawah ACTIVE PROJECTS")
      .addStringOption((opt) =>
        opt
          .setName("name")
          .setDescription("Nama Proyek (contoh: Mount DRP / Speed Racing)")
          .setRequired(true)
      )
      .addUserOption((opt) =>
        opt
          .setName("client")
          .setDescription("Member / Klien pemesan project")
          .setRequired(true)
      )
      .addStringOption((opt) =>
        opt
          .setName("total")
          .setDescription("Total Biaya Proyek (contoh: 500k / 500.000 / 1.5jt)")
          .setRequired(false)
      )
      .addStringOption((opt) =>
        opt
          .setName("dp")
          .setDescription("Nominal DP / Terbayar Saat Ini (contoh: 250k / kosongkan jika lunas)")
          .setRequired(false)
      )
      .addStringOption((opt) =>
        opt
          .setName("estimasi")
          .setDescription("Estimasi pengerjaan (contoh: 5-7 hari kerja)")
          .setRequired(false)
      )
      .addUserOption((opt) =>
        opt
          .setName("pic")
          .setDescription("Developer PIC penanggung jawab (default: diri sendiri)")
          .setRequired(false)
      )
      .addStringOption((opt) =>
        opt
          .setName("notes")
          .setDescription("Scope & catatan detail pengerjaan")
          .setRequired(false)
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
  const guild = interaction.guild;

  // 1. SUBCOMMAND: LIST
  if (sub === "list") {
    const embed = await projectService.listActiveProjects(guild);
    return interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
  }

  // 2. SUBCOMMAND: CREATE
  if (sub === "create") {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
      return interaction.reply({
        content: "Anda membutuhkan permission `Manage Channels` untuk membuat channel project baru.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const projectName = interaction.options.getString("name");
    const clientUser = interaction.options.getUser("client");
    const totalInput = interaction.options.getString("total");
    const dpInput = interaction.options.getString("dp");
    const estimation = interaction.options.getString("estimasi") || "5-7 hari kerja";
    const picUser = interaction.options.getUser("pic") || interaction.user;
    const notes = interaction.options.getString("notes") || "Tidak ada catatan khusus";

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const channel = await projectService.createProjectChannel(guild, {
        projectName,
        clientUser,
        picUser,
        estimation,
        totalPrice: totalInput,
        dpPaid: dpInput,
        notes,
        sourceTicketChannel: null,
        creatorUser: interaction.user,
      });

      return interaction.editReply({
        content: `Channel project **${projectName}** berhasil dibuat di <#${channel.id}>. Role Verified Client telah diberikan kepada <@${clientUser.id}>.`,
      });
    } catch (err) {
      console.error("Gagal membuat channel project:", err);
      return interaction.editReply({
        content: `Gagal membuat channel project: ${err.message}`,
      });
    }
  }
}

module.exports = {
  data,
  execute,
};
