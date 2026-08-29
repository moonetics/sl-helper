const { EmbedBuilder, Events } = require("discord.js");

module.exports = {
  name: Events.GuildMemberRemove,
  once: false,
  async execute(member) {
    const guild = member.guild;

    // Kirim Farewell Embed ke channel farewell
    try {
      const farewellChannel = guild.channels.cache.find(
        (ch) => ch.name.includes("farewell") && ch.isTextBased()
      );

      if (farewellChannel) {
        const joinedAtStr = member.joinedAt
          ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`
          : "Tidak diketahui";

        const farewellEmbed = new EmbedBuilder()
          .setTitle("Member Meninggalkan Server")
          .setDescription(
            `Member **${member.user.tag}** (<@${member.id}>) telah keluar dari server.`
          )
          .addFields(
            { name: "ID User", value: `\`${member.id}\``, inline: true },
            { name: "Bergabung Pada", value: joinedAtStr, inline: true }
          )
          .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
          .setColor(0xe74c3c)
          .setFooter({
            text: `Audit Kepergian Member • SOREVI LABS`,
          })
          .setTimestamp();

        await farewellChannel.send({ embeds: [farewellEmbed] });
      }
    } catch (err) {
      console.error("Gagal mengirim pesan farewell:", err.message);
    }
  },
};
