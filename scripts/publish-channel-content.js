require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
} = require("discord.js");
const {
  soreviChannelBlueprint,
  getChannelMarkdownContent,
} = require("../src/data/soreviData");
const ticketService = require("../src/services/ticketService");

const token = process.env.DISCORD_TOKEN;
const guildId = process.env.GUILD_ID;

if (!token || !guildId) {
  console.error("DISCORD_TOKEN dan GUILD_ID wajib diisi di file .env");
  process.exit(1);
}

function resolveMentions(content, guild) {
  if (!content) return content;
  // 1. Resolve channel mentions: <#slug>
  let resolved = content.replace(/<#([a-zA-Z0-9_-]+)>/g, (match, slug) => {
    if (/^\d+$/.test(slug)) return match;
    const cleanSlug = slug.toLowerCase();
    const found = guild.channels.cache.find(
      (ch) =>
        ch.name.toLowerCase() === cleanSlug ||
        ch.name.toLowerCase().endsWith(cleanSlug) ||
        ch.name.toLowerCase().includes(cleanSlug)
    );
    return found ? `<#${found.id}>` : match;
  });

  // 2. Resolve role mentions: <@&slug>
  resolved = resolved.replace(/<@&([a-zA-Z0-9_ -]+)>/g, (match, slug) => {
    if (/^\d+$/.test(slug)) return match;
    const cleanSlug = slug.toLowerCase().replace(/[-_]/g, " ").trim();
    const found = guild.roles.cache.find((r) => {
      const rName = r.name.toLowerCase();
      return rName.includes(cleanSlug) || rName.replace(/^[^\w-]+｜?/, "").trim() === cleanSlug;
    });
    return found ? `<@&${found.id}>` : match;
  });

  return resolved;
}

function splitMessage(content, maxLength = 1900) {
  if (!content) return [];
  if (content.length <= maxLength) return [content];
  const chunks = [];
  let buffer = "";
  for (const line of content.split("\n")) {
    const candidate = buffer ? `${buffer}\n${line}` : line;
    if (candidate.length <= maxLength) {
      buffer = candidate;
      continue;
    }
    if (buffer) {
      chunks.push(buffer);
      buffer = "";
    }
    if (line.length <= maxLength) {
      buffer = line;
      continue;
    }
    for (let i = 0; i < line.length; i += maxLength) {
      chunks.push(line.slice(i, i + maxLength));
    }
  }
  if (buffer) chunks.push(buffer);
  return chunks;
}

async function main() {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  });

  console.log("Menghubungkan ke bot Discord...");
  await client.login(token);
  const guild = await client.guilds.fetch(guildId);
  console.log(`\n======================================================`);
  console.log(`  SINKRONISASI KONTEN DARI channel_content/*.md KE DISCORD`);
  console.log(`  Server: ${guild.name} (${guild.id})`);
  console.log(`======================================================\n`);

  await guild.channels.fetch();
  await guild.roles.fetch();
  const channelsByName = new Map(guild.channels.cache.map((ch) => [ch.name, ch]));

  for (const catSpec of soreviChannelBlueprint) {
    for (const child of catSpec.channels) {
      const channel = channelsByName.get(child.name);
      if (!channel || !channel.isTextBased() || channel.isVoiceBased()) continue;

      // 1. Jika channel memiliki file markdown
      if (child.contentFile) {
        const mdContent = getChannelMarkdownContent(child.contentFile);
        if (mdContent) {
          console.log(`- Memperbarui #${channel.name} dari ${child.contentFile}...`);
          try {
            const oldMsgs = await channel.messages.fetch({ limit: 50 });
            if (oldMsgs.size > 0) {
              await channel.bulkDelete(oldMsgs, true).catch(() => {});
            }
            const resolvedContent = resolveMentions(mdContent, guild);
            const chunks = splitMessage(resolvedContent);
            for (const chunk of chunks) {
              await channel.send({ content: chunk, allowedMentions: { parse: ["roles", "users"] } });
            }
            console.log(`  ✅ Berhasil diposting (${chunks.length} bagian pesan).`);
          } catch (err) {
            console.error(`  x Gagal update #${channel.name}:`, err.message);
          }
        }
      } else if (child.ticketPanel) {
        // 2. Jika channel adalah create-ticket panel
        console.log(`- Memperbarui Panel Tiket di #${channel.name}...`);
        try {
          const oldMsgs = await channel.messages.fetch({ limit: 20 });
          if (oldMsgs.size > 0) {
            await channel.bulkDelete(oldMsgs, true).catch(() => {});
          }
          const embed = ticketService.buildTicketPanelEmbed();
          const components = ticketService.buildTicketPanelComponents();
          await channel.send({ embeds: [embed], components });
          console.log(`  ✅ Panel tiket berhasil dipasang.`);
        } catch (err) {
          console.error(`  x Gagal update panel tiket:`, err.message);
        }
      } else {
        // 3. Channel tanpa content (seperti official-links atau self-roles yang diminta untuk tidak dikirim)
        try {
          const oldMsgs = await channel.messages.fetch({ limit: 20 });
          if (oldMsgs.size > 0) {
            await channel.bulkDelete(oldMsgs, true).catch(() => {});
            console.log(`  🧹 Membersihkan pesan lama dari #${channel.name}...`);
          }
        } catch (_) {}
      }
    }
  }

  console.log(`\n======================================================`);
  console.log(`🎉 SINKRONISASI SELESAI! SEMUA CHANNEL TELAH SESUAI FILE .MD!`);
  console.log(`======================================================\n`);

  client.destroy();
}

main().catch((err) => {
  console.error("Fatal Error:", err);
  process.exit(1);
});
