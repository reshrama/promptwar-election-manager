import { GeminiService } from './services/gemini.service.js';
import { TimelineComponent } from './components/timeline.component.js';
import { translations } from './services/i18n.service.js';
import { NewsService } from './services/news.service.js';

class App {
    constructor() {
        this.currentYear = new Date().getFullYear();
        this.currentLang = 'en';
        this.currentStateCode = '';
        this.currentStateName = 'National';
        
        this.geminiService = new GeminiService();
        this.timeline = new TimelineComponent();
        this.newsService = new NewsService();
        
        this.selectedFile = null;
        
        // Element cache
        this.chatInput = document.getElementById('chatInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.attachBtn = document.getElementById('attachBtn');
        this.fileInput = document.getElementById('fileInput');
        this.chatDisplay = document.getElementById('chatDisplay');
        this.langSwitcher = document.getElementById('langSwitcher');
        this.stateSwitcher = document.getElementById('stateSwitcher');
        this.welcomeP = document.getElementById('dynamicGreeting');
        this.stateNameEl = document.getElementById('currentState');
        this.apiKeyBtn = document.getElementById('setApiKeyBtn');
        this.apiStatusEl = document.getElementById('apiStatus');
        
        this.init();
    }

    async init() {
        this.renderStaticUI();
        await this.geminiService.ready;
        this.updateApiStatus();
        
        // QUOTA-GUARD: Skip initial AI call for National, use static 2026 context
        this.welcomeP.innerHTML = `<strong>General Elections 2026</strong>: India is currently in the middle of a historic multi-phase election. Use the map to explore specific states or ask Bharat Sahayak for live updates. <span class="badge-mini">Standard View</span>`;
        
        // Only sync if it's not the initial 'National' load or if cached
        const cacheKey = `National_${this.currentLang}`;
        if (localStorage.getItem('AI_CACHE') && JSON.parse(localStorage.getItem('AI_CACHE'))[cacheKey]) {
            await this.syncStateData();
        }
        
        this.sendBtn.addEventListener('click', () => this.handleSendMessage());
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSendMessage();
        });
        
        this.attachBtn.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelection(e));
        
        this.langSwitcher.addEventListener('change', (e) => this.setLanguage(e.target.value));
        this.stateSwitcher.addEventListener('change', (e) => this.setState(e.target.value));
        
        this.apiKeyBtn.addEventListener('click', () => {
            const key = prompt("Enter your Google AI Studio API Key:");
            if (key) {
                localStorage.setItem('GEMINI_API_KEY', key);
                location.reload();
            }
        });
    }

    handleFileSelection(e) {
        const file = e.target.files[0];
        if (file) {
            this.selectedFile = file;
            this.attachBtn.innerHTML = "✅";
            this.attachBtn.style.borderColor = "var(--primary)";
        }
    }

    async handleSendMessage() {
        const query = this.chatInput.value.trim();
        if (!query && !this.selectedFile) return;

        this.addMessage(query || "Analyzing attached document...", 'user');
        this.chatInput.value = '';
        
        const assistantMsgDiv = this.addMessage("...", 'assistant');
        let fileData = null;

        if (this.selectedFile) {
            fileData = await this.fileToBase64(this.selectedFile);
            this.selectedFile = null;
            this.attachBtn.innerHTML = "📎";
            this.attachBtn.style.borderColor = "var(--border)";
        }

        await this.geminiService.askStream(query, (text) => {
            assistantMsgDiv.innerText = text;
            this.chatDisplay.scrollTop = this.chatDisplay.scrollHeight;
        }, fileData);
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve({
                mime_type: file.type,
                data: reader.result.split(',')[1]
            });
            reader.onerror = error => reject(error);
        });
    }

    addMessage(text, className) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${className}`;
        msgDiv.innerText = text;
        this.chatDisplay.appendChild(msgDiv);
        this.chatDisplay.scrollTop = this.chatDisplay.scrollHeight;
        return msgDiv;
    }

    updateApiStatus() {
        const key = localStorage.getItem('GEMINI_API_KEY') || 'AIzaSyBkF9menCmIws__jc-HeRarPSDh-LjIEUM';
        if (key && key !== 'YOUR_GEMINI_API_KEY') {
            this.apiStatusEl.innerText = "Live AI Mode";
            this.apiStatusEl.style.background = "#dcfce7";
            this.apiStatusEl.style.color = "#15803d";
        }
    }

    renderStaticUI() {
        this.updateTranslations();
        this.renderNews();
        this.renderVideos(this.currentLang);
    }

    async setState(stateCode) {
        this.currentStateCode = stateCode;
        const stateElement = document.querySelector(`#stateSwitcher option[value="${stateCode}"]`);
        this.currentStateName = stateElement ? stateElement.innerText : 'National';
        this.stateNameEl.innerText = this.currentStateName;
        this.welcomeP.innerHTML = `<em>Fetching latest dynamic details for ${this.currentStateName}...</em>`;
        await this.syncStateData();
    }

    async syncStateData() {
        // Only fetch if we have a state or if we're not hitting limits
        try {
            const dynamicData = await this.geminiService.fetchElectionContext(this.currentStateName, this.currentLang);
            if (dynamicData.summary) {
                const isLocal = dynamicData.summary.includes('Local Intelligence');
                this.welcomeP.innerHTML = `<strong>${dynamicData.electionType || 'General Election'}</strong>: ${dynamicData.summary} ${isLocal ? '<span class="badge-mini">Offline Mode</span>' : ''}`;
            }
            if (dynamicData.phases) this.renderDynamicTimeline(dynamicData.phases);
            if (dynamicData.parties) this.renderDynamicParties(dynamicData.parties);
        } catch (error) {
            this.welcomeP.innerText = "Viewing election schedule in Standard Mode.";
        }
    }

    renderDynamicTimeline(phases) {
        const container = document.getElementById('timelineContainer');
        if (!container) return;
        const label = (this.currentLang === 'hi' || this.currentLang === 'mr') ? 'चरण' : 'Phase';
        container.innerHTML = phases.map(phase => `
            <div class="timeline-item ${phase.status || 'upcoming'}">
                <div class="date-box">
                    <span class="month">${phase.month || 'TBD'}</span>
                    <strong class="day">${phase.date || '??'}</strong>
                </div>
                <h4>${label} ${phase.id || ''} ${phase.status === 'completed' ? '✓' : ''}</h4>
                <p>${phase.title || phase.event}</p>
                <small>${phase.location || phase.states || ''}</small>
            </div>
        `).join('');
    }

    renderDynamicParties(parties) {
        const grid = document.getElementById('partyGrid');
        if (!grid) return;
        grid.innerHTML = parties.map(party => `
            <div class="party-item">
                <div class="party-logo" style="background-color: ${party.color || '#334155'}">${party.abbr ? party.abbr[0] : (party.name ? party.name[0] : 'P')}</div>
                <div class="party-info"><strong>${party.abbr || party.name}</strong></div>
            </div>
        `).join('');
    }

    setLanguage(lang) {
        this.currentLang = lang;
        if (this.geminiService) this.geminiService.setLanguage(lang);
        this.renderStaticUI();
        this.syncStateData();
    }

    async renderNews() {
        const grid = document.getElementById('newsFeed');
        if (!grid) return;
        const news = await this.newsService.fetchLatest();
        grid.innerHTML = news.map(item => `
            <a href="${item.url}" target="_blank" style="text-decoration: none; color: inherit;">
                <div class="news-item">
                    <div class="news-meta">
                        <span class="news-source">${item.source}</span>
                        <span class="news-time">${item.time}</span>
                    </div>
                    <h4>${item.title}</h4>
                    <p>${item.summary}</p>
                </div>
            </a>
        `).join('');
    }

    renderVideos(lang) {
        const grid = document.getElementById('videoGrid');
        if (!grid) return;
        let t = translations[lang] || translations['en'];
        const videoHub = [
            { id: "XGJQNKFYqYI", title: t.vidHowToVote },
            { id: "ZJReQ8ao0SU", title: t.vidCheckRoll },
            { id: "LQ4Ebazf44A", title: t.vidRegistration }
        ];
        grid.innerHTML = videoHub.map((video) => `
            <a href="https://www.youtube.com/watch?v=${video.id}" target="_blank" style="text-decoration: none; color: inherit;">
                <div class="video-card card">
                    <div class="thumbnail" style="background-image: url('https://img.youtube.com/vi/${video.id}/0.jpg'); min-height: 150px; background-size: cover; border-radius: 12px; background-position: center; background-color: #f1f5f9;"></div>
                    <h4>${video.title}</h4>
                </div>
            </a>
        `).join('');
    }

    updateTranslations() {
        let t = translations[this.currentLang] || translations['en'];
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (t[key]) el.innerText = t[key];
        });
        const footerText = document.getElementById('footerCopy');
        if (footerText) footerText.innerHTML = `&copy; ${this.currentYear} Indian Election Assistant. AI-powered dynamic data dashboard.`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new App();
});
