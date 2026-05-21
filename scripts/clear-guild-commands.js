require("dotenv").config();

const { REST, Routes } = require("discord.js");

const token = process.env.DISCORD_TOKEN;
const guildId = process.env.GUILD_ID;
const clientIdFromEnv = process.env.CLIENT_ID;

if (!token) {
  console.error("DISCORD_TOKEN belum di-set di .env");
  process.exit(1);
}

if (!guildId) {
  console.error("GUILD_ID belum di-set di .env");
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

async function main() {
  const clientId = resolveClientId();
  const rest = new REST({ version: "10" }).setToken(token);
  await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] });
  console.log("Guild commands cleared.");
}

main().catch((error) => {
  console.error("Gagal clear guild commands:", error);
  process.exit(1);
});
