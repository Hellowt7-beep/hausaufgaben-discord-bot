import fetch from 'node-fetch';
import { config } from 'dotenv';
import sharp from 'sharp';

config();

export async function performOCR(imageBuffer) {
    try {
        const apiKey = process.env.OCR_API_KEY;

        // Erste Priorität: OCR.space mit API Key
        if (apiKey && apiKey !== 'helloworld' && apiKey !== 'your_ocr_api_key_here') {
            console.log('🔤 Verwende OCR.space mit API Key...');
            try {
                return await performOCRWithAPIKey(imageBuffer, apiKey);
            } catch (error) {
                console.log('⚠️ OCR.space mit API Key fehlgeschlagen:', error.message);
            }
        }

        // Zweite Priorität: Kostenloser OCR.space Service
        console.log('🔤 Verwende kostenlosen OCR.space Service...');
        try {
            return await performFreeOCR(imageBuffer);
        } catch (error) {
            console.log('⚠️ Kostenloser OCR.space fehlgeschlagen:', error.message);
        }

        // Dritte Priorität: Alternative OCR API
        console.log('🔤 Verwende alternative OCR API...');
        try {
            return await performAlternativeOCR(imageBuffer);
        } catch (error) {
            console.log('⚠️ Alternative OCR fehlgeschlagen:', error.message);
        }

        // Letzte Option: Mock OCR für Demo
        console.log('🔤 Verwende Mock OCR für Demo...');
        return performMockOCR();

    } catch (error) {
        console.error('❌ Alle OCR Methoden fehlgeschlagen:', error.message);
        return performMockOCR();
    }
}

// OCR.space mit API Key
async function performOCRWithAPIKey(imageBuffer, apiKey) {
    const optimizedBuffer = await optimizeImageForOCR(imageBuffer);
    const base64Image = optimizedBuffer.toString('base64');

    const formData = new URLSearchParams();
    formData.append('apikey', apiKey);
    formData.append('base64Image', `data:image/jpeg;base64,${base64Image}`);
    formData.append('language', 'ger');
    formData.append('isOverlayRequired', 'false');
    formData.append('detectOrientation', 'true');
    formData.append('scale', 'true');
    formData.append('OCREngine', '2');
    formData.append('isTable', 'true');

    const response = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
        timeout: 30000
    });

    const result = await response.json();

    if (result.OCRExitCode === 1 && result.ParsedResults && result.ParsedResults.length > 0) {
        const extractedText = result.ParsedResults[0].ParsedText;
        console.log('✅ OCR.space mit API Key erfolgreich');
        return extractedText;
    } else {
        throw new Error(`OCR.space API Fehler: ${result.ErrorMessage || 'Unbekannter Fehler'}`);
    }
}

// Kostenloser OCR.space Service mit Retry
async function performFreeOCR(imageBuffer) {
    const optimizedBuffer = await optimizeImageForOCR(imageBuffer);
    const base64Image = optimizedBuffer.toString('base64');

    // Mehrere kostenlose API Keys versuchen
    const freeApiKeys = ['helloworld', 'K87899142388957'];
    
    for (const apiKey of freeApiKeys) {
        try {
            console.log(`🔄 Versuche kostenlosen OCR mit Key: ${apiKey.substring(0, 5)}...`);
            
            const formData = new URLSearchParams();
            formData.append('apikey', apiKey);
            formData.append('base64Image', `data:image/jpeg;base64,${base64Image}`);
            formData.append('language', 'ger');
            formData.append('isOverlayRequired', 'false');
            formData.append('detectOrientation', 'true');
            formData.append('scale', 'true');
            formData.append('OCREngine', '1'); // Engine 1 für kostenlosen Service

            const response = await fetch('https://api.ocr.space/parse/image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData,
                timeout: 45000
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            if (result.OCRExitCode === 1 && result.ParsedResults && result.ParsedResults.length > 0) {
                const extractedText = result.ParsedResults[0].ParsedText;
                console.log('✅ Kostenloser OCR erfolgreich');
                return extractedText;
            } else {
                throw new Error(`OCR Fehler: ${result.ErrorMessage || 'Kein Text erkannt'}`);
            }
        } catch (error) {
            console.log(`❌ Kostenloser OCR mit ${apiKey.substring(0, 5)}... fehlgeschlagen:`, error.message);
            continue;
        }
    }
    
    throw new Error('Alle kostenlosen OCR Services fehlgeschlagen');
}

// Alternative OCR API (API-Ninjas oder ähnlich)
async function performAlternativeOCR(imageBuffer) {
    try {
        // Verwende eine alternative OCR API (falls verfügbar)
        console.log('🔄 Versuche alternative OCR...');
        
        // Hier könnte eine andere OCR API integriert werden
        // Für jetzt als Mock implementiert
        
        throw new Error('Alternative OCR nicht verfügbar');
    } catch (error) {
        throw error;
    }
}

// Mock OCR für Demo/Entwicklung
function performMockOCR() {
    console.log('🎭 Verwende Mock OCR für Demo...');
    
    const mockText = `
Hausaufgaben Mock OCR Ergebnis:

Deutsch:
- Seite 45, Aufgaben 1-3 bearbeiten
- Gedicht "Der Erlkönig" auswendig lernen
- Inhaltsangabe zu Kapitel 7 schreiben

Mathe:
- Buch Seite 82, Aufgaben 5-12
- Arbeitsblatt Bruchrechnung beenden
- Übungsaufgaben für Klassenarbeit

English:
- Vocabulary Unit 5 lernen
- Workbook page 23-25
- Essay about "My favorite hobby" (150 words)

Hinweis: Dies ist ein Mock-Ergebnis. Für echte OCR:
1. OCR_API_KEY in .env eintragen
2. Bessere Bildqualität verwenden
3. Oder Text manuell mit .ai eingeben
`;

    console.log('⚠️ Mock OCR verwendet - für Produktion echten API Key verwenden');
    return mockText;
}

// Bild für OCR optimieren mit Sharp
async function optimizeImageForOCR(imageBuffer) {
    try {
        console.log('🖼️ Optimiere Bild für OCR...');

        const optimized = await sharp(imageBuffer)
            .resize(2000, 2000, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .greyscale()
            .normalize()
            .sharpen()
            .jpeg({ quality: 90 })
            .toBuffer();

        console.log('✅ Bildoptimierung abgeschlossen');
        return optimized;
    } catch (error) {
        console.log('⚠️ Bildoptimierung fehlgeschlagen, verwende Original:', error.message);
        return imageBuffer;
    }
}

// Utility Funktion für URL-basierte OCR
export async function performOCRFromURL(imageUrl) {
    try {
        console.log('📥 Lade Bild von URL herunter...');
        const response = await fetch(imageUrl, {
            timeout: 30000,
            headers: {
                'User-Agent': 'Discord-Bot/1.0'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const imageBuffer = await response.arrayBuffer();
        console.log(`📊 Bildgröße: ${Math.round(imageBuffer.byteLength / 1024)} KB`);

        validateImage(Buffer.from(imageBuffer));

        return await performOCR(Buffer.from(imageBuffer));
    } catch (error) {
        throw new Error(`Fehler beim Laden des Bildes von URL: ${error.message}`);
    }
}

// Funktion zur Bildvalidierung
export function validateImage(imageBuffer) {
    const maxSize = 10 * 1024 * 1024; // 10MB Limit
    const minSize = 1024; // 1KB Minimum

    if (imageBuffer.length > maxSize) {
        throw new Error('Bild ist zu groß (max. 10MB)');
    }

    if (imageBuffer.length < minSize) {
        throw new Error('Bild ist zu klein (min. 1KB)');
    }

    // Prüfe ob es sich um ein gültiges Bildformat handelt
    const header = imageBuffer.slice(0, 8);
    const isPNG = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47;
    const isJPEG = header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF;
    const isWEBP = header.slice(0, 4).toString() === 'RIFF' && header.slice(8, 12).toString() === 'WEBP';

    if (!isPNG && !isJPEG && !isWEBP) {
        throw new Error('Unsupported image format. Only PNG, JPEG and WEBP are supported.');
    }

    return true;
}

// Enhanced OCR with retry logic
export async function performOCRWithRetry(imageBuffer, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🔄 OCR Versuch ${attempt}/${maxRetries}`);
            const result = await performOCR(imageBuffer);

            // Prüfe ob Ergebnis sinnvoll ist
            if (result && result.trim().length > 10) {
                return result;
            } else {
                throw new Error('OCR Ergebnis zu kurz oder leer');
            }
        } catch (error) {
            console.log(`❌ OCR Versuch ${attempt} fehlgeschlagen:`, error.message);

            if (attempt === maxRetries) {
                // Beim letzten Versuch immer Mock OCR zurückgeben
                console.log('🎭 Alle OCR Versuche fehlgeschlagen, verwende Mock OCR...');
                return performMockOCR();
            }

            // Warte zwischen Versuchen
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        }
    }
}
