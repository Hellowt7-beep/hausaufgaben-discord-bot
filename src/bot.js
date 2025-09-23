import { Client, GatewayIntentBits, AttachmentBuilder } from 'discord.js';
import { config } from 'dotenv';
import { analyzeHomework } from './homework-analyzer.js';
<<<<<<< HEAD
import { solveProblemWithImage, getMaterialWithImages } from './problem-solver.js';
import { chatWithAI, getHomeworkHelp } from './ai-chat.js';
=======
import { solveProblem, solveProblemWithImage } from './problem-solver.js';
>>>>>>> f005e76f4fed9a65868eab65bf74b483e4397b67
import express from 'express';

config();

// Express Server für Health Check
const app = express();
const PORT = process.env.PORT || 3000;

// Health Check Endpoint
app.get('/', (req, res) => {
    res.json({
        status: 'Bot is running!',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
<<<<<<< HEAD
        botStatus: client.user ? 'Connected' : 'Connecting...',
        processedMessages: processedMessages.size,
        activeCommands: activeCommands.size
=======
        botStatus: client.user ? 'Connected' : 'Connecting...'
>>>>>>> f005e76f4fed9a65868eab65bf74b483e4397b67
    });
});

app.get('/ping', (req, res) => {
    res.json({ pong: true, timestamp: Date.now() });
});

// Server starten
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Health Check Server läuft auf Port ${PORT}`);
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions
    ]
});

<<<<<<< HEAD
// IMPROVED: Duplicate Prevention & Rate Limiting
const processedMessages = new Map(); // Message ID -> timestamp
const activeCommands = new Map(); // User ID -> command info
const userCooldowns = new Map(); // User ID -> last command timestamp

const COOLDOWN_MS = 3000; // 3 Sekunden zwischen Commands
const MESSAGE_CACHE_MS = 30000; // 30 Sekunden Message Cache
const MAX_ACTIVE_COMMANDS = 3; // Max gleichzeitige Commands

// Bot Ready Event
=======
// FIX: Verwende clientReady statt ready (Discord.js v14 deprecation)
>>>>>>> f005e76f4fed9a65868eab65bf74b483e4397b67
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
<<<<<<< HEAD

    // Cleanup Timer für Maps
    setInterval(() => {
        const now = Date.now();

        // Cleanup processed messages
        for (const [messageId, timestamp] of processedMessages) {
            if (now - timestamp > MESSAGE_CACHE_MS) {
                processedMessages.delete(messageId);
            }
        }

        // Cleanup active commands (timeout after 2 minutes)
        for (const [userId, commandInfo] of activeCommands) {
            if (now - commandInfo.timestamp > 120000) {
                activeCommands.delete(userId);
            }
        }
    }, 10000); // Cleanup alle 10 Sekunden
});

// Fach-Emoji Mapping
const SUBJECT_EMOJIS = {
    'mathe': '🔵',
    'deutsch': '🔴',
    'english': '🟡',
    'französisch': '🟠',
    'franzoesisch': '🟠',
    'fr': '🟠',
    'latein': '🟠',
    'geschichte': '⚪',
    'physik': '🟣',
    'chemie': '🟢',
    'religion ev': '⚫',
    'religion kt': '⚫',
    'ethik': '⚫'
};

// Verfügbare Fächer
const AVAILABLE_SUBJECTS = [
    'deutsch', 'mathe', 'english', 'französisch', 'fr', 'latein',
    'geschichte', 'physik', 'chemie', 'religion ev', 'religion kt', 'ethik'
];

=======
});

>>>>>>> f005e76f4fed9a65868eab65bf74b483e4397b67
client.on('messageCreate', async (message) => {
    // Ignoriere Bot-Nachrichten
    if (message.author.bot) return;

<<<<<<< HEAD
    const messageId = message.id;
    const userId = message.author.id;
    const now = Date.now();

    // IMPROVED: Duplicate Prevention
    if (processedMessages.has(messageId)) {
        console.log(`⚠️  Message ${messageId} bereits verarbeitet, überspringe...`);
        return;
    }

    // IMPROVED: Rate Limiting
    const lastCommand = userCooldowns.get(userId);
    if (lastCommand && (now - lastCommand) < COOLDOWN_MS) {
        console.log(`⚠️  User ${userId} in Cooldown, überspringe...`);
        return;
    }

    // IMPROVED: Active Command Limiting
    if (activeCommands.size >= MAX_ACTIVE_COMMANDS) {
        console.log('⚠️  Zu viele aktive Commands, überspringe...');
        return;
    }

=======
>>>>>>> f005e76f4fed9a65868eab65bf74b483e4397b67
    // Prüfe ob in erlaubtem Kanal (falls konfiguriert)
    if (process.env.ALLOWED_CHANNEL_ID && message.channel.id !== process.env.ALLOWED_CHANNEL_ID) {
        return;
    }

    const content = message.content.toLowerCase().trim();

<<<<<<< HEAD
    // Prüfe ob es ein gültiger Command ist
    const isValidCommand = content === '.ha' ||
                          content.startsWith('.lsg ') ||
                          content.startsWith('.ai ') ||
                          content.startsWith('.a ') ||
                          content.startsWith('.material ') ||
                          content === '.help' ||
                          content === '.hilfe';

    if (!isValidCommand) return;

    // Markiere Message als verarbeitet
    processedMessages.set(messageId, now);
    userCooldowns.set(userId, now);

    // Markiere Command als aktiv
    activeCommands.set(userId, {
        command: content.split(' ')[0],
        timestamp: now,
        messageId: messageId
    });

    try {
        // Command Router
        if (content === '.ha') {
            await handleHomeworkCommand(message);
        }
        else if (content.startsWith('.lsg ')) {
            await handleSolutionCommand(message, content);
        }
        else if (content.startsWith('.ai ')) {
            await handleAIChat(message, content);
        }
        else if (content.startsWith('.a ')) {
            await handleHomeworkHelp(message, content);
        }
        else if (content.startsWith('.material ')) {
            await handleMaterialCommand(message, content);
        }
        else if (content === '.help' || content === '.hilfe') {
            await showHelp(message);
        }

    } catch (error) {
        console.error('Fehler beim Verarbeiten der Nachricht:', error);

        // Bessere Error Messages
        let errorMsg = '❌ Ein Fehler ist aufgetreten.';

        if (error.message.includes('API')) {
            errorMsg += ' Problem mit der API. Versuche es in ein paar Minuten nochmal.';
        } else if (error.message.includes('MEGA')) {
            errorMsg += ' Problem mit MEGA. Prüfe die Dateien.';
        } else if (error.message.includes('OCR')) {
            errorMsg += ' Problem mit der Texterkennung. Versuche ein besseres Bild.';
        }

        await message.reply(errorMsg);
    } finally {
        // Command als beendet markieren
        activeCommands.delete(userId);
=======
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
>>>>>>> f005e76f4fed9a65868eab65bf74b483e4397b67
    }
});

async function handleHomeworkCommand(message) {
<<<<<<< HEAD
    const waitMsg = await message.reply('⏳ Analysiere Hausaufgaben...');
=======
    await message.reply('⏳ Bitte warten...');
>>>>>>> f005e76f4fed9a65868eab65bf74b483e4397b67

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
<<<<<<< HEAD
                await waitMsg.edit('❌ Keine ha.jpg gefunden! Lade ein Bild mit "ha" im Namen in Discord hoch oder speichere ha.jpg in MEGA.');
=======
                await message.reply('❌ Keine ha.jpg gefunden! Lade ein Bild mit "ha" im Namen in Discord hoch oder speichere ha.jpg in MEGA.');
>>>>>>> f005e76f4fed9a65868eab65bf74b483e4397b67
                return;
            }
        }

        const result = await analyzeHomework(imageUrl);
<<<<<<< HEAD
        const formattedResult = formatHomeworkResult(result);

        await waitMsg.edit(`📝 **Hausaufgaben gefunden:**\n\n${formattedResult}`);

    } catch (error) {
        console.error('Fehler bei Hausaufgaben-Analyse:', error);
        await waitMsg.edit(`❌ Fehler beim Analysieren der Hausaufgaben: ${error.message}`);
=======

        await message.reply(`📝 **Hausaufgaben gefunden:**\n\`\`\`\n${result}\n\`\`\``);

    } catch (error) {
        console.error('Fehler bei Hausaufgaben-Analyse:', error);
        await message.reply(`❌ Fehler beim Analysieren der Hausaufgaben: ${error.message}`);
>>>>>>> f005e76f4fed9a65868eab65bf74b483e4397b67
    }
}

async function handleSolutionCommand(message, content) {
<<<<<<< HEAD
    const parts = content.split(' ').slice(1);

    if (parts.length < 3) {
        await message.reply(`❌ Format: \`.lsg [fach] seite [nummer]\`

**Verfügbare Fächer:**
${AVAILABLE_SUBJECTS.map(subject => `${SUBJECT_EMOJIS[subject] || '📚'} ${subject}`).join(', ')}

**Beispiele:**
• \`.lsg deutsch seite 1\`
• \`.lsg mathe seite 42\`
• \`.lsg latein seite 15\``);
=======
    // Parse ".lsg deutsch seite 1" -> fach: "deutsch", seite: "1"
    const parts = content.split(' ').slice(1); // Entferne ".lsg"

    if (parts.length < 3) {
        await message.reply('❌ Format: `.lsg [fach] seite [nummer]`\nBeispiele:\n• `.lsg deutsch seite 1`\n• `.lsg mathe seite 42`\n• `.lsg latein seite 15`\n• `.lsg französisch seite 8`');
>>>>>>> f005e76f4fed9a65868eab65bf74b483e4397b67
        return;
    }

    const fach = parts[0];
    const seiteNummer = parts[2];

<<<<<<< HEAD
    const waitMsg = await message.reply('⏳ Lade Buchseite...');
=======
    await message.reply('⏳ Suche Lösung und lade Originalbild...');
>>>>>>> f005e76f4fed9a65868eab65bf74b483e4397b67

    try {
        const result = await solveProblemWithImage(fach, seiteNummer);

        // 1. Erst das Originalbild senden
        const imageAttachment = new AttachmentBuilder(result.imageBuffer, { name: result.fileName });
        await message.reply({
<<<<<<< HEAD
            content: `📄 **Originalbild:** ${getSubjectEmoji(fach)} **${fach} Seite ${seiteNummer}**`,
            files: [imageAttachment]
        });

        // 2. Dann die Lösung formatiert senden
        const formattedSolution = formatSolutionResult(fach, seiteNummer, result.solution);

        if (formattedSolution.length > 2000) {
            const solutionBuffer = Buffer.from(formattedSolution, 'utf-8');
            const solutionAttachment = new AttachmentBuilder(solutionBuffer, { name: `loesung_${fach}_seite_${seiteNummer}.txt` });
            await message.reply({
                content: `🤖 **Lösung:** ${getSubjectEmoji(fach)} **${fach} Seite ${seiteNummer}**\n*Text ist zu lang, siehe Datei:*`,
                files: [solutionAttachment]
            });
        } else {
            await message.reply(formattedSolution);
        }

        await waitMsg.delete().catch(() => {});

    } catch (error) {
        console.error('Fehler bei Lösungssuche:', error);
        await waitMsg.edit(`❌ Fehler: ${error.message}`);
    }
}

async function handleAIChat(message, content) {
    const prompt = content.slice(4).trim();

    if (!prompt) {
        await message.reply('❌ Format: `.ai [deine frage]`\nBeispiel: `.ai Erkläre mir Photosynthese`');
        return;
    }

    const waitMsg = await message.reply('⏳ Denke nach...');

    try {
        const response = await chatWithAI(prompt);
        const formattedResponse = `🤖 **Gemini Chat:**\n\n${response}`;

        if (formattedResponse.length > 2000) {
            const responseBuffer = Buffer.from(formattedResponse, 'utf-8');
            const responseAttachment = new AttachmentBuilder(responseBuffer, { name: 'ai_antwort.txt' });
            await waitMsg.edit({
                content: '🤖 **Antwort zu lang, siehe Datei:**',
                files: [responseAttachment]
            });
        } else {
            await waitMsg.edit(formattedResponse);
        }

    } catch (error) {
        console.error('Fehler bei AI Chat:', error);
        await waitMsg.edit(`❌ Fehler beim Chat: ${error.message}`);
    }
}

async function handleHomeworkHelp(message, content) {
    const parts = content.split(' ').slice(1);

    if (parts.length < 4) {
        await message.reply(`❌ Format: \`.a [fach] seite [nummer] [prompt]\`

**Verfügbare Fächer:**
${AVAILABLE_SUBJECTS.map(subject => `${SUBJECT_EMOJIS[subject] || '📚'} ${subject}`).join(', ')}

**Beispiele:**
• \`.a deutsch seite 1 erkläre mir die aufgabe\`
• \`.a mathe seite 42 wie löse ich gleichungen\``);
        return;
    }

    const fach = parts[0];
    const seiteNummer = parts[2];
    const prompt = parts.slice(3).join(' ');

    const waitMsg = await message.reply('⏳ Bereite Hilfe vor...');

    try {
        const response = await getHomeworkHelp(fach, seiteNummer, prompt);
        const formattedResponse = formatHomeworkHelpResult(fach, seiteNummer, response);

        if (formattedResponse.length > 2000) {
            const responseBuffer = Buffer.from(formattedResponse, 'utf-8');
            const responseAttachment = new AttachmentBuilder(responseBuffer, { name: `hilfe_${fach}_seite_${seiteNummer}.txt` });
            await waitMsg.edit({
                content: `🎓 **Hausaufgaben-Hilfe zu lang, siehe Datei:**`,
                files: [responseAttachment]
            });
        } else {
            await waitMsg.edit(formattedResponse);
        }

    } catch (error) {
        console.error('Fehler bei Hausaufgaben-Hilfe:', error);
        await waitMsg.edit(`❌ Fehler: ${error.message}`);
    }
}

async function handleMaterialCommand(message, content) {
    const parts = content.split(' ').slice(1);

    if (parts.length < 3) {
        await message.reply(`❌ Format: \`.material [fach] seite [nummer]\`

**Verfügbare Fächer:**
${AVAILABLE_SUBJECTS.map(subject => `${SUBJECT_EMOJIS[subject] || '📚'} ${subject}`).join(', ')}

**Beispiele:**
• \`.material englisch seite 11\`
• \`.material mathe seite 42\``);
        return;
    }

    const fach = parts[0];
    const seiteNummer = parts[2];

    const waitMsg = await message.reply('⏳ Suche Material-Dateien...');

    try {
        const materialImages = await getMaterialWithImages(fach, seiteNummer);

        if (materialImages.length === 0) {
            await waitMsg.edit(`❌ Keine Material-Dateien gefunden für: ${fach} Seite ${seiteNummer}`);
            return;
        }

        await waitMsg.edit(`📚 **Material gefunden:** ${getSubjectEmoji(fach)} **${fach} Seite ${seiteNummer}**\n${materialImages.length} Datei(en) werden gesendet...`);

        for (let i = 0; i < materialImages.length; i++) {
            const material = materialImages[i];
            const imageAttachment = new AttachmentBuilder(material.imageBuffer, { name: material.fileName });

            await message.reply({
                content: `📄 **Material ${i + 1}/${materialImages.length}:** ${getSubjectEmoji(fach)} **${fach} Seite ${seiteNummer}**\n\`${material.fileName}\``,
                files: [imageAttachment]
            });

            if (i < materialImages.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

    } catch (error) {
        console.error('Fehler bei Material-Suche:', error);
        await waitMsg.edit(`❌ Fehler: ${error.message}`);
=======
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
>>>>>>> f005e76f4fed9a65868eab65bf74b483e4397b67
    }
}

async function showHelp(message) {
<<<<<<< HEAD
    const helpText = `🤖 **Hausaufgaben Bot - Befehle:**

📝 \`.ha\` - Analysiert ha.jpg und zeigt Hausaufgaben an

📚 \`.lsg [fach] seite [nummer]\` - Zeigt Originalbild + Gemini Lösungen

🤖 \`.ai [frage]\` - Chat mit Gemini KI

🎓 \`.a [fach] seite [nummer] [prompt]\` - Hausaufgaben-Hilfe mit Tipps

📄 \`.material [fach] seite [nummer]\` - Zeigt alle Material-Dateien

❓ \`.help\` - Zeigt diese Hilfe an

**Verfügbare Fächer:**
${AVAILABLE_SUBJECTS.map(subject => `${SUBJECT_EMOJIS[subject] || '📚'} ${subject}`).join(', ')}

**Hinweise:**
• ⏱️ 3 Sekunden Cooldown zwischen Commands
• 🚫 Max. 3 gleichzeitige Commands
• 🔄 Automatische Duplikat-Prevention`;
=======
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
>>>>>>> f005e76f4fed9a65868eab65bf74b483e4397b67

    await message.reply(helpText);
}

<<<<<<< HEAD
// Formatierungsfunktionen
function formatHomeworkResult(result) {
    let formatted = result;

    formatted = formatted.replace(/Deutsch:/g, '🔴 **Deutsch**:');
    formatted = formatted.replace(/Mathe:/g, '🔵 **Mathe**:');
    formatted = formatted.replace(/English:/g, '🟡 **English**:');
    formatted = formatted.replace(/Französisch:/g, '🟠 **Französisch**:');
    formatted = formatted.replace(/Latein:/g, '🟠 **Latein**:');
    formatted = formatted.replace(/Geschichte:/g, '⚪ **Geschichte**:');
    formatted = formatted.replace(/Physik:/g, '🟣 **Physik**:');
    formatted = formatted.replace(/Chemie:/g, '🟢 **Chemie**:');
    formatted = formatted.replace(/Religion:/g, '⚫ **Religion**:');
    formatted = formatted.replace(/Ethik:/g, '⚫ **Ethik**:');

    return formatted;
}

function getSubjectEmoji(subject) {
    return SUBJECT_EMOJIS[subject.toLowerCase()] || '📚';
}

function formatSolutionResult(fach, seite, solution) {
    const emoji = getSubjectEmoji(fach);
    return `🤖 **Lösung:** ${emoji} **${fach.charAt(0).toUpperCase() + fach.slice(1)} Seite ${seite}**\n\n${solution}`;
}

function formatHomeworkHelpResult(fach, seite, response) {
    const emoji = getSubjectEmoji(fach);
    return `🎓 **Hausaufgaben-Hilfe:** ${emoji} **${fach.charAt(0).toUpperCase() + fach.slice(1)} Seite ${seite}**\n\n${response}`;
}

// Bessere Fehlerbehandlung
=======
// Bessere Fehlerbehandlung für unbehandelte Rejections
>>>>>>> f005e76f4fed9a65868eab65bf74b483e4397b67
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

<<<<<<< HEAD
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

=======
>>>>>>> f005e76f4fed9a65868eab65bf74b483e4397b67
client.login(process.env.DISCORD_TOKEN);
