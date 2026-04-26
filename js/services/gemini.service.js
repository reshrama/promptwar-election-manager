import { stateParties } from '../data/parties.data.js';
import { DatabaseService } from './database.service.js';
import { geminiConfig } from '../config.js';

/**
 * Gemini AI Service - Enterprise Resilience Version
 */
export class GeminiService {
    constructor() {
        this.lang = 'en';
        this.db = new DatabaseService();
        this.cache = JSON.parse(localStorage.getItem('AI_CACHE') || '{}');
        const currentKey = geminiConfig.apiKey;
        if (localStorage.getItem('LAST_KEY') !== currentKey) {
            localStorage.clear();
            localStorage.setItem('LAST_KEY', currentKey);
        }
        this.apiKey = currentKey;
        this.model = localStorage.getItem('GEMINI_MODEL') || 'gemini-1.5-flash';
        this.version = 'v1beta';
        this.lastRequestTime = 0;
        this.ready = this.discoverModel();

        // Local Intelligence for 2026 (Safety Net - Expanded)
        this.staticData = {
            'National': {
                electionType: "General Elections 2026",
                summary: "India is conducting its 19th General Elections. Over 980 million voters are participating in this historic democratic exercise.",
                phases: [
                    { id: "1", date: "19", month: "APR", title: "Phase 1", location: "102 Seats", status: "completed" },
                    { id: "2", date: "26", month: "APR", title: "Phase 2", location: "89 Seats", status: "ongoing" }
                ]
            },
            'Andhra Pradesh': {
                electionType: "AP Assembly & Lok Sabha 2026",
                summary: "Intense competition across 175 Assembly seats and 25 Lok Sabha seats.",
                phases: [{ id: "1", date: "13", month: "MAY", title: "General Voting", location: "Statewide", status: "upcoming" }]
            },
            'Sikkim': {
                electionType: "Sikkim Assembly Election 2026",
                summary: "Polling for 32 assembly constituencies. SKM and SDF remain the dominant forces.",
                phases: [{ id: "1", date: "19", month: "APR", title: "Voting", location: "32 Seats", status: "completed" }]
            }
        };
    }

    async discoverModel() {
        if (localStorage.getItem('GEMINI_MODEL')) return;
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`);
            const data = await response.json();
            if (data.models && data.models.length > 0) {
                const bestModel = data.models.find(m => m.name.includes('gemini-1.5-flash')) || data.models[0];
                this.model = bestModel.name.split('/').pop();
                localStorage.setItem('GEMINI_MODEL', this.model);
            }
        } catch (e) {}
    }

    async fetchElectionContext(stateName, lang) {
        await this.ready;
        
        // Always get verified party data from DB first
        const verifiedSource = await this.db.getStateData(stateName);

        const cacheKey = `${stateName}_${lang}`;
        const cached = this.cache[cacheKey];
        if (cached && (Date.now() - cached.timestamp < 3600000)) return cached.data;

        const now = Date.now();
        if (now - this.lastRequestTime < 30000) {
            return this.getMockFallback(stateName);
        }

        try {
            this.lastRequestTime = now;
            const url = `https://generativelanguage.googleapis.com/${this.version}/models/${this.model}:generateContent?key=${this.apiKey}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: `Provide election summary and phases for ${stateName}, India in 2026. Return ONLY JSON: {electionType, summary, phases:[{id, date, month, title, location, status}]}. Language: ${lang}` }] }]
                })
            });

            if (response.status === 429) return this.getMockFallback(stateName);

            const data = await response.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    const parsed = JSON.parse(jsonMatch[0]);
                    // Stitch verified parties into the AI response
                    parsed.parties = verifiedSource.parties;
                    this.saveToCache(cacheKey, parsed);
                    return parsed;
                } catch (parseError) {
                    console.error("AI returned invalid JSON", parseError);
                }
            }
            return this.getMockFallback(stateName);
        } catch (error) {
            return this.getMockFallback(stateName);
        }
    }

    async askStream(prompt, onChunk, fileData = null) {
        try {
            const url = `https://generativelanguage.googleapis.com/${this.version}/models/${this.model}:streamGenerateContent?key=${this.apiKey}`;
            const body = {
                contents: [{ parts: [{ text: prompt }] }]
            };
            
            if (fileData) {
                body.contents[0].parts.push({
                    inline_data: fileData
                });
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await response.json();
            let fullText = "";
            
            if (Array.isArray(data)) {
                data.forEach(chunk => {
                    fullText += chunk.candidates?.[0]?.content?.parts?.[0]?.text || "";
                    onChunk(fullText);
                });
            } else {
                onChunk(data.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't process that.");
            }
        } catch (e) {
            onChunk("Service temporarily unavailable. Please verify your API key.");
        }
    }

    saveToCache(key, data) {
        this.cache[key] = { timestamp: Date.now(), data };
        localStorage.setItem('AI_CACHE', JSON.stringify(this.cache));
    }

    async getMockFallback(stateName) {
        const verifiedSource = await this.db.getStateData(stateName);
        if (this.staticData[stateName]) {
            const data = JSON.parse(JSON.stringify(this.staticData[stateName]));
            data.summary += " (Source: Local Intelligence)";
            data.parties = verifiedSource.parties;
            return data;
        }
        return {
            electionType: "General Elections 2026",
            summary: `Ongoing 2026 elections in ${stateName}. (Source: Local Intelligence)`,
            phases: [{ id: "1", date: "19", month: "APR", title: "General Voting", location: "Statewide", status: "completed" }],
            parties: verifiedSource.parties
        };
    }
}
