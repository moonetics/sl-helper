const fs = require("fs");
const path = require("path");

const CONTENT_DIR = path.resolve(__dirname, "../../channel_content");

const soreviRoleBlueprint = [
  { name: "👑 ｜ Founder & Studio Lead", color: "#E74C3C", hoist: true, mentionable: true },
  { name: "💼 ｜ Lead Project Developer", color: "#9B59B6", hoist: true, mentionable: true },
  { name: "💻 ｜ Project Developer", color: "#3498DB", hoist: true, mentionable: true },
  { name: "🔨 ｜ Builder & Level Designer", color: "#E67E22", hoist: true, mentionable: true },
  { name: "🎨 ｜ 3D Modeler & Animator", color: "#1ABC9C", hoist: true, mentionable: true },
  { name: "✨ ｜ UI/UX Designer", color: "#F1C40F", hoist: true, mentionable: true },
  { name: "🛡️ ｜ Head of Support", color: "#2ECC71", hoist: true, mentionable: true },
  { name: "🧪 ｜ QA & Game Tester", color: "#E91E63", hoist: true, mentionable: true },
  { name: "🤝 ｜ Verified Client", color: "#00FF6A", hoist: true, mentionable: false },
  { name: "🏆 ｜ Past Client", color: "#7F8C8D", hoist: true, mentionable: false },
  { name: "🤝 ｜ Studio Partner", color: "#7289DA", hoist: true, mentionable: false },
  { name: "⭐ ｜ Sorevi Community", color: "#00D2D3", hoist: true, mentionable: false },
  { name: "🤖 ｜ Sorevi Assistant", color: "#5865F2", hoist: true, mentionable: false },
];

const soreviChannelBlueprint = [
  {
    name: "🏛｜✦ SOREVI LABS INFO ✦",
    channels: [
      { type: "text", name: "👋・welcome", readOnly: true },
      { type: "text", name: "🚪・farewell", adminOnly: true },
      { type: "text", name: "📜・rules", contentFile: "rules-and-tos.md", readOnly: true },
      { type: "announcement", name: "📢・announcements", contentFile: "announcements.md", readOnly: true },
      { type: "text", name: "🌐・about-sorevi-labs", contentFile: "about-sorevi-labs.md", readOnly: true },
      { type: "text", name: "🔗・official-links", readOnly: true },
      { type: "text", name: "🏷️・self-roles", readOnly: true },
    ],
  },
  {
    name: "💼｜✦ SHOWCASE & SERVICES ✦",
    channels: [
      { type: "text", name: "🎨・dev-showcase", devPostOnly: true },
      { type: "text", name: "📋・services-and-pricing", contentFile: "services-and-pricing.md", readOnly: true },
      { type: "🌟・client-testimonials", clientPostOnly: true },
      { type: "text", name: "🔍・talent-recruitment", readOnly: true },
    ],
  },
  {
    name: "🎫｜✦ HELPDESK & TICKETING ✦",
    channels: [
      { type: "text", name: "📩・create-ticket", ticketPanel: true },
      { type: "text", name: "📌・ticket-guidelines", contentFile: "ticket-guidelines.md", readOnly: true },
      { type: "text", name: "❓・faq", contentFile: "faq.md", readOnly: true },
    ],
  },
  {
    name: "🎫｜✦ ACTIVE TICKETS ✦",
    private: true,
    channels: [],
  },
  {
    name: "📁｜✦ CLOSED TICKETS ✦",
    private: true,
    channels: [],
  },
  {
    name: "💬｜✦ COMMUNITY & SOCIAL ✦",
    channels: [
      { type: "text", name: "💬・general-chat" },
      { type: "text", name: "📸・media-and-clips" },
      { type: "text", name: "💡・game-suggestions" },
      { type: "text", name: "🤖・bot-commands" },
    ],
  },
  {
    name: "🛠️｜✦ ROBLOX DEV LOUNGE ✦",
    channels: [
      { type: "text", name: "💻・luau-scripting" },
      { type: "text", name: "🏰・building-and-lighting" },
      { type: "text", name: "🎨・3d-blender-and-ugc" },
      { type: "text", name: "🎁・free-assets-plugins", devPostOnly: true },
    ],
  },
  {
    name: "🧪｜✦ QA & PLAYTESTING ✦",
    channels: [
      { type: "text", name: "👁️・sneak-peeks", readOnly: true },
      { type: "announcement", name: "📢・playtest-schedule", readOnly: true },
      { type: "text", name: "📝・tester-feedback", qaOnly: true },
      { type: "announcement", name: "📝・patch-notes", readOnly: true },
    ],
  },
  {
    name: "🛡｜✦ STUDIO INTERNAL ✦",
    private: true,
    channels: [
      { type: "text", name: "📝・team-chat" },
      { type: "text", name: "📋・roadmap-and-tasks" },
      { type: "text", name: "📊・ticket-logs" },
      { type: "text", name: "📊・bot-logs" },
      { type: "text", name: "🧰・dev-commands" },
    ],
  },
  {
    name: "🔊｜✦ COMMUNITY VOICE ✦",
    channels: [
      { type: "voice", name: "☕・Lounge VC" },
      { type: "voice", name: "🎮・Mabar Game 1" },
      { type: "voice", name: "🎮・Mabar Game 2" },
    ],
  },
  {
    name: "💼｜✦ PROJECT & WORKSPACE VC ✦",
    channels: [
      { type: "voice", name: "🛠️・Dev Co-Working" },
      { type: "voice", name: "🔒・Meeting Room", clientMeeting: true },
      { type: "voice", name: "🎧・Dev Sprint VC", staffOnlyVoice: true },
    ],
  },
];

/**
 * Membaca konten markdown dari folder channel_content secara dinamis.
 * @param {string} fileNameOrSlug Nama file (misal: "rules-and-tos.md") atau slug channel
 * @returns {string|null} Isi file markdown jika ada dan tidak kosong
 */
function getChannelMarkdownContent(fileNameOrSlug) {
  if (!fileNameOrSlug) return null;
  let fileName = fileNameOrSlug;
  if (!fileName.endsWith(".md")) {
    const cleanSlug = fileName.replace(/^[^\w-]+・?/, "").trim();
    fileName = `${cleanSlug}.md`;
  }

  const filePath = path.join(CONTENT_DIR, fileName);
  if (fs.existsSync(filePath)) {
    const raw = fs.readFileSync(filePath, "utf-8").trim();
    return raw.length > 0 ? raw : null;
  }
  return null;
}

module.exports = {
  soreviRoleBlueprint,
  soreviChannelBlueprint,
  getChannelMarkdownContent,
  CONTENT_DIR,
};
