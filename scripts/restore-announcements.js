require("dotenv").config();

const fs = require("fs/promises");
const path = require("path");
const { Client, GatewayIntentBits } = require("discord.js");

const token = process.env.DISCORD_TOKEN;
const backupId = "SL-Community-2026-05-07_02-33-25";
const backupRoot = path.resolve(__dirname, "..", "backups", backupId);
const manifestPath = path.join(backupRoot, "manifest.json");
const backupStartedLabel = "May 7, 2026, 2:33 AM WIB";
const restoreFooterText = `Restored from backup ${backupId}, backup started ${backupStartedLabel}`;
const maxDiscordContentLength = 2000;
const maxFilesPerMessage = 10;
const restoreDelayMinMs = 3 * 60 * 1000;
const restoreDelayMaxMs = 5 * 60 * 1000;

const roleIds = {
  speedDivision: "1501704754743476406",
  ladies: "1501704756660273343",
  streamer: "1501704758304706821",
  verifiedRoster: "1501704753166680186",
};

const allowedMentionRoleIds = Object.values(roleIds);

const roleMentionReplacements = [
  ["@🏁〡SL Speed Division", `<@&${roleIds.speedDivision}>`],
  ["@💗〡SL Ladies", `<@&${roleIds.ladies}>`],
  ["@🔴〡SL Streamer", `<@&${roleIds.streamer}>`],
  ["@🔖〡Verified SL Roster", `<@&${roleIds.verifiedRoster}>`],
];

const restoreTargets = [
  {
    sourceChannelId: "1459240153993183446",
    targetChannelId: "1501708289854144524",
    label: "📢・official-announcement",
  },
  {
    sourceChannelId: "1470952650399809578",
    targetChannelId: "1501708292714397799",
    label: "📢・sub-announcement",
  },
  {
    sourceChannelId: "1467547676991160411",
    targetChannelId: "1501708296363577467",
    label: "🧨・pengunaan-tag-sl",
  },
  {
    sourceChannelId: "1459240379898531982",
    targetChannelId: "1501708298842280018",
    label: "📰・event-results",
  },
];

function printHelp() {
  console.log("Usage: npm run announcements:restore");
  console.log("       npm run announcements:restore -- --clear-first");
  console.log("       npm run announcements:restore -- --refresh-mentions");
  console.log("");
  console.log("Restore backup announcement messages in append-only mode.");
  console.log("By default, each restored backup message waits a random 3-5 minutes before the next one.");
  console.log("The script skips targets that already have restore footers in the target channel.");
  console.log("--clear-first deletes all current messages in target channels before restoring from backup.");
  console.log("--refresh-mentions edits restored messages so @everyone and converted role mentions are parsed, and normalizes the footer.");
  console.log("--no-delay sends restore messages immediately.");
}

function requireEnv() {
  if (!token) {
    throw new Error("DISCORD_TOKEN belum di-set di .env");
  }
}

function decodeHtml(value) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function convertRoleMentions(content) {
  let converted = content;
  for (const [oldMention, newMention] of roleMentionReplacements) {
    converted = converted.replace(new RegExp(escapeRegExp(oldMention), "g"), newMention);
  }
  return converted;
}

function extractFirst(body, pattern) {
  const match = pattern.exec(body);
  return match ? match[1] : "";
}

function normalizeAssetPath(assetHref) {
  const decodedHref = decodeHtml(assetHref);
  const withoutParent = decodedHref.replace(/^\.\.\//, "");
  const normalized = path.normalize(withoutParent);

  if (normalized.startsWith("..") || path.isAbsolute(normalized) || !normalized.startsWith("assets")) {
    return null;
  }

  return path.join(backupRoot, normalized);
}

function parseMessages(html) {
  const messages = [];
  const articlePattern = /<article class="message" id="message-([^"]+)">([\s\S]*?)<\/article>/g;
  let articleMatch;

  while ((articleMatch = articlePattern.exec(html)) !== null) {
    const oldMessageId = articleMatch[1];
    const body = articleMatch[2];
    const rawContent = extractFirst(body, /<div class="message-content">([\s\S]*?)<\/div>/);
    const timestamp = decodeHtml(extractFirst(body, /<time datetime="([^"]+)"/));
    const content = convertRoleMentions(decodeHtml(rawContent).trimEnd());
    const attachments = [];
    const seenAttachments = new Set();
    const hrefPattern = /href="(\.\.\/assets\/[^"]+)"/g;
    let hrefMatch;

    while ((hrefMatch = hrefPattern.exec(body)) !== null) {
      const attachmentPath = normalizeAssetPath(hrefMatch[1]);
      if (attachmentPath && !seenAttachments.has(attachmentPath)) {
        seenAttachments.add(attachmentPath);
        attachments.push(attachmentPath);
      }
    }

    messages.push({
      oldMessageId,
      timestamp,
      content,
      attachments,
    });
  }

  return messages;
}

function footerFor() {
  return `||${restoreFooterText}||`;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function randomRestoreDelayMs() {
  return restoreDelayMinMs + Math.floor(Math.random() * (restoreDelayMaxMs - restoreDelayMinMs + 1));
}

function formatDuration(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

function takeChunk(value, maxLength) {
  if (value.length <= maxLength) {
    return [value, ""];
  }

  const slice = value.slice(0, maxLength + 1);
  const candidates = [slice.lastIndexOf("\n"), slice.lastIndexOf(" "), maxLength];
  const splitAt = candidates.find((candidate) => candidate > 0 && candidate <= maxLength) || maxLength;

  return [value.slice(0, splitAt).trimEnd(), value.slice(splitAt).trimStart()];
}

function splitContentWithFooter(content, footer) {
  const chunks = [];
  let remaining = content.trimEnd();
  const separatorLength = remaining ? 2 : 0;
  const finalContentLimit = maxDiscordContentLength - footer.length - separatorLength;

  while (remaining.length > Math.max(finalContentLimit, 0)) {
    const [chunk, rest] = takeChunk(remaining, maxDiscordContentLength);
    chunks.push(chunk);
    remaining = rest;
  }

  const finalChunk = remaining ? `${remaining}\n\n${footer}` : footer;

  if (finalChunk.length <= maxDiscordContentLength) {
    chunks.push(finalChunk);
    return chunks;
  }

  if (remaining) {
    chunks.push(remaining);
  }
  chunks.push(footer);
  return chunks;
}

async function resolveAttachments(attachmentPaths) {
  const existing = [];
  const missing = [];

  for (const filePath of attachmentPaths) {
    try {
      await fs.access(filePath);
      existing.push(filePath);
    } catch {
      missing.push(filePath);
    }
  }

  return { existing, missing };
}

async function sendChunks(channel, chunks, files) {
  let sentMessages = 0;
  const baseOptions = {
    allowedMentions: {
      parse: ["everyone"],
      roles: allowedMentionRoleIds,
    },
  };

  for (let index = 0; index < chunks.length - 1; index += 1) {
    await channel.send({ ...baseOptions, content: chunks[index] });
    sentMessages += 1;
  }

  const finalChunk = chunks[chunks.length - 1] || "";
  const firstFileBatch = files.slice(0, maxFilesPerMessage);
  await channel.send({
    ...baseOptions,
    content: finalChunk,
    files: firstFileBatch,
  });
  sentMessages += 1;

  for (let index = maxFilesPerMessage; index < files.length; index += maxFilesPerMessage) {
    const batch = files.slice(index, index + maxFilesPerMessage);
    await channel.send({
      ...baseOptions,
      content: "Attachment lanjutan dari pesan backup yang sama.",
      files: batch,
    });
    sentMessages += 1;
  }

  return sentMessages;
}

function mentionOptions() {
  return {
    parse: ["everyone"],
    roles: allowedMentionRoleIds,
  };
}

async function collectExistingRestoredIds(channel) {
  const restoredIds = new Set();
  let markerCount = 0;
  let before;
  let fetchedTotal = 0;
  const oldIdMarkerPattern = new RegExp(
    `Restored from backup ${escapeRegExp(backupId)}[\\s\\S]*?old message ID: (\\d+)`,
    "g"
  );
  const footerMarker = `Restored from backup ${backupId}, backup started ${backupStartedLabel}`;

  while (fetchedTotal < 500) {
    const batch = await channel.messages.fetch({
      limit: 100,
      ...(before ? { before } : {}),
    });

    if (batch.size === 0) {
      break;
    }

    for (const message of batch.values()) {
      fetchedTotal += 1;
      let markerMatch;
      oldIdMarkerPattern.lastIndex = 0;
      if (message.content.includes(footerMarker)) {
        markerCount += 1;
      }
      while ((markerMatch = oldIdMarkerPattern.exec(message.content)) !== null) {
        restoredIds.add(markerMatch[1]);
      }
    }

    before = batch.last().id;
    if (batch.size < 100) {
      break;
    }
  }

  return { markerCount, restoredIds };
}

function normalizeRestoreFooter(content) {
  const oldFooterPattern = new RegExp(
    `(?:\\|\\|)?(?:—\\s*)?Restored from backup ${escapeRegExp(backupId)}, backup started ${escapeRegExp(
      backupStartedLabel
    )}, old message ID: \\d+(?:\\|\\|)?`,
    "g"
  );
  const newFooter = footerFor();

  if (oldFooterPattern.test(content)) {
    return content.replace(oldFooterPattern, newFooter);
  }

  return content;
}

async function refreshMentionParsing(channel) {
  let before;
  let fetchedTotal = 0;
  let matched = 0;
  let refreshed = 0;
  let failed = 0;

  while (fetchedTotal < 500) {
    const batch = await channel.messages.fetch({
      limit: 100,
      ...(before ? { before } : {}),
    });

    if (batch.size === 0) {
      break;
    }

    for (const message of batch.values()) {
      fetchedTotal += 1;

      if (!message.content.includes(`Restored from backup ${backupId}`)) {
        continue;
      }

      matched += 1;

      try {
        const normalizedContent = normalizeRestoreFooter(message.content);
        await message.edit({
          content: normalizedContent,
          allowedMentions: mentionOptions(),
        });
        refreshed += 1;
      } catch (error) {
        failed += 1;
        console.error(`- ${message.id}: refresh mention failed - ${error.message}`);
      }
    }

    before = batch.last().id;
    if (batch.size < 100) {
      break;
    }
  }

  return { matched, refreshed, failed };
}

async function readManifest() {
  return JSON.parse(await fs.readFile(manifestPath, "utf8"));
}

function findManifestChannel(manifest, sourceChannelId) {
  return manifest.channels.find((channel) => channel.id === sourceChannelId);
}

async function restoreTarget(client, manifest, target, restoreOptions) {
  const manifestChannel = findManifestChannel(manifest, target.sourceChannelId);
  if (!manifestChannel) {
    throw new Error(`Backup channel tidak ditemukan di manifest: ${target.sourceChannelId}`);
  }

  const sourcePath = path.join(backupRoot, manifestChannel.file);
  const html = await fs.readFile(sourcePath, "utf8");
  const messages = parseMessages(html);
  const channel = await client.channels.fetch(target.targetChannelId);

  if (!channel || !channel.isTextBased() || typeof channel.send !== "function") {
    throw new Error(`Target channel tidak bisa dipakai untuk kirim pesan: ${target.label} (${target.targetChannelId})`);
  }

  const summary = {
    label: target.label,
    targetChannelId: target.targetChannelId,
    found: messages.length,
    posted: 0,
    skipped: 0,
    failed: 0,
    sentDiscordMessages: 0,
    attachmentsUploaded: 0,
    attachmentsMissing: 0,
  };

  if (messages.length === 0) {
    return summary;
  }

  const existingRestored = await collectExistingRestoredIds(channel);

  console.log(`\nTarget: ${target.label} (${target.targetChannelId})`);
  console.log(`Source: ${manifestChannel.file}`);
  console.log(`Messages found: ${messages.length}`);
  console.log(`Already restored in target: ${existingRestored.markerCount}`);

  if (existingRestored.restoredIds.size === 0 && existingRestored.markerCount >= messages.length) {
    summary.skipped = messages.length;
    console.log("- skipped target, restore footers already exist");
    return summary;
  }

  for (const message of messages) {
    if (existingRestored.restoredIds.has(message.oldMessageId)) {
      summary.skipped += 1;
      console.log(`- ${message.oldMessageId}: skipped, already restored`);
      continue;
    }

    const { existing, missing } = await resolveAttachments(message.attachments);
    const footer = footerFor();
    const chunks = splitContentWithFooter(message.content, footer);

    try {
      const sent = await sendChunks(channel, chunks, existing);
      summary.posted += 1;
      summary.sentDiscordMessages += sent;
      summary.attachmentsUploaded += existing.length;
      summary.attachmentsMissing += missing.length;

      if (missing.length > 0) {
        console.log(`- ${message.oldMessageId}: posted, missing attachments ${missing.length}`);
      } else {
        console.log(`- ${message.oldMessageId}: posted`);
      }

      const remainingMessages = messages.length - summary.posted - summary.skipped - summary.failed;
      if (!restoreOptions.noDelay && remainingMessages > 0) {
        const delayMs = randomRestoreDelayMs();
        console.log(`  waiting ${formatDuration(delayMs)} before next restore message...`);
        await sleep(delayMs);
      }
    } catch (error) {
      summary.failed += 1;
      console.error(`- ${message.oldMessageId}: failed - ${error.message}`);
    }
  }

  return summary;
}

async function refreshTargetMentions(client, target) {
  const channel = await client.channels.fetch(target.targetChannelId);

  if (!channel || !channel.isTextBased() || typeof channel.messages?.fetch !== "function") {
    throw new Error(`Target channel tidak bisa dipakai untuk refresh mention: ${target.label} (${target.targetChannelId})`);
  }

  const result = await refreshMentionParsing(channel);
  return {
    label: target.label,
    targetChannelId: target.targetChannelId,
    ...result,
  };
}

async function clearTargetChannel(client, target) {
  const channel = await client.channels.fetch(target.targetChannelId);

  if (!channel || !channel.isTextBased() || typeof channel.messages?.fetch !== "function") {
    throw new Error(`Target channel tidak bisa dipakai untuk hapus pesan: ${target.label} (${target.targetChannelId})`);
  }

  let before;
  let deleted = 0;
  let failed = 0;

  while (true) {
    const batch = await channel.messages.fetch({
      limit: 100,
      ...(before ? { before } : {}),
    });

    if (batch.size === 0) {
      break;
    }

    before = batch.last().id;

    for (const message of batch.values()) {
      try {
        await message.delete();
        deleted += 1;
      } catch (error) {
        failed += 1;
        console.error(`- ${target.label} ${message.id}: delete failed - ${error.message}`);
      }
    }

    if (batch.size < 100) {
      break;
    }
  }

  return {
    label: target.label,
    targetChannelId: target.targetChannelId,
    deleted,
    failed,
  };
}

function printClearSummary(results) {
  const totals = results.reduce(
    (sum, item) => ({
      deleted: sum.deleted + item.deleted,
      failed: sum.failed + item.failed,
    }),
    { deleted: 0, failed: 0 }
  );

  console.log("\nClear summary:");
  for (const item of results) {
    console.log(`- ${item.label} (${item.targetChannelId}): deleted ${item.deleted}, failed ${item.failed}`);
  }
  console.log(`Total: deleted ${totals.deleted}, failed ${totals.failed}`);
}

function printRefreshSummary(results) {
  const totals = results.reduce(
    (sum, item) => ({
      matched: sum.matched + item.matched,
      refreshed: sum.refreshed + item.refreshed,
      failed: sum.failed + item.failed,
    }),
    { matched: 0, refreshed: 0, failed: 0 }
  );

  console.log("\nRefresh mention summary:");
  for (const item of results) {
    console.log(
      `- ${item.label} (${item.targetChannelId}): matched ${item.matched}, refreshed ${item.refreshed}, failed ${item.failed}`
    );
  }
  console.log(`Total: matched ${totals.matched}, refreshed ${totals.refreshed}, failed ${totals.failed}`);
}

function printSummary(results) {
  const totals = results.reduce(
    (sum, item) => ({
      found: sum.found + item.found,
      posted: sum.posted + item.posted,
      skipped: sum.skipped + item.skipped,
      failed: sum.failed + item.failed,
      sentDiscordMessages: sum.sentDiscordMessages + item.sentDiscordMessages,
      attachmentsUploaded: sum.attachmentsUploaded + item.attachmentsUploaded,
      attachmentsMissing: sum.attachmentsMissing + item.attachmentsMissing,
    }),
    {
      found: 0,
      posted: 0,
      skipped: 0,
      failed: 0,
      sentDiscordMessages: 0,
      attachmentsUploaded: 0,
      attachmentsMissing: 0,
    }
  );

  console.log("\nRestore summary:");
  for (const item of results) {
    console.log(
      `- ${item.label} (${item.targetChannelId}): found ${item.found}, posted ${item.posted}, failed ${item.failed}, Discord messages sent ${item.sentDiscordMessages}, attachments uploaded ${item.attachmentsUploaded}, missing ${item.attachmentsMissing}`
    );
  }

  console.log("");
  console.log(
    `Total: found ${totals.found}, posted ${totals.posted}, failed ${totals.failed}, Discord messages sent ${totals.sentDiscordMessages}, attachments uploaded ${totals.attachmentsUploaded}, missing ${totals.attachmentsMissing}`
  );
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    printHelp();
    return;
  }

  requireEnv();

  const refreshMentionsOnly = process.argv.includes("--refresh-mentions");
  const clearFirst = process.argv.includes("--clear-first");
  const noDelay = process.argv.includes("--no-delay");
  const manifest = await readManifest();
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  await client.login(token);

  try {
    if (refreshMentionsOnly) {
      console.log("SL Announcement Mention Refresh");
      console.log("Mode: edit restored bot messages, enable @everyone and converted role mention parsing");

      const results = [];
      for (const target of restoreTargets) {
        results.push(await refreshTargetMentions(client, target));
      }

      printRefreshSummary(results);
      return;
    }

    if (clearFirst) {
      console.log("SL Announcement Clear");
      console.log("Mode: delete all current messages in target channels before restore");

      const clearResults = [];
      for (const target of restoreTargets) {
        clearResults.push(await clearTargetChannel(client, target));
      }

      printClearSummary(clearResults);
      console.log("");
    }

    console.log("SL Announcement Restore");
    console.log(clearFirst ? "Mode: restore after clear" : "Mode: append only, tidak menghapus pesan live");
    console.log(noDelay ? "Delay: disabled" : "Delay: random 3-5 minutes between restored backup messages");
    console.log(`Backup: ${backupId}`);

    const results = [];
    for (const target of restoreTargets) {
      results.push(await restoreTarget(client, manifest, target, { noDelay }));
    }

    printSummary(results);
  } finally {
    client.destroy();
  }
}

main().catch((error) => {
  console.error("Restore announcements gagal:", error);
  process.exit(1);
});
