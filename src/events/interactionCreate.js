const { Events, MessageFlags } = require("discord.js");
const ticketService = require("../services/ticketService");

module.exports = {
  name: Events.InteractionCreate,
  once: false,
  async execute(interaction) {
    // 1. Handle Slash Commands
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) {
        return;
      }

      try {
        await command.execute(interaction);

        // Auto log slash command execution to # 📊・bot-logs
        if (interaction.guild) {
          const sub = interaction.options?.getSubcommand(false) || "";
          const commandDisplay = `/${interaction.commandName}${sub ? ` ${sub}` : ""}`;

          await ticketService.logToBotLogs(interaction.guild, {
            action: commandDisplay,
            userId: interaction.user.id,
            channelId: interaction.channelId,
          });
        }
      } catch (error) {
        console.error(`Error di command /${interaction.commandName}:`, error);

        const errorMessage = "Terjadi error saat menjalankan command.";
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(errorMessage).catch(() => {});
        } else {
          await interaction.reply({ content: errorMessage, flags: MessageFlags.Ephemeral }).catch(() => {});
        }
      }
      return;
    }

    // 2. Handle Button Interactions
    if (interaction.isButton()) {
      const customId = interaction.customId;

      // A. Tombol Buat Tiket Mandiri (Memunculkan Form Modal)
      if (customId.startsWith("ticket_open_")) {
        const typeKey = customId.replace("ticket_open_", "");
        const modal = ticketService.buildTicketModal(typeKey);
        await interaction.showModal(modal);
        return;
      }

      // B. Tombol Kategori Tiket Manual oleh Staff (Memunculkan Form Modal untuk Staff)
      if (customId.startsWith("ticket_manual_open_")) {
        const parts = customId.replace("ticket_manual_open_", "").split("_");
        const typeKey = parts[0];
        const targetUserId = parts[1];

        const modal = ticketService.buildManualTicketModal(typeKey, targetUserId);
        await interaction.showModal(modal);
        return;
      }

      // C. Tombol Claim Tiket
      if (customId === "ticket_claim") {
        try {
          await ticketService.claimTicket(interaction);
        } catch (error) {
          console.error("Error claim ticket:", error);
          await interaction.reply({
            content: `Gagal claim tiket: ${error.message}`,
            flags: MessageFlags.Ephemeral,
          }).catch(() => {});
        }
        return;
      }

      // D. Tombol Tutup Tiket (Memunculkan Modal Input Alasan)
      if (customId === "ticket_close") {
        try {
          const modal = ticketService.buildCloseTicketModal();
          await interaction.showModal(modal);
        } catch (error) {
          console.error("Error show close modal:", error);
          await interaction.reply({
            content: `Gagal membuka form penutupan: ${error.message}`,
            flags: MessageFlags.Ephemeral,
          }).catch(() => {});
        }
        return;
      }

      // E. Tombol Export Transkrip
      if (customId === "ticket_transcript") {
        try {
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });
          const transcriptInfo = await ticketService.exportTranscriptMarkdown(interaction.channel);
          await interaction.editReply({
            content: `✅ Transkrip chat berhasil diekspor dan disimpan ke server lokal:\n\`transcripts/${transcriptInfo.fileName}\` (${transcriptInfo.count} pesan).`,
          });
        } catch (error) {
          console.error("Error export transcript:", error);
          await interaction.editReply({
            content: `Gagal export transcript: ${error.message}`,
          });
        }
        return;
      }
    }

    // 3. Handle Modal Submissions
    if (interaction.isModalSubmit()) {
      // A. Modal Submit Tiket Mandiri
      if (interaction.customId.startsWith("modal_ticket_submit_")) {
        const typeKey = interaction.customId.replace("modal_ticket_submit_", "");
        const subject = interaction.fields.getTextInputValue("input_subject") || "";
        const project = interaction.fields.getTextInputValue("input_project") || "";
        const description = interaction.fields.getTextInputValue("input_description") || "";

        try {
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });
          const channel = await ticketService.createTicketChannel(
            interaction.guild,
            interaction.user,
            typeKey,
            {
              subject,
              project,
              description,
            }
          );

          await interaction.editReply({
            content: `✅ Tiket Anda berhasil dibuat di <#${channel.id}>. Silakan menuju ke channel tersebut untuk berdiskusi dengan tim developer!`,
          });
        } catch (error) {
          console.error("Error creating ticket channel:", error);
          await interaction.editReply({
            content: `Gagal membuat tiket: ${error.message}`,
          });
        }
        return;
      }

      // B. Modal Submit Tiket Manual oleh Staff
      if (interaction.customId.startsWith("modal_manual_ticket_submit_")) {
        const parts = interaction.customId.replace("modal_manual_ticket_submit_", "").split("_");
        const typeKey = parts[0];
        const targetUserId = parts[1];

        const subject = interaction.fields.getTextInputValue("input_subject") || "";
        const project = interaction.fields.getTextInputValue("input_project") || "";
        const description = interaction.fields.getTextInputValue("input_description") || "";

        try {
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });
          const targetUser = await interaction.client.users.fetch(targetUserId);

          const channel = await ticketService.createTicketChannel(
            interaction.guild,
            targetUser,
            typeKey,
            {
              subject,
              project,
              description,
            }
          );

          await interaction.editReply({
            content: `✅ Tiket manual untuk <@${targetUser.id}> berhasil dibuat di <#${channel.id}>!`,
          });

          await ticketService.logToBotLogs(interaction.guild, {
            action: "Buat Tiket Manual",
            userId: interaction.user.id,
            channelId: channel.id,
            details: `Untuk <@${targetUser.id}> (${subject})`,
          });
        } catch (error) {
          console.error("Error creating manual ticket modal:", error);
          await interaction.editReply({
            content: `Gagal membuat tiket manual: ${error.message}`,
          });
        }
        return;
      }

      // C. Modal Submit Alasan Tutup Tiket
      if (interaction.customId === "modal_ticket_close_submit") {
        const reason = interaction.fields.getTextInputValue("input_close_reason") || "Pengerjaan selesai / Masalah teratasi";
        try {
          await ticketService.closeTicket(interaction, reason);
        } catch (error) {
          console.error("Error closing ticket from modal:", error);
          if (interaction.deferred || interaction.replied) {
            await interaction.editReply(`Gagal menutup tiket: ${error.message}`).catch(() => {});
          } else {
            await interaction.reply({ content: `Gagal menutup tiket: ${error.message}`, flags: MessageFlags.Ephemeral }).catch(() => {});
          }
        }
        return;
      }
    }
  },
};
