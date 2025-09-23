import { config } from "dotenv";

// Lade Umgebungsvariablen
config();

console.log("🧪 Bot Setup Test\\n");

// Teste Discord Token
const discordToken = process.env.DISCORD_TOKEN;
if (discordToken && discordToken !== "your_discord_bot_token_here") {
    console.log("✅ Discord Token: Konfiguriert");
} else {
    console.log("❌ Discord Token: Nicht konfiguriert");
}

// Teste Gemini API Key
const geminiKey = process.env.GEMINI_API_KEY;
if (geminiKey && geminiKey !== "YOUR_NEW_GEMINI_API_KEY_HERE") {
    console.log("✅ Gemini API Key: Konfiguriert");
} else {
    console.log("❌ Gemini API Key: Nicht konfiguriert");
}

// Teste MEGA Credentials
const megaEmail = process.env.MEGA_EMAIL;
const megaPassword = process.env.MEGA_PASSWORD;
if (megaEmail && megaPassword) {
    console.log("✅ MEGA Credentials: Konfiguriert");
} else {
    console.log("❌ MEGA Credentials: Nicht konfiguriert");
}

console.log("\\n🚀 Starte Bot mit: bun start");
console.log("📊 Entwicklung mit: bun dev");
