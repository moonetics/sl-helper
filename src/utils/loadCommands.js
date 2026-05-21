const fs = require("fs/promises");
const path = require("path");

const commandsDir = path.resolve(__dirname, "..", "commands");

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

async function loadCommands(client) {
  const results = [];
  const files = await walk(commandsDir);

  for (const file of files) {
    try {
      delete require.cache[require.resolve(file)];
      const mod = require(file);
      if (!mod?.data?.name || typeof mod?.execute !== "function") {
        results.push({ status: "skip", file, note: "bukan slash command valid" });
        continue;
      }

      client.commands.set(mod.data.name, mod);
      results.push({ status: "ok", file, name: mod.data.name });
    } catch (error) {
      results.push({ status: "fail", file, note: error.message });
    }
  }

  return results;
}

module.exports = {
  loadCommands,
};
