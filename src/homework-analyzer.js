import { GoogleGenerativeAI } from '@google/generative-ai';
import Tesseract from 'tesseract.js';
import fetch from 'node-fetch';
import { config } from 'dotenv';

// Stelle sicher, dass .env geladen wird
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

        // Text an Gemini zur Analyse senden
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
Du bist ein Hausaufgaben-Assistent. Analysiere den folgenden Text aus einem Hausaufgabenbild und extrahiere die Hausaufgaben nach Fächern strukturiert.

Erkannter Text:
${text}

Aufgabe:
1. Identifiziere alle Hausaufgaben in dem Text
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
    }
}
