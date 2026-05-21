const fs = require("fs/promises");
const fsSync = require("fs");
const path = require("path");
const archiver = require("archiver");
const {
  ChannelType,
  PermissionFlagsBits,
} = require("discord.js");

const backupRoot = path.resolve(__dirname, "..", "..", "backups");
const messageFetchLimit = 100;

function pad(value) {
  return String(value).padStart(2, "0");
}

function formatTimestampForPath(date) {
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("-") + `_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
}

function sanitizeFilename(value, fallback = "item") {
  const sanitized = String(value || fallback)
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^\.+/, "")
    .replace(/[.-]+$/, "")
    .slice(0, 120);

  return sanitized || fallback;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function write(stream, content) {
  return new Promise((resolve, reject) => {
    if (stream.write(content)) {
      resolve();
      return;
    }

    const onDrain = () => {
      stream.off("error", onError);
      resolve();
    };
    const onError = (error) => {
      stream.off("drain", onDrain);
      reject(error);
    };

    stream.once("drain", onDrain);
    stream.once("error", onError);
  });
}

function endStream(stream) {
  return new Promise((resolve, reject) => {
    stream.end(resolve);
    stream.once("error", reject);
  });
}

function isBackupChannel(channel) {
  return (
    channel?.isTextBased?.() &&
    [ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildVoice].includes(channel.type) &&
    typeof channel.messages?.fetch === "function"
  );
}

function requiredPermissionsFor(channel) {
  const permissions = [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.ReadMessageHistory,
  ];

  if (channel.type === ChannelType.GuildVoice) {
    permissions.push(PermissionFlagsBits.Connect);
  }

  return permissions;
}

function missingPermissions(channel, me) {
  const permissions = channel.permissionsFor(me);
  if (!permissions) {
    return ["ViewChannel", "ReadMessageHistory"];
  }

  return requiredPermissionsFor(channel)
    .filter((permission) => !permissions.has(permission))
    .map((permission) => {
      if (permission === PermissionFlagsBits.ViewChannel) return "ViewChannel";
      if (permission === PermissionFlagsBits.ReadMessageHistory) return "ReadMessageHistory";
      if (permission === PermissionFlagsBits.Connect) return "Connect";
      return String(permission);
    });
}

function buildMessageUrl(guildId, channelId, messageId) {
  return `https://discord.com/channels/${guildId}/${channelId}/${messageId}`;
}

function buildChannelFile(channel, channelIndex) {
  return `channels/${String(channelIndex).padStart(4, "0")}-${sanitizeFilename(channel.name, "channel")}-${channel.id}.html`;
}

function channelTypeLabel(type) {
  if (type === ChannelType.GuildVoice) return "voice";
  if (type === ChannelType.GuildAnnouncement) return "announcement";
  return "text";
}

function channelIcon(type) {
  if (type === ChannelType.GuildVoice) return "!";
  if (type === ChannelType.GuildAnnouncement) return ">";
  return "#";
}

function getCategoryInfo(channel) {
  const parent = channel.parent || null;
  return {
    categoryId: parent?.id || null,
    categoryName: parent?.name || "NO CATEGORY",
    categoryPosition: parent?.rawPosition ?? parent?.position ?? -1,
  };
}

function formatDiscordTime(date) {
  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function renderContent(content) {
  const escaped = escapeHtml(content || "");
  if (!escaped) {
    return "";
  }

  return `<div class="message-content">${escaped}</div>`;
}

function attachmentIsImage(attachment) {
  return attachment.contentType?.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp|avif)$/i.test(attachment.name || "");
}

function attachmentIsVideo(attachment) {
  return attachment.contentType?.startsWith("video/") || /\.(mp4|webm|mov|m4v)$/i.test(attachment.name || "");
}

function attachmentIsAudio(attachment) {
  return attachment.contentType?.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|flac)$/i.test(attachment.name || "");
}

function renderAttachment(attachmentRecord) {
  const label = `${escapeHtml(attachmentRecord.name)} (${formatBytes(attachmentRecord.size)})`;
  const localHref = attachmentRecord.localPath ? escapeAttr(attachmentRecord.localPath) : null;
  const sourceHref = escapeAttr(attachmentRecord.url);
  const href = localHref || sourceHref;
  const failed = attachmentRecord.downloadError
    ? `<div class="download-error">Download gagal: ${escapeHtml(attachmentRecord.downloadError)}</div>`
    : "";

  let preview = "";
  if (localHref && attachmentRecord.isImage) {
    preview = `<img src="${localHref}" alt="${escapeAttr(attachmentRecord.name)}" loading="lazy">`;
  } else if (localHref && attachmentRecord.isVideo) {
    preview = `<video src="${localHref}" controls preload="metadata"></video>`;
  } else if (localHref && attachmentRecord.isAudio) {
    preview = `<audio src="${localHref}" controls preload="metadata"></audio>`;
  }

  return `
    <div class="attachment">
      ${preview}
      <a href="${href}" target="_blank" rel="noreferrer">${label}</a>
      ${failed}
    </div>`;
}

function renderEmbeds(message) {
  const embeds = message.embeds?.map((embed) => embed.toJSON?.() || embed).filter(Boolean) || [];
  if (embeds.length === 0) {
    return "";
  }

  return `<div class="embeds">${embeds
    .map((embed) => {
      const title = embed.title
        ? `<div class="embed-title">${embed.url ? `<a href="${escapeAttr(embed.url)}" target="_blank" rel="noreferrer">${escapeHtml(embed.title)}</a>` : escapeHtml(embed.title)}</div>`
        : "";
      const author = embed.author?.name ? `<div class="embed-author">${escapeHtml(embed.author.name)}</div>` : "";
      const description = embed.description ? `<div class="embed-description">${escapeHtml(embed.description)}</div>` : "";
      const fields = Array.isArray(embed.fields)
        ? embed.fields.map((field) => `<div class="embed-field"><strong>${escapeHtml(field.name)}</strong><span>${escapeHtml(field.value)}</span></div>`).join("")
        : "";
      const thumbnail = embed.thumbnail?.url ? `<img class="embed-thumb" src="${escapeAttr(embed.thumbnail.url)}" alt="">` : "";
      const image = embed.image?.url ? `<img class="embed-image" src="${escapeAttr(embed.image.url)}" alt="">` : "";
      const footer = embed.footer?.text ? `<div class="embed-footer">${escapeHtml(embed.footer.text)}</div>` : "";

      return `<div class="embed">${thumbnail}<div class="embed-body">${author}${title}${description}${fields}${image}${footer}</div></div>`;
    })
    .join("")}</div>`;
}

function renderStickers(message) {
  const stickers = [...(message.stickers?.values?.() || [])];
  if (stickers.length === 0) {
    return "";
  }

  return `<div class="stickers">${stickers
    .map((sticker) => {
      const stickerUrl = sticker.url ? `<a href="${escapeAttr(sticker.url)}" target="_blank" rel="noreferrer">open</a>` : "";
      return `<span class="sticker">${escapeHtml(sticker.name || sticker.id)} ${stickerUrl}</span>`;
    })
    .join("")}</div>`;
}

function renderReactions(message) {
  const reactions = [...(message.reactions?.cache?.values?.() || [])];
  if (reactions.length === 0) {
    return "";
  }

  return `<div class="reactions">${reactions
    .map((reaction) => {
      const emoji = reaction.emoji?.toString?.() || reaction.emoji?.name || "emoji";
      return `<span class="reaction">${escapeHtml(emoji)} ${reaction.count}</span>`;
    })
    .join("")}</div>`;
}

function renderReplyReference(message, guildId) {
  if (!message.reference?.messageId || !message.reference?.channelId) {
    return "";
  }

  const url = buildMessageUrl(guildId, message.reference.channelId, message.reference.messageId);
  return `<div class="reply-ref">Reply to <a href="${escapeAttr(url)}" target="_blank" rel="noreferrer">${escapeHtml(message.reference.messageId)}</a></div>`;
}

function renderChannelNav(channels, currentChannelId, linkMode = "index") {
  if (!channels?.length) {
    return `<div class="empty-nav">No backed up channels</div>`;
  }

  const groups = [];
  for (const channel of channels) {
    const categoryKey = channel.categoryId || `uncategorized:${channel.categoryName || "NO CATEGORY"}`;
    const group = groups.find((item) => item.key === categoryKey);
    if (group) {
      group.channels.push(channel);
      continue;
    }

    groups.push({
      key: categoryKey,
      id: channel.categoryId,
      name: channel.categoryName || "NO CATEGORY",
      position: channel.categoryPosition ?? -1,
      channels: [channel],
    });
  }

  return groups
    .map((group) => `<div class="category-block">
      <div class="category-title">${escapeHtml(group.name)}</div>
      ${group.channels
        .map((channel) => {
          const href = linkMode === "channel"
            ? path.basename(channel.file)
            : channel.file;
          const activeClass = channel.id === currentChannelId ? " active" : "";
          return `<a class="channel-link${activeClass}" href="${escapeAttr(href)}">
            <span class="channel-symbol">${escapeHtml(channelIcon(channel.type))}</span>
            <span class="channel-name">${escapeHtml(channel.name)}</span>
          </a>`;
        })
        .join("")}
    </div>`)
    .join("");
}

function renderShellSidebar(guild, channels, currentChannelId, linkMode, statsHtml = "") {
  const indexHref = linkMode === "channel" ? "../index.html" : "index.html";
  return `<aside class="discord-sidebar">
    <div class="server-header">
      <div class="server-title">${escapeHtml(guild.name)}</div>
      <a class="home-link" href="${escapeAttr(indexHref)}">Backup overview</a>
    </div>
    ${statsHtml}
    <div class="channel-section-title">BACKED UP CHANNELS</div>
    <nav class="channel-nav">${renderChannelNav(channels, currentChannelId, linkMode)}</nav>
  </aside>`;
}

async function downloadAttachment(attachment, assetsDir, relativeAssetsPath, counters) {
  const originalName = attachment.name || `${attachment.id}.bin`;
  const filename = sanitizeFilename(`${attachment.id}-${originalName}`, `${attachment.id}.bin`);
  const outputPath = path.join(assetsDir, filename);
  const relativePath = `${relativeAssetsPath}/${filename}`;
  const record = {
    id: attachment.id,
    name: originalName,
    url: attachment.url,
    proxyUrl: attachment.proxyURL,
    size: attachment.size || 0,
    contentType: attachment.contentType || null,
    localPath: relativePath,
    isImage: attachmentIsImage(attachment),
    isVideo: attachmentIsVideo(attachment),
    isAudio: attachmentIsAudio(attachment),
    downloadError: null,
  };

  try {
    const response = await fetch(attachment.url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    await fs.writeFile(outputPath, Buffer.from(arrayBuffer));
    counters.attachmentsDownloaded += 1;
  } catch (error) {
    record.localPath = null;
    record.downloadError = error.message;
    counters.attachmentsFailed += 1;
  }

  return record;
}

async function renderMessage(message, context) {
  const author = message.author;
  const avatarUrl = author?.displayAvatarURL?.({ extension: "png", size: 64 }) || "";
  const attachments = [...(message.attachments?.values?.() || [])];
  const attachmentRecords = [];

  for (const attachment of attachments) {
    attachmentRecords.push(await downloadAttachment(
      attachment,
      context.assetsDir,
      context.relativeAssetsPath,
      context.counters
    ));
  }

  const timestamp = message.createdAt ? formatDiscordTime(message.createdAt) : "";
  const edited = message.editedAt ? `edited ${formatDiscordTime(message.editedAt)}` : "";
  const messageUrl = buildMessageUrl(context.guildId, context.channelId, message.id);
  const content = message.cleanContent || message.content || "";
  const replyHtml = renderReplyReference(message, context.guildId);
  const contentHtml = renderContent(content);
  const attachmentsHtml = attachmentRecords.length > 0
    ? `<div class="attachments">${attachmentRecords.map(renderAttachment).join("")}</div>`
    : "";
  const embedsHtml = renderEmbeds(message);
  const stickersHtml = renderStickers(message);
  const reactionsHtml = renderReactions(message);
  const fallbackHtml = !contentHtml && !attachmentsHtml && !embedsHtml && !stickersHtml && !reactionsHtml
    ? `<div class="message-empty">No readable message content</div>`
    : "";

  return `
    <article class="message" id="message-${escapeAttr(message.id)}">
      <img class="avatar" src="${escapeAttr(avatarUrl)}" alt="">
      <div class="message-main">
        <div class="message-meta">
          <span class="author">${escapeHtml(author?.tag || author?.username || "Unknown user")}</span>
          <span class="author-id">${escapeHtml(author?.id || "unknown")}</span>
          <a href="${escapeAttr(messageUrl)}" target="_blank" rel="noreferrer">${escapeHtml(timestamp)}</a>
          ${edited ? `<span>${escapeHtml(edited)}</span>` : ""}
        </div>
        ${replyHtml}
        ${contentHtml}
        ${attachmentsHtml}
        ${embedsHtml}
        ${stickersHtml}
        ${reactionsHtml}
        ${fallbackHtml}
      </div>
    </article>`;
}

function channelCss() {
  return `
    :root { color-scheme: dark; font-family: "gg sans", "Noto Sans", "Helvetica Neue", Arial, sans-serif; background: #313338; color: #dbdee1; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; background: #313338; color: #dbdee1; }
    a { color: #00a8fc; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .discord-shell { display: grid; grid-template-columns: 280px minmax(0, 1fr); min-height: 100vh; background: #313338; }
    .discord-sidebar { position: sticky; top: 0; height: 100vh; overflow-y: auto; background: #2b2d31; border-right: 1px solid #1e1f22; }
    .server-header { min-height: 64px; padding: 14px 16px; border-bottom: 1px solid #1e1f22; box-shadow: 0 1px 0 rgba(0, 0, 0, .2); }
    .server-title { color: #f2f3f5; font-size: 16px; line-height: 20px; font-weight: 700; overflow-wrap: anywhere; }
    .home-link { display: block; margin-top: 5px; color: #b5bac1; font-size: 12px; }
    .channel-section-title { margin: 18px 10px 6px; color: #949ba4; font-size: 12px; line-height: 16px; font-weight: 700; }
    .channel-nav { display: grid; gap: 2px; padding: 0 8px 16px; }
    .category-block { display: grid; gap: 2px; margin-top: 10px; }
    .category-title { padding: 4px 8px 2px; color: #949ba4; font-size: 11px; line-height: 14px; font-weight: 700; text-transform: uppercase; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .channel-link { display: grid; grid-template-columns: 20px minmax(0, 1fr); align-items: center; gap: 7px; min-height: 34px; padding: 6px 8px; border-radius: 4px; color: #949ba4; font-size: 15px; }
    .channel-link:hover { background: #35373c; color: #dbdee1; text-decoration: none; }
    .channel-link.active { background: #404249; color: #fff; }
    .channel-symbol { color: #80848e; text-align: center; font-weight: 700; }
    .channel-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .empty-nav { padding: 10px 16px; color: #949ba4; font-size: 13px; }
    .chat-panel { display: grid; grid-template-rows: 48px minmax(0, 1fr) auto; min-width: 0; min-height: 100vh; background: #313338; }
    .chat-topbar { position: sticky; top: 0; z-index: 2; display: flex; align-items: center; justify-content: space-between; gap: 16px; min-height: 48px; padding: 0 20px; background: #313338; border-bottom: 1px solid #27292d; box-shadow: 0 1px 0 rgba(0, 0, 0, .24); }
    h1 { margin: 0; color: #f2f3f5; font-size: 16px; line-height: 20px; font-weight: 700; }
    .topbar-meta { color: #949ba4; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .messages { min-width: 0; padding: 18px 0 28px; overflow: visible; }
    .message { display: grid; grid-template-columns: 48px minmax(0, 1fr); gap: 12px; padding: 3px 48px 3px 20px; margin-top: 14px; }
    .message:hover { background: #2e3035; }
    .avatar { width: 40px; height: 40px; border-radius: 50%; background: #1e1f22; object-fit: cover; }
    .message-main { min-width: 0; }
    .message-meta { display: flex; flex-wrap: wrap; gap: 7px; align-items: baseline; min-height: 20px; color: #949ba4; font-size: 12px; line-height: 18px; }
    .author { color: #f2f3f5; font-weight: 600; font-size: 15px; }
    .author-id { color: #80848e; font-family: Consolas, "Liberation Mono", monospace; font-size: 11px; }
    .message-content { margin-top: 1px; white-space: pre-wrap; overflow-wrap: anywhere; color: #dbdee1; font-size: 15px; line-height: 1.42; }
    .message-empty { margin-top: 4px; color: #949ba4; font-size: 13px; font-style: italic; }
    .reply-ref { width: fit-content; margin: 2px 0 4px; padding: 2px 7px; border-left: 2px solid #4e5058; color: #b5bac1; font-size: 12px; background: #2b2d31; border-radius: 3px; }
    .attachments, .embeds, .stickers, .reactions { margin-top: 8px; display: grid; gap: 8px; }
    .attachment { display: grid; gap: 7px; max-width: 640px; padding: 10px; background: #2b2d31; border: 1px solid #1e1f22; border-radius: 4px; }
    .attachment img, .embed-image { max-width: 100%; max-height: 520px; object-fit: contain; border-radius: 4px; }
    video { max-width: 100%; max-height: 520px; border-radius: 4px; }
    audio { width: min(100%, 520px); }
    .download-error { color: #f23f42; font-size: 12px; }
    .embed { display: flex; gap: 10px; max-width: 680px; padding: 10px 12px; border-left: 4px solid #4e5058; background: #2b2d31; border-radius: 4px; }
    .embed-thumb { width: 80px; height: 80px; object-fit: cover; border-radius: 4px; }
    .embed-title, .embed-author { color: #f2f3f5; font-weight: 700; margin-bottom: 4px; }
    .embed-description, .embed-field span { white-space: pre-wrap; overflow-wrap: anywhere; display: block; color: #dbdee1; line-height: 1.4; }
    .embed-field { margin-top: 7px; }
    .embed-field strong { color: #f2f3f5; }
    .embed-footer { margin-top: 7px; color: #949ba4; font-size: 12px; }
    .sticker, .reaction { display: inline-block; width: fit-content; padding: 3px 8px; border: 1px solid #3f4147; border-radius: 999px; background: #2b2d31; color: #dbdee1; font-size: 12px; }
    .chat-footer { padding: 14px 20px 18px 80px; color: #949ba4; font-size: 12px; border-top: 1px solid #27292d; }
    @media (max-width: 760px) {
      .discord-shell { grid-template-columns: 1fr; }
      .discord-sidebar { position: relative; height: auto; max-height: 280px; border-right: 0; border-bottom: 1px solid #1e1f22; }
      .message { grid-template-columns: 40px minmax(0, 1fr); padding-right: 16px; padding-left: 12px; }
      .chat-topbar { align-items: flex-start; flex-direction: column; height: auto; padding: 10px 14px; }
      .topbar-meta { white-space: normal; }
      .chat-footer { padding-left: 14px; }
    }`;
}

function indexCss() {
  return `
    :root { color-scheme: dark; font-family: "gg sans", "Noto Sans", "Helvetica Neue", Arial, sans-serif; background: #313338; color: #dbdee1; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; background: #313338; color: #dbdee1; }
    a { color: #00a8fc; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .discord-shell { display: grid; grid-template-columns: 280px minmax(0, 1fr); min-height: 100vh; background: #313338; }
    .discord-sidebar { position: sticky; top: 0; height: 100vh; overflow-y: auto; background: #2b2d31; border-right: 1px solid #1e1f22; }
    .server-header { min-height: 64px; padding: 14px 16px; border-bottom: 1px solid #1e1f22; box-shadow: 0 1px 0 rgba(0, 0, 0, .2); }
    .server-title { color: #f2f3f5; font-size: 16px; line-height: 20px; font-weight: 700; overflow-wrap: anywhere; }
    .home-link { display: block; margin-top: 5px; color: #b5bac1; font-size: 12px; }
    .sidebar-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 12px 10px 2px; }
    .mini-stat { min-width: 0; padding: 8px; border-radius: 4px; background: #1e1f22; }
    .mini-stat strong { display: block; color: #f2f3f5; font-size: 18px; line-height: 22px; }
    .mini-stat span { color: #949ba4; font-size: 11px; }
    .channel-section-title { margin: 18px 10px 6px; color: #949ba4; font-size: 12px; line-height: 16px; font-weight: 700; }
    .channel-nav { display: grid; gap: 2px; padding: 0 8px 16px; }
    .category-block { display: grid; gap: 2px; margin-top: 10px; }
    .category-title { padding: 4px 8px 2px; color: #949ba4; font-size: 11px; line-height: 14px; font-weight: 700; text-transform: uppercase; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .channel-link { display: grid; grid-template-columns: 20px minmax(0, 1fr); align-items: center; gap: 7px; min-height: 34px; padding: 6px 8px; border-radius: 4px; color: #949ba4; font-size: 15px; }
    .channel-link:hover { background: #35373c; color: #dbdee1; text-decoration: none; }
    .channel-symbol { color: #80848e; text-align: center; font-weight: 700; }
    .channel-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .empty-nav { padding: 10px 16px; color: #949ba4; font-size: 13px; }
    .overview-panel { min-width: 0; min-height: 100vh; background: #313338; }
    .overview-topbar { position: sticky; top: 0; z-index: 2; display: flex; align-items: center; justify-content: space-between; gap: 16px; min-height: 48px; padding: 0 20px; background: #313338; border-bottom: 1px solid #27292d; box-shadow: 0 1px 0 rgba(0, 0, 0, .24); }
    h1 { margin: 0; color: #f2f3f5; font-size: 16px; line-height: 20px; font-weight: 700; }
    h2 { margin: 24px 0 10px; color: #f2f3f5; font-size: 15px; line-height: 20px; }
    .overview-category { margin: 20px 0 8px; color: #949ba4; font-size: 12px; font-weight: 700; text-transform: uppercase; }
    .muted { color: #949ba4; font-size: 13px; }
    .overview-content { padding: 24px; }
    .intent-warning { margin-bottom: 16px; padding: 12px 14px; color: #fee75c; background: rgba(254, 231, 92, .08); border: 1px solid rgba(254, 231, 92, .28); border-radius: 4px; font-size: 13px; line-height: 1.4; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin: 0 0 22px; }
    .stat { min-width: 0; padding: 14px; background: #2b2d31; border: 1px solid #1e1f22; border-radius: 4px; }
    .stat strong { display: block; color: #f2f3f5; font-size: 26px; line-height: 32px; }
    .stat span { color: #b5bac1; font-size: 12px; }
    .channels { display: grid; gap: 4px; }
    .channel { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 12px; align-items: center; min-height: 48px; padding: 8px 12px; background: transparent; border-radius: 4px; }
    .channel:hover { background: #2e3035; }
    .channel-main { min-width: 0; }
    .channel-title { display: flex; gap: 8px; align-items: center; color: #dbdee1; font-size: 15px; }
    .channel-id { color: #80848e; font-family: Consolas, "Liberation Mono", monospace; font-size: 11px; overflow-wrap: anywhere; }
    .channel-status { color: #949ba4; font-size: 13px; text-align: right; white-space: nowrap; }
    .failed { color: #f23f42; }
    @media (max-width: 760px) {
      .discord-shell { grid-template-columns: 1fr; }
      .discord-sidebar { position: relative; height: auto; max-height: 300px; border-right: 0; border-bottom: 1px solid #1e1f22; }
      .overview-topbar { align-items: flex-start; flex-direction: column; height: auto; padding: 10px 14px; }
      .overview-content { padding: 16px 12px 24px; }
      .channel { grid-template-columns: 1fr; }
      .channel-status { text-align: left; white-space: normal; }
    }`;
}

async function writeChannelHeader(stream, channel, guild, startedAt, channelNav) {
  await write(stream, `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>#${escapeHtml(channel.name)} - ${escapeHtml(guild.name)}</title>
  <style>${channelCss()}</style>
</head>
<body>
  <div class="discord-shell">
    ${renderShellSidebar(guild, channelNav, channel.id, "channel")}
    <section class="chat-panel">
      <header class="chat-topbar">
        <h1>${escapeHtml(channelIcon(channel.type))} ${escapeHtml(channel.name)}</h1>
        <div class="topbar-meta">${escapeHtml(guild.name)} - ${escapeHtml(channelTypeLabel(channel.type))} channel - backup started ${escapeHtml(formatDiscordTime(startedAt))} - ID ${escapeHtml(channel.id)}</div>
      </header>
      <main class="messages">
`);
}

async function writeChannelFooter(stream, stats) {
  await write(stream, `      </main>
      <footer class="chat-footer">Messages: ${stats.messages} - Attachments downloaded: ${stats.attachmentsDownloaded} - Attachments failed: ${stats.attachmentsFailed}</footer>
    </section>
  </div>
</body>
</html>
`);
}

async function backupChannel(channel, context) {
  const channelFile = context.channelFileName;
  const channelPath = path.join(context.channelsDir, channelFile);
  const assetsDir = path.join(context.assetsDir, channel.id);
  const relativeAssetsPath = `../assets/${channel.id}`;
  const stream = fsSync.createWriteStream(channelPath, { encoding: "utf8" });
  const stats = {
    id: channel.id,
    name: channel.name,
    type: channel.type,
    categoryId: context.category.categoryId,
    categoryName: context.category.categoryName,
    categoryPosition: context.category.categoryPosition,
    status: "ok",
    file: `channels/${channelFile}`,
    messages: 0,
    attachmentsDownloaded: 0,
    attachmentsFailed: 0,
    error: null,
  };

  await fs.mkdir(assetsDir, { recursive: true });
  await writeChannelHeader(stream, channel, context.guild, context.startedAt, context.channelNav);

  let before = null;
  while (true) {
    const options = before
      ? { limit: messageFetchLimit, before }
      : { limit: messageFetchLimit };
    const batch = await channel.messages.fetch(options);
    if (batch.size === 0) {
      break;
    }

    const messages = [...batch.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);
    for (const message of messages) {
      await write(stream, await renderMessage(message, {
        guildId: context.guild.id,
        channelId: channel.id,
        assetsDir,
        relativeAssetsPath,
        counters: stats,
      }));
      stats.messages += 1;
    }

    before = batch.last()?.id;
    if (batch.size < messageFetchLimit || !before) {
      break;
    }
  }

  await writeChannelFooter(stream, stats);
  await endStream(stream);
  return stats;
}

async function createZip(sourceDir, outputPath) {
  await new Promise((resolve, reject) => {
    const output = fsSync.createWriteStream(outputPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", resolve);
    archive.on("error", reject);
    archive.pipe(output);

    archive.glob("**/*", {
      cwd: sourceDir,
      ignore: ["backup.zip"],
      dot: true,
    });
    archive.finalize();
  });
}

async function writeIndex(manifest, outputPath) {
  const successful = manifest.channels.filter((channel) => channel.status === "ok");
  const failed = manifest.channels.filter((channel) => channel.status !== "ok");
  const sidebarStats = `<div class="sidebar-stats">
    <div class="mini-stat"><strong>${manifest.totals.channelsOk}</strong><span>ok</span></div>
    <div class="mini-stat"><strong>${failed.length}</strong><span>failed</span></div>
    <div class="mini-stat"><strong>${manifest.totals.messages}</strong><span>messages</span></div>
    <div class="mini-stat"><strong>${manifest.totals.attachmentsDownloaded}</strong><span>files</span></div>
  </div>`;
  const channelGroups = [];
  for (const channel of manifest.channels) {
    const categoryKey = channel.categoryId || `uncategorized:${channel.categoryName || "NO CATEGORY"}`;
    const group = channelGroups.find((item) => item.key === categoryKey);
    if (group) {
      group.channels.push(channel);
      continue;
    }

    channelGroups.push({
      key: categoryKey,
      name: channel.categoryName || "NO CATEGORY",
      channels: [channel],
    });
  }
  const channelRows = channelGroups.map((group) => {
    const rows = group.channels.map((channel) => {
      const name = channel.name;
      const status = channel.status === "ok"
        ? `${channel.messages} messages`
        : `${channel.status}: ${channel.error || (channel.missingPermissions || []).join(", ")}`;
      const content = channel.file
        ? `<a class="channel-title" href="${escapeAttr(channel.file)}"><span>${escapeHtml(channelIcon(channel.type))}</span><span>${escapeHtml(name)}</span></a>`
        : `<div class="channel-title"><span>${escapeHtml(channelIcon(channel.type))}</span><span>${escapeHtml(name)}</span></div>`;

      return `<div class="channel">
        <div class="channel-main">${content}<div class="channel-id">${escapeHtml(channel.id)}</div></div>
        <div class="channel-status ${channel.status === "ok" ? "" : "failed"}">${escapeHtml(status)}</div>
      </div>`;
    }).join("");

    return `<div class="overview-category">${escapeHtml(group.name)}</div>${rows}`;
  }).join("");
  const intentWarning = manifest.messageContentIntentEnabled
    ? ""
    : `<div class="intent-warning">Message Content Intent was disabled for this run. Some message text, embeds, and attachments may be unavailable. Enable it in Discord Developer Portal and set ENABLE_MESSAGE_CONTENT_INTENT=true before running a new backup.</div>`;

  const html = `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(manifest.guild.name)} backup</title>
  <style>${indexCss()}</style>
</head>
<body>
  <div class="discord-shell">
    ${renderShellSidebar(manifest.guild, successful, null, "index", sidebarStats)}
    <main class="overview-panel">
      <header class="overview-topbar">
        <h1>${escapeHtml(manifest.guild.name)} backup</h1>
        <div class="muted">Started ${escapeHtml(manifest.startedAt)} - Finished ${escapeHtml(manifest.finishedAt || "not finished")}</div>
      </header>
      <div class="overview-content">
        ${intentWarning}
        <section class="summary">
          <div class="stat"><strong>${manifest.totals.channelsOk}</strong><span>channels ok</span></div>
          <div class="stat"><strong>${failed.length}</strong><span>channels skipped/failed</span></div>
          <div class="stat"><strong>${manifest.totals.messages}</strong><span>messages</span></div>
          <div class="stat"><strong>${manifest.totals.attachmentsDownloaded}</strong><span>attachments downloaded</span></div>
          <div class="stat"><strong>${manifest.totals.attachmentsFailed}</strong><span>attachments failed</span></div>
        </section>
        <h2>Channels</h2>
        <section class="channels">${channelRows || "<p>No channels backed up.</p>"}</section>
        <p class="muted">Successful channels: ${successful.length}</p>
      </div>
    </main>
  </div>
</body>
</html>
`;

  await fs.writeFile(outputPath, html, "utf8");
}

function sortChannels(channels) {
  return channels.sort((a, b) => {
    const parentA = a.parent?.rawPosition ?? a.parent?.position ?? -1;
    const parentB = b.parent?.rawPosition ?? b.parent?.position ?? -1;
    if (parentA !== parentB) return parentA - parentB;

    const posA = a.rawPosition ?? a.position ?? 0;
    const posB = b.rawPosition ?? b.position ?? 0;
    if (posA !== posB) return posA - posB;

    return a.name.localeCompare(b.name);
  });
}

async function backupGuild(guild, options = {}) {
  const startedAt = new Date();
  const backupId = sanitizeFilename(`${guild.name}-${formatTimestampForPath(startedAt)}`, `backup-${formatTimestampForPath(startedAt)}`);
  const backupDir = path.join(backupRoot, backupId);
  const channelsDir = path.join(backupDir, "channels");
  const assetsDir = path.join(backupDir, "assets");
  const manifestPath = path.join(backupDir, "manifest.json");
  const indexPath = path.join(backupDir, "index.html");
  const zipPath = path.join(backupDir, "backup.zip");

  await fs.mkdir(channelsDir, { recursive: true });
  await fs.mkdir(assetsDir, { recursive: true });
  await guild.channels.fetch();

  const me = guild.members.me || await guild.members.fetchMe();
  const channels = sortChannels([...guild.channels.cache.values()].filter(isBackupChannel));
  const channelRecords = channels.map((channel, index) => {
    const category = getCategoryInfo(channel);
    return {
      id: channel.id,
      name: channel.name,
      type: channel.type,
      file: buildChannelFile(channel, index + 1),
      channel,
      category,
      missingPermissions: missingPermissions(channel, me),
    };
  });
  const channelNav = channelRecords
    .filter((record) => record.missingPermissions.length === 0)
    .map(({ id, name, type, file, category }) => ({ id, name, type, file, ...category }));
  const manifest = {
    backupId,
    startedAt: startedAt.toISOString(),
    finishedAt: null,
    requestedById: options.requestedById || null,
    output: {
      directory: backupDir,
      index: indexPath,
      zip: zipPath,
    },
    guild: {
      id: guild.id,
      name: guild.name,
    },
    messageContentIntentEnabled: Boolean(options.messageContentIntentEnabled),
    totals: {
      channelsFound: channels.length,
      channelsOk: 0,
      channelsSkipped: 0,
      messages: 0,
      attachmentsDownloaded: 0,
      attachmentsFailed: 0,
    },
    channels: [],
  };

  for (const record of channelRecords) {
    const channel = record.channel;
    const missing = record.missingPermissions;
    if (missing.length > 0) {
      manifest.channels.push({
        id: channel.id,
        name: channel.name,
        type: channel.type,
        ...record.category,
        status: "skipped",
        missingPermissions: missing,
        messages: 0,
        attachmentsDownloaded: 0,
        attachmentsFailed: 0,
      });
      manifest.totals.channelsSkipped += 1;
      continue;
    }

    try {
      const stats = await backupChannel(channel, {
        guild,
        startedAt,
        channelsDir,
        assetsDir,
        channelFileName: path.basename(record.file),
        channelNav,
        category: record.category,
      });

      manifest.channels.push(stats);
      manifest.totals.channelsOk += 1;
      manifest.totals.messages += stats.messages;
      manifest.totals.attachmentsDownloaded += stats.attachmentsDownloaded;
      manifest.totals.attachmentsFailed += stats.attachmentsFailed;
    } catch (error) {
      manifest.channels.push({
        id: channel.id,
        name: channel.name,
        type: channel.type,
        ...record.category,
        status: "failed",
        error: error.message,
        messages: 0,
        attachmentsDownloaded: 0,
        attachmentsFailed: 0,
      });
      manifest.totals.channelsSkipped += 1;
    }

    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
  }

  manifest.finishedAt = new Date().toISOString();
  await writeIndex(manifest, indexPath);
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
  await createZip(backupDir, zipPath);

  return manifest;
}

module.exports = {
  backupGuild,
};
