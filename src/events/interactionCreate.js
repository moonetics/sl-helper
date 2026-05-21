const { Events, MessageFlags } = require("discord.js");

module.exports = {
  name: Events.InteractionCreate,
  once: false,
  async execute(interaction) {
    if (!interaction.isChatInputCommand()) {
      return;
    }

    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) {
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`Error di command /${interaction.commandName}:`, error);

      const errorMessage = "Terjadi error saat menjalankan command.";
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(errorMessage).catch(() => {});
      } else {
        await interaction.reply({ content: errorMessage, flags: MessageFlags.Ephemeral }).catch(() => {});
      }
    }
  },
};
