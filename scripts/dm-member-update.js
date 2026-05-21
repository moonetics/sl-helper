require("dotenv").config();

const fs = require("fs/promises");
const path = require("path");
const readline = require("readline/promises");
const { Client, Events, GatewayIntentBits } = require("discord.js");
const { readMemberPairs } = require("../src/services/membersService");
const { getUserById, getUsersByIds } = require("../src/services/robloxService");

const token = process.env.DISCORD_TOKEN;
const defaultTestDiscordId = "202263962509639680";
const sendDelayMs = 1500;
const robloxFallbackDelayMs = 2500;
const dmFilePath = path.resolve(__dirname, "..", "dm.txt");
const messageFilePath = path.resolve(__dirname, "..", "member-update-message.md");

if (!token) {
  console.error("DISCORD_TOKEN belum di-set di file .env");
  process.exit(1);
}

function getArgValue(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return null;
  }

  return process.argv[index + 1] || null;
}

function getTargetDiscordId() {
  const npmTarget = process.env.npm_config_target;
  const configTarget = npmTarget && !["true", "false"].includes(npmTarget) ? npmTarget : null;
  const explicitTarget = getArgValue("--target") || configTarget;
  if (explicitTarget) {
    return explicitTarget;
  }

  return process.argv.slice(2).find((arg) => /^\d{15,22}$/.test(arg)) || defaultTestDiscordId;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function confirmSend(targetCount) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const answer = await rl.question(`\nLanjut kirim DM ke ${targetCount} target? ketik yes/y untuk lanjut: `);
    return ["yes", "y"].includes(answer.trim().toLowerCase());
  } finally {
    rl.close();
  }
}

async function readMessage() {
  const message = await fs.readFile(messageFilePath, "utf8");
  const trimmed = message.trim();

  if (!trimmed) {
    throw new Error(`File pesan kosong: ${messageFilePath}`);
  }

  return trimmed;
}

function resolveMembersFilePath() {
  return dmFilePath;
}

function renderMessage(template, target) {
  const displayName = getTargetDisplayName(target) || "warga SL";
  const replacements = {
    userId: target.userId || "",
    discordId: target.discordId,
    displayName,
    kode: target.assessmentCode || target.code || "",
    code: target.assessmentCode || target.code || "",
    assessmentCode: target.assessmentCode || target.code || "",
    robloxName: target.robloxName || displayName,
    robloxUsername: target.robloxName || "",
    name: displayName,
  };

  return template.replace(/\{\{?(userId|discordId|displayName|kode|code|assessmentCode|robloxName|robloxUsername|name)\}?\}/g, (_, key) => {
    return String(replacements[key] ?? "");
  });
}

function normalizeDmTarget(target) {
  const assessmentCode = target.assessmentCode || target.code || target.displayName || target.note || null;

  return {
    ...target,
    assessmentCode,
    code: assessmentCode,
    displayName: target.robloxDisplayName || null,
    note: null,
  };
}

function getTargetDisplayName(target) {
  return target.robloxDisplayName || target.displayName || target.note || null;
}

function formatTargetLabel(target) {
  const displayName = getTargetDisplayName(target);
  const robloxUsername = target.robloxName && target.robloxName !== displayName ? ` @${target.robloxName}` : "";
  const name = displayName ? `${displayName}${robloxUsername}` : "nama tidak diketahui";
  const robloxId = target.userId ? `, robloxid ${target.userId}` : "";
  const code = target.assessmentCode || target.code ? `, kode ${target.assessmentCode || target.code}` : "";

  return `${name} (discordid ${target.discordId}${robloxId}${code})`;
}

async function enrichTargetsWithRoblox(targets) {
  const userIds = [...new Set(targets.map((target) => target.userId).filter(Boolean))];
  const usersById = new Map();

  for (let index = 0; index < userIds.length; index += 100) {
    const batch = userIds.slice(index, index + 100);
    let users = [];

    try {
      users = await getUsersByIds(batch);
    } catch (error) {
      console.warn(`Gagal fetch data Roblox untuk batch ${index + 1}-${index + batch.length}: ${error.message}`);
      for (const userId of batch) {
        try {
          const user = await getUserById(userId);
          users.push(user);
        } catch (singleError) {
          console.warn(`Gagal fetch data Roblox untuk userid ${userId}: ${singleError.message}`);
        }

        await sleep(robloxFallbackDelayMs);
      }
    }

    for (const user of users) {
      usersById.set(Number(user.id), user);
    }
  }

  return targets.map((target) => {
    const robloxUser = usersById.get(Number(target.userId));
    if (!robloxUser) {
      return target;
    }

    return {
      ...target,
      robloxDisplayName: robloxUser.displayName || robloxUser.name || target.displayName,
      robloxName: robloxUser.name || target.displayName,
    };
  });
}

async function resolveTargets(targetFilePath) {
  const members = await readMemberPairs(targetFilePath);
  const shouldSendAll = process.argv.includes("--all") || process.env.npm_config_all === "true";
  const targetDiscordId = getTargetDiscordId();

  if (shouldSendAll) {
    return members.map(normalizeDmTarget);
  }

  const target = members.find((member) => member.discordId === targetDiscordId);
  if (target) {
    return [normalizeDmTarget(target)];
  }

  return [
    {
      userId: null,
      discordId: targetDiscordId,
      displayName: null,
      note: "manual target",
    },
  ];
}

async function sendDm(client, target, messageTemplate) {
  const user = await client.users.fetch(target.discordId);
  const message = renderMessage(messageTemplate, target);
  await user.send(message);
}

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  const targetFilePath = resolveMembersFilePath();
  const rawTargets = await resolveTargets(targetFilePath);
  const targets = await enrichTargetsWithRoblox(rawTargets);
  const messageTemplate = await readMessage();

  if (targets.length === 0) {
    console.log(`Tidak ada target aktif dari ${targetFilePath}.`);
    return;
  }

  console.log(`Sumber target: ${targetFilePath}`);
  console.log(`Target DM: ${targets.length}`);
  for (const target of targets) {
    console.log(`- ${formatTargetLabel(target)}`);
  }

  if (isDryRun) {
    console.log("\nDry run aktif, tidak ada DM yang dikirim.");
    console.log("\nPreview pesan untuk target pertama:\n");
    console.log(renderMessage(messageTemplate, targets[0]));
    return;
  }

  const confirmed = await confirmSend(targets.length);
  if (!confirmed) {
    console.log("Dibatalkan. Tidak ada DM yang dikirim.");
    return;
  }

  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  await new Promise((resolve, reject) => {
    client.once(Events.ClientReady, resolve);
    client.login(token).catch(reject);
  });

  console.log(`Bot online sebagai ${client.user.tag}`);

  let sent = 0;
  let failed = 0;
  const failures = [];

  try {
    for (const [index, target] of targets.entries()) {
      try {
        await sendDm(client, target, messageTemplate);
        sent += 1;
        console.log(`OK kirim DM ke ${formatTargetLabel(target)}`);
      } catch (error) {
        failed += 1;
        failures.push({ target, reason: error.message });
        console.error(`Gagal kirim DM ke ${formatTargetLabel(target)}: ${error.message}`);
      }

      if (index < targets.length - 1) {
        await sleep(sendDelayMs);
      }
    }
  } finally {
    client.destroy();
  }

  console.log(`Selesai. Berhasil: ${sent}, gagal: ${failed}`);
  if (failures.length > 0) {
    console.log("\nDaftar gagal kirim DM:");
    for (const failure of failures) {
      console.log(`- ${formatTargetLabel(failure.target)} -> ${failure.reason}`);
    }
  }

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Gagal menjalankan DM update member:", error);
  process.exit(1);
});
