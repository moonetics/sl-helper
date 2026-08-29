const { Events, MessageFlags, PermissionFlagsBits } = require("discord.js");
const ticketService = require("../services/ticketService");
const projectService = require("../services/projectService");
const warrantyService = require("../services/warrantyService");

async function safeReplyError(interaction, message) {
  try {
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: message }).catch(() => {});
    } else {
      await interaction.reply({ content: message, flags: MessageFlags.Ephemeral }).catch(() => {});
    }
  } catch (e) {
    // Ignore secondary network/interaction errors
  }
}

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

        // Auto log slash command execution to bot-logs
        if (interaction.guild) {
          const sub = interaction.options?.getSubcommand(false) || "";
          const commandDisplay = `/${interaction.commandName}${sub ? ` ${sub}` : ""}`;

          await ticketService.logToBotLogs(interaction.guild, {
            action: commandDisplay,
            userId: interaction.user.id,
            channelId: interaction.channelId,
          }).catch(() => {});
        }
      } catch (error) {
        console.error(`Error di command /${interaction.commandName}:`, error);
        await safeReplyError(interaction, `Terjadi error saat menjalankan command: ${error.message}`);
      }
      return;
    }

    // 2. Handle Button Interactions
    if (interaction.isButton()) {
      const customId = interaction.customId;

      // A. Tombol Buat Tiket Mandiri
      if (customId.startsWith("ticket_open_")) {
        try {
          const typeKey = customId.replace("ticket_open_", "");
          const modal = ticketService.buildTicketModal(typeKey);
          await interaction.showModal(modal);
        } catch (error) {
          console.error("Error show ticket modal:", error);
          await safeReplyError(interaction, `Gagal membuka form tiket: ${error.message}`);
        }
        return;
      }

      // B. Tombol Kategori Tiket Manual oleh Staff
      if (customId.startsWith("ticket_manual_open_")) {
        try {
          const parts = customId.replace("ticket_manual_open_", "").split("_");
          const typeKey = parts[0];
          const targetUserId = parts[1];

          const modal = ticketService.buildManualTicketModal(typeKey, targetUserId);
          await interaction.showModal(modal);
        } catch (error) {
          console.error("Error show manual ticket modal:", error);
          await safeReplyError(interaction, `Gagal membuka form tiket manual: ${error.message}`);
        }
        return;
      }

      // C. Tombol Accept Project dari Tiket
      if (customId === "ticket_accept") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
          return interaction.reply({
            content: "Anda membutuhkan permission Manage Channels untuk meng-accept project tiket.",
            flags: MessageFlags.Ephemeral,
          });
        }

        try {
          const defaultName = interaction.channel.name.replace(/^sl-/, "Project ");
          const modal = ticketService.buildAcceptTicketModal(defaultName);
          await interaction.showModal(modal);
        } catch (error) {
          console.error("Error show accept project modal:", error);
          await safeReplyError(interaction, `Gagal membuka form accept project: ${error.message}`);
        }
        return;
      }

      // D. Tombol Serah Terima & Garansi dari Project Workspace
      if (customId === "project_handover") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
          return interaction.reply({
            content: "Anda membutuhkan permission Manage Channels untuk serah terima & mulai garansi.",
            flags: MessageFlags.Ephemeral,
          });
        }

        try {
          let defaultName = interaction.channel.name.replace(/^prj-/, "").replace(/-/g, " ");
          if (interaction.channel.topic) {
            const pMatch = interaction.channel.topic.match(/Project:\s*([^|]+)/i);
            if (pMatch) defaultName = pMatch[1].trim();
          }

          const modal = warrantyService.buildHandoverModal(defaultName);
          await interaction.showModal(modal);
        } catch (error) {
          console.error("Error show project handover modal:", error);
          await safeReplyError(interaction, `Gagal membuka form serah terima garansi: ${error.message}`);
        }
        return;
      }

      // E. Tombol Selesaikan Project Langsung
      if (customId === "project_complete") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
          return interaction.reply({
            content: "Anda membutuhkan permission Manage Channels untuk menyelesaikan project.",
            flags: MessageFlags.Ephemeral,
          });
        }

        try {
          const modal = projectService.buildCompleteProjectModal();
          await interaction.showModal(modal);
        } catch (error) {
          console.error("Error show complete project modal:", error);
          await safeReplyError(interaction, `Gagal membuka form penyelesaian project: ${error.message}`);
        }
        return;
      }

      // F. Tombol Update Pembayaran Project
      if (customId === "project_payment") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
          return interaction.reply({
            content: "Anda membutuhkan permission Manage Channels untuk meng-update pembayaran project.",
            flags: MessageFlags.Ephemeral,
          });
        }

        try {
          const modal = projectService.buildPaymentUpdateModal();
          await interaction.showModal(modal);
        } catch (error) {
          console.error("Error show project payment modal:", error);
          await safeReplyError(interaction, `Gagal membuka form update pembayaran: ${error.message}`);
        }
        return;
      }

      // G. Tombol Cek Sisa Waktu Garansi
      if (customId === "warranty_status") {
        const activeWar = warrantyService.getWarrantyStatus(interaction.channel.id);
        if (!activeWar) {
          return interaction.reply({
            content: "Tidak ditemukan catatan garansi aktif untuk channel ini.",
            flags: MessageFlags.Ephemeral,
          });
        }

        const expirySec = Math.floor(activeWar.expiryTime / 1000);
        return interaction.reply({
          content: `Status Garansi Proyek: \`${activeWar.projectName}\`\nDurasi Awal: ${activeWar.durationText}\nBerakhir: <t:${expirySec}:F> (<t:${expirySec}:R>)\nPIC: <@${activeWar.picId}>`,
          flags: MessageFlags.Ephemeral,
        });
      }

      // H. Tombol Sesuaikan Masa Garansi (Add / Subtract / Set)
      if (customId === "warranty_modify") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
          return interaction.reply({
            content: "Anda membutuhkan permission Manage Channels untuk menyesuaikan masa garansi.",
            flags: MessageFlags.Ephemeral,
          });
        }

        try {
          const modal = warrantyService.buildWarrantyModifyModal();
          await interaction.showModal(modal);
        } catch (error) {
          console.error("Error show warranty modify modal:", error);
          await safeReplyError(interaction, `Gagal membuka form penyesuaian garansi: ${error.message}`);
        }
        return;
      }

      // I. Tombol Selesaikan Garansi & Pindah ke Completed
      if (customId === "warranty_complete") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
          return interaction.reply({
            content: "Anda membutuhkan permission Manage Channels untuk menyelesaikan garansi.",
            flags: MessageFlags.Ephemeral,
          });
        }
        return warrantyService.endWarrantyEarly(interaction);
      }

      // I. Tombol Tutup Tiket
      if (customId === "ticket_close") {
        try {
          const modal = ticketService.buildCloseTicketModal();
          await interaction.showModal(modal);
        } catch (error) {
          console.error("Error show close modal:", error);
          await safeReplyError(interaction, `Gagal membuka form penutupan: ${error.message}`);
        }
        return;
      }

      // J. Tombol Export Transkrip
      if (customId === "ticket_transcript" || customId === "project_transcript") {
        try {
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });
          const transcriptInfo = await ticketService.exportTranscriptMarkdown(interaction.channel);
          await interaction.editReply({
            content: `Transkrip berhasil diekspor dan disimpan ke server lokal:\ntranscripts/${transcriptInfo.fileName} (${transcriptInfo.count} pesan).`,
          });
        } catch (error) {
          console.error("Error export transcript:", error);
          await safeReplyError(interaction, `Gagal export transcript: ${error.message}`);
        }
        return;
      }

      // K. Tombol Hapus Closed / Completed Ticket Permanen
      if (customId === "closed_ticket_delete") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
          return interaction.reply({
            content: "Anda membutuhkan permission Manage Channels untuk menghapus channel.",
            flags: MessageFlags.Ephemeral,
          });
        }
        return ticketService.deleteClosedTicket(interaction);
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
            content: `Tiket Anda berhasil dibuat di <#${channel.id}>. Silakan menuju ke channel tersebut untuk berdiskusi dengan tim developer.`,
          });
        } catch (error) {
          console.error("Error creating ticket channel:", error);
          await safeReplyError(interaction, `Gagal membuat tiket: ${error.message}`);
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
            content: `Tiket manual untuk <@${targetUser.id}> berhasil dibuat di <#${channel.id}>.`,
          });

          await ticketService.logToBotLogs(interaction.guild, {
            action: "Buat Tiket Manual",
            userId: interaction.user.id,
            channelId: channel.id,
            details: `Untuk <@${targetUser.id}> (${subject})`,
          });
        } catch (error) {
          console.error("Error creating manual ticket modal:", error);
          await safeReplyError(interaction, `Gagal membuat tiket manual: ${error.message}`);
        }
        return;
      }

      // C. Modal Submit Accept Tiket Menjadi Project (Perpindahan Channel)
      if (interaction.customId === "modal_ticket_accept_submit") {
        const projectName = interaction.fields.getTextInputValue("input_accept_name") || "Custom Project";
        const totalInput = interaction.fields.getTextInputValue("input_accept_total") || "Sesuai kesepakatan";
        const dpInput = interaction.fields.getTextInputValue("input_accept_dp") || "";
        const estimation = interaction.fields.getTextInputValue("input_accept_estimation") || "5-7 hari kerja";
        const notes = interaction.fields.getTextInputValue("input_accept_notes") || "";

        try {
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });
          await ticketService.acceptTicketAsProject(interaction, {
            projectName,
            estimation,
            totalPrice: totalInput,
            dpPaid: dpInput,
            picUserId: interaction.user.id,
            notes,
          });
        } catch (error) {
          console.error("Error accept ticket as project modal:", error);
          await safeReplyError(interaction, `Gagal memproses pengerjaan project: ${error.message}`);
        }
        return;
      }

      // D. Modal Submit Serah Terima & Garansi (Perpindahan Channel ke ACTIVE WARRANTY)
      if (interaction.customId === "modal_handover_submit") {
        const projectName = interaction.fields.getTextInputValue("input_handover_name") || "Custom Project";
        const notes = interaction.fields.getTextInputValue("input_handover_notes") || "Ownership place / project telah diserahkan.";
        const durationInput = interaction.fields.getTextInputValue("input_handover_days") || "7d";

        try {
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });

          let clientUser = null;
          if (interaction.channel.topic) {
            const cMatch = interaction.channel.topic.match(/Client:\s*.*?\((\d{16,20})\)/i) || interaction.channel.topic.match(/Pembuat:\s*.*?\((\d{16,20})\)/i);
            if (cMatch) {
              clientUser = await interaction.guild.client.users.fetch(cMatch[1]).catch(() => null);
            }
          }

          if (!clientUser) {
            const nonStaffOverwrite = interaction.channel.permissionOverwrites.cache.find(
              (po) => po.type === 1 && po.id !== interaction.guild.client.user.id
            );
            if (nonStaffOverwrite) {
              clientUser = await interaction.guild.client.users.fetch(nonStaffOverwrite.id).catch(() => null);
            }
          }

          const warRecord = await warrantyService.startWarranty(interaction.guild, {
            channel: interaction.channel,
            clientUser,
            picUser: interaction.user,
            projectName,
            notes,
            durationInput,
            actorUser: interaction.user,
          });

          await interaction.editReply({
            content: `Serah terima project **${projectName}** selesai. Channel telah dipindahkan ke **ACTIVE WARRANTY** (${warRecord.durationText}).`,
          });
        } catch (error) {
          console.error("Error handover submit modal:", error);
          await safeReplyError(interaction, `Gagal memproses serah terima garansi: ${error.message}`);
        }
        return;
      }

      // E. Modal Submit Alasan Tutup Tiket (Perpindahan Channel ke CLOSED TICKETS)
      if (interaction.customId === "modal_ticket_close_submit") {
        const reason = interaction.fields.getTextInputValue("input_close_reason") || "Pengerjaan selesai / Masalah teratasi";
        try {
          await ticketService.closeTicket(interaction, reason);
        } catch (error) {
          console.error("Error closing ticket from modal:", error);
          await safeReplyError(interaction, `Gagal menutup tiket: ${error.message}`);
        }
        return;
      }

      // F. Modal Submit Selesaikan Project (Perpindahan Channel ke COMPLETED PROJECTS)
      if (interaction.customId === "modal_project_complete_submit") {
        const notes = interaction.fields.getTextInputValue("input_complete_notes") || "Project selesai & serah terima berhasil";
        try {
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });

          let clientId = null;
          if (interaction.channel.topic) {
            const match = interaction.channel.topic.match(/Client:\s*.*?\((\d{16,20})\)/i) || interaction.channel.topic.match(/Pembuat:\s*.*?\((\d{16,20})\)/i);
            if (match) clientId = match[1];
          }

          const projectName = interaction.channel.topic?.match(/Project:\s*([^|]+)/i)?.[1]?.trim() || interaction.channel.name.replace(/^prj-/, "").replace(/-/g, " ");

          await warrantyService.completeWarrantyAndArchiveToCompleted(interaction.channel, interaction.guild, {
            projectName,
            clientId,
            actorUser: interaction.user,
            notes,
          });

          await interaction.editReply({
            content: `Project **${projectName}** telah diselesaikan dan dipindahkan ke **COMPLETED PROJECTS** (Read-Only untuk klien).`,
          });
        } catch (error) {
          console.error("Error completing project modal:", error);
          await safeReplyError(interaction, `Gagal menyelesaikan project: ${error.message}`);
        }
        return;
      }

      // G. Modal Submit Update Pembayaran Project
      if (interaction.customId === "modal_project_payment_submit") {
        const totalInput = interaction.fields.getTextInputValue("input_payment_total") || "";
        const dpInput = interaction.fields.getTextInputValue("input_payment_dp") || "";
        const notes = interaction.fields.getTextInputValue("input_payment_notes") || "";

        try {
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });
          await projectService.updateProjectPayment(interaction, {
            totalInput,
            dpInput,
            notes,
          });
        } catch (error) {
          console.error("Error updating project payment modal:", error);
          await safeReplyError(interaction, `Gagal memperbarui pembayaran: ${error.message}`);
        }
        return;
      }

      // H. Modal Submit Sesuaikan Masa Garansi
      if (interaction.customId === "modal_warranty_modify_submit") {
        const inputStr = interaction.fields.getTextInputValue("input_modify_duration") || "";
        const reason = interaction.fields.getTextInputValue("input_modify_reason") || "";

        try {
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });
          const modResult = await warrantyService.modifyWarranty(interaction.guild, {
            channel: interaction.channel,
            inputStr,
            reason,
            actorUser: interaction.user,
          });

          await interaction.editReply({
            content: `Masa garansi berhasil diperbarui: **${modResult.changeText}**.\nBatas akhir baru telah diumumkan di channel.`,
          });
        } catch (error) {
          console.error("Error modify warranty modal:", error);
          await safeReplyError(interaction, `Gagal menyesuaikan masa garansi: ${error.message}`);
        }
        return;
      }
    }
  },
};
