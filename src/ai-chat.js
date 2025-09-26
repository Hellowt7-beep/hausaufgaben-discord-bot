import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from 'dotenv';
import { findBookPage, downloadAndProcessImage } from './problem-solver.js';

config();

let genAI = null;

function initializeGenAI() {
    if (genAI) return genAI;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
        throw new Error('GEMINI_API_KEY nicht gesetzt! Bitte in .env Datei eintragen.');
    }

    genAI = new GoogleGenerativeAI(apiKey);
    return genAI;
}

export async function chatWithAI(prompt) {
    try {
        const ai = initializeGenAI();
        // KORRIGIERTER MODEL NAME
        const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });

        const enhancedPrompt = `
Du bist ein hilfsbereiter und geduldiger Nachhilfelehrer. Beantworte die folgende Frage kurz, direkt und verständlich:

${prompt}

Regeln:
- Sei freundlich und ermutigend
- Erkläre einfach und verständlich
- Verwende gerne Emojis
- Halte dich kurz aber vollständig
- Gib konkrete Beispiele wenn nötig

Antworte direkt auf die Frage ohne komplizierte Formatierung. Sei wie ein echter Nachhilfelehrer: freundlich, geduldig und klar.
`;

        console.log('🤖 Sende Frage an Gemini 2.5 Flash...');
        const result = await model.generateContent(enhancedPrompt);
        const response = await result.response;

        return response.text();

    } catch (error) {
        console.error('Fehler bei AI Chat:', error);

        // Bessere Fehlermeldungen
        if (error.message.includes('API_KEY')) {
            throw new Error('Gemini API Key Problem. Prüfe die .env Datei.');
        } else if (error.message.includes('quota')) {
            throw new Error('Gemini API Limit erreicht. Versuche es später nochmal.');
        } else if (error.message.includes('safety')) {
            throw new Error('Anfrage wurde aus Sicherheitsgründen blockiert. Formuliere die Frage anders.');
        } else {
            throw new Error(`AI Chat fehlgeschlagen: ${error.message}`);
        }
    }
}

export async function getHomeworkHelp(fach, seiteNummer, userPrompt) {
    try {
        const ai = initializeGenAI();
        // KORRIGIERTER MODEL NAME
        const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });

        // Versuche, das Buch zu finden und den Text zu extrahieren
        let pageText = '';
        let hasPageText = false;

        try {
            const file = await findBookPage(fach, seiteNummer);
            pageText = await downloadAndProcessImage(file);
            hasPageText = true;
            console.log('📖 Buchseite erfolgreich geladen');
        } catch (pageError) {
            console.log('⚠️ Buchseite nicht gefunden, arbeite nur mit Prompt');
        }

        const helpPrompt = createHomeworkHelpPrompt(fach, seiteNummer, userPrompt, pageText, hasPageText);

        console.log('🎓 Generiere Hausaufgaben-Hilfe mit Gemini 2.5 Flash...');
        const result = await model.generateContent(helpPrompt);
        const response = await result.response;

        return response.text();

    } catch (error) {
        console.error('Fehler bei Hausaufgaben-Hilfe:', error);

        // Spezifische Fehlermeldungen
        if (error.message.includes('findBookPage')) {
            throw new Error(`Buchseite nicht gefunden: ${fach} Seite ${seiteNummer}. Prüfe MEGA-Dateien.`);
        } else if (error.message.includes('OCR')) {
            throw new Error('Texterkennung fehlgeschlagen. Versuche bessere Bildqualität.');
        } else if (error.message.includes('API')) {
            throw new Error('Gemini API Problem. Versuche es später nochmal.');
        } else {
            throw new Error(`Hausaufgaben-Hilfe fehlgeschlagen: ${error.message}`);
        }
    }
}

function createHomeworkHelpPrompt(fach, seiteNummer, userPrompt, pageText, hasPageText) {
    const fachEmoji = getFachEmoji(fach);

    return `
Du bist ein erfahrener und geduldiger Nachhilfelehrer für das Fach "${fach}".

${hasPageText ? `📖 Hier ist der Text von Seite ${seiteNummer}:
${pageText}

` : `📚 Ich arbeite mit Seite ${seiteNummer} des Fachs "${fach}", aber der Seitentext ist nicht verfügbar.
`}

🎓 **Schülerfrage:** "${userPrompt}"

Deine Aufgabe als Nachhilfelehrer:
1. Beantworte die Schülerfrage ausführlich und verständlich
2. Erkläre schwierige Konzepte Schritt für Schritt
3. Gib praktische Tipps und Lernhilfen
4. Verwende Beispiele zur Veranschaulichung
5. Sei motivierend und ermutigend
6. ${hasPageText ? 'Beziehe dich auf den Seiteninhalt wenn relevant' : 'Arbeite mit allgemeinem Fachwissen'}

Spezielle Hinweise für ${fach}:
${getFachSpezifischeHilfe(fach)}

Formatiere deine Antwort übersichtlich:

## ${fachEmoji} Antwort auf deine Frage:
[Direkte, verständliche Antwort]

## 📚 Schritt-für-Schritt Erklärung:
[Detaillierte Erklärung mit Zwischenschritten]

## 💡 Tipps & Tricks:
[Praktische Lernhilfen und Merktipps]

## 🔍 Beispiele:
[Konkrete Beispiele zur Veranschaulichung]

${hasPageText ? `## 📖 Bezug zur Buchseite:
[Verbindung zum Seiteninhalt und weitere Aufgaben]` : ''}

## 🎯 Zusammenfassung:
[Wichtigste Punkte kurz zusammengefasst]

Stil: Sei geduldig, motivierend und erkläre alles so, dass es ein Schüler gut verstehen kann. Verwende keine zu komplizierte Fachsprache ohne Erklärung.
`;
}

function getFachEmoji(fach) {
    const emojis = {
        'deutsch': '🔴',
        'mathe': '🔵',
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

    return emojis[fach.toLowerCase()] || '📚';
}

function getFachSpezifischeHilfe(fach) {
    const lowerFach = fach.toLowerCase();

    switch (lowerFach) {
        case 'mathe':
            return `
- Zeige alle Rechenschritte deutlich
- Erkläre verwendete Formeln und Regeln
- Gib Kontrolltipps zur Überprüfung
- Verwende konkrete Zahlenbeispiele
- Erkläre die Logik hinter den Schritten`;

        case 'deutsch':
            return `
- Erkläre Grammatikregeln mit Beispielen
- Gib Strukturhilfen für Texte
- Erkläre Stilmittel anschaulich
- Hilf bei Rechtschreibung und Zeichensetzung
- Gib Interpretationsansätze`;

        case 'english':
            return `
- Gib deutsche Übersetzungen und Erklärungen
- Erkläre Grammatikregeln verständlich
- Hilf bei Aussprache (phonetisch)
- Gib Vokabelhilfen und Merkwörter
- Zeige typische Sprachmuster auf`;

        case 'französisch':
        case 'franzoesisch':
        case 'fr':
            return `
- Übersetze ins Deutsche
- Erkläre französische Grammatik einfach
- Hilf bei Aussprache (lautschrift)
- Gib Eselsbrücken für Vokabeln
- Erkläre kulturelle Besonderheiten`;

        case 'latein':
            return `
- Übersetze lateinische Texte
- Erkläre Grammatik und Satzstruktur
- Gib Wortschatzhilfen
- Zeige Wortableitungen ins Deutsche
- Erkläre historische Zusammenhänge`;

        case 'geschichte':
            return `
- Erkläre historische Zusammenhänge
- Gib chronologische Einordnungen
- Zeige Ursache-Wirkung-Ketten auf
- Verbinde mit der heutigen Zeit
- Gib Merkstrategien für Daten`;

        case 'physik':
            return `
- Erkläre Naturgesetze anschaulich
- Zeige Formeln mit Einheiten
- Gib Alltagsbeispiele
- Erkläre Experimente verständlich
- Zeige Anwendungen in der Technik`;

        case 'chemie':
            return `
- Erkläre chemische Reaktionen
- Zeige Formeln und Gleichungen
- Gib Alltagsbezüge
- Erkläre Sicherheit im Labor
- Zeige Anwendungen im Leben`;

        case 'religion ev':
        case 'religion kt':
        case 'ethik':
            return `
- Erkläre ethische Konzepte verständlich
- Zeige verschiedene Sichtweisen auf
- Fördere eigenes Nachdenken
- Gib Lebensbezug
- Respektiere unterschiedliche Meinungen`;

        default:
            return `
- Erkläre Fachbegriffe verständlich
- Gib strukturierte Antworten
- Verwende anschauliche Beispiele
- Motiviere zum Weiterlernen
- Zeige praktische Anwendungen`;
    }
}

