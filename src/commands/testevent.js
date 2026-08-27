const {
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require("discord.js");
const guildMemberAddEvent = require("../events/guildMemberAdd");
const guildMemberRemoveEvent = require("../events/guildMemberRemove");
const ticketService = require("../services/ticketService");

const data = new SlashCommandBuilder()
  .setName("testevent")
  .setDescription("Simulasi pengujian embed Welcome dan Farewell member")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand((sub) =>
    sub
      .setName("join")
      .setDescription("Simulasikan pengiriman Welcome Embed untuk member tertentu")
      .addUserOption((opt) =>
        opt
          .setName("user")
          .setDescription("Member yang ingin disimulasikan join")
          .setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("leave")
      .setDescription("Simulasikan pengiriman Farewell Embed untuk member tertentu")
      .addUserOption((opt) =>
        opt
          .setName("user")
          .setDescription("Member yang ingin disimulasikan leave")
          .setRequired(true)
      )
  );

async function execute(interaction) {
  if (!interaction.inGuild()) {
    return interaction.reply({
      content: "Command ini hanya bisa digunakan di server.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const sub = interaction.options.getSubcommand();
  const targetUser = interaction.options.getUser("user");
  const guild = interaction.guild;

  // Coba ambil GuildMember jika ada, atau buat mock member
  let targetMember;
  try {
    targetMember = await guild.members.fetch(targetUser.id);
  } catch {
    targetMember = {
      guild,
      user: targetUser,
      id: targetUser.id,
      joinedAt: new Date(),
      joinedTimestamp: Date.now(),
      roles: { add: async () => {} },
    };
  }

  if (sub === "join") {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await guildMemberAddEvent.execute(targetMember);

    await ticketService.logToBotLogs(guild, {
      action: "/testevent join",
      userId: interaction.user.id,
      channelId: interaction.channel.id,
      details: `Simulasi join: <@${targetUser.id}>`,
    });

    return interaction.editReply({
      content: `✅ Simulasi Welcome Embed untuk <@${targetUser.id}> berhasil dikirim ke channel welcome.`,
    });
  }

  if (sub === "leave") {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await guildMemberRemoveEvent.execute(targetMember);

    await ticketService.logToBotLogs(guild, {
      action: "/testevent leave",
      userId: interaction.user.id,
      channelId: interaction.channel.id,
      details: `Simulasi leave: <@${targetUser.id}>`,
    });

    return interaction.editReply({
      content: `✅ Simulasi Farewell Embed untuk <@${targetUser.id}> berhasil dikirim ke channel farewell.`,
    });
  }
}

module.exports = {
  data,
  execute,
};
