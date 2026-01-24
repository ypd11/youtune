// --- CONFIG ---
const API_BASE = "https://de1.api.radio-browser.info/json/stations";
const ITUNES_API = "https://itunes.apple.com/search";
const PLACEHOLDER_IMG = "https://cdn-icons-png.flaticon.com/512/3595/3595455.png";
const PLACEHOLDER_IMG_LARGE = "https://cdn-icons-png.flaticon.com/512/3595/3595455.png";

const firebaseConfig = {
  apiKey: "AIzaSyB4N5hKnaEAkqes1x5BR4hRpkdv-jD2xBM",
  authDomain: "jottime-25f70.firebaseapp.com",
  databaseURL: "https://jottime-25f70-default-rtdb.firebaseio.com",
  projectId: "jottime-25f70",
  storageBucket: "jottime-25f70.firebasestorage.app",
  messagingSenderId: "416581324730",
  appId: "1:416581324730:web:099556583ef8649e26d783",
  measurementId: "G-GR7H7L0GHT"
};

/* EMOJIS */
const EMOJI_CATEGORIES = [
  {
    name: "EXPRESSIONS",
    emojis: "😀 😃 😄 😁 😆 😅 😂 🤣 🥲 🥹 😊 😇 🙂 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😜 😝 🤑 🤗 🤭 🤫 🤔 🫡 🤐 🤨 😐 😑 😶 🫥 😶‍🌫️ 😏 😒 🙄 😬 😮‍💨 🤥 🫨 😌 😔 😪 🤤 😴 😷 🤒 🤕 🤢 🤮 🤧 🥵 🥶 🥴 😵 😵‍💫 🤯 🤠 🥳 🥸 😎 🤓 🧐 😕 🫤 😟 🙁 😮 😯 😲 😳 🥺 🥹 😦 😧 😨 😰 😥 😢 😭 😱 😖 😣 😞 😓 😩 😫 🥱 😤 😡 😠 🤬 😈 👿 💀 ☠️ 💩 🤡 👹 👺 👻 👽 👾 🤖 😺 😸 😹 😻 😼 😽 🙀 😿 😾 🙈 🙉 🙊".split(" ")
  },
  {
    name: "GESTURES",
    emojis: "👋 🤚 🖐️ ✋ 🖖 👌 🤌 🤏 ✌️ 🤞 🫰 🤟 🤘 🤙 👈 👉 👆 🖕 👇 ☝️ 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 👐 🤲 🤝 🙏 ✍️ 💅 🤳 💪 🦾 🦿 🦵 🦶 👂 🦻 👃 🧠 🫀 🫁 🦷 🦴 👀 👁️ 👅 👄 🫦 👤 👥 🫂 👣".split(" ")
  },
  {
    name: "VIBES",
    emojis: "💘 💝 💖 💗 💓 💞 💕 💟 ❣️ 💔 ❤️‍🔥 ❤️‍🩹 ❤️ 🧡 💛 💚 💙 💜 🤎 🖤 🤍 🫧 💢 💥 💫 💦 💨 🕳️ 💬 👁️‍🗨️ 🗨️ 🗯️ 💭 💤 ✨ 🌟 ⭐️ 🌠 🌌 🪐 🌑 🌒 🌓 🌔 🌕 🌖 🌗 🌘 🌙 🌚 🌛 🌜 ☀️ 🌤️ ⛅ 🌥️ 🌦️ 🌧️ 🌨️ 🌩️ 🌪️ 🌫️ 🌬️ 🌈 ❄️ ☃️ ☄️ 🔥 💧 🌊 🌋 ⚡".split(" ")
  },
  {
    name: "FOOD",
    emojis: "🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🍆 🥑 🥦 🥬 🥒 🌶️ 🫑 🌽 🥕 🫒 🧄 🧅 🥔 🍠 🥐 🥯 🍞 🥖 🥨 🧀 🥚 🍳 🧈 🥞 🧇 🥓 🥩 🍗 🍖 🦴 🌭 🍔 🍟 🍕 🫓 🥪 🥙 🧆 🌮 🌯 🥗 🥘 🫕 🥣 🍝 🍜 🍲 🍛 🍣 🍱 🥟 🍤 🍙 🍚 🍘 🍥 🥠 🍢 🍡 🍧 🍨 🍦 🥧 🧁 🍰 🎂 🍮 🍭 🍬 🍫 🍿 🍩 🍪 🌰 🥜 🍯 🥛 ☕ 🫖 🍵 🍶 🍾 🍷 🍸 🍹 🍺 🍻 🥂 🥃 🥤 🧋 🧊 🍴 🍽️ 🥣 🥢".split(" ")
  },
  {
    name: "PLACES",
    emojis: "🌍 🌎 🌏 🪐 🏠 🏡 🏢 🏣 🏤 🏥 🏦 🏨 🏩 🏪 🏫 🏬 🏭 🏯 🏰 💒 🗼 🗽 ⛪ 🕌 ⛩️ ⛲ ⛺ 🌁 🌃 🏙️ 🌄 🌅 🌆 🌇 🌉 ♨️ 🎠 🎡 🎢 💈 🎪 🚀 ✈️ 🛫 🛬 🚁 🚂 🚃 🚄 🚅 🚆 🚇 🚈 🚉 🚊 🚝 🚞 🚋 🚌 🚍 🚎 🚐 🚑 🚒 🚓 🚔 🚕 🚖 🚗 🚘 🚙 🛻 🚚 🚛 🚜 🏎️ 🏍️ 🛵 🚲 🛴 🚏 🛣️ 🛤️ ⚓ ⛵ 🛶 🚤 🛳️ ⛴️ 🚢 🛸 🗺️ 🏔️ ⛰️ 🌋 🗻 🏕️ 🏖️ 🏜️ 🏝️ 🏞️".split(" ")
  }
];

// --- STATE ---
let audio = document.getElementById('audio-core');
let favorites = JSON.parse(localStorage.getItem('yt_favs')) || [];
let searchHistory = JSON.parse(localStorage.getItem('yt_search_history')) || [];
let httpsOnly = localStorage.getItem('yt_https_only') !== 'false';

let currentStation = null;
let isPlaying = false;
let currentOffset = 0;
let currentMode = 'trending'; // 'trending', 'search', 'country', 'favorites'
let currentQuery = '';
let currentPage = 1;
let hasNextPage = false;
let countryCode = null;
let nowPlayingTitle = "";

// Chat
let firebaseApp = null;
let firebaseDb = null;
let chatInitialized = false;
let chatUsername = localStorage.getItem('yt_chat_name') || null;
let chatMessagesRef = null;

// --- INIT ---
window.onload = () => {
    initHttpsToggle();
    initAboutYear();
    renderSearchHistory();
    favorites = favorites.filter(s => s && s.url_resolved);

    requestCountryAtStartup();
    loadTrending();

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
    });
    audio.addEventListener('pause', () => {
        isPlaying = false;
        updatePlayIcons();
    });

    audio.onerror = () => {
        document.getElementById('player-artist').innerText = "Stream offline or blocked";
        document.getElementById('np-artist').innerText = "Stream offline or blocked";
        isPlaying = false;
        updatePlayIcons();
    };

    const chatInput = document.getElementById('chat-input');
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendChatMessage();
        }
    });

    initEmojiUI();
    registerServiceWorker();
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
        if (currentMode === 'trending') loadTrending();
        else if (currentMode === 'country') loadCountryStations(true);
        else if (currentMode === 'favorites') loadFavorites();
        else if (currentMode === 'search') searchStations(currentQuery);
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
    else if (key === 'about') document.getElementById('nav-about').classList.add('active');
    else if (key === 'country') document.getElementById('nav-country').classList.add('active');
}

// --- SEARCH HISTORY ---
function renderSearchHistory() {
    const container = document.getElementById('search-history');
    if (!container) return;
    container.innerHTML = '';
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
    } else {
        loadTrending(false);
    }
}

// --- COUNTRY DETECTION ---
function requestCountryAtStartup() {
    if (!navigator.geolocation) return;
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

function loadTrending(reset = true) {
    if (reset) resetList();
    currentMode = 'trending';
    currentQuery = '';
    setActiveNav('trending');
    showListView();
    document.getElementById('section-title').innerText = "Trending Now";

    const url = `${API_BASE}/topclick?limit=${LIMIT}&offset=${currentOffset}&hidebroken=true${buildHttpsParam()}`;
    fetchData(url);
}

function loadCountryStations(reset = true) {
    currentMode = 'country';
    currentQuery = '';
    setActiveNav('country');
    showListView();
    document.getElementById('section-title').innerText = "Stations in Your Country";

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

async function searchStations(query, reset = true) {
    if (!query) return;
    if (reset) resetList();
    currentMode = 'search';
    currentQuery = query;
    setActiveNav(null);
    showListView();

    document.getElementById('section-title').innerText = `Search: "${query}"`;
    const url = `${API_BASE}/search?name=${encodeURIComponent(query)}&limit=${LIMIT}&offset=${currentOffset}&hidebroken=true&order=clickcount&reverse=true${buildHttpsParam()}`;

    if (reset) addSearchHistory(query);
    fetchData(url, true);
}

function loadFavorites() {
    currentMode = 'favorites';
    currentQuery = '';
    currentOffset = 0;
    currentPage = 1;
    setActiveNav('favorites');
    showListView();
    document.getElementById('section-title').innerText = "My Favorites";
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
function renderCards(stations) {
    const grid = document.getElementById('channel-grid');

    stations.forEach(station => {
        const card = document.createElement('div');
        card.className = 'card';

        const img = station.favicon || PLACEHOLDER_IMG;
        const genre = station.tags ? station.tags.split(',')[0] : 'Music';
        const safeName = station.name || 'Unknown station';

        card.innerHTML = `
            <div class="card-img-wrap">
                <img src="${img}" class="card-img" onerror="this.src='${PLACEHOLDER_IMG}'">
            </div>
            <div class="card-title" title="${safeName}">${safeName}</div>
            <div class="card-subtitle">${genre} • ${station.bitrate || 0}k</div>
            <div class="card-actions">
                <div class="card-actions-left">
                    <button class="card-icon-btn" title="Play" onclick="playStationFromCard(event, '${station.stationuuid}')">
                        <span class="material-icons">play_arrow</span>
                    </button>
                    <button class="card-icon-btn" title="Info" onclick="openStationModalFromCard(event, '${station.stationuuid}')">
                        <span class="material-icons">info</span>
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
        grid.appendChild(card);
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

function setLoading(show) {
    const loader = document.getElementById('loader');
    if (show) loader.classList.remove('hidden');
    else loader.classList.add('hidden');
}

// --- PLAYER ---
function playStation(station) {
    currentStation = station;
    nowPlayingTitle = "";

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
    document.getElementById('np-bitrate').innerText = station.bitrate ? `${station.bitrate} kbps` : "";

    updateHeartIcons();

    audio.src = station.url_resolved;
    audio.play().then(() => {
        document.getElementById('player-artist').innerText = "Live stream";
        document.getElementById('np-artist').innerText = "Live stream";
        fetchArt(name);
    }).catch(e => {
        console.error(e);
        document.getElementById('player-artist').innerText = "Stream offline or blocked";
        document.getElementById('np-artist').innerText = "Stream offline or blocked";
    });
}

function togglePlay() {
    if (!currentStation) return;
    if (audio.paused) {
        audio.play().catch(() => {});
    } else {
        audio.pause();
    }
}

function updatePlayIcons() {
    const icon = document.getElementById('play-icon');
    const value = isPlaying ? 'pause_circle_filled' : 'play_circle_filled';
    icon.innerText = value;
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
}

function showNowPlayingView() {
    if (!currentStation) return;
    setActiveView('view-nowplaying');
}

function showAboutView() {
    setActiveNav('about');
    setActiveView('view-about');
}

function showChatView() {
    initFirebaseIfNeeded();
    if (!chatInitialized || !firebaseDb) {
        document.getElementById('chat-status').innerText = 'Chat is not available right now.';
        setActiveView('view-chat');
        return;
    }
    ensureChatUsername().then(() => {
        document.getElementById('chat-status').innerText = '';
        attachChatListener();
        setActiveView('view-chat');
    }).catch(() => {
        // keep asking via modal
    });
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
    document.getElementById('modal-subtitle').innerText = station.tags || 'No description';

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
    const clean = query.replace(/\d+|FM|Radio|The/gi, '').trim();
    if (clean.length < 3) return;
    try {
        const res = await fetch(`${ITUNES_API}?term=${encodeURIComponent(clean)}&media=music&entity=musicTrack&limit=1`);
        const data = await res.json();
        if (data.results && data.results.length > 0) {
            const track = data.results[0];
            const art = track.artworkUrl100.replace('100x100', '600x600');
            document.getElementById('player-art').src = art;
            document.getElementById('np-art').src = art;

            const title = `${track.artistName} – ${track.trackName}`;
            nowPlayingTitle = title;
            document.getElementById('player-artist').innerText = title;
            document.getElementById('np-artist').innerText = title;
        }
    } catch (e) {
        // ignore
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

// --- EMOJI PICKER TOGGLE ---
function toggleEmojiPicker() {
    const picker = document.getElementById('emoji-picker');
    const tabs = document.getElementById('emoji-tabs');
    
    if (picker.classList.contains('hidden')) {
        picker.classList.remove('hidden');
        tabs.classList.remove('hidden');
    } else {
        picker.classList.add('hidden');
        tabs.classList.add('hidden');
    }
}

// --- CHAT (Firebase Realtime DB) ---
function initFirebaseIfNeeded() {
    if (chatInitialized) return;
    try {
        firebaseApp = firebase.initializeApp(firebaseConfig);
        firebaseDb = firebase.database();
        chatMessagesRef = firebaseDb.ref('youtune_chat/messages');
        chatInitialized = true;
    } catch (e) {
        console.error(e);
    }
}

function ensureChatUsername() {
    return new Promise((resolve, reject) => {
        if (chatUsername) {
            resolve();
            return;
        }
        const modal = document.getElementById('chat-name-modal');
        const input = document.getElementById('chat-name-input');
        input.value = "";
        modal.classList.remove('hidden');

        const handler = () => {
            const name = input.value.trim();
            if (!name) return;
            chatUsername = name;
            localStorage.setItem('yt_chat_name', chatUsername);
            modal.classList.add('hidden');
            input.removeEventListener('keypress', keyHandler);
            resolve();
        };
        const keyHandler = (e) => {
            if (e.key === 'Enter') handler();
        };

        input.addEventListener('keypress', keyHandler);
        window.confirmChatName = handler;
    });
}

function attachChatListener() {
    const messagesEl = document.getElementById('chat-messages');
    chatMessagesRef.off();
    chatMessagesRef.limitToLast(100).on('value', snapshot => {
        messagesEl.innerHTML = '';
        const val = snapshot.val();
        if (!val) return;
        const entries = Object.values(val).sort((a, b) => a.timestamp - b.timestamp);
        entries.forEach(msg => {
            const div = document.createElement('div');
            div.className = 'chat-message';
            const header = document.createElement('div');
            header.className = 'chat-message-header';
            const time = new Date(msg.timestamp || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
            header.innerHTML = `${escapeHtml(msg.name || 'User')}<span class="chat-message-time">${time}</span>`;
            const text = document.createElement('div');
            text.className = 'chat-message-text';
            text.innerText = msg.text || '';
            div.appendChild(header);
            div.appendChild(text);
            messagesEl.appendChild(div);
        });
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }, err => {
        console.error(err);
        document.getElementById('chat-status').innerText = 'Chat is full or not available right now.';
    });
}

function sendChatMessage() {
    if (!chatInitialized || !firebaseDb || !chatMessagesRef) {
        document.getElementById('chat-status').innerText = 'Chat is not available right now.';
        return;
    }
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;
    if (!chatUsername) return;

    const msg = {
        name: chatUsername,
        text,
        timestamp: Date.now()
    };

    chatMessagesRef.push(msg, err => {
        if (err) {
            document.getElementById('chat-status').innerText = 'Chat is full or not available right now.';
        }
    });
    input.value = '';
    
    // Hide emoji picker after sending
    document.getElementById('emoji-picker').classList.add('hidden');
    document.getElementById('emoji-tabs').classList.add('hidden');
}

// --- EMOJI UI ---
function initEmojiUI() {
    const tabs = document.getElementById('emoji-tabs');
    const picker = document.getElementById('emoji-picker');
    if (!tabs || !picker) return;

    // Hide by default
    tabs.classList.add('hidden');
    picker.classList.add('hidden');

    tabs.innerHTML = '';
    EMOJI_CATEGORIES.forEach((cat, idx) => {
        const btn = document.createElement('button');
        btn.className = 'emoji-tab-btn' + (idx === 0 ? ' active' : '');
        btn.innerText = cat.name;
        btn.onclick = () => {
            document.querySelectorAll('.emoji-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderEmojiCategory(cat);
        };
        tabs.appendChild(btn);
    });

    renderEmojiCategory(EMOJI_CATEGORIES[0]);
}

function renderEmojiCategory(cat) {
    const picker = document.getElementById('emoji-picker');
    if (!picker) return;
    picker.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'emoji-grid';
    cat.emojis.forEach(e => {
        if (!e) return;
        const span = document.createElement('span');
        span.innerText = e;
        span.onclick = () => appendEmoji(e);
        grid.appendChild(span);
    });
    picker.appendChild(grid);
}

function appendEmoji(emoji) {
    const input = document.getElementById('chat-input');
    input.value += emoji;
    input.focus();
}

// --- UTILS ---
function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, s => {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
        return map[s];
    });
}