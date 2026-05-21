const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require("discord.js");
const { config } = require("../config");
const { backupGuild } = require("../services/backupService");

const activeBackups = new Set();

const data = new SlashCommandBuilder()
  .setName("pjpjserver")
  .setDescription("Backup semua text channel dan voice open chat ke HTML lokal")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

function formatSummary(manifest) {
  return [
    "Backup server selesai.",
    `Folder: ${manifest.output.directory}`,
    `ZIP: ${manifest.output.zip}`,
    `Channel sukses: ${manifest.totals.channelsOk}/${manifest.totals.channelsFound}`,
    `Channel dilewati/gagal: ${manifest.totals.channelsSkipped}`,
    `Pesan: ${manifest.totals.messages}`,
    `Attachment berhasil/gagal: ${manifest.totals.attachmentsDownloaded}/${manifest.totals.attachmentsFailed}`,
  ].join("\n");
}

async function execute(interaction) {
  if (!interaction.inGuild()) {
    await interaction.reply({
      content: "Command ini hanya bisa dipakai di server.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({
      content: "Kamu butuh permission Administrator untuk memakai command ini.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!config.enableMessageContentIntent) {
    await interaction.reply({
      content: [
        "Backup dibatalkan karena Message Content Intent belum aktif di config bot.",
        "",
        "Perbaikan yang diperlukan:",
        "1. Aktifkan Message Content Intent di Discord Developer Portal.",
        "2. Set `ENABLE_MESSAGE_CONTENT_INTENT=true` di file `.env`.",
        "3. Restart bot, lalu jalankan `/pjpjserver` ulang.",
        "",
        "Backup lama yang sudah berisi `No readable message content` tidak bisa diperbaiki otomatis. Buat backup baru setelah intent aktif.",
      ].join("\n"),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const guildId = interaction.guild.id;
  if (activeBackups.has(guildId)) {
    await interaction.reply({
      content: "Backup server ini masih berjalan. Tunggu proses sebelumnya selesai dulu.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  activeBackups.add(guildId);
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  await interaction.editReply("Backup dimulai di background. Hasil akan disimpan ke folder `backups/` project ini.");

  const guild = interaction.guild;
  const reportChannel = interaction.channel;
  const requestedById = interaction.user.id;

  backupGuild(guild, {
    requestedById,
    messageContentIntentEnabled: config.enableMessageContentIntent,
  })
    .then(async (manifest) => {
      const summary = formatSummary(manifest);
      if (reportChannel?.send) {
        await reportChannel.send({ content: summary }).catch(() => {});
      }
      console.log(summary);
    })
    .catch(async (error) => {
      const message = `Backup server gagal: ${error.message}`;
      if (reportChannel?.send) {
        await reportChannel.send({ content: message }).catch(() => {});
      }
      console.error(message, error);
    })
    .finally(() => {
      activeBackups.delete(guildId);
    });
}

module.exports = {
  data,
  execute,
};
