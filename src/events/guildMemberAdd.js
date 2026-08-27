const { EmbedBuilder, Events } = require("discord.js");

module.exports = {
  name: Events.GuildMemberAdd,
  once: false,
  async execute(member) {
    const guild = member.guild;

    // 1. Auto-assign role "⭐ ｜ Sorevi Community"
    try {
      const communityRole = guild.roles.cache.find(
        (r) => r.name.includes("Sorevi Community") || r.name.includes("Community")
      );
      if (communityRole) {
        await member.roles.add(communityRole);
      }
    } catch (err) {
      console.error(`Gagal auto-assign role community ke ${member.user.tag}:`, err.message);
    }

    // 2. Kirim Welcome Embed ke channel # 👋・welcome
    try {
      const welcomeChannel = guild.channels.cache.find(
        (ch) => ch.name.includes("welcome") && ch.isTextBased()
      );

      if (welcomeChannel) {
        const rulesChannel = guild.channels.cache.find(
          (ch) => ch.name.includes("rules") && ch.isTextBased()
        );
        const ticketChannel = guild.channels.cache.find(
          (ch) => ch.name.includes("create-ticket") && ch.isTextBased()
        );

        const welcomeEmbed = new EmbedBuilder()
          .setTitle(`👋 SELAMAT DATANG DI SOREVI LABS!`)
          .setDescription(
            `Halo <@${member.id}> (\`${member.user.tag}\`), selamat datang di **SOREVI LABS** — Roblox Development & Commission Hub!\n\n` +
            `🔹 **Baca Peraturan:** Pastikan membaca ${rulesChannel ? `<#${rulesChannel.id}>` : "peraturan server"} sebelum berinteraksi.\n` +
            `🔹 **Order Project:** Butuh sistem race, obstacle, map, atau UGC 3D? Buka tiket di ${ticketChannel ? `<#${ticketChannel.id}>` : "#create-ticket"}.\n` +
            `🔹 **Ngobrol Santai:** Gabung diskusi bersama sesama developer di channel umum!\n\n` +
            `_Semoga Anda menikmati waktu dan pengalaman berkreasi di sini!_`
          )
          .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
          .setColor(0x00d2d3)
          .setFooter({
            text: `Member #${guild.memberCount} • SOREVI LABS`,
            iconURL: guild.iconURL({ dynamic: true }) || undefined,
          })
          .setTimestamp();

        await welcomeChannel.send({
          content: `Selamat datang <@${member.id}>! 🎉`,
          embeds: [welcomeEmbed],
        });
      }
    } catch (err) {
      console.error("Gagal mengirim pesan welcome:", err.message);
    }
  },
};
