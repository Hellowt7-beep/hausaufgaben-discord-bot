import { Client, GatewayIntentBits, AttachmentBuilder } from 'discord.js';
import { config } from 'dotenv';
import { analyzeHomework } from './homework-analyzer.js';
import { solveProblemWithImage, getMaterialWithImages } from './problem-solver.js';
import { chatWithAI, getHomeworkHelp } from './ai-chat.js';
import express from 'express';

config();

// Express Server für Health Check
const app = express();
const PORT = process.env.PORT || 3000;

// Health Check Endpoint
app.get('/', (req, res) => {
    res.json({
        status: '✅ Fixed Bot is running!',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        botStatus: client.user ? 'Connected' : 'Connecting...',
        geminiModel: 'gemini-2.5-flash (UPDATED)',
        features: ['🔥 NEW Gemini 2.5 Flash', 'No Message Editing', 'Bot Command Reactions', 'All Dot Commands']
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

// Rate Limiting
const userCooldowns = new Map();
const COOLDOWN_MS = 2000; // 2 Sekunden zwischen Commands

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

// Bot Ready Event
client.once('clientReady', () => {
    console.log(`🤖 FIXED Bot ist online als ${client.user.tag}!`);
    console.log(`🔥 Verwendet NEUE Gemini 2.5 Flash API!`);
    console.log(`📚 Bereit für Hausaufgaben-Hilfe!`);
    console.log(`🤝 Reagiert auf ALLE . Commands (auch von Bots)!`);
    console.log(`✨ KEINE Message-Edits - nur neue Nachrichten!`);

    // API Keys prüfen
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
        console.log('⚠️  WARNUNG: GEMINI_API_KEY nicht gesetzt!');
    } else {
        console.log('✅ Gemini API Key konfiguriert');
    }

    if (!process.env.MEGA_EMAIL || !process.env.MEGA_PASSWORD) {
        console.log('⚠️  WARNUNG: MEGA Login-Daten nicht gesetzt!');
    } else {
        console.log('✅ MEGA Credentials konfiguriert');
    }

    // Cleanup Timer für Maps
    setInterval(() => {
        const now = Date.now();
        for (const [userId, timestamp] of userCooldowns) {
            if (now - timestamp > 300000) {
                userCooldowns.delete(userId);
            }
        }
    }, 60000);
});

client.on('messageCreate', async (message) => {
    // Reagiere auf ALLE . Commands, auch von Bots!
    if (message.author.id === client.user.id) return;

    const userId = message.author.id;
    const now = Date.now();

    // Prüfe ob in erlaubtem Kanal (falls konfiguriert)
    if (process.env.ALLOWED_CHANNEL_ID && message.channel.id !== process.env.ALLOWED_CHANNEL_ID) {
        return;
    }

    const content = message.content.toLowerCase().trim();

    // NEUE LOGIK: Reagiere auf ALLE . Commands (von Menschen UND Bots)
    if (!content.startsWith('.')) return;

    // Rate Limiting
    const lastCommand = userCooldowns.get(userId);
    if (lastCommand && (now - lastCommand) < COOLDOWN_MS) {
        console.log(`⏳ User/Bot ${message.author.tag} in Cooldown, überspringe...`);
        return;
    }

    // Prüfe ob es ein gültiger Command ist
    const isValidCommand = content === '.ha' ||
                          content.startsWith('.lsg ') ||
                          content.startsWith('.ai ') ||
                          content.startsWith('.a ') ||
                          content.startsWith('.material ') ||
                          content === '.help' ||
                          content === '.hilfe';

    if (!isValidCommand) {
        console.log(`🤷 Unbekannter . Command: ${content} von ${message.author.tag} (${message.author.bot ? 'Bot' : 'User'})`);
        return;
    }

    // Setze Cooldown
    userCooldowns.set(userId, now);

    // Log für Debugging
    console.log(`🎯 Verarbeite Command: ${content} von ${message.author.tag} (${message.author.bot ? 'Bot' : 'User'})`);

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
        let errorMsg = 'Ein Fehler ist aufgetreten.';

        if (error.message.includes('API')) {
            errorMsg += ' Problem mit der API. Versuche es in ein paar Minuten nochmal.';
        } else if (error.message.includes('MEGA')) {
            errorMsg += ' Problem mit MEGA. Prüfe die Dateien.';
        } else if (error.message.includes('OCR')) {
            errorMsg += ' Problem mit der Texterkennung. Versuche ein besseres Bild.';
        }

        await message.reply(errorMsg);
    }
});

async function handleHomeworkCommand(message) {
    await message.reply('Bitte warten, ich gebe dir gleich die Hausaufgaben');

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
                await message.reply('Keine ha.jpg gefunden! Lade ein Bild mit "ha" im Namen in Discord hoch oder speichere ha.jpg in MEGA.');
                return;
            }
        }

        const result = await analyzeHomework(imageUrl);
        const formattedResult = formatHomeworkResult(result);

        await message.reply(`**Hausaufgaben gefunden:**\n\n${formattedResult}`);

    } catch (error) {
        console.error('Fehler bei Hausaufgaben-Analyse:', error);
        await message.reply(`Fehler beim Analysieren der Hausaufgaben: ${error.message}`);
    }
}

async function handleSolutionCommand(message, content) {
    const parts = content.split(' ').slice(1);

    if (parts.length < 3) {
        await message.reply(`Format: .lsg [fach] seite [nummer]

Verfügbare Fächer:
${AVAILABLE_SUBJECTS.map(subject => `${subject}`).join(', ')}

Beispiele:
.lsg deutsch seite 1
.lsg mathe seite 42
.lsg latein seite 15`);
        return;
    }

    const fach = parts[0];
    const seiteNummer = parts[2];

    await message.reply('Bitte warten, ich schaue mir die Seite an');

    try {
        const result = await solveProblemWithImage(fach, seiteNummer);

        // 1. Erst das Originalbild senden
        const imageAttachment = new AttachmentBuilder(result.imageBuffer, { name: result.fileName });
        await message.reply({
            content: `**Originalbild:** ${fach} Seite ${seiteNummer}`,
            files: [imageAttachment]
        });

        // 2. Dann die Lösung senden
        const formattedSolution = formatSolutionResult(fach, seiteNummer, result.solution);

        if (formattedSolution.length > 2000) {
            const solutionBuffer = Buffer.from(formattedSolution, 'utf-8');
            const solutionAttachment = new AttachmentBuilder(solutionBuffer, { name: `loesung_${fach}_seite_${seiteNummer}.txt` });
            await message.reply({
                content: `**Lösung:** ${fach} Seite ${seiteNummer}`,
                files: [solutionAttachment]
            });
        } else {
            await message.reply(formattedSolution);
        }

    } catch (error) {
        console.error('Fehler bei Lösungssuche:', error);
        await message.reply(`Fehler: ${error.message}`);
    }
}

async function handleAIChat(message, content) {
    const prompt = content.slice(4).trim();

    if (!prompt) {
        await message.reply('Format: .ai [deine frage]\nBeispiel: .ai Erkläre mir Photosynthese');
        return;
    }



    try {
        const response = await chatWithAI(prompt);
        const formattedResponse = response;

        if (formattedResponse.length > 2000) {
            const responseBuffer = Buffer.from(formattedResponse, 'utf-8');
            const responseAttachment = new AttachmentBuilder(responseBuffer, { name: 'ai_antwort.txt' });
            await message.reply({
                files: [responseAttachment]
            });
        } else {
            await message.reply(formattedResponse);
        }

    } catch (error) {
        console.error('Fehler bei AI Chat:', error);
        await message.reply(`Fehler beim Chat: ${error.message}`);
    }
}

async function handleHomeworkHelp(message, content) {
    const parts = content.split(' ').slice(1);

    if (parts.length < 4) {
        await message.reply(`Format: .a [fach] seite [nummer] [prompt]

Verfügbare Fächer:
${AVAILABLE_SUBJECTS.map(subject => `${subject}`).join(', ')}

Beispiele:
.a deutsch seite 1 erkläre mir die aufgabe
.a mathe seite 42 wie löse ich gleichungen`);
        return;
    }

    const fach = parts[0];
    const seiteNummer = parts[2];
    const prompt = parts.slice(3).join(' ');

    await message.reply('Bitte warten');

    try {
        const response = await getHomeworkHelp(fach, seiteNummer, prompt);
        const formattedResponse = formatHomeworkHelpResult(fach, seiteNummer, response);

        if (formattedResponse.length > 2000) {
            const responseBuffer = Buffer.from(formattedResponse, 'utf-8');
            const responseAttachment = new AttachmentBuilder(responseBuffer, { name: `hilfe_${fach}_seite_${seiteNummer}.txt` });
            await message.reply({
                files: [responseAttachment]
            });
        } else {
            await message.reply(formattedResponse);
        }

    } catch (error) {
        console.error('Fehler bei Hausaufgaben-Hilfe:', error);
        await message.reply(`Fehler: ${error.message}`);
    }
}

async function handleMaterialCommand(message, content) {
    const parts = content.split(' ').slice(1);

    if (parts.length < 3) {
        await message.reply(`Format: .material [fach] seite [nummer]

Verfügbare Fächer:
${AVAILABLE_SUBJECTS.map(subject => `${subject}`).join(', ')}

Beispiele:
.material englisch seite 11
.material mathe seite 42`);
        return;
    }

    const fach = parts[0];
    const seiteNummer = parts[2];

    await message.reply('Bitte warten');

    try {
        const materialImages = await getMaterialWithImages(fach, seiteNummer);

        if (materialImages.length === 0) {
            await message.reply(`Keine Material-Dateien gefunden für: ${fach} Seite ${seiteNummer}`);
            return;
        }

        await message.reply(`**Material gefunden:** ${fach} Seite ${seiteNummer}\n${materialImages.length} Datei(en) werden gesendet...`);

        for (let i = 0; i < materialImages.length; i++) {
            const material = materialImages[i];
            const imageAttachment = new AttachmentBuilder(material.imageBuffer, { name: material.fileName });

            await message.reply({
                content: `**Material ${i + 1}/${materialImages.length}:** ${fach} Seite ${seiteNummer}\n${material.fileName}`,
                files: [imageAttachment]
            });

            if (i < materialImages.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

    } catch (error) {
        console.error('Fehler bei Material-Suche:', error);
        await message.reply(`Fehler: ${error.message}`);
    }
}

async function showHelp(message) {
    const helpText = `**Hausaufgaben Bot - Befehle:**

.ha - Analysiert ha.jpg und zeigt Hausaufgaben an

.lsg [fach] seite [nummer] - Zeigt Originalbild + Lösungen

.ai [frage] - Chat mit KI

.a [fach] seite [nummer] [prompt] - Hausaufgaben-Hilfe mit Tipps

.material [fach] seite [nummer] - Zeigt alle Material-Dateien

.help - Zeigt diese Hilfe an

**Verfügbare Fächer:**
${AVAILABLE_SUBJECTS.map(subject => `${SUBJECT_EMOJIS[subject] || '📚'} ${subject}`).join(', ')}

**Features:**
- Funktioniert mit allen Commands von Bots und Usern
- 2 Sekunden Cooldown zwischen Commands
- Bot-zu-Bot Kommunikation optimiert`;

    await message.reply(helpText);
}

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
    return `**Lösung:** ${emoji} **${fach.charAt(0).toUpperCase() + fach.slice(1)} Seite ${seite}**\n\n${solution}`;
}

function formatHomeworkHelpResult(fach, seite, response) {
    const emoji = getSubjectEmoji(fach);
    return `**Hausaufgaben-Hilfe:** ${emoji} **${fach.charAt(0).toUpperCase() + fach.slice(1)} Seite ${seite}**\n\n${response}`;
}

// Bessere Fehlerbehandlung
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

client.login(process.env.DISCORD_TOKEN);

