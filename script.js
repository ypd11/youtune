// --- CONFIG ---
const DEFAULT_API = "https://de1.api.radio-browser.info";
const storedApi = localStorage.getItem('yt_api_server');
const API_BASE_HOST = storedApi || DEFAULT_API;
const API_BASE = `${API_BASE_HOST}/json/stations`;
const ITUNES_API = "https://itunes.apple.com/search";
const PLACEHOLDER_IMG = "placeholder.png";
const PLACEHOLDER_IMG_LARGE = "placeholder.png";
const CORS_PROXY = "https://youtune.exeinn-info.workers.dev";
const USE_CORS_PROXY = true; // Set to false to disable proxy
const SUPABASE_URL = "https://ojmwufjrxgxegxfewfql.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qbXd1ZmpyeGd4ZWd4ZmV3ZnFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNjg4ODUsImV4cCI6MjA4NDk0NDg4NX0.sJ-FGTBDX070EjLmvFvwJF2tyihEUs4Ltfw7PNrAWFo";

// --- STATE ---
let audio = document.getElementById('audio-core');
let favorites = JSON.parse(localStorage.getItem('yt_favs')) || [];
let searchHistory = JSON.parse(localStorage.getItem('yt_search_history')) || [];
let recentStations = JSON.parse(localStorage.getItem('yt_recent')) || [];
let httpsOnly = localStorage.getItem('yt_https_only') !== 'false';
let minBitrate = parseInt(localStorage.getItem('yt_min_bitrate')) || 0;
let autoPlay = localStorage.getItem('yt_auto_play') === 'true';
let currentVolume = parseFloat(localStorage.getItem('yt_volume')) || 1;
let isMuted = false;

let currentStation = null;
let isPlaying = false;
let currentOffset = 0;
let currentMode = 'trending'; // 'trending', 'search', 'country', 'favorites'
let currentQuery = '';
let currentPage = 1;
let hasNextPage = false;
let countryCode = null;
let nowPlayingTitle = "";
let chatChannel = null;
let myNickname = localStorage.getItem('yt_nickname') || `Guest_${Math.floor(Math.random() * 9000) + 1000}`;
let myUserId = localStorage.getItem('yt_user_id') || generateUUID();
let blockedUsers = JSON.parse(localStorage.getItem('yt_blocked_users')) || {}; // { id: name }
let socialLoaded = false;
let confirmActionCallback = null;

// Chat Options State
let selectedChatUser = null;
let selectedChatUserId = null;
let selectedChatText = null;
let replyContext = null; // { user, text }

// Metadata polling
let metadataInterval = null;
let lastMetadataTitle = "";

// Sleep Timer
let sleepTimer = null;
let sleepMinutes = 0;
let homeCache = null;
let lastViewId = 'view-list';

// Visualizer
let audioContext = null;
let analyser = null;
let dataArray = null;
let visualizerSource = null;

// Recording
let mediaRecorder = null;
let recordedChunks = [];


// --- INIT ---
window.onload = () => {
    initContentProtection();
    initOnlineCount();
    initHttpsToggle();
    initChatHistory();
    initAboutYear();
    renderSearchHistory();
    renderRecentStations();
    initVolume();
    favorites = favorites.filter(s => s && s.url_resolved);

    // Ensure ID is saved
    if (!localStorage.getItem('yt_user_id')) localStorage.setItem('yt_user_id', myUserId);

    requestCountryAtStartup();
    loadTrending();

    // Auto-play logic
    if (autoPlay && recentStations.length > 0) {
        playStation(recentStations[0]);
    }

    document.getElementById('search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = e.target.value.trim();
            if (!query) return;
            searchStations(query);
            hideSidebarOnMobile();
        }
    });

    audio.addEventListener('play', () => {
        isPlaying = true;
        updatePlayIcons();
        // Start metadata polling
        if (metadataInterval) clearInterval(metadataInterval);
        metadataInterval = setInterval(fetchMetadata, 5000);

        // Init Visualizer (requires user interaction first)
        if (!audioContext) setupVisualizer();
        if (audioContext && audioContext.state === 'suspended') audioContext.resume();
    });
    audio.addEventListener('pause', () => {
        isPlaying = false;
        updatePlayIcons();
        // Stop metadata polling
        if (metadataInterval) {
            clearInterval(metadataInterval);
            metadataInterval = null;
        }
    });

    audio.onerror = () => {
        document.getElementById('player-artist').innerText = "Stream offline or blocked";
        document.getElementById('np-artist').innerText = "Stream offline or blocked";
        isPlaying = false;
        updatePlayIcons();
        // Stop metadata polling
        if (metadataInterval) {
            clearInterval(metadataInterval);
            metadataInterval = null;
        }
    };

    registerServiceWorker();

    // Close art menu when clicking outside
    document.addEventListener('click', (e) => {
        const menu = document.getElementById('art-menu');
        if (menu && !menu.classList.contains('hidden') && !e.target.closest('#art-menu') && !e.target.closest('.art-action-btn')) {
            menu.classList.add('hidden');
        }
        
        const sleepMenu = document.getElementById('sleep-menu');
        if (sleepMenu && !sleepMenu.classList.contains('hidden') && !e.target.closest('#sleep-menu') && !e.target.closest('.art-action-btn')) {
            sleepMenu.classList.add('hidden');
        }
    });

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        // Ignore if typing in an input field
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        switch(e.code) {
            case 'Space':
                e.preventDefault(); // Prevent scrolling
                togglePlay();
                break;
            case 'KeyM':
                toggleMute();
                break;
            case 'KeyF':
                toggleFavoriteCurrent();
                break;
            case 'Escape':
                // Close overlays in priority order
                if (!document.getElementById('station-modal').classList.contains('hidden')) closeStationModal();
                else if (!document.getElementById('chat-settings-modal').classList.contains('hidden')) closeChatSettingsModal();
                else if (document.body.classList.contains('zen-mode')) toggleZenMode();
                else if (!document.getElementById('view-list').classList.contains('active-view')) showListView();
                break;
            case 'ArrowUp':
                e.preventDefault();
                setVolume(Math.min(currentVolume + 0.1, 1));
                break;
            case 'ArrowDown':
                e.preventDefault();
                setVolume(Math.max(currentVolume - 0.1, 0));
                break;
        }
    });

    // Scroll to Top Logic
    const mainContent = document.getElementById('main-content');
    const scrollBtn = document.getElementById('scroll-top-btn');
    mainContent.addEventListener('scroll', () => {
        if (mainContent.scrollTop > 300) {
            scrollBtn.classList.add('visible');
        } else {
            scrollBtn.classList.remove('visible');
        }
    });
};

// --- PWA SW REGISTER ---
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(() => {});
    }
}

// --- HTTPS TOGGLE ---
function initHttpsToggle() {
    const toggle = document.getElementById('https-toggle');
    toggle.checked = httpsOnly;
    toggle.addEventListener('change', () => {
        httpsOnly = toggle.checked;
        localStorage.setItem('yt_https_only', httpsOnly ? 'true' : 'false');
        homeCache = null;
        
        const isSettings = document.getElementById('view-settings').classList.contains('active-view');

        if (currentMode === 'trending') loadTrending(isSettings);
        else if (currentMode === 'country') loadCountryStations(true, isSettings);
        else if (currentMode === 'social') loadSocial();
        else if (currentMode === 'favorites') loadFavorites(isSettings);
        else if (currentMode === 'search') searchStations(currentQuery, true, isSettings);
    });
}

// --- ABOUT ---
function initAboutYear() {
    const yearSpan = document.getElementById('about-year');
    if (yearSpan) {
        yearSpan.innerText = new Date().getFullYear();
    }
}

// --- NAV ACTIVE STATE ---
function setActiveNav(key) {
    const items = document.querySelectorAll('.nav-item');
    items.forEach(i => i.classList.remove('active'));

    if (key === 'trending') document.getElementById('nav-trending').classList.add('active');
    else if (key === 'favorites') document.getElementById('nav-favorites').classList.add('active'); 
    else if (key === 'chat') document.getElementById('nav-chat').classList.add('active');
    else if (key === 'social') document.getElementById('nav-social').classList.add('active');

    else if (key === 'about') document.getElementById('nav-about').classList.add('active');
    else if (key === 'settings') document.getElementById('nav-settings').classList.add('active');
    else if (key === 'country') document.getElementById('nav-country').classList.add('active');
}

// --- SEARCH HISTORY ---
function renderSearchHistory() {
    const container = document.getElementById('search-history');
    if (!container) return;
    container.innerHTML = '';

    if (searchHistory.length === 0) {
        container.innerHTML = '<div style="padding:0 10px; font-size:0.8rem; color:rgba(255,255,255,0.4);">No search history</div>';
        return;
    }

    searchHistory.slice().reverse().forEach(query => {
        const btn = document.createElement('button');
        btn.className = 'history-item';
        btn.innerText = query;
        btn.title = query;
        btn.onclick = () => {
            document.getElementById('search-input').value = query;
            searchStations(query);
            hideSidebarOnMobile();
        };
        container.appendChild(btn);
    });
}

function addSearchHistory(query) {
    const trimmed = query.trim();
    if (!trimmed) return;
    const existingIndex = searchHistory.findIndex(h => h.toLowerCase() === trimmed.toLowerCase());
    if (existingIndex !== -1) {
        searchHistory.splice(existingIndex, 1);
    }
    searchHistory.push(trimmed);
    if (searchHistory.length > 50) searchHistory.shift();
    localStorage.setItem('yt_search_history', JSON.stringify(searchHistory));
    renderSearchHistory();
}

function clearSearchHistory() {
    searchHistory = [];
    localStorage.removeItem('yt_search_history');
    renderSearchHistory();
}

// --- RECENTLY PLAYED ---
function renderRecentStations() {
    const container = document.getElementById('recent-stations');
    if (!container) return;
    container.innerHTML = '';

    if (recentStations.length === 0) {
        container.innerHTML = '<div style="padding:0 10px; font-size:0.8rem; color:rgba(255,255,255,0.4);">No recent stations</div>';
        return;
    }

    recentStations.forEach(station => {
        const btn = document.createElement('button');
        btn.className = 'nav-item';
        btn.innerHTML = `<span class="material-icons" style="font-size:1rem; opacity:0.7; flex-shrink: 0;">history</span> <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0;">${escapeHtml(station.name)}</span>`;
        btn.title = station.name;
        btn.onclick = () => playStation(station);
        container.appendChild(btn);
    });
}

function addToRecent(station) {
    // Remove if already exists to move it to top
    recentStations = recentStations.filter(s => s.stationuuid !== station.stationuuid);
    // Add to front
    recentStations.unshift(station);
    // Keep last 5
    if (recentStations.length > 5) recentStations.pop();
    localStorage.setItem('yt_recent', JSON.stringify(recentStations));
    renderRecentStations();
}

function clearRecentStations() {
    recentStations = [];
    localStorage.removeItem('yt_recent');
    renderRecentStations();
}

// --- PAGINATION ---
const LIMIT = 40;

function resetList() {
    currentOffset = 0;
    currentPage = 1;
    hasNextPage = false;
    document.getElementById('channel-grid').innerHTML = '';
    document.getElementById('empty-state').classList.add('hidden');
    updatePaginationUI(false);
}

function updatePaginationUI(hasContent) {
    const pag = document.getElementById('pagination');
    const prevBtn = document.getElementById('page-prev');
    const nextBtn = document.getElementById('page-next');
    const info = document.getElementById('page-info');

    if (!hasContent) {
        pag.classList.add('hidden');
        return;
    }

    pag.classList.remove('hidden');
    info.innerText = `Page ${currentPage}`;
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = !hasNextPage;
}

function changePage(direction) {
    if (direction === -1 && currentPage <= 1) return;
    if (direction === 1 && !hasNextPage) return;

    currentPage += direction;
    currentOffset = (currentPage - 1) * LIMIT;
    document.getElementById('channel-grid').innerHTML = '';

    if (currentMode === 'search') {
        searchStations(currentQuery, false);
    } else if (currentMode === 'favorites') {
        renderFavoritesPage();
    } else if (currentMode === 'country') {
        loadCountryStations(false);
    } else if (currentMode === 'country_filter') {
        const url = `${API_BASE}/bycountrycodeexact/${currentQuery}?limit=${LIMIT}&offset=${currentOffset}&hidebroken=true&order=clickcount&reverse=true${buildHttpsParam()}`;
        fetchData(url);
    } else {
        loadTrending(false);
    }
}

// --- COUNTRY DETECTION ---
function requestCountryAtStartup() {
    if (!navigator.geolocation) return;
    if (!window.isSecureContext) return; // Prevent error on non-HTTPS
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            detectCountryFromCoords(lat, lon);
        },
        () => {}
    );
}

async function detectCountryFromCoords(lat, lon) {
    try {
        // Use reverse geocoding API to get country code
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (data && data.address && data.address.country_code) {
            countryCode = data.address.country_code.toUpperCase();
            console.log('Detected country code:', countryCode);
        }
    } catch (e) {
        console.error('Error detecting country:', e);
    }
}

// --- DATA LOGIC ---
function buildHttpsParam() {
    return httpsOnly ? '&is_https=true' : '';
}

async function loadTrending(stayInView = false) {
    currentMode = 'trending';
    currentQuery = '';
    if (!stayInView) {
        setActiveNav('trending');
        showListView();
    }
    document.getElementById('section-title').innerText = "Home";
    document.getElementById('back-home-btn').classList.add('hidden');
    
    // Switch to Dashboard Mode
    document.getElementById('channel-grid').innerHTML = '';
    document.getElementById('channel-grid').classList.add('hidden');
    document.getElementById('pagination').classList.add('hidden');
    document.getElementById('empty-state').classList.add('hidden');
    
    const dash = document.getElementById('dashboard-container');
    dash.classList.remove('hidden');

    if (homeCache) {
        renderDashboard(homeCache);
        return;
    }
    dash.innerHTML = '<div class="loader"></div>';

    try {
        // 1. Fetch Top Voted
        const votedUrl = `${API_BASE}/topvote?limit=20&hidebroken=true${buildHttpsParam()}`;
        const votedRes = await fetch(votedUrl);
        const votedData = await votedRes.json();

        // 2. Fetch Trending (Clicks)
        const clickUrl = `${API_BASE}/topclick?limit=12&hidebroken=true${buildHttpsParam()}`;
        const clickRes = await fetch(clickUrl);
        const clickData = await clickRes.json();

        homeCache = { voted: votedData, clicked: clickData };
        renderDashboard(homeCache);

    } catch (e) {
        console.error(e);
        dash.innerHTML = '<div style="padding:20px; color:#ccc;">Error loading dashboard.</div>';
    }
}

function renderDashboard(data) {
    const dash = document.getElementById('dashboard-container');
    dash.innerHTML = '';

    // Section: Top Voted
    createDashboardSection(dash, 'Top Voted Stations', 'thumb_up', data.voted, true);

    // Section: Genres
    const genres = [
        'Pop', 'Rock', 'Jazz', 'Classical', 'Electronic', 'News', 'Talk', 'Hip Hop', 'Chill', 'Ambient', 'Lounge',
        'Country', 'Blues', 'Folk', 'Latin', 'Metal', 'Reggae', 'Soul', 'Indie', 'Disco', 'House', 'Techno',
        '80s', '90s', 'Oldies', 'R&B', 'Dance', 'Alternative', 'Instrumental', 'Rap', 'Funk', 'Ska', 'Punk'
    ];
    createChipSection(dash, 'Browse by Genre', 'category', genres, (g) => searchStationsByTag(g), true);

    // Section: Countries
    const countries = [
        {code:'US', name:'USA'}, {code:'DE', name:'Germany'}, {code:'FR', name:'France'}, 
        {code:'GB', name:'UK'}, {code:'ES', name:'Spain'}, {code:'IT', name:'Italy'},
        {code:'CA', name:'Canada'}, {code:'BR', name:'Brazil'}, {code:'JP', name:'Japan'},
        {code:'RU', name:'Russia'}, {code:'MX', name:'Mexico'}, {code:'AR', name:'Argentina'},
        {code:'AU', name:'Australia'}, {code:'IN', name:'India'}, {code:'CN', name:'China'},
        {code:'NL', name:'Netherlands'}, {code:'PL', name:'Poland'}, {code:'GR', name:'Greece'},
        {code:'TR', name:'Turkey'}, {code:'SE', name:'Sweden'}, {code:'NO', name:'Norway'},
        {code:'FI', name:'Finland'}, {code:'DK', name:'Denmark'}, {code:'BE', name:'Belgium'},
        {code:'CH', name:'Switzerland'}, {code:'AT', name:'Austria'}, {code:'PT', name:'Portugal'},
        {code:'CZ', name:'Czechia'}, {code:'KR', name:'South Korea'}, {code:'ID', name:'Indonesia'},
        {code:'ZA', name:'South Africa'}, {code:'NG', name:'Nigeria'}, {code:'EG', name:'Egypt'}
    ];
    createChipSection(dash, 'Browse by Country', 'public', countries, (c) => loadStationsByCountryCode(c.code, c.name), true);

    // Section: Trending
    createDashboardSection(dash, 'Most Popular', 'trending_up', data.clicked);
}

function createDashboardSection(container, title, icon, stations, isHorizontal = false) {
    const section = document.createElement('div');
    section.className = 'dash-section';
    section.innerHTML = `<div class="dash-header"><span class="material-icons">${icon}</span> ${title}</div>`;
    
    const grid = document.createElement('div');
    grid.className = isHorizontal ? 'horizontal-grid' : 'channel-grid';
    renderCards(stations, grid);
    
    section.appendChild(grid);
    container.appendChild(section);
}

function createChipSection(container, title, icon, items, callback, isHorizontal = false) {
    const section = document.createElement('div');
    section.className = 'dash-section';
    section.innerHTML = `<div class="dash-header"><span class="material-icons">${icon}</span> ${title}</div>`;
    
    const grid = document.createElement('div');
    grid.className = isHorizontal ? 'horizontal-chip-grid' : 'chip-grid';
    
    items.forEach(item => {
        const label = item.name || item;
        const chip = document.createElement('div');
        chip.className = 'chip';
        chip.innerText = label;
        chip.onclick = () => callback(item);
        grid.appendChild(chip);
    });

    section.appendChild(grid);
    container.appendChild(section);
}

function loadStationsByCountryCode(code, name) {
    resetList();
    currentMode = 'country_filter';
    currentQuery = code; // Store code for pagination
    document.getElementById('section-title').innerText = `Stations in ${name}`;
    document.getElementById('back-home-btn').classList.remove('hidden');
    showListView(); // FIX: Ensure we switch from dashboard to grid view
    const url = `${API_BASE}/bycountrycodeexact/${code}?limit=${LIMIT}&offset=0&hidebroken=true&order=clickcount&reverse=true${buildHttpsParam()}`;
    fetchData(url);
}

function loadCountryStations(reset = true, stayInView = false) {
    currentMode = 'country';
    currentQuery = '';
    if (!stayInView) {
        setActiveNav('country');
        showListView();
    }
    document.getElementById('section-title').innerText = "Local Stations";
    document.getElementById('back-home-btn').classList.add('hidden');

    if (!countryCode) {
        if (reset) {
            resetList();
            const empty = document.getElementById('empty-state');
            empty.classList.remove('hidden');
            empty.innerText = "We couldn't detect your country yet. Please allow location access.";
            updatePaginationUI(false);
        }
        return;
    }

    if (reset) resetList();

    const url = `${API_BASE}/bycountrycodeexact/${encodeURIComponent(countryCode)}?limit=${LIMIT}&offset=${currentOffset}&hidebroken=true&order=clickcount&reverse=true${buildHttpsParam()}`;
    fetchData(url, false, true);
}

async function searchStations(query, reset = true, stayInView = false) {
    if (!query) return;
    if (reset) resetList();
    currentMode = 'search';
    currentQuery = query;
    if (!stayInView) {
        setActiveNav(null);
        showListView();
    }

    // Hide mobile keyboard after search
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.blur();

    document.getElementById('section-title').innerText = `Search: "${query}"`;
    document.getElementById('back-home-btn').classList.remove('hidden');
    const url = `${API_BASE}/search?name=${encodeURIComponent(query)}&limit=${LIMIT}&offset=${currentOffset}&hidebroken=true&order=clickcount&reverse=true${buildHttpsParam()}`;

    if (reset) addSearchHistory(query);
    fetchData(url, true);
}

async function searchStationsByTag(tag) {
    if (!tag) return;
    resetList();
    currentMode = 'search';
    currentQuery = tag;
    setActiveNav(null);
    showListView();

    document.getElementById('section-title').innerText = `Genre: ${tag}`;
    document.getElementById('back-home-btn').classList.remove('hidden');
    
    const url = `${API_BASE}/search?tag=${encodeURIComponent(tag.toLowerCase())}&limit=${LIMIT}&offset=0&hidebroken=true&order=clickcount&reverse=true${buildHttpsParam()}`;
    fetchData(url, true);
}

function loadSocial() {
    currentMode = 'social';
    currentQuery = '';
    setActiveNav('social');
    setActiveView('view-social');

    if (!socialLoaded) {
        document.getElementById('social-frame').src = "social/index.html";
        socialLoaded = true;
    }
}

function loadFavorites(stayInView = false) {
    currentMode = 'favorites';
    currentQuery = '';
    currentOffset = 0;
    currentPage = 1;
    if (!stayInView) {
        setActiveNav('favorites');
        showListView();
    }
    document.getElementById('section-title').innerText = "My Favorites";
    document.getElementById('back-home-btn').classList.remove('hidden');
    document.getElementById('channel-grid').innerHTML = '';
    document.getElementById('empty-state').classList.add('hidden');
    hasNextPage = false;

    if (favorites.length === 0) {
        document.getElementById('empty-state').classList.remove('hidden');
        document.getElementById('empty-state').innerText = "You haven't added any favorites yet.";
        updatePaginationUI(false);
    } else {
        renderFavoritesPage();
    }
}

function renderFavoritesPage() {
    const grid = document.getElementById('channel-grid');
    grid.innerHTML = '';

    let favs = favorites.slice();
    if (httpsOnly) {
        favs = favs.filter(s => s.url_resolved && s.url_resolved.startsWith('https://'));
    }

    const start = (currentPage - 1) * LIMIT;
    const slice = favs.slice(start, start + LIMIT);
    renderCards(slice);

    hasNextPage = favs.length > start + LIMIT;
    updatePaginationUI(slice.length > 0);
}

async function fetchData(url, isSearch = false, isCountry = false) {
    setLoading(true);
    try {
        const res = await fetch(url);
        const data = await res.json();

        let stations = data || [];
        if (httpsOnly) {
            stations = stations.filter(s => s.url_resolved && s.url_resolved.startsWith('https://'));
        } else {
            stations = stations.filter(s => s.url_resolved);
        }

        if (minBitrate > 0) {
            stations = stations.filter(s => (s.bitrate || 0) >= minBitrate);
        }

        if (stations.length === 0 && currentOffset === 0) {
            const empty = document.getElementById('empty-state');
            empty.classList.remove('hidden');
            empty.innerText = isSearch
                ? "No stations found for this search. Try a broader term."
                : "No stations found.";
            hasNextPage = false;
            updatePaginationUI(false);
        } else {
            renderCards(stations);
            hasNextPage = data.length === LIMIT;
            updatePaginationUI(stations.length > 0);
        }
    } catch (e) {
        console.error(e);
        const empty = document.getElementById('empty-state');
        empty.classList.remove('hidden');
        empty.innerText = "Error loading stations.";
        hasNextPage = false;
        updatePaginationUI(false);
    }
    setLoading(false);
}

// --- RENDER UI ---
function renderCards(stations, container = document.getElementById('channel-grid')) {
    // If using default container, ensure it's cleared if needed (handled by resetList usually)
    // But for dashboard, we append to the specific grid passed in.

    stations.forEach(station => {
        const card = document.createElement('div');
        card.className = 'card';

        const img = station.favicon || PLACEHOLDER_IMG;
        const tags = station.tags || 'Music';
        const safeName = station.name || 'Unknown station';
        const votes = formatNumber(station.votes || 0);

        card.innerHTML = `
            <div class="card-img-wrap">
                <img src="${img}" class="card-img" onerror="this.src='${PLACEHOLDER_IMG}'">
            </div>
            <div class="card-title" title="${safeName}">${safeName}</div>
            <div class="card-subtitle">${station.bitrate || 0} kbps • ${tags}</div>
            <div class="card-votes">${votes} likes</div>
            <div class="card-actions">
                <div class="card-actions-left">
                    <button class="card-icon-btn" title="Play" onclick="playStationFromCard(event, '${station.stationuuid}')">
                        <span class="material-icons">play_arrow</span>
                    </button>
                    <button class="card-icon-btn" title="Info" onclick="openStationModalFromCard(event, '${station.stationuuid}')">
                        <span class="material-icons">info</span>
                    </button>
                    <button class="card-icon-btn" title="Vote" onclick="voteForStation(event, '${station.stationuuid}')">
                        <span class="material-icons" style="font-size:1.1rem;">thumb_up</span>
                    </button>
                </div>
                <div class="card-actions-right">
                    <button class="card-icon-btn" title="Open station website" onclick="openStationUrlFromCard(event, '${station.stationuuid}')">
                        <span class="material-icons">open_in_new</span>
                    </button>
                </div>
            </div>
        `;

        card.dataset.station = JSON.stringify(station);
        card.onclick = () => playStation(station);
        container.appendChild(card);
    });
}

function findStationByUuid(uuid) {
    const cards = document.querySelectorAll('.card');
    for (const card of cards) {
        const data = card.dataset.station;
        if (!data) continue;
        try {
            const st = JSON.parse(data);
            if (st.stationuuid === uuid) return st;
        } catch (_) {}
    }
    return null;
}

function playStationFromCard(e, uuid) {
    e.stopPropagation();
    const st = findStationByUuid(uuid);
    if (st) playStation(st);
}

function openStationModalFromCard(e, uuid) {
    e.stopPropagation();
    const st = findStationByUuid(uuid);
    if (st) openStationModal(st);
}

function openStationUrlFromCard(e, uuid) {
    e.stopPropagation();
    const st = findStationByUuid(uuid);
    if (st) openStationUrl(st);
}

async function voteForStation(e, uuid) {
    e.stopPropagation();
    
    // Check local storage limit (1 vote per station per 24h)
    const lastVote = localStorage.getItem(`yt_vote_${uuid}`);
    const now = Date.now();
    if (lastVote && (now - parseInt(lastVote)) < 24 * 60 * 60 * 1000) {
        showToast("You already voted for this station today.");
        return;
    }

    try {
        // API_BASE is .../json/stations. We need .../json/vote/{uuid}
        const voteUrl = API_BASE.replace('/stations', `/vote/${uuid}`);
        await fetch(voteUrl);
        
        localStorage.setItem(`yt_vote_${uuid}`, now.toString());
        showToast("Vote submitted! Thanks for contributing.");
    } catch (err) {
        showToast("Error submitting vote.");
    }
}

function setLoading(show) {
    const loader = document.getElementById('loader');
    if (show) loader.classList.remove('hidden');
    else loader.classList.add('hidden');
}

// --- PLAYER ---
function playStation(station) {
    currentStation = station;
    nowPlayingTitle = "";
    lastMetadataTitle = ""; // Reset for new station

    const name = station.name || 'Unknown station';

    const pTitle = document.getElementById('player-title');
    pTitle.innerText = name;
    pTitle.title = name;
    document.getElementById('player-artist').innerText = "Buffering...";
    document.getElementById('player-art').src = station.favicon || PLACEHOLDER_IMG;

    document.getElementById('np-art').src = station.favicon || PLACEHOLDER_IMG_LARGE;
    document.getElementById('np-title').innerText = name;
    document.getElementById('np-artist').innerText = "Buffering...";
    document.getElementById('np-country').innerText = station.country || "";

    updateHeartIcons();
    addToRecent(station);

    // Use CORS proxy if enabled
    let streamUrl = station.url_resolved;
    if (USE_CORS_PROXY && CORS_PROXY) {
        streamUrl = `${CORS_PROXY}?url=${encodeURIComponent(station.url_resolved)}`;
    }

    audio.src = streamUrl;
    audio.volume = isMuted ? 0 : currentVolume;
    audio.play().then(() => {
        document.getElementById('player-artist').innerText = "Live stream";
        document.getElementById('np-artist').innerText = "Live stream";
        fetchMetadata(); // Fetch metadata immediately on play
    }).catch(e => {
        console.error(e);
        if (e.name === 'NotAllowedError') {
            document.getElementById('player-artist').innerText = "Click Play to start";
            document.getElementById('np-artist').innerText = "Click Play to start";
            isPlaying = false;
            updatePlayIcons();
        } else {
            document.getElementById('player-artist').innerText = "Stream offline or blocked";
            document.getElementById('np-artist').innerText = "Stream offline or blocked";
        }
    });
}

function togglePlay() {
    if (!currentStation) return;
    if (audio.paused) {
        audio.play().catch(() => {});
        document.getElementById('player-artist').innerText = "Buffering...";
        document.getElementById('np-artist').innerText = "Buffering...";

        audio.play().then(() => {
            if (nowPlayingTitle) {
                document.getElementById('player-artist').innerText = nowPlayingTitle;
                document.getElementById('np-artist').innerText = nowPlayingTitle;
            } else {
                document.getElementById('player-artist').innerText = "Live stream";
                document.getElementById('np-artist').innerText = "Live stream";
            }
            fetchMetadata();
        }).catch(() => {
            document.getElementById('player-artist').innerText = "Stream offline";
            document.getElementById('np-artist').innerText = "Stream offline";
        });
    } else {
        audio.pause();
    }
}

function updatePlayIcons() {
    const icon = document.getElementById('play-icon');
    const value = isPlaying ? 'pause' : 'play_arrow';
    icon.innerText = value;
}

// --- VOLUME ---
function initVolume() {
    const slider = document.getElementById('volume-slider');
    if (slider) {
        slider.value = currentVolume;
        setVolume(currentVolume);
    }
}

function setVolume(val) {
    currentVolume = parseFloat(val);
    localStorage.setItem('yt_volume', currentVolume);
    
    if (!isMuted) {
        audio.volume = currentVolume;
    }
    
    // Update slider visual if changed via keys
    const slider = document.getElementById('volume-slider');
    if (slider) slider.value = currentVolume;
}

function toggleMute() {
    isMuted = !isMuted;
    audio.volume = isMuted ? 0 : currentVolume;
    
    const icon = document.querySelector('#mute-btn .material-icons');
    if (icon) icon.innerText = isMuted ? 'volume_off' : 'volume_up';
}

function updateHeartIcons() {
    if (!currentStation) return;
    const isFav = favorites.some(s => s.stationuuid === currentStation.stationuuid);
    const btn = document.getElementById('fav-icon');
    const iconName = isFav ? 'favorite' : 'favorite_border';
    const color = isFav ? '#f97316' : 'rgba(255,255,255,0.9)';
    btn.innerText = iconName;
    btn.style.color = color;
}

function toggleFavoriteCurrent() {
    if (!currentStation) return;
    if (!currentStation.url_resolved) return;

    const idx = favorites.findIndex(s => s.stationuuid === currentStation.stationuuid);
    if (idx > -1) favorites.splice(idx, 1);
    else favorites.push(currentStation);

    localStorage.setItem('yt_favs', JSON.stringify(favorites));
    updateHeartIcons();
}

// --- VIEWS (LIST / NOW PLAYING / ABOUT / CHAT) ---
function setActiveView(id) {
    const views = document.querySelectorAll('.view');
    views.forEach(v => v.classList.remove('active-view'));
    const view = document.getElementById(id);
    if (view) view.classList.add('active-view');

    const hero = document.getElementById('hero-text');
    if (id === 'view-list') hero.classList.remove('hidden');
    else hero.classList.add('hidden');
}

function showListView() {
    setActiveView('view-list');
    // Reset dashboard visibility if we are NOT in trending mode
    if (currentMode !== 'trending') {
        document.getElementById('dashboard-container').classList.add('hidden');
        document.getElementById('channel-grid').classList.remove('hidden');
    }
}

function showNowPlayingView() {
    if (!currentStation) return;
    setActiveView('view-nowplaying');
}

function showChatView() {
    recordLastView();
    setActiveNav('chat');
    setActiveView('view-chat');
}

function showAboutView() {
    recordLastView();
    setActiveNav('about');
    setActiveView('view-about');
}

function showSettingsView() {
    recordLastView();
    setActiveNav('settings');
    setActiveView('view-settings');

    // Populate values
    document.getElementById('server-select').value = API_BASE_HOST;
    document.getElementById('bitrate-select').value = minBitrate;
    document.getElementById('autoplay-toggle').checked = autoPlay;
}

function recordLastView() {
    const current = document.querySelector('.view.active-view');
    if (current) lastViewId = current.id;
}

function goBack() {
    const currentView = document.querySelector('.view.active-view');
    
    // Prevent getting stuck: if last view is same as current, go Home
    if (currentView && lastViewId === currentView.id) {
        loadTrending();
        return;
    }

    setActiveView(lastViewId);
    
    if (lastViewId === 'view-social') setActiveNav('social');
    else if (lastViewId === 'view-list') {
        if (currentMode === 'trending') setActiveNav('trending');
        else if (currentMode === 'favorites') setActiveNav('favorites');
        else if (currentMode === 'country') setActiveNav('country');
        else setActiveNav(null);
    }
}

// --- STATION URL / MODAL ---
function openStationUrl(station) {
    const url = station.homepage || station.url_resolved;
    if (!url) return;
    window.open(url, '_blank', 'noopener');
}

function openCurrentStationUrl() {
    if (!currentStation) return;
    openStationUrl(currentStation);
}

function openStationModal(station) {
    const modal = document.getElementById('station-modal');
    modal.classList.remove('hidden');

    document.getElementById('modal-art').src = station.favicon || PLACEHOLDER_IMG;
    document.getElementById('modal-title').innerText = station.name || 'Unknown station';

    document.getElementById('modal-country').innerText = station.country || 'Unknown';
    document.getElementById('modal-language').innerText = station.language || 'Unknown';
    document.getElementById('modal-bitrate').innerText = station.bitrate || 0;
    document.getElementById('modal-tags').innerText = station.tags || '—';

    const homepage = station.homepage || '#';
    const stream = station.url_resolved || '#';

    const homepageLink = document.getElementById('modal-homepage');
    const streamLink = document.getElementById('modal-stream');

    homepageLink.href = homepage;
    streamLink.href = stream;
}

function closeStationModal() {
    document.getElementById('station-modal').classList.add('hidden');
}

// --- ARTWORK (iTunes) ---
async function fetchArt(query) {
    let searchTerm = query.trim();
    
    const resetArt = () => {
        if (!currentStation) return;
        const def = currentStation.favicon || PLACEHOLDER_IMG;
        document.getElementById('player-art').src = def;
        document.getElementById('np-art').src = def;
    };

    if (searchTerm.length < 3) { resetArt(); return; }

    // If title contains " - ", treat as "Artist - Track" and combine for search
    if (searchTerm.includes(' - ')) {
        const parts = searchTerm.split(' - ');
        if (parts.length >= 2) {
            searchTerm = `${parts[0].trim()} ${parts[1].trim()}`;
        }
    }

    try {
        const res = await fetch(`${ITUNES_API}?term=${encodeURIComponent(searchTerm)}&media=music&entity=musicTrack&limit=1`);
        const data = await res.json();
        if (data.results && data.results.length > 0) {
            const track = data.results[0];
            const art = track.artworkUrl100.replace('100x100', '600x600');
            document.getElementById('player-art').src = art;
            document.getElementById('np-art').src = art;
        } else {
            resetArt();
        }
    } catch (e) {
        resetArt();
    }
}

// --- ARTWORK SEARCH MENU ---
function toggleArtMenu(e) {
    e.stopPropagation();
    const menu = document.getElementById('art-menu');
    document.getElementById('sleep-menu').classList.add('hidden');
    menu.classList.toggle('hidden');
}

function searchPlatform(platform) {
    // Prefer the specific song title, otherwise fallback to station name
    let query = nowPlayingTitle;
    
    // Filter out generic status messages
    if (!query || query === "Buffering..." || query === "Live stream" || query === "Stream offline or blocked") {
        query = currentStation ? currentStation.name : "";
    }

    if (!query) return;

    const q = encodeURIComponent(query);
    let url = "";

    switch(platform) {
        case 'spotify': url = `https://open.spotify.com/search/${q}`; break;
        case 'apple': url = `https://music.apple.com/us/search?term=${q}`; break;
        case 'youtube': url = `https://www.youtube.com/results?search_query=${q}`; break;
        case 'soundcloud': url = `https://soundcloud.com/search?q=${q}`; break;
    }

    if (url) window.open(url, '_blank');
    document.getElementById('art-menu').classList.add('hidden');
}

// --- SLEEP TIMER ---
function toggleSleepMenu(e) {
    e.stopPropagation();
    const menu = document.getElementById('sleep-menu');
    document.getElementById('art-menu').classList.add('hidden');
    menu.classList.toggle('hidden');
}

function setSleepTimer(minutes) {
    sleepMinutes = minutes;
    
    if (sleepTimer) {
        clearTimeout(sleepTimer);
        sleepTimer = null;
    }

    const btn = document.getElementById('sleep-timer-btn');
    const icon = btn.querySelector('.material-icons');

    if (minutes > 0) {
        btn.classList.add('sleep-active');
        btn.title = `Sleep Timer: ${minutes} min`;
        icon.innerText = 'timer';
        
        // Set new timer
        sleepTimer = setTimeout(() => {
            if (isPlaying) togglePlay();
            showToast("Sleep timer ended. Music stopped.");
            setSleepTimer(0); // Reset UI to off
        }, minutes * 60 * 1000);

    } else {
        btn.classList.remove('sleep-active');
        btn.title = "Sleep Timer: Off";
        icon.innerText = 'timer_off';
        if (minutes > 0) showToast(`Sleep timer set for ${minutes} minutes`);
        else if (sleepTimer === null && minutes === 0) showToast("Sleep timer turned off");
    }

    // Update Menu Selection UI
    document.querySelectorAll('.sleep-option').forEach(opt => {
        opt.classList.remove('selected');
        if (parseInt(opt.dataset.min) === minutes) {
            opt.classList.add('selected');
        }
    });

    document.getElementById('sleep-menu').classList.add('hidden');
}

// --- SHARE ---
async function shareStation() {
    if (!currentStation) return;
    const shareData = {
        title: 'YouTune Radio',
        text: `Listening to ${currentStation.name}: ${nowPlayingTitle}`,
        url: window.location.href
    };

    if (navigator.share) {
        try { await navigator.share(shareData); } catch (e) {}
    } else {
        // Fallback: Copy to clipboard
        const text = `${nowPlayingTitle} on ${currentStation.name} (https://youtuneradio.com)`;
        navigator.clipboard.writeText(text);
        showToast("Info copied to clipboard!");
    }
}

// --- SIDEBAR TOGGLE ---
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.querySelector('.sidebar-overlay').classList.toggle('active');
}
function hideSidebarOnMobile() {
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('open');
        document.querySelector('.sidebar-overlay').classList.remove('active');
    }
}

// --- ACCORDION ---
function toggleAccordion(id, header) {
    const content = document.getElementById(id);
    if (content) {
        content.classList.toggle('collapsed');
        header.classList.toggle('collapsed');
    }
}

// --- VISUALIZER ---
function setupVisualizer() {
    try {
        const Canvas = document.getElementById('visualizer');
        if (!Canvas) return;

        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        
        // Connect audio element to analyser
        visualizerSource = audioContext.createMediaElementSource(audio);
        visualizerSource.connect(analyser);
        analyser.connect(audioContext.destination);

        analyser.fftSize = 128; // Controls bar count (lower = chunkier bars)
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);

        drawVisualizer();
    } catch (e) {
        console.log("Visualizer setup failed (likely CORS or already connected):", e);
    }
}

function drawVisualizer() {
    const canvas = document.getElementById('visualizer');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    requestAnimationFrame(drawVisualizer);

    if (!analyser) return;
    analyser.getByteFrequencyData(dataArray);

    ctx.clearRect(0, 0, width, height);

    const barWidth = (width / dataArray.length) * 2.5;
    let barHeight;
    let x = 0;

    for (let i = 0; i < dataArray.length; i++) {
        barHeight = dataArray[i] / 1.5; // Scale down height

        // Gradient color (Orange to Transparent)
        const gradient = ctx.createLinearGradient(0, height - barHeight, 0, height);
        gradient.addColorStop(0, 'rgba(249, 115, 22, 0.9)'); // Accent color
        gradient.addColorStop(1, 'rgba(249, 115, 22, 0.1)');

        ctx.fillStyle = gradient;
        // Draw bars at the bottom
        ctx.fillRect(x, height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
    }
}

// --- RECORDING ---
function toggleRecording() {
    if (!isPlaying){
        showToast("Nothing is playing.");
        return;
    }
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        stopRecording();
    } else {
        startRecording();
    }
}

function startRecording() {
    if (!audioContext || !visualizerSource) {
        setupVisualizer(); // Try to init if not ready
        if (!audioContext) {
            showToast("Cannot record: Audio context not ready.");
            return;
        }
    }

    try {
        const dest = audioContext.createMediaStreamDestination();
        visualizerSource.connect(dest);
        
        mediaRecorder = new MediaRecorder(dest.stream);
        recordedChunks = [];
        
        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) recordedChunks.push(e.data);
        };
        
        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: 'audio/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `youtune-rec-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.webm`;
            a.click();
            showToast("Recording saved!");
            document.getElementById('record-btn').classList.remove('recording-active');
        };
        
        mediaRecorder.start();
        showToast("Recording started...");
        document.getElementById('record-btn').classList.add('recording-active');
    } catch (e) {
        console.error(e);
        showToast("Recording failed to start.");
    }
}

function stopRecording() {
    if (mediaRecorder) mediaRecorder.stop();
}

// --- DATA BACKUP ---
function exportData() {
    const data = {
        favorites: favorites,
        history: searchHistory,
        recent: recentStations,
        settings: { httpsOnly: httpsOnly, volume: currentVolume }
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `youtune-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    showToast("Backup file downloaded");
}

function importData(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            
            if (data.favorites) {
                favorites = data.favorites;
                localStorage.setItem('yt_favs', JSON.stringify(favorites));
            }
            if (data.history) {
                searchHistory = data.history;
                localStorage.setItem('yt_search_history', JSON.stringify(searchHistory));
            }
            if (data.recent) {
                recentStations = data.recent;
                localStorage.setItem('yt_recent', JSON.stringify(recentStations));
            }
            
            // Refresh UI
            renderSearchHistory();
            renderRecentStations();
            if (currentMode === 'favorites') loadFavorites();
            
            showToast("Data restored successfully!");
        } catch (err) {
            showToast("Error reading file");
            console.error(err);
        }
    };
    reader.readAsText(file);
    input.value = ''; // Reset input
}

// --- SETTINGS (Server Switch) ---
function saveSettings() {
    const val = document.getElementById('server-select').value;
    const bitrate = document.getElementById('bitrate-select').value;
    const ap = document.getElementById('autoplay-toggle').checked;

    localStorage.setItem('yt_api_server', val);
    localStorage.setItem('yt_min_bitrate', bitrate);
    localStorage.setItem('yt_auto_play', ap);

    location.reload(); // Reload to apply new server
}

function resetSettings() {
    if(confirm("Reset all settings to default? This will not delete your favorites.")) {
        localStorage.removeItem('yt_api_server');
        localStorage.removeItem('yt_min_bitrate');
        localStorage.removeItem('yt_auto_play');
        localStorage.removeItem('yt_https_only');
        location.reload();
    }
}

// --- ZEN MODE ---
function toggleZenMode() {
    document.body.classList.toggle('zen-mode');
    const btn = document.querySelector('#zen-btn .material-icons');
    if (document.body.classList.contains('zen-mode')) {
        btn.innerText = 'close_fullscreen';
    } else {
        btn.innerText = 'fullscreen';
    }
}

// --- SCROLL TO TOP ---
function scrollToTop() {
    document.getElementById('main-content').scrollTo({ top: 0, behavior: 'smooth' });
}

// --- TOAST NOTIFICATIONS ---
let toastTimeout;
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.innerText = message;
    toast.classList.remove('hidden');
    
    if (toastTimeout) clearTimeout(toastTimeout);
    
    toastTimeout = setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}





// --- UTILS ---
function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, s => {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
        return map[s];
    });
}

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num;
}

// --- METADATA ---
function fetchMetadata() {
    if (!currentStation || !isPlaying) return;
    const url = `${CORS_PROXY}?url=${encodeURIComponent(currentStation.url_resolved)}&metadata=true`;
    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error('Metadata fetch failed');
            return response.json();
        })
        .then(data => {
            if (data && data.title && typeof data.title === 'string' && data.title.trim() && !data.title.includes('{') && data.title !== lastMetadataTitle) {
                // Check for invalid metadata (URLs or generic messages)
                const t = data.title.trim();
                const isUrl = t.match(/https?:\/\//i);
                const isTracklist = t.toLowerCase().startsWith('tracklist:');
                if (isUrl || isTracklist) {
                    document.getElementById('player-artist').innerText = 'Live stream';
                    document.getElementById('np-artist').innerText = 'Live stream';
                    nowPlayingTitle = '';
                    lastMetadataTitle = t;
                } else {
                    lastMetadataTitle = t;
                    document.getElementById('player-artist').innerText = t;
                    document.getElementById('np-artist').innerText = t;
                    nowPlayingTitle = t;
                    fetchArt(t);
                }
            }
        })
        .catch(error => {
            // Only log errors occasionally to avoid spam
            if (Math.random() < 0.1) console.error('Error fetching metadata:', error);
        });
}

// --- CONTENT PROTECTION ---
function initContentProtection() {
    // Disable context menu (right-click)
    document.addEventListener('contextmenu', event => {
        const tag = event.target.tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA') event.preventDefault();
    });

    // Disable copy event (Ctrl+C or Menu)
    document.addEventListener('copy', event => {
        const tag = event.target.tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA') event.preventDefault();
    });
}

// Close emoji picker when clicking outside
document.addEventListener('click', (e) => {
    const picker = document.getElementById('emoji-picker');
    if (picker && !picker.classList.contains('hidden') && !e.target.closest('.emoji-picker') && !e.target.closest('.chat-input-area')) {
        picker.classList.add('hidden');
    }
});

// --- ONLINE COUNT (SUPABASE) ---
function initOnlineCount() {
    // 1. Create UI Elements
    const createBadge = (isMobile) => {
        const el = document.createElement('div');
        el.className = isMobile ? 'online-badge mobile-badge' : 'online-badge desktop-badge';
        el.innerHTML = '<span class="material-icons">person</span> <span class="online-count-num">1</span>';
        el.title = "Listeners online";
        return el;
    };

    // Desktop: Player Bar (Before Volume)
    const playerRight = document.querySelector('.player-right');
    const volumeWrap = document.querySelector('.volume-wrap');
    if (playerRight && volumeWrap) playerRight.insertBefore(createBadge(false), volumeWrap);

    // Mobile: Header (Right Side)
    const mobileHeader = document.querySelector('.mobile-header');
    if (mobileHeader) mobileHeader.appendChild(createBadge(true));

    // 2. Connect to Supabase
    if (!SUPABASE_URL) return;

    try {
        const { createClient } = supabase;
        const client = createClient(SUPABASE_URL, SUPABASE_KEY);
        
        // Unique ID for this user session
        const userId = 'user-' + Math.random().toString(36).slice(2);

        // We use the same channel for Presence (Online Count) and Broadcast (Chat)
        chatChannel = client.channel('global-room', {
            config: { presence: { key: userId } }
        });

        // 1. Listen for Online Count
        chatChannel.on('presence', { event: 'sync' }, () => {
            const state = chatChannel.presenceState();
            const count = Object.keys(state).length;
            
            document.querySelectorAll('.online-badge').forEach(el => {
                el.classList.remove('hidden');
                el.querySelector('.online-count-num').innerText = formatNumber(count);
            });
            
            // Update chat view count too
            const chatCount = document.getElementById('chat-online-count');
            if(chatCount) chatCount.innerText = formatNumber(count);
        });

        // 2. Listen for Chat Messages
        chatChannel.on('broadcast', { event: 'chat' }, ({ payload }) => {
            appendChatMessage(payload.user, payload.msg, 'received', true, payload.userId, payload.replyTo);
        });

        chatChannel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await chatChannel.track({ online_at: new Date().toISOString() });
            }
        });

    } catch (e) {
        console.error("Supabase init error:", e);
    }
}

// --- CHAT HISTORY (Session Storage) ---
function initChatHistory() {
    const history = JSON.parse(sessionStorage.getItem('yt_chat_history')) || [];
    const container = document.getElementById('chat-messages');
    if (container && history.length > 0) {
        // Clear default welcome message if we have history
        container.innerHTML = '';
        history.forEach(msg => appendChatMessage(msg.user, msg.text, msg.type, false, msg.userId, msg.replyTo));
    }
}

// --- CHAT LOGIC ---
function sendChatMessage(e) {
    e.preventDefault();
    const input = document.getElementById('chat-input');
    const msg = input.value.trim();
    
    if (!msg || !chatChannel) return;

    const payload = { user: myNickname, msg: msg, userId: myUserId };
    
    if (replyContext) {
        payload.replyTo = replyContext;
        cancelReply();
    }

    // Send to Supabase
    chatChannel.send({
        type: 'broadcast',
        event: 'chat',
        payload: payload
    });

    // Show my own message immediately
    appendChatMessage('Me', msg, 'sent', true, myUserId, payload.replyTo);
    
    input.value = '';
}

function appendChatMessage(user, text, type, save = true, userId = null, replyTo = null) {
    // Check Blocked
    if (userId && blockedUsers[userId]) return;

    const container = document.getElementById('chat-messages');
    if (!container) return;

    // Format text with mentions
    const formattedText = formatMessageText(text, type === 'sent');

    const div = document.createElement('div');
    div.className = `chat-msg ${type}`;
    
    // Only show name if it's not me. Make it clickable for blocking.
    let nameHtml = '';
    if (type === 'received') {
        // Make the entire bubble clickable to open options
        div.setAttribute('onclick', `openChatOptions(event, '${userId}', '${escapeHtml(user)}', '${escapeHtml(text)}')`);
        nameHtml = `<div class="chat-sender">${escapeHtml(user)}</div>`;
    }
    
    let replyHtml = '';
    if (replyTo) {
        replyHtml = `
            <div class="msg-reply-context">
                <span class="reply-sender">${escapeHtml(replyTo.user)}</span>
                <span class="reply-snippet">${escapeHtml(replyTo.text)}</span>
            </div>
        `;
    }
    
    div.innerHTML = `${nameHtml}${replyHtml}${formattedText}`;
    
    container.appendChild(div);
    container.scrollTop = container.scrollHeight; // Auto scroll to bottom

    if (save) {
        const history = JSON.parse(sessionStorage.getItem('yt_chat_history')) || [];
        history.push({ user, text, type, userId, replyTo });
        // Keep last 50 messages to avoid overflow
        if (history.length > 50) history.shift();
        sessionStorage.setItem('yt_chat_history', JSON.stringify(history));
    }
}

function formatMessageText(text, isSent) {
    let safeText = escapeHtml(text);
    
    // Replace @username with colored span
    // Regex looks for @ followed by word characters
    return safeText.replace(/@(\w+)/g, (match, username) => {
        const color = isSent ? '#ffffff' : getRandomColorForUser(username);
        return `<span class="mention" style="color:${color}">${match}</span>`;
    });
}

function getRandomColorForUser(username) {
    // Generate a consistent color from username hash
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    // Use HSL for better visibility control (darker shades for light bg)
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 35%)`; // 35% lightness ensures visibility on white/grey
}

// --- CHAT OPTIONS MODAL ---
function openChatOptions(e, userId, username, messageText) {
    if (!userId || userId === 'null') return;
    e.stopPropagation(); // Prevent event bubbling

    selectedChatUser = username;
    selectedChatUserId = userId;
    selectedChatText = messageText;
    
    document.getElementById('chat-options-title').innerText = username;
    document.getElementById('chat-options-modal').classList.remove('hidden');
}

function closeChatOptions() {
    document.getElementById('chat-options-modal').classList.add('hidden');
    selectedChatUser = null;
    selectedChatUserId = null;
    selectedChatText = null;
}

function chatActionReply() {
    if (selectedChatUser) {
        replyContext = {
            user: selectedChatUser,
            text: selectedChatText
        };
        
        // Show UI
        const preview = document.getElementById('reply-preview');
        document.getElementById('reply-to-user').innerText = selectedChatUser;
        document.getElementById('reply-to-text').innerText = selectedChatText;
        preview.classList.remove('hidden');
        
        document.getElementById('chat-input').focus();
    }
    closeChatOptions();
}

function cancelReply() {
    replyContext = null;
    document.getElementById('reply-preview').classList.add('hidden');
}

function chatActionLike() {
    if (selectedChatUser) {
        const replyTo = {
            user: selectedChatUser,
            text: selectedChatText
        };
        const msg = "❤️";

        chatChannel.send({
            type: 'broadcast',
            event: 'chat',
            payload: { user: myNickname, msg: msg, userId: myUserId, replyTo: replyTo }
        });
        appendChatMessage('Me', msg, 'sent', true, myUserId, replyTo);
    }
    closeChatOptions();
}

function chatActionBlock() {
    if (selectedChatUserId && selectedChatUser) {
        promptBlockUser(selectedChatUserId, selectedChatUser);
    }
    closeChatOptions();
}

// --- CHAT SETTINGS (Nickname & Blocking) ---
function openChatSettingsModal() {
    document.getElementById('chat-settings-modal').classList.remove('hidden');
    document.getElementById('username-input').value = myNickname;
    renderBlockedUsers();
}

function closeChatSettingsModal() {
    document.getElementById('chat-settings-modal').classList.add('hidden');
}

function saveUsername() {
    const input = document.getElementById('username-input');
    const newName = input.value.trim().replace(/\s+/g, '_');
    if (newName) {
        myNickname = newName;
        localStorage.setItem('yt_nickname', newName);
        showToast(`Nickname changed to ${newName}`);
    }
    closeChatSettingsModal();
}

function promptBlockUser(id, name) {
    if (!id || id === 'null') return;
    if (confirm(`Block messages from ${name}?`)) {
        blockedUsers[id] = name;
        localStorage.setItem('yt_blocked_users', JSON.stringify(blockedUsers));
        showToast(`${name} blocked.`);
        
        // Remove their messages from current view
        initChatHistory(); // Re-render history (which filters blocked users)
    }
}

function unblockUser(id) {
    if (blockedUsers[id]) {
        delete blockedUsers[id];
        localStorage.setItem('yt_blocked_users', JSON.stringify(blockedUsers));
        renderBlockedUsers();
    }
}

function renderBlockedUsers() {
    const list = document.getElementById('blocked-users-list');
    list.innerHTML = '';
    
    const ids = Object.keys(blockedUsers);
    if (ids.length === 0) {
        list.innerHTML = '<div style="font-size:0.85rem; color:#9ca3af; font-style:italic;">No blocked users.</div>';
        return;
    }

    ids.forEach(id => {
        const name = blockedUsers[id];
        const div = document.createElement('div');
        div.className = 'blocked-user-item';
        div.innerHTML = `
            <span>${escapeHtml(name)}</span>
            <button class="icon-btn" onclick="unblockUser('${id}')" style="color:#ef4444;" title="Unblock"><span class="material-icons">remove_circle</span></button>
        `;
        list.appendChild(div);
    });
}

function clearChatHistory() {
    openConfirmationModal("Clear History", "Are you sure you want to delete all chat messages?", "Delete", () => {
        sessionStorage.removeItem('yt_chat_history');
        document.getElementById('chat-messages').innerHTML = '<div class="chat-system-msg">Chat history cleared.</div>';
        showToast("Chat history cleared");
    });
}

// --- EMOJI LOGIC ---
const EMOJI_CATEGORIES = {
    "Smileys": ["😀","😃","😄","😁","😆","😅","😂","🤣","😊","😇","🙂","🙃","😉","😌","😍","🥰","😘","😗","😙","😚","😋","😛","😝","😜","🤪","🤨","🧐","🤓","😎","🤩","🥳","😏","😒","😞","😔","😟","😕","🙁","☹️","😣","😖","😫","😩","🥺","😢","😭","😤","😠","😡","🤬","🤯","😳","🥵","🥶","😱","😨","😰","😥","😓","🤗","🤔","🤭","🤫","🤥","😶","😐","😑","😬","🙄","😯","😦","😧","😮","😲","🥱","😴","🤤","😪","😵","🤐","🥴","🤢","🤮","🤧","😷","🤒","🤕","🤑","🤠","😈","👿","👹","👺","🤡","💩","👻","💀","☠️","👽","👾","🤖","🎃","😺","😸","😹","😻","😼","😽","🙀","😿","😾"],
    "Hands": ["👋","🤚","🖐️","✋","🖖","👌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝️","👍","👎","✊","👊","🤛","🤜","👏","🙌","👐","🤲","🤝","🙏","✍️","💅","🤳","💪","🦾","🦵","🦿","🦶","👂","🦻","👃","🧠","🦷","🦴","👀","👁️","👅","👄"],
    "People": ["👶","🧒","👦","👧","🧑","👱","👨","🧔","👩","🧓","👴","👵","👨‍⚕️","👩‍⚕️","👨‍🎓","👩‍🎓","👨‍🏫","👩‍🏫","👨‍⚖️","👩‍⚖️","👨‍🌾","👩‍🌾","👨‍🍳","👩‍🍳","👨‍🔧","👩‍🔧","👨‍🏭","👩‍🏭","👨‍💼","👩‍💼","👨‍🔬","👩‍🔬","👨‍💻","👩‍💻","👨‍🎤","👩‍🎤","👨‍🎨","👩‍🎨","👨‍✈️","👩‍✈️","👨‍🚀","👩‍🚀","👨‍🚒","👩‍🚒","👮","🕵️","💂","👷","🤴","👸","👳","👲","🧕","🤵","👰","🤰","🤱","👼","🎅","🤶","🦸","🦹","🧙","🧚","🧛","🧜","🧝","🧞","🧟"],
    "Symbols": ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟","☮️","✝️","☪️","🕉️","☸️","✡️","🔯","🕎","☯️","☦️","🛐","⛎","♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓","🆔","⚛️","🉑","☢️","☣️","📴","📳","🈶","🈚","🈸","🈺","🈷️","✴️","🆚","💮","🉐","㊙️","㊗️","🈴","🈵","🈹","🈲","🅰️","🅱️","🆎","🆑","🅾️","🆘","❌","⭕","🛑","⛔","📛","🚫","💯","💢","♨️","🚷","🚯","🚳","🚱","🔞","📵","🚭","❗","❕","❓","❔","‼️","⁉️","✅","🈯","💹","❇️","✳️","❎","🌐","💠","Ⓜ️","🌀","💤","🏧","🚾","♿","🅿️","🈳","🈂️","🛂","🛃","🛄","🛅","🚹","🚺","🚼","🚻","🚮","🎦","📶","🈁","🔣","ℹ️","🔤","🔡","🔠","🆖","🆗","🆙","🆒","🆕","🆓","0️⃣","1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟","🔢","#️⃣","*️⃣","⏏️","▶️","⏸️","⏯️","⏹️","⏺️","⏭️","⏮️","⏩","⏪","⏫","⏬","◀️","🔼","🔽","➡️","⬅️","⬆️","⬇️","↗️","↘️","↙️","↖️","↕️","↔️","↪️","↩️","⤴️","⤵️","🔀","🔁","🔂","🔄","🔃","➕","➖","➗","✖️","♾️","💲","💱","™️","©️","®️","👁️‍🗨️","🔚","🔙","🔛","🔝","🔜"],
    "Nature": ["✨","🌟","⭐","💫","💥","💢","💦","💨","🕳️","💣","💬","🗨️","🗯️","💭","💤","☀️","🌤️","⛅","🌥️","☁️","🌦️","🌧️","⛈️","🌩️","🌨️","❄️","☃️","⛄","🌬️","🌪️","🌫️","🌊","💧","🔥","🌈","⚡","☄️","🌑","🌒","🌓","🌔","🌕","🌖","🌗","🌘","🌙","🌚","🌛","🌜","🌡️","🌝","🌞","🪐","🌍","🌎","🌏","🌐"],
    "Music/Travel": ["🎵","🎶","📻","🎸","🎹","🎧","🎤","🥁","🎬","🎨","🎭","🎮","🕹️","🎰","🚀","🛸","🚁","✈️","🚢","⚓","🚗","🚕","🚲","🛵","🏎️","🚒","🚑","🚓","🚜","🏍️","🛴","🛹","🚏","🛣️","🛤️","🛢️","⛽","🚨","🚥","🚦","🛑","🚧"]
};

function toggleEmojiPicker() {
    const picker = document.getElementById('emoji-picker');
    
    if (picker.innerHTML === '') {
        // Create Fixed Tabs
        const tabsContainer = document.createElement('div');
        tabsContainer.className = 'emoji-tabs';
        
        // Create Scrollable Area
        const contentContainer = document.createElement('div');
        contentContainer.id = 'emoji-content-area';
        contentContainer.className = 'emoji-content';
        
        Object.keys(EMOJI_CATEGORIES).forEach((catName, index) => {
            const tab = document.createElement('button');
            tab.className = 'emoji-tab' + (index === 0 ? ' active' : '');
            tab.innerText = EMOJI_CATEGORIES[catName][0]; 
            tab.title = catName;
            tab.type = 'button';
            
            tab.onclick = () => {
                document.querySelectorAll('.emoji-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                renderEmojiCategory(catName);
            };
            
            tabsContainer.appendChild(tab);
        });
        
        picker.appendChild(tabsContainer);
        picker.appendChild(contentContainer);
        
        renderEmojiCategory(Object.keys(EMOJI_CATEGORIES)[0]);
    }
    
    picker.classList.toggle('hidden');
}

function renderEmojiCategory(category) {
    const container = document.getElementById('emoji-content-area');
    container.innerHTML = ''; 
    
    EMOJI_CATEGORIES[category].forEach(emoji => {
        const btn = document.createElement('button');
        btn.className = 'emoji-btn';
        btn.innerText = emoji;
        btn.type = 'button';
        btn.onclick = () => insertEmoji(emoji);
        container.appendChild(btn);
    });
    
    container.scrollTop = 0; // Reset scroll position when switching categories
}

function insertEmoji(char) {
    const input = document.getElementById('chat-input');
    input.value += char;
    input.focus();
}

// --- CONFIRMATION MODAL ---
function openConfirmationModal(title, text, btnText, callback) {
    document.getElementById('confirm-title').innerText = title;
    document.getElementById('confirm-text').innerText = text;
    const btn = document.getElementById('confirm-btn');
    btn.innerText = btnText;
    confirmActionCallback = callback;
    document.getElementById('confirmation-modal').classList.remove('hidden');
}

function closeConfirmationModal() {
    document.getElementById('confirmation-modal').classList.add('hidden');
    confirmActionCallback = null;
}

function executeConfirmAction() {
    if (confirmActionCallback) confirmActionCallback();
    closeConfirmationModal();
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}