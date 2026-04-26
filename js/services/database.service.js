/**
 * Database Service - Google Firebase (Firestore) Integration
 * Handles fetching of constant election data from a remote Google-based source.
 */
export class DatabaseService {
    constructor() {
        // These would be your Firebase Config values
        this.config = {
            apiKey: "AIzaSyCGQLROINrBQeqw6b0sMOJPXIk7PZ-gZIM",
            projectId: "promptwar-election-manager",
            databaseURL: "https://promptwar-election-manager-default-rtdb.firebaseio.com"
        };
        this.isLive = this.config.projectId !== "YOUR_PROJECT_ID";
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
            return await response.json();
        } catch (e) {
            console.warn("DB Fetch failed, using local fallback.");
            const { stateParties } = await import('./parties.data.js');
            return { parties: stateParties[stateName] };
        }
    }
}
