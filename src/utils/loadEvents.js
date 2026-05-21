const fs = require("fs/promises");
const path = require("path");

const eventsDir = path.resolve(__dirname, "..", "events");

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

async function loadEvents(client) {
  const results = [];
  const files = await walk(eventsDir);

  for (const file of files) {
    try {
      delete require.cache[require.resolve(file)];
      const event = require(file);
      if (!event?.name || typeof event?.execute !== "function") {
        results.push({ status: "skip", file, note: "bukan event handler valid" });
        continue;
      }

      const wrapped = (...args) => event.execute(...args);
      if (event.once) {
        client.once(event.name, wrapped);
      } else {
        client.on(event.name, wrapped);
      }

      results.push({ status: "ok", file, name: event.name });
    } catch (error) {
      results.push({ status: "fail", file, note: error.message });
    }
  }

  return results;
}

module.exports = {
  loadEvents,
};
