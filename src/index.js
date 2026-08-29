const { Client, Collection, GatewayIntentBits } = require("discord.js");
const { config } = require("./config");
const { loadCommands } = require("./utils/loadCommands");
const { loadEvents } = require("./utils/loadEvents");

if (!config.token) {
  console.error("DISCORD_TOKEN belum di-set di file .env");
  process.exit(1);
}

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

const intents = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMembers,
  GatewayIntentBits.GuildMessages,
];

if (config.enableMessageContentIntent) {
  intents.push(GatewayIntentBits.MessageContent);
}

const client = new Client({
  intents,
});

client.commands = new Collection();

async function bootstrap() {
  const commandResults = await loadCommands(client);
  const eventResults = await loadEvents(client);

  for (const result of commandResults) {
    if (result.status === "fail") {
      console.error(`[commands] FAIL ${result.file} -> ${result.note}`);
    }
  }

  for (const result of eventResults) {
    if (result.status === "fail") {
      console.error(`[events] FAIL ${result.file} -> ${result.note}`);
    }
  }

  const commandOk = commandResults.filter((r) => r.status === "ok").length;
  const eventOk = eventResults.filter((r) => r.status === "ok").length;
  console.log(`[loader] commands: ${commandOk}, events: ${eventOk}`);

  await client.login(config.token);
}

bootstrap().catch((error) => {
  console.error("Gagal start bot:", error);
  process.exit(1);
});
