import { Client, GatewayIntentBits, AttachmentBuilder } from 'discord.js';
import { config } from 'dotenv';
import { analyzeHomework } from './homework-analyzer.js';
import { solveProblem, solveProblemWithImage } from './problem-solver.js';

config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions
    ]
});

// FIX: Verwende clientReady statt ready (Discord.js v14 deprecation)
client.once('clientReady', () => {
    console.log(`🤖 Bot ist online als ${client.user.tag}!`);
    console.log(`📚 Bereit für Hausaufgaben-Hilfe!`);

    // API Keys prüfen
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'YOUR_NEW_GEMINI_API_KEY_HERE') {
        console.log('⚠️  WARNUNG: GEMINI_API_KEY nicht gesetzt!');
    }
    if (!process.env.MEGA_EMAIL || !process.env.MEGA_PASSWORD) {
        console.log('⚠️  WARNUNG: MEGA Login-Daten nicht gesetzt!');
    }
});

client.on('messageCreate', async (message) => {
    // Ignoriere Bot-Nachrichten
    if (message.author.bot) return;

    // Prüfe ob in erlaubtem Kanal (falls konfiguriert)
    if (process.env.ALLOWED_CHANNEL_ID && message.channel.id !== process.env.ALLOWED_CHANNEL_ID) {
        return;
    }

    const content = message.content.toLowerCase().trim();

    try {
        // .ha Command - Hausaufgaben analysieren
        if (content === '.ha') {
            await handleHomeworkCommand(message);
        }

        // .lsg Command - Lösungen finden
        else if (content.startsWith('.lsg ')) {
            await handleSolutionCommand(message, content);
        }

        // .help Command - Hilfe anzeigen
        else if (content === '.help' || content === '.hilfe') {
            await showHelp(message);
        }
    } catch (error) {
        console.error('Fehler beim Verarbeiten der Nachricht:', error);
        await message.reply('❌ Ein Fehler ist aufgetreten. Versuche es nochmal!');
    }
});

async function handleHomeworkCommand(message) {
    await message.reply('⏳ Bitte warten...');

    try {
        // Zuerst im Discord Chat suchen
        const messages = await message.channel.messages.fetch({ limit: 100 });
        const imageMessage = messages.find(msg =>
            msg.attachments.some(attachment =>
                attachment.name?.toLowerCase().includes('ha') &&
                (attachment.name?.toLowerCase().endsWith('.jpg') ||
                 attachment.name?.toLowerCase().endsWith('.png') ||
                 attachment.name?.toLowerCase().endsWith('.jpeg'))
            )
        );

        let imageUrl = null;

        if (imageMessage) {
            // Gefunden im Discord Chat
            const attachment = imageMessage.attachments.find(att =>
                att.name?.toLowerCase().includes('ha') &&
                (att.name?.toLowerCase().endsWith('.jpg') ||
                 att.name?.toLowerCase().endsWith('.png') ||
                 att.name?.toLowerCase().endsWith('.jpeg'))
            );
            imageUrl = attachment.url;
        } else {
            // Fallback: Suche in MEGA
            try {
                const { findHomeworkInMega } = await import('./problem-solver.js');
                const megaImageUrl = await findHomeworkInMega();
                imageUrl = megaImageUrl;
            } catch (megaError) {
                await message.reply('❌ Keine ha.jpg gefunden! Lade ein Bild mit "ha" im Namen in Discord hoch oder speichere ha.jpg in MEGA.');
                return;
            }
        }

        const result = await analyzeHomework(imageUrl);

        await message.reply(`📝 **Hausaufgaben gefunden:**\n\`\`\`\n${result}\n\`\`\``);

    } catch (error) {
        console.error('Fehler bei Hausaufgaben-Analyse:', error);
        await message.reply(`❌ Fehler beim Analysieren der Hausaufgaben: ${error.message}`);
    }
}

async function handleSolutionCommand(message, content) {
    // Parse ".lsg deutsch seite 1" -> fach: "deutsch", seite: "1"
    const parts = content.split(' ').slice(1); // Entferne ".lsg"

    if (parts.length < 3) {
        await message.reply('❌ Format: `.lsg [fach] seite [nummer]`\nBeispiele:\n• `.lsg deutsch seite 1`\n• `.lsg mathe seite 42`\n• `.lsg latein seite 15`\n• `.lsg französisch seite 8`');
        return;
    }

    const fach = parts[0];
    const seiteNummer = parts[2];

    await message.reply('⏳ Suche Lösung und lade Originalbild...');

    try {
        const result = await solveProblemWithImage(fach, seiteNummer);

        // 1. Erst das Originalbild senden
        const imageAttachment = new AttachmentBuilder(result.imageBuffer, { name: result.fileName });
        await message.reply({
            content: `📄 **Originalbild: ${fach} Seite ${seiteNummer}**`,
            files: [imageAttachment]
        });

        // 2. Dann die Lösung senden
        if (result.solution.length > 2000) {
            // Discord hat 2000 Zeichen Limit, bei längeren Texten als Datei senden
            const solutionBuffer = Buffer.from(result.solution, 'utf-8');
            const solutionAttachment = new AttachmentBuilder(solutionBuffer, { name: `loesung_${fach}_seite_${seiteNummer}.txt` });
            await message.reply({
                content: `🤖 **Gemini Lösung für ${fach} Seite ${seiteNummer}:**`,
                files: [solutionAttachment]
            });
        } else {
            await message.reply(`🤖 **Gemini Lösung für ${fach} Seite ${seiteNummer}:**\n\`\`\`\n${result.solution}\n\`\`\``);
        }

    } catch (error) {
        console.error('Fehler bei Lösungssuche:', error);
        await message.reply(`❌ Fehler: ${error.message}`);
    }
}

async function showHelp(message) {
    const helpText = `
🤖 **Hausaufgaben Bot - Befehle:**

📝 \`.ha\` - Analysiert ha.jpg (aus Discord Chat oder MEGA) und zeigt Hausaufgaben an

📚 \`.lsg [fach] seite [nummer]\` - Zeigt Originalbild + Gemini Lösungen
   Verfügbare Fächer:
   • \`.lsg deutsch seite 1\`
   • \`.lsg mathe seite 42\`
   • \`.lsg english seite 15\`
   • \`.lsg latein seite 8\`
   • \`.lsg französisch seite 23\`

❓ \`.help\` - Zeigt diese Hilfe an

**Funktionen:**
• \`.ha\`: OCR + KI Hausaufgaben-Analyse aus Bildern
• \`.lsg\`: Zeigt zuerst Originalbild, dann Gemini-Lösung

**Setup:**
• Hausaufgaben: Lade ha.jpg in Discord hoch oder speichere in MEGA
• Bücher: Speichere als \`fach_seite_nummer.jpg\` in MEGA
• Unterstützte Fächer: Deutsch, Mathe, English, Latein, Französisch

**Setup:**
• GEMINI_API_KEY in .env setzen (Google AI Studio)
• MEGA Login-Daten in .env eintragen
`;

    await message.reply(helpText);
}

// Bessere Fehlerbehandlung für unbehandelte Rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

client.login(process.env.DISCORD_TOKEN);
