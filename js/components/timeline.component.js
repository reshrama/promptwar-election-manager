export class TimelineComponent {
    constructor() {
        this.phases = [
            { id: 1, date: "April 19", month: "APR", event: "Phase 1 Voting", states: "102 Constituencies", status: "upcoming" },

            { id: 2, date: "April 26", month: "APR", event: "Phase 2 Voting", states: "89 Constituencies", status: "upcoming" },
            { id: 3, date: "May 7", month: "MAY", event: "Phase 3 Voting", states: "94 Constituencies", status: "upcoming" },
            { id: 4, date: "May 13", month: "MAY", event: "Phase 4 Voting", states: "96 Constituencies", status: "upcoming" },
            { id: 5, date: "May 20", month: "MAY", event: "Phase 5 Voting", states: "49 Constituencies", status: "upcoming" },
            { id: 6, date: "May 25", month: "MAY", event: "Phase 6 Voting", states: "58 Constituencies", status: "upcoming" },
            { id: 7, date: "June 1", month: "JUN", event: "Phase 7 Voting", states: "57 Constituencies", status: "upcoming" },
            { id: 8, date: "June 4", month: "JUN", event: "Results Day", states: "Nationwide", status: "result" }
        ];
    }

    render(containerId, lang = 'en') {
        const container = document.getElementById(containerId);
        if (!container) return;

        const label = (lang === 'hi' || lang === 'mr') ? 'चरण' : 'Phase';

        container.innerHTML = this.phases.map(phase => `
            <div class="timeline-item ${phase.status}">
                <div class="date-box">
                    <span class="month">${phase.month}</span>
                    <strong class="day">${phase.date.split(' ')[1]}</strong>
                </div>
                <h4>${label} ${phase.id} ${phase.status === 'completed' ? '✓' : ''}</h4>
                <p>${phase.event}</p>
                <small>${phase.states}</small>
            </div>
        `).join('');
    }
}

