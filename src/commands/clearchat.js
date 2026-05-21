const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags,
} = require("discord.js");

const data = new SlashCommandBuilder()
  .setName("clearchat")
  .setDescription("Hapus beberapa pesan di atas command ini")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
  .addIntegerOption((option) =>
    option
      .setName("jumlah")
      .setDescription("Jumlah pesan di atas command yang ingin dihapus (1-99)")
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(99)
  );

async function execute(interaction) {
  if (!interaction.inGuild()) {
    await interaction.reply({
      content: "Command ini hanya bisa dipakai di server.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
    await interaction.reply({
      content: "Kamu butuh permission Manage Messages untuk memakai command ini.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const channel = interaction.channel;
  if (
    !channel ||
    channel.type === ChannelType.DM ||
    typeof channel.bulkDelete !== "function"
  ) {
    await interaction.reply({
      content: "Channel ini tidak mendukung hapus massal pesan.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const me = interaction.guild.members.me;
  if (!me?.permissionsIn(channel).has(PermissionFlagsBits.ManageMessages)) {
    await interaction.reply({
      content: "Bot butuh permission Manage Messages di channel ini.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const jumlah = interaction.options.getInteger("jumlah", true);
  const totalToDelete = jumlah + 1;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const deleted = await channel.bulkDelete(totalToDelete, true);
  const skipped = totalToDelete - deleted.size;

  let message = `Berhasil hapus ${deleted.size} pesan (target ${totalToDelete}, termasuk pesan trigger).`;
  if (skipped > 0) {
    message += ` ${skipped} pesan tidak bisa dihapus (kemungkinan lebih dari 14 hari).`;
  }

  await interaction.editReply(message);
}

module.exports = {
  data,
  execute,
};
