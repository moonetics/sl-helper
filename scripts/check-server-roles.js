require("dotenv").config();

const { PermissionFlagsBits, REST, Routes } = require("discord.js");

const token = process.env.DISCORD_TOKEN;
const guildId = process.env.GUILD_ID;

const importantPermissionNames = [
  "Administrator",
  "ManageGuild",
  "ManageRoles",
  "ManageChannels",
  "ManageMessages",
  "KickMembers",
  "BanMembers",
  "ModerateMembers",
  "ViewAuditLog",
  "MentionEveryone",
];

function requireEnv() {
  if (!token) {
    throw new Error("DISCORD_TOKEN belum di-set di .env");
  }

  if (!guildId) {
    throw new Error("GUILD_ID belum di-set di .env. Role check butuh ID server target.");
  }
}

function formatColor(color) {
  if (!color) {
    return "#000000";
  }

  return `#${color.toString(16).padStart(6, "0").toUpperCase()}`;
}

function resolvePermissionNames(permissionValue) {
  const permissions = BigInt(permissionValue);

  return Object.entries(PermissionFlagsBits)
    .filter(([, bit]) => (permissions & bit) === bit)
    .map(([name]) => name)
    .sort((a, b) => a.localeCompare(b));
}

function resolveImportantPermissions(permissionNames) {
  return importantPermissionNames.filter((name) => permissionNames.includes(name));
}

function resolveRoleType(role) {
  if (role.id === guildId) {
    return "@everyone";
  }

  if (role.tags?.bot_id) {
    return `bot managed (${role.tags.bot_id})`;
  }

  if (role.managed) {
    return "managed";
  }

  return "custom";
}

function sortByHierarchy(roles) {
  return [...roles].sort((a, b) => {
    if (b.position !== a.position) {
      return b.position - a.position;
    }

    return BigInt(b.id) > BigInt(a.id) ? 1 : -1;
  });
}

function printRole(role, index) {
  const permissionNames = resolvePermissionNames(role.permissions);
  const importantPermissions = resolveImportantPermissions(permissionNames);

  console.log(`${index + 1}. ${role.name}`);
  console.log(`   ID: ${role.id}`);
  console.log(`   Position: ${role.position}`);
  console.log(`   Type: ${resolveRoleType(role)}`);
  console.log(`   Color: ${formatColor(role.color)}`);
  console.log(`   Hoist: ${role.hoist ? "yes" : "no"}`);
  console.log(`   Mentionable: ${role.mentionable ? "yes" : "no"}`);
  console.log(
    `   Important permissions: ${
      importantPermissions.length > 0 ? importantPermissions.join(", ") : "(none)"
    }`
  );
  console.log(
    `   All permissions: ${
      permissionNames.length > 0 ? permissionNames.join(", ") : "(none)"
    }`
  );
  console.log("");
}

async function main() {
  requireEnv();

  const rest = new REST({ version: "10" }).setToken(token);
  const roles = await rest.get(Routes.guildRoles(guildId));
  const sortedRoles = sortByHierarchy(roles);

  console.log("SL Server Role Check");
  console.log("Mode: read only, tidak mengubah Discord server");
  console.log(`Guild ID: ${guildId}`);
  console.log(`Total roles: ${sortedRoles.length}`);
  console.log("Order: highest role first");
  console.log("");
  console.log("Roles:");
  console.log("");

  sortedRoles.forEach(printRole);
}

main().catch((error) => {
  console.error("Role check gagal:", error.message);
  process.exit(1);
});
