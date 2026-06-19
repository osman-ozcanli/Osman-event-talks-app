// App State
let releaseNotes = [];
let filteredNotes = [];
let selectedNote = null;
let currentCategory = 'all';
let searchQuery = '';

// SVG Circular Progress Ring constants
const circle = document.querySelector('.progress-ring__circle');
let radius, circumference;
if (circle) {
    radius = circle.r.baseVal.value;
    circumference = radius * 2 * Math.PI;
    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    circle.style.strokeDashoffset = circumference;
}

// DOM Elements
const feedContainer = document.getElementById('feed-container');
const feedLoading = document.getElementById('feed-loading');
const feedEmpty = document.getElementById('feed-empty');
const searchInput = document.getElementById('search-input');
const btnRefresh = document.getElementById('btn-refresh');
const refreshIcon = btnRefresh.querySelector('.icon-spin-target');
const totalCountEl = document.getElementById('total-count');

// Modal Elements
const tweetModal = document.getElementById('tweet-modal');
const modalClose = document.getElementById('modal-close');
const modalCancel = document.getElementById('modal-cancel');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCountText = document.getElementById('char-count-text');
const btnTweetAction = document.getElementById('btn-tweet-action');
const btnShorten = document.getElementById('btn-shorten');
const previewBadgeCat = document.getElementById('preview-badge-cat');
const previewBadgeDate = document.getElementById('preview-badge-date');
const previewOriginalText = document.getElementById('preview-original-text');

// Init application
document.addEventListener('DOMContentLoaded', () => {
    fetchReleaseNotes();
    setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
    // Refresh feed
    btnRefresh.addEventListener('click', () => {
        fetchReleaseNotes(true);
    });

    // Search input typing
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        applyFilters();
    });

    // Category pills selection
    const filterPills = document.querySelectorAll('.filter-pill');
    filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            filterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentCategory = pill.getAttribute('data-category');
            applyFilters();
        });
    });

    // Modal Close
    modalClose.addEventListener('click', closeComposer);
    modalCancel.addEventListener('click', closeComposer);
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) closeComposer();
    });

    // Character counter logic
    tweetTextarea.addEventListener('input', updateCharCounter);

    // AI Shorten Helper
    btnShorten.addEventListener('click', shortenTweetText);
}

// Fetch notes from Flask API
async function fetchReleaseNotes(forceRefresh = false) {
    showLoading(true);
    
    // Add spinning animation to refresh icon
    if (refreshIcon) refreshIcon.classList.add('spinning');
    btnRefresh.disabled = true;

    try {
        const url = `/api/releases${forceRefresh ? '?refresh=true' : ''}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch release notes');
        
        const result = await response.json();
        if (result.status === 'success') {
            releaseNotes = result.data;
            applyFilters();
            updateStatsCounts();
        } else {
            console.error('API Error:', result.message);
        }
    } catch (error) {
        console.error('Error fetching release notes:', error);
        alert('Could not update release notes. Displaying cached version if available.');
    } finally {
        showLoading(false);
        // Remove spinning animation with delay for visual feedback
        setTimeout(() => {
            if (refreshIcon) refreshIcon.classList.remove('spinning');
            btnRefresh.disabled = false;
        }, 600);
    }
}

// Handle loading state display
function showLoading(isLoading) {
    if (isLoading) {
        feedContainer.classList.add('hidden');
        feedEmpty.classList.add('hidden');
        feedLoading.classList.remove('hidden');
    } else {
        feedLoading.classList.add('hidden');
        feedContainer.classList.remove('hidden');
    }
}

// Update UI Badge Counts
function updateStatsCounts() {
    totalCountEl.textContent = releaseNotes.length;
    
    const categories = ['Feature', 'Announcement', 'Change', 'Breaking', 'Issue'];
    
    // Reset all badge counters
    document.getElementById('count-all').textContent = releaseNotes.length;
    categories.forEach(cat => {
        const count = releaseNotes.filter(note => note.category.toLowerCase() === cat.toLowerCase()).length;
        const el = document.getElementById(`count-${cat.toLowerCase()}`);
        if (el) el.textContent = count;
    });
}

// Filter and search handling
function applyFilters() {
    filteredNotes = releaseNotes.filter(note => {
        const matchesCategory = currentCategory === 'all' || note.category.toLowerCase() === currentCategory.toLowerCase();
        
        const matchesSearch = searchQuery === '' || 
            note.date.toLowerCase().includes(searchQuery) ||
            note.category.toLowerCase().includes(searchQuery) ||
            note.content_text.toLowerCase().includes(searchQuery);
            
        return matchesCategory && matchesSearch;
    });

    renderFeed();
}

// Render cards to Grid
function renderFeed() {
    feedContainer.innerHTML = '';

    if (filteredNotes.length === 0) {
        feedEmpty.classList.remove('hidden');
        return;
    }

    feedEmpty.classList.add('hidden');

    filteredNotes.forEach(note => {
        const card = document.createElement('div');
        card.className = 'release-card card';
        
        const categoryClass = note.category.toLowerCase();
        
        card.innerHTML = `
            <div class="release-card-header">
                <span class="date-badge">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    ${note.date}
                </span>
                <span class="category-badge ${categoryClass}">${note.category}</span>
            </div>
            
            <div class="release-card-body">
                ${note.content_html}
            </div>
            
            <div class="release-card-footer">
                <a href="${note.link}" target="_blank" class="link-original">
                    <span>Original Source</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                </a>
                <button class="btn-tweet-card" data-id="${note.id}">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    Tweet
                </button>
            </div>
        `;
        
        // Add tweet click handler
        const btnTweet = card.querySelector('.btn-tweet-card');
        btnTweet.addEventListener('click', () => openComposer(note));
        
        feedContainer.appendChild(card);
    });
}

// Open Tweet Composer Modal
function openComposer(note) {
    selectedNote = note;
    
    // Set preview details
    previewBadgeCat.className = `preview-badge category-badge ${note.category.toLowerCase()}`;
    previewBadgeCat.textContent = note.category;
    previewBadgeDate.textContent = note.date;
    previewOriginalText.textContent = note.content_text;

    // Compose default tweet text
    // E.g. "BigQuery Feature (June 17, 2026): Autonomous embedding generation is GA... Learn more: URL"
    let defaultText = `🚀 BigQuery ${note.category} (${note.date}): `;
    
    // Clean text size
    let contentLimit = 280 - defaultText.length - 30; // Leave buffer for links & hashtags
    let cleanText = note.content_text.trim();
    
    if (cleanText.length > contentLimit) {
        cleanText = cleanText.substring(0, contentLimit - 3) + '...';
    }
    
    defaultText += `${cleanText}\n\nLink: ${note.link} #BigQuery #GoogleCloud`;
    
    tweetTextarea.value = defaultText;
    updateCharCounter();
    
    // Show Modal
    tweetModal.classList.add('active');
}

// Close Composer
function closeComposer() {
    tweetModal.classList.remove('active');
    selectedNote = null;
}

// Update Character Counter display
function updateCharCounter() {
    const textLength = tweetTextarea.value.length;
    const remaining = 280 - textLength;
    charCountText.textContent = remaining;
    
    if (remaining < 0) {
        charCountText.style.color = '#ef4444'; // Red if exceeded
        btnTweetAction.style.pointerEvents = 'none';
        btnTweetAction.style.opacity = '0.5';
    } else if (remaining <= 40) {
        charCountText.style.color = '#f59e0b'; // Amber if close
        btnTweetAction.style.pointerEvents = 'auto';
        btnTweetAction.style.opacity = '1';
    } else {
        charCountText.style.color = 'var(--text-muted)';
        btnTweetAction.style.pointerEvents = 'auto';
        btnTweetAction.style.opacity = '1';
    }

    // Update Progress Circle ring
    if (circle) {
        const percent = Math.min(100, (textLength / 280) * 100);
        const offset = circumference - (percent / 100) * circumference;
        circle.style.strokeDashoffset = offset;
        
        // Change color based on fullness
        if (remaining < 0) {
            circle.style.stroke = '#ef4444';
        } else if (remaining <= 40) {
            circle.style.stroke = '#f59e0b';
        } else {
            circle.style.stroke = 'var(--primary)';
        }
    }

    // Set Twitter web intent URL
    const encodedText = encodeURIComponent(tweetTextarea.value);
    btnTweetAction.href = `https://twitter.com/intent/tweet?text=${encodedText}`;
}

// Shorten Tweet Logic
function shortenTweetText() {
    if (!selectedNote) return;
    
    const note = selectedNote;
    
    // Try to isolate the first sentence or make it extremely brief
    let sentences = note.content_text.split(/[.!?]+/);
    let summarySentence = sentences[0].trim();
    
    // If first sentence is super short, add the second
    if (summarySentence.length < 50 && sentences.length > 1 && sentences[1].trim().length > 0) {
        summarySentence += `. ${sentences[1].trim()}`;
    }
    
    let shortTweet = `⚡ BigQuery ${note.category}: ${summarySentence}`;
    const baseLength = shortTweet.length;
    const linkHashtags = `\n\nLink: ${note.link} #BigQuery #Cloud`;
    
    // If still too long, truncate the text part
    if (baseLength + linkHashtags.length > 280) {
        const allowedLength = 280 - linkHashtags.length - 3; // buffer for ellipsis
        shortTweet = shortTweet.substring(0, allowedLength) + '...';
    }
    
    shortTweet += linkHashtags;
    
    tweetTextarea.value = shortTweet;
    updateCharCounter();
}
