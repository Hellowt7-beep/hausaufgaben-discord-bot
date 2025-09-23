import { GoogleGenerativeAI } from '@google/generative-ai';
<<<<<<< HEAD
import fetch from 'node-fetch';
import { config } from 'dotenv';
import { performOCRFromURL, performOCRWithRetry } from './ocr-service.js';

=======
import Tesseract from 'tesseract.js';
import fetch from 'node-fetch';
import { config } from 'dotenv';

// Stelle sicher, dass .env geladen wird
>>>>>>> f005e76f4fed9a65868eab65bf74b483e4397b67
config();

export async function analyzeHomework(imageUrl) {
    try {
        // API Key zur Laufzeit laden
        const apiKey = process.env.GEMINI_API_KEY;
        console.log('🔑 API Key geladen:', apiKey ? `JA (${apiKey.substring(0, 20)}...)` : 'NEIN');

        if (!apiKey || apiKey === 'YOUR_NEW_GEMINI_API_KEY_HERE') {
            throw new Error('GEMINI_API_KEY nicht gesetzt! Bitte in .env Datei eintragen.');
        }

        // GenAI zur Laufzeit initialisieren
        const genAI = new GoogleGenerativeAI(apiKey);

<<<<<<< HEAD
        console.log('📥 Lade Hausaufgaben-Bild herunter...');

        // Bild herunterladen mit verbessertem Handling
        const fetchResponse = await fetch(imageUrl, {
            timeout: 30000,
            headers: {
                'User-Agent': 'Discord-Bot/1.0'
            }
        });

        if (!fetchResponse.ok) {
            throw new Error(`Fehler beim Laden des Bildes: ${fetchResponse.status} ${fetchResponse.statusText}`);
        }

        const imageBuffer = await fetchResponse.arrayBuffer();
        console.log(`📊 Bildgröße: ${Math.round(imageBuffer.byteLength / 1024)} KB`);

        console.log('🔤 Führe OCR durch...');

        // Verwende verbesserten OCR Service mit Retry-Logic
        let text = '';
        try {
            text = await performOCRWithRetry(Buffer.from(imageBuffer), 2);
        } catch (ocrError) {
            console.log('⚠️ OCR fehlgeschlagen:', ocrError.message);

            // Fallback: Verwende Gemini Vision direkt
            console.log('🤖 Verwende Gemini Vision als OCR-Fallback...');
            text = await analyzeImageWithGeminiVision(imageBuffer, genAI);
        }

        if (!text.trim()) {
            throw new Error('Kein Text im Bild gefunden - versuche bessere Bildqualität');
        }

        console.log('🤖 Sende an Gemini zur Analyse...');
=======
        // Bild herunterladen
        const fetchResponse = await fetch(imageUrl);
        const imageBuffer = await fetchResponse.arrayBuffer();

        console.log('🔤 Führe OCR durch...');

        // OCR mit Tesseract
        const { data: { text } } = await Tesseract.recognize(imageBuffer, 'deu');

        if (!text.trim()) {
            throw new Error('Kein Text im Bild gefunden');
        }

        console.log('🤖 Sende an Gemini...');
>>>>>>> f005e76f4fed9a65868eab65bf74b483e4397b67

        // Text an Gemini zur Analyse senden
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

<<<<<<< HEAD
        const prompt = createHomeworkAnalysisPrompt(text);

        const result = await model.generateContent(prompt);
        const geminiResponse = await result.response;

        console.log('✅ Hausaufgaben-Analyse erfolgreich abgeschlossen');
        return geminiResponse.text();

    } catch (error) {
        console.error('Fehler bei der Hausaufgaben-Analyse:', error);
        throw new Error(`Analyse fehlgeschlagen: ${error.message}`);
    }
}

// Fallback: Gemini Vision für direkte Bildanalyse
async function analyzeImageWithGeminiVision(imageBuffer, genAI) {
    try {
        console.log('👁️ Verwende Gemini Vision für Bildanalyse...');

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Konvertiere Bild zu Base64
        const base64Image = Buffer.from(imageBuffer).toString('base64');

        const imagePart = {
            inlineData: {
                data: base64Image,
                mimeType: "image/jpeg"
            }
        };

        const prompt = `
Analysiere dieses Hausaufgaben-Bild und extrahiere ALLE erkennbaren Texte.

Aufgabe:
1. Erkenne und transkribiere JEDEN sichtbaren Text
2. Achte besonders auf Fächer-Namen und Aufgaben
3. Gib den Text strukturiert und vollständig wieder

Bitte gib NUR den erkannten Text zurück, keine zusätzlichen Erklärungen.
`;

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;

        console.log('✅ Gemini Vision OCR erfolgreich');
        return response.text();

    } catch (visionError) {
        console.error('❌ Gemini Vision OCR fehlgeschlagen:', visionError);
        throw new Error('Sowohl Standard-OCR als auch Gemini Vision fehlgeschlagen');
    }
}

function createHomeworkAnalysisPrompt(text) {
    return `
=======
        const prompt = `
>>>>>>> f005e76f4fed9a65868eab65bf74b483e4397b67
Du bist ein Hausaufgaben-Assistent. Analysiere den folgenden Text aus einem Hausaufgabenbild und extrahiere die Hausaufgaben nach Fächern strukturiert.

Erkannter Text:
${text}

Aufgabe:
1. Identifiziere alle Hausaufgaben in dem Text
<<<<<<< HEAD
2. Strukturiere sie nach Fächern
3. Gib eine klare, übersichtliche Übersicht zurück

WICHTIG: Verwende EXAKT diese Fach-Namen (nicht übersetzen!):
- Deutsch
- Mathe
- English
- Französisch
- Latein
- Geschichte
- Physik
- Chemie
- Religion ev
- Religion kt
- Ethik

Format (EXAKT so verwenden):
**Deutsch:**
- [Hausaufgabe 1]
- [Hausaufgabe 2]

**Mathe:**
- [Hausaufgabe]

**English:**
- [Hausaufgabe]

Beispiel:
**Deutsch:**
- Seite 45, Aufgaben 1-3 bearbeiten
- Gedicht auswendig lernen

**Mathe:**
- Buch Seite 28, Nr. 5-10
- Arbeitsblatt Bruchrechnung

**English:**
- Vocabulary Unit 3 lernen
- Workbook page 15

Regeln:
- Falls keine klaren Hausaufgaben erkennbar sind, gib den wichtigsten Inhalt strukturiert zurück
- Jede Hausaufgabe in einer eigenen Zeile mit "- " beginnen
- Verwende die Fach-Namen EXAKT wie oben angegeben
- Gruppiere ähnliche Aufgaben unter dem entsprechenden Fach
- Wenn ein Fach nicht erkannt wird, verwende "**Weitere Aufgaben:**"

Falls der Text unleserlich ist, antworte mit:
"❌ Text nicht klar erkennbar. Bitte verwende ein schärferes Bild oder gib die Hausaufgaben manuell mit .ai ein."
`;
}

// Hilfsfunktion für bessere Fehlermeldungen
export function getHomeworkAnalysisError(error) {
    if (error.message.includes('API')) {
        return '❌ Problem mit der Gemini API. Versuche es in ein paar Minuten nochmal.';
    } else if (error.message.includes('OCR')) {
        return '❌ Problem mit der Texterkennung. Versuche ein schärferes Bild oder verwende .ai für manuelle Eingabe.';
    } else if (error.message.includes('fetch')) {
        return '❌ Problem beim Laden des Bildes. Prüfe die Internetverbindung.';
    } else if (error.message.includes('GEMINI_API_KEY')) {
        return '❌ Gemini API Key nicht konfiguriert. Prüfe die .env Datei.';
    } else {
        return `❌ Unbekannter Fehler: ${error.message}`;
=======
2. Strukturiere sie nach Fächern (Deutsch, Mathe, English, etc.)
3. Gib eine klare Übersicht zurück

Format:
**[FACH]:**
- [Hausaufgabe 1]
- [Hausaufgabe 2]

**[ANDERES FACH]:**
- [Hausaufgabe]

Falls keine klaren Hausaufgaben erkennbar sind, gib den wichtigsten Inhalt strukturiert zurück.
`;

        const result = await model.generateContent(prompt);
        const geminiResponse = await result.response;
        return geminiResponse.text();

    } catch (error) {
        console.error('Fehler bei der Hausaufgaben-Analyse:', error);
        throw new Error(`Analyse fehlgeschlagen: ${error.message}`);
>>>>>>> f005e76f4fed9a65868eab65bf74b483e4397b67
    }
}
