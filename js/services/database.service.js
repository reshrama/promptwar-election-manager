import { firebaseConfig } from '../config.js';

/**
 * Database Service - Google Firebase (Firestore) Integration
 * Handles fetching of constant election data from a remote Google-based source.
 */
export class DatabaseService {
    constructor() {
        this.config = firebaseConfig;
        this.isLive = !!(this.config.apiKey && !this.config.apiKey.includes('YOUR_'));
    }

    async getStateData(stateName) {
        if (!this.isLive) {
            // Fallback to our internal high-fidelity source during development
            const { stateParties } = await import('./parties.data.js');
            return {
                parties: stateParties[stateName] || stateParties['National'],
                isLive: false
            };
        }

        try {
            // This is the logic to fetch from Firestore
            const response = await fetch(`${this.config.databaseURL}/states/${stateName}.json`);
            if (!response.ok) throw new Error('Network response was not ok');
            
            const data = await response.json();
            if (!data) throw new Error('No data found for this state');
            
            return data;
        } catch (e) {
            console.warn("DB Fetch failed, using local fallback.");
            const { stateParties } = await import('./parties.data.js');
            return { parties: stateParties[stateName] };
        }
    }
}
