/**
 * News Service - Simulated Google News integration for Elections
 */

export const latestNews = [
    {
        title: "Phase 1 Voting Begins in 102 Constituencies",
        source: "Google News",
        time: "2 hours ago",
        url: "https://news.google.com/search?q=india+elections+2026",
        summary: "The first phase of the General Elections 2026 has officially kicked off with high voter turnout reported."
    },
    {
        title: "ECI Introduces 'Voter Helpline App' for Real-Time Updates",
        source: "ECI Updates",
        time: "5 hours ago",
        url: "https://voters.eci.gov.in/",
        summary: "The Election Commission has launched a new app to help voters track their polling station and queue status."
    },
    {
        title: "Supreme Court Clarifies Voter ID Guidelines",
        source: "Legal News",
        time: "1 day ago",
        url: "https://news.google.com/search?q=voter+id+guidelines+india",
        summary: "New directions issued for the use of secondary identification documents at polling stations."
    }
];

export class NewsService {
    async fetchLatest() {
        return latestNews;
    }
}
