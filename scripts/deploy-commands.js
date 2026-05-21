require("dotenv").config();

const fs = require("fs/promises");
const path = require("path");
const { REST, Routes } = require("discord.js");

const token = process.env.DISCORD_TOKEN;
const clientIdFromEnv = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID || null;
const commandsDir = path.resolve(__dirname, "..", "src", "commands");

if (!token) {
  console.error("DISCORD_TOKEN belum di-set di .env");
  process.exit(1);
}

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(normalized + padding, "base64").toString("utf8");
}

function resolveClientId() {
  if (clientIdFromEnv) {
    return clientIdFromEnv;
  }

  const tokenFirstPart = token.split(".")[0];
  if (!tokenFirstPart) {
    throw new Error("CLIENT_ID belum di-set dan token tidak valid.");
  }

  const derivedId = decodeBase64Url(tokenFirstPart);
  if (!/^\d+$/.test(derivedId)) {
    throw new Error("CLIENT_ID belum di-set dan gagal derive dari token.");
  }

  console.warn("CLIENT_ID tidak ditemukan di .env, memakai hasil derive dari token.");
  return derivedId;
}

async function walk(dir, acc = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath, acc);
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith(".js")) {
      continue;
    }

    if (entry.name.startsWith("_") || entry.name.endsWith(".disabled.js")) {
      continue;
    }

    acc.push(fullPath);
  }
  return acc;
}

async function loadCommandPayload() {
  const files = await walk(commandsDir);
  const payload = [];
  const seen = new Set();

  for (const file of files) {
    try {
      delete require.cache[require.resolve(file)];
      const mod = require(file);

      if (!mod?.data?.toJSON || typeof mod?.execute !== "function") {
        continue;
      }

      if (seen.has(mod.data.name)) {
        console.warn(`Duplikat command "${mod.data.name}", memakai file terakhir.`);
      }
      seen.add(mod.data.name);

      payload.push(mod.data.toJSON());
    } catch (error) {
      console.error(`Gagal load command dari ${file}: ${error.message}`);
    }
  }

  return payload;
}

async function main() {
  const clientId = resolveClientId();
  const payload = await loadCommandPayload();
  const rest = new REST({ version: "10" }).setToken(token);

  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: payload });
    console.log(`Deploy guild commands selesai. Total: ${payload.length}`);
    return;
  }

  await rest.put(Routes.applicationCommands(clientId), { body: payload });
  console.log(`Deploy global commands selesai. Total: ${payload.length}`);
}

main().catch((error) => {
  console.error("Deploy command gagal:", error);
  process.exit(1);
});
