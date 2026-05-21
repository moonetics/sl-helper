const currentRoles = [
  {
    name: "SL Helper",
    id: "1501704039673364672",
    position: 12,
    type: "bot managed",
    color: "#00FF6A",
  },
  {
    name: "SL〡BOT",
    id: "1501704763765428255",
    position: 11,
    type: "custom",
    color: "#5865F2",
  },
  {
    name: "SL〡Orchestrator",
    id: "1501704747600576612",
    position: 10,
    type: "custom",
    color: "#2623B9",
  },
  {
    name: "SL〡Council",
    id: "1501704749081301135",
    position: 9,
    type: "custom",
    color: "#F1C40F",
  },
  {
    name: "SL〡Admin",
    id: "1501704751203614830",
    position: 8,
    type: "custom",
    color: "#D10000",
  },
  {
    name: "SL〡Verified Roster",
    id: "1501704753166680186",
    position: 7,
    type: "custom",
    color: "#0DE735",
  },
  {
    name: "SL〡Speed Division",
    id: "1501704754743476406",
    position: 6,
    type: "custom",
    color: "#14F5C8",
  },
  {
    name: "SL〡Ladies",
    id: "1501704756660273343",
    position: 5,
    type: "custom",
    color: "#FF69B4",
  },
  {
    name: "SL〡Streamer",
    id: "1501704758304706821",
    position: 4,
    type: "custom",
    color: "#FF0055",
  },
  {
    name: "SL〡Members",
    id: "1501704759843754118",
    position: 3,
    type: "custom",
    color: "#607D8B",
  },
  {
    name: "SL〡Players",
    id: "1501704761827655741",
    position: 2,
    type: "custom",
    color: "#979C9F",
  },
  {
    name: "Koya",
    id: "1504370958633406518",
    position: 1,
    type: "bot managed",
    color: "#000000",
  },
  {
    name: "@everyone",
    id: "1501690878530424973",
    position: 0,
    type: "@everyone",
    color: "#000000",
  },
];

const recommendedHierarchy = [
  "SL〡BOT",
  "SL〡Orchestrator",
  "SL〡Council",
  "SL〡Admin",
  "SL〡Verified Roster",
  "SL〡Speed Division",
  "SL〡Ladies",
  "SL〡Streamer",
  "SL〡Members",
  "SL〡Players",
];

const recommendations = {
  "SL〡Orchestrator": {
    permissions: [
      "ViewAuditLog",
      "ManageGuild",
      "ManageRoles",
      "ManageChannels",
      "ManageMessages",
      "KickMembers",
      "BanMembers",
      "ModerateMembers",
      "ManageNicknames",
      "ManageWebhooks",
      "MentionEveryone",
    ],
    reason: "Role manusia tertinggi untuk operasi server besar tanpa memakai Administrator.",
    notes: "Tidak diberi Administrator by default. Pakai Administrator hanya sementara saat emergency/setup besar.",
  },
  "SL〡Council": {
    permissions: [
      "ViewAuditLog",
      "ManageRoles",
      "ManageChannels",
      "ManageMessages",
      "KickMembers",
      "ModerateMembers",
      "ManageNicknames",
    ],
    reason: "Role leadership operasional untuk mengatur role/channel dan moderasi utama.",
    notes: "Tidak diberi BanMembers, ManageGuild, ManageWebhooks, atau MentionEveryone agar eskalasi tetap ke Orchestrator.",
  },
  "SL〡Admin": {
    permissions: [
      "ViewAuditLog",
      "ManageMessages",
      "KickMembers",
      "ModerateMembers",
      "ManageNicknames",
    ],
    reason: "Role moderasi harian untuk menjaga chat, member, nickname, kick, dan timeout.",
    notes: "Tidak diberi ManageRoles/ManageChannels supaya konfigurasi server tetap di Council ke atas.",
  },
  "SL〡BOT": {
    permissions: [
      "ViewChannel",
      "SendMessages",
      "ReadMessageHistory",
      "ManageRoles",
      "ManageChannels",
      "ManageMessages",
      "KickMembers",
      "ModerateMembers",
      "Connect",
      "Speak",
      "AttachFiles",
      "EmbedLinks",
    ],
    reason: "Role teknis agar command setup, sync role, clear chat, kick, voice, dan report bot bisa berjalan.",
    notes: "Role bot harus berada di atas role yang perlu dibuat/diatur/kick oleh bot.",
  },
  "SL〡Verified Roster": {
    permissions: [],
    reason: "Role akses/label roster terverifikasi, bukan role staff.",
    notes: "Atur akses verified channel lewat category/channel overwrites.",
  },
  "SL〡Speed Division": {
    permissions: [],
    reason: "Role komunitas/divisi untuk grouping member speed.",
    notes: "Atur akses speed division channel lewat category/channel overwrites.",
  },
  "SL〡Ladies": {
    permissions: [],
    reason: "Role komunitas/access untuk area girls corner.",
    notes: "Atur akses girls corner lewat category/channel overwrites.",
  },
  "SL〡Streamer": {
    permissions: [],
    reason: "Role komunitas/content untuk streamer.",
    notes: "Atur akses content/stream channel lewat category/channel overwrites.",
  },
  "SL〡Members": {
    permissions: [],
    reason: "Role identitas member umum.",
    notes: "Tidak perlu global permission tambahan.",
  },
  "SL〡Players": {
    permissions: [],
    reason: "Role grouping player.",
    notes: "Tidak perlu global permission tambahan.",
  },
  "@everyone": {
    permissions: [
      "AddReactions",
      "AttachFiles",
      "ChangeNickname",
      "Connect",
      "CreateInstantInvite",
      "CreatePrivateThreads",
      "CreatePublicThreads",
      "EmbedLinks",
      "ReadMessageHistory",
      "RequestToSpeak",
      "SendMessages",
      "SendMessagesInThreads",
      "SendPolls",
      "SendVoiceMessages",
      "Speak",
      "Stream",
      "UseApplicationCommands",
      "UseEmbeddedActivities",
      "UseExternalApps",
      "UseExternalEmojis",
      "UseExternalSounds",
      "UseExternalStickers",
      "UseSoundboard",
      "UseVAD",
      "ViewChannel",
    ],
    reason: "Permission dasar server boleh dipertahankan untuk area publik.",
    notes: "Channel sensitif tetap harus dikunci lewat category/channel overwrites.",
  },
  "SL Helper": {
    permissions: [],
    reason: "Role bot-managed, bukan role manusia/community custom.",
    notes: "Saat ini punya Administrator. Rekomendasi jangka panjang: ganti ke exact bot permissions kalau bot sudah stabil.",
  },
  Koya: {
    permissions: [],
    reason: "Role bot-managed untuk bot Koya, bukan role manusia/community custom.",
    notes: "Kalau Koya perlu manage/kick role custom, posisinya harus di atas target role.",
  },
};

function formatPermissions(permissions) {
  return permissions.length > 0 ? permissions.join(", ") : "(none / global minimal)";
}

function printRoleRecommendation(role, index) {
  const recommendation = recommendations[role.name] || {
    permissions: [],
    reason: "Role belum punya rekomendasi khusus.",
    notes: "Review manual sebelum permission diterapkan.",
  };

  console.log(`${index + 1}. ${role.name}`);
  console.log(`   ID: ${role.id}`);
  console.log(`   Position: ${role.position}`);
  console.log(`   Type: ${role.type}`);
  console.log(`   Color: ${role.color}`);
  console.log(`   Recommended permissions: ${formatPermissions(recommendation.permissions)}`);
  console.log(`   Reason: ${recommendation.reason}`);
  console.log(`   Notes: ${recommendation.notes}`);
  console.log("");
}

function main() {
  console.log("SL Role Permission Recommendation");
  console.log("Style: least privilege community setup");
  console.log("Mode: report only, tidak mengubah Discord server");
  console.log("");
  console.log(`Total roles from latest role check: ${currentRoles.length}`);
  console.log(`Recommended custom hierarchy: ${recommendedHierarchy.join(" > ")}`);
  console.log("Administrator default: tidak direkomendasikan untuk role manusia.");
  console.log("");
  console.log("Roles:");
  console.log("");

  currentRoles.forEach(printRoleRecommendation);

  console.log("Manual verification after applying permissions:");
  console.log("- Run: npm run roles:check");
  console.log("- Pastikan role manusia tidak punya Administrator.");
  console.log("- Test /clearchat dengan Admin ke atas.");
  console.log("- Test /slkick user dengan Admin ke atas.");
  console.log("- Pastikan private channel dikunci lewat category/channel overwrites.");
}

main();
