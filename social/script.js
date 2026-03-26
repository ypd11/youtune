// --- CONFIG ---
const SUPABASE_URL = "https://ojmwufjrxgxegxfewfql.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qbXd1ZmpyeGd4ZWd4ZmV3ZnFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNjg4ODUsImV4cCI6MjA4NDk0NDg4NX0.sJ-FGTBDX070EjLmvFvwJF2tyihEUs4Ltfw7PNrAWFo";
const PAGE_SIZE = 10;

// --- STATE ---
let supabaseClient = null;
let currentPage = 0;
let myLikes = new Set(); // Store IDs of posts I liked
let myNickname = localStorage.getItem('yt_nickname') || "Guest";
let deleteAction = null;
let realtimeChannel = null;
let knownLikes = new Map(); // Cache like_id -> { post_id, username }

// --- INIT ---
window.onload = () => {
    initContentProtection();
    initSupabase();
    initRealtime();
    initScrollButton();
    loadPosts();
    
    // Listen for nickname changes from main app
    window.addEventListener('storage', () => {
        myNickname = localStorage.getItem('yt_nickname') || "Guest";
    });
};

function initSupabase() {
    if (window.supabase) {
        const { createClient } = window.supabase;
        supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
    }
}

// --- REALTIME ---
function initRealtime() {
    if (!supabaseClient) return;
    if (realtimeChannel) return; // Prevent duplicate subscriptions

    const channel = supabaseClient.channel('social-feed-v1');

    channel
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'social_posts' }, payload => {
            // If it's not me, show the new post
            if (payload.new.username !== myNickname) {
                console.log('New post received:', payload.new);
                addPostToFeed(payload.new, true);
            }
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'social_posts' }, payload => {
            const el = document.getElementById(`post-${payload.old.id}`);
            if (el) el.remove();
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'social_comments' }, payload => {
            if (payload.new.username !== myNickname) {
                addCommentToPost(payload.new);
            }
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'social_likes' }, payload => {
             // Cache details so we can handle the DELETE event later if needed
             knownLikes.set(payload.new.id, { 
                 post_id: payload.new.post_id, 
                 username: payload.new.username 
             });

             if (payload.new.username !== myNickname) {
                console.log('Like received:', payload.new);
                updateLikeCountUI(payload.new.post_id, 1);
             }
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'social_likes' }, payload => {
             console.log('Unlike received:', payload.old);
             
             let postId = payload.old.post_id;
             let username = payload.old.username;

             // Workaround: If Supabase didn't send post_id, try to find it in our local cache
             if (!postId && payload.old.id && knownLikes.has(payload.old.id)) {
                 const cached = knownLikes.get(payload.old.id);
                 postId = cached.post_id;
                 username = cached.username;
                 knownLikes.delete(payload.old.id); // Clean up
             }

             if (postId && username !== myNickname) {
                updateLikeCountUI(postId, -1);
             }
        })
        .subscribe((status) => {
            console.log("Social Realtime:", status);
            if (status === 'SUBSCRIBED') {
                // Connection successful
            }
        });
    realtimeChannel = channel;
}

// --- POSTS ---
async function loadPosts(loadMore = false) {
    if (!supabaseClient) return;
    
    if (!loadMore) {
        currentPage = 0;
        document.getElementById('feed-container').innerHTML = '';
    }

    const from = currentPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    // Fetch posts AND the count of likes (using foreign key relation)
    const { data, error } = await supabaseClient
        .from('social_posts')
        .select('*, social_likes(count)') 
        .order('created_at', { ascending: false })
        .range(from, to);

    if (error) {
        console.error(error);
        showToast("Error loading posts");
        return;
    }

    if (data.length < PAGE_SIZE) {
        document.getElementById('load-more-btn').classList.add('hidden');
    } else {
        document.getElementById('load-more-btn').classList.remove('hidden');
    }

    // Fetch "My Likes" for these posts to color the heart button
    if (data.length > 0) {
        const postIds = data.map(p => p.id);
        const { data: likes } = await supabaseClient
            .from('social_likes')
            .select('post_id')
            .eq('username', myNickname)
            .in('post_id', postIds);
        
        if (likes) likes.forEach(l => myLikes.add(l.post_id));
    }

    renderPosts(data);
    currentPage++;
}

function loadMorePosts() {
    loadPosts(true);
}

function renderPosts(posts) {
    const container = document.getElementById('feed-container');
    
    posts.forEach(post => {
        const el = createPostElement(post);
        container.appendChild(el);
    });
}

function addPostToFeed(post, prepend = false) {
    const container = document.getElementById('feed-container');
    const el = createPostElement(post);
    if (prepend) container.prepend(el);
    else container.appendChild(el);
}

function createPostElement(post) {
    const isOwner = post.username === myNickname;
    const likeCount = (post.social_likes && post.social_likes[0]) ? post.social_likes[0].count : 0;
    const isLiked = myLikes.has(post.id);
    const likeIcon = isLiked ? 'favorite' : 'favorite_border';
    const likeClass = isLiked ? 'liked' : '';

    const el = document.createElement('div');
    el.className = 'post-card';
    el.id = `post-${post.id}`;
    el.innerHTML = `
        <div class="post-header">
            <div class="post-header-left">
                ${getAvatar(post.username)}
                <div>
                    <div class="post-user">${escapeHtml(post.username)}</div>
                    <div class="post-time">${formatDate(post.created_at)}</div>
                </div>
            </div>
            ${isOwner ? `<button class="delete-btn" onclick="deletePost(${post.id})" title="Delete Post"><span class="material-icons">delete</span></button>` : ''}
        </div>
        <div class="post-content">${escapeHtml(post.content)}</div>
        <div class="post-footer">
            <button class="action-link ${likeClass}" id="like-btn-${post.id}" onclick="toggleLike(${post.id})">
                <span class="material-icons" style="font-size:1.1rem">${likeIcon}</span> 
                <span id="like-count-${post.id}">${likeCount > 0 ? likeCount : 'Like'}</span>
            </button>
            <button class="action-link" onclick="toggleComments(${post.id})">
                <span class="material-icons" style="font-size:1.1rem">chat_bubble_outline</span> Comment
            </button>
        </div>
        <div id="comments-${post.id}" class="comments-section hidden">
            <div id="comments-list-${post.id}"></div>
            <div class="comment-input-area">
                <input type="text" id="comment-input-${post.id}" class="comment-input" placeholder="Write a comment...">
                <button class="comment-send" onclick="postComment(${post.id})">Send</button>
            </div>
        </div>
    `;
    return el;
}

async function createPost() {
    const input = document.getElementById('post-input');
    const content = input.value.trim();
    if (!content) return;

    const { error } = await supabaseClient
        .from('social_posts')
        .insert([{ username: myNickname, content: content }]);

    if (error) {
        showToast("Failed to post");
    } else {
        input.value = '';
        showToast("Posted!");
        loadPosts(false); // Reload feed
    }
}

function deletePost(id) {
    openDeleteModal(async () => {
        // Optimistic remove
        document.getElementById(`post-${id}`).remove();

        const { error } = await supabaseClient
            .from('social_posts')
            .delete()
            .match({ id: id, username: myNickname }); // Security check: only delete if username matches

        if (error) {
            showToast("Error deleting post");
            loadPosts(); // Reload to restore if failed
        } else {
            showToast("Post deleted");
        }
    });
}

async function toggleLike(id) {
    const btn = document.getElementById(`like-btn-${id}`);
    const icon = btn.querySelector('.material-icons');
    
    const wasLiked = btn.classList.contains('liked');

    if (wasLiked) {
        // Optimistic Unlike
        btn.classList.remove('liked');
        icon.innerText = 'favorite_border';
        updateLikeCountUI(id, -1);
        myLikes.delete(id);

        await supabaseClient.from('social_likes').delete().match({ post_id: id, username: myNickname });
    } else {
        // Optimistic Like
        btn.classList.add('liked');
        icon.innerText = 'favorite';
        updateLikeCountUI(id, 1);
        myLikes.add(id);

        await supabaseClient.from('social_likes').insert([{ post_id: id, username: myNickname }]);
    }
}

function updateLikeCountUI(postId, change) {
    const countSpan = document.getElementById(`like-count-${postId}`);
    if (!countSpan) return;
    
    let text = countSpan.innerText.trim();
    let count = (text === 'Like') ? 0 : parseInt(text, 10);
    if (isNaN(count)) count = 0;

    count += change;
    
    if (count <= 0) {
        countSpan.innerText = 'Like';
    } else {
        countSpan.innerText = count.toString();
    }
}

// --- COMMENTS ---
async function toggleComments(postId) {
    const section = document.getElementById(`comments-${postId}`);
    section.classList.toggle('hidden');
    
    if (!section.classList.contains('hidden')) {
        loadComments(postId);
    }
}

async function loadComments(postId) {
    const list = document.getElementById(`comments-list-${postId}`);
    list.innerHTML = '<div style="font-size:0.8rem; color:#999;">Loading...</div>';

    const { data, error } = await supabaseClient
        .from('social_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

    if (error) {
        list.innerHTML = '<div style="color:red;">Error</div>';
        return;
    }

    list.innerHTML = '';
    if (data.length === 0) {
        list.innerHTML = '<div style="font-size:0.8rem; color:#ccc; margin-bottom:10px;">No comments yet.</div>';
    }

    data.forEach(c => {
        const div = createCommentElement(c);
        list.appendChild(div);
    });
}

function addCommentToPost(comment) {
    const list = document.getElementById(`comments-list-${comment.post_id}`);
    // Only append if the list is visible (loaded)
    if (list && list.offsetParent !== null) {
        // Remove "No comments yet" if it exists
        if (list.children.length === 1 && list.children[0].innerText === "No comments yet.") {
            list.innerHTML = '';
        }
        list.appendChild(createCommentElement(comment));
    }
}

function createCommentElement(c) {
    const isOwner = c.username === myNickname;
    const div = document.createElement('div');
    div.className = 'comment-item';
    div.id = `comment-${c.id}`;
    div.innerHTML = `
        ${getAvatar(c.username, 28)}
        <div class="comment-content">
            <span class="comment-user">${escapeHtml(c.username)}</span> 
            <span class="comment-text">${escapeHtml(c.content)}</span>
        </div>
        ${isOwner ? `<button class="delete-btn" onclick="deleteComment(${c.id})" style="font-size:0.8rem"><span class="material-icons" style="font-size:1rem">close</span></button>` : ''}
    `;
    return div;
}

async function postComment(postId) {
    const input = document.getElementById(`comment-input-${postId}`);
    const content = input.value.trim();
    if (!content) return;

    const { error } = await supabaseClient
        .from('social_comments')
        .insert([{ post_id: postId, username: myNickname, content: content }]);

    if (error) {
        showToast("Failed to comment");
    } else {
        input.value = '';
        loadComments(postId); // Refresh comments
    }
}

function deleteComment(id) {
    openDeleteModal(async () => {
        document.getElementById(`comment-${id}`).remove();

        const { error } = await supabaseClient
            .from('social_comments')
            .delete()
            .match({ id: id, username: myNickname });

        if (error) showToast("Error deleting comment");
    });
}

// --- MODAL ---
function openDeleteModal(action) {
    deleteAction = action;
    document.getElementById('delete-modal').classList.remove('hidden');
}

function closeDeleteModal() {
    deleteAction = null;
    document.getElementById('delete-modal').classList.add('hidden');
}

function confirmDelete() {
    if (deleteAction) deleteAction();
    closeDeleteModal();
}

// --- UTILS ---
function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[s]);
}

function formatDate(isoStr) {
    const d = new Date(isoStr);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

function showToast(msg) {
    const t = document.getElementById('toast');
    t.innerText = msg;
    t.classList.remove('hidden');
    setTimeout(() => t.classList.add('hidden'), 3000);
}

// --- SCROLL TO TOP ---
function initScrollButton() {
    const btn = document.getElementById('scroll-top-btn');
    // Listen to scroll on body since it has overflow-y: auto
    document.body.addEventListener('scroll', () => {
        if (document.body.scrollTop > 300) btn.classList.add('visible');
        else btn.classList.remove('visible');
    });
}

function scrollToTop() {
    document.body.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- AVATAR GENERATOR ---
function getAvatar(name, size = 36) {
    const initial = name ? name.charAt(0).toUpperCase() : '?';
    const color = stringToColor(name || 'Guest');
    return `<div class="user-avatar" style="background-color:${color}; width:${size}px; height:${size}px; font-size:${size*0.45}px">${initial}</div>`;
}

function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + "00000".substring(0, 6 - c.length) + c;
}

// --- EMOJI ---
const EMOJI_CATEGORIES = [
  { 
    name: "Expressions", 
    emojis: "😀 😃 😄 😁 😆 😅 😂 🤣 🥲 🥹 😊 😇 🙂 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😜 😝 🤑 🤗 🤭 🤫 🤔 🫡 🤐 🤨 😐 😑 😶 🫥 😶‍🌫️ 😏 😒 🙄 😬 😮‍💨 🤥 🫨 😌 😔 😪 🤤 😴 😷 🤒 🤕 🤢 🤮 🤧 🥵 🥶 🥴 😵 😵‍💫 🤯 🤠 🥳 🥸 😎 🤓 🧐 😕 🫤 😟 🙁 😮 😯 😲 😳 🥺 🥹 😦 😧 😨 😰 😥 😢 😭 😱 😖 😣 😞 😓 😩 😫 🥱 😤 😡 😠 🤬 😈 👿 💀 ☠️ 💩 🤡 👹 👺 👻 👽 👾 🤖 😺 😸 😹 😻 😼 😽 🙀 😿 😾 🙈 🙉 🙊".split(/\s+/) 
  },
  { 
    name: "Gestures", 
    emojis: "👋 🤚 🖐️ ✋ 🖖 👌 🤌 🤏 ✌️ 🤞 🫰 🤟 🤘 🤙 👈 👉 👆 🖕 👇 ☝️ 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 👐 🤲 🤝 🙏 ✍️ 💅 🤳 💪 🦾 🦿 🦵 🦶 👂 🦻 👃 🧠 🫀 🫁 🦷 🦴 👀 👁️ 👅 👄 🫦 👤 👥 🫂 👣".split(/\s+/) 
  },
  { 
    name: "Vibes", 
    emojis: "💘 💝 💖 💗 💓 💞 💕 💟 ❣️ 💔 ❤️‍🔥 ❤️‍🩹 ❤️ 🧡 💛 💚 💙 💜 🤎 🖤 🤍 🫧 💢 💥 💫 💦 💨 🕳️ 💬 👁️‍🗨️ 🗨️ 🗯️ 💭 💤 ✨ 🌟 ⭐️ 🌠 🌌 🪐 🌑 🌒 🌓 🌔 🌕 🌖 🌗 🌘 🌙 🌚 🌛 🌜 ☀️ 🌤️ ⛅ 🌥️ 🌦️ 🌧️ 🌨️ 🌩️ 🌪️ 🌫️ 🌬️ 🌈 ❄️ ☃️ ☄️ 🔥 💧 🌊 🌋 ⚡".split(/\s+/) 
  },
  { 
    name: "Food", 
    emojis: "🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🍆 🥑 🥦 🥬 🥒 🌶️ 🫑 🌽 🥕 🫒 🧄 🧅 🥔 🍠 🥐 🥯 🍞 🥖 🥨 🧀 🥚 🍳 🧈 🥞 🧇 🥓 🥩 🍗 🍖 🦴 🌭 🍔 🍟 🍕 🫓 🥪 🥙 🧆 🌮 🌯 🥗 🥘 🫕 🥣 🍝 🍜 🍲 🍛 🍣 🍱 🥟 🍤 🍙 🍚 🍘 🍥 🥠 🍢 🍡 🍧 🍨 🍦 🥧 🧁 🍰 🎂 🍮 🍭 🍬 🍫 🍿 🍩 🍪 🌰 🥜 🍯 🥛 ☕ 🫖 🍵 🍶 🍾 🍷 🍸 🍹 🍺 🍻 🥂 🥃 🥤 🧋 🧊 🍴 🍽️ 🥣 🥢".split(/\s+/) 
  },
  { 
    name: "Destinations", 
    emojis: "🌍 🌎 🌏 🪐 🏠 🏡 🏢 🏣 🏤 🏥 🏦 🏨 🏩 🏪 🏫 🏬 🏭 🏯 🏰 💒 🗼 🗽 ⛪ 🕌 ⛩️ ⛲ ⛺ 🌁 🌃 🏙️ 🌄 🌅 🌆 🌇 🌉 ♨️ 🎠 🎡 🎢 💈 🎪 🚀 ✈️ 🛫 🛬 🚁 🚂 🚃 🚄 🚅 🚆 🚇 🚈 🚉 🚊 🚝 🚞 🚋 🚌 🚍 🚎 🚐 🚑 🚒 🚓 🚔 🚕 🚖 🚗 🚘 🚙 🛻 🚚 🚛 🚜 🏎️ 🏍️ 🛵 🚲 🛴 🚏 🛣️ 🛤️ ⚓ ⛵ 🛶 🚤 🛳️ ⛴️ 🚢 🛸 🗺️ 🏔️ ⛰️ 🌋 🗻 🏕️ 🏖️ 🏜️ 🏝️ 🏞️".split(/\s+/) 
  }
];

function toggleEmojiPicker() {
    const p = document.getElementById('emoji-picker');
    if (p.children.length === 0) {
        buildEmojiPickerUI(p);
    }
    p.classList.toggle('hidden');
}

function buildEmojiPickerUI(container) {
    // Tabs
    const tabs = document.createElement('div');
    tabs.className = 'emoji-tabs';
    
    // Content
    const content = document.createElement('div');
    content.className = 'emoji-content';
    
    EMOJI_CATEGORIES.forEach((cat, idx) => {
        const btn = document.createElement('button');
        btn.className = 'emoji-tab';
        btn.innerText = cat.emojis[0];
        btn.title = cat.name;
        btn.onclick = (e) => {
            e.stopPropagation();
            switchCategory(idx, tabs, content);
        };
        tabs.appendChild(btn);
    });

    container.appendChild(tabs);
    container.appendChild(content);
    
    switchCategory(0, tabs, content);
}

function switchCategory(idx, tabsContainer, contentContainer) {
    // Update Tabs
    Array.from(tabsContainer.children).forEach((btn, i) => {
        if (i === idx) btn.classList.add('active');
        else btn.classList.remove('active');
    });

    // Update Content
    contentContainer.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'emoji-grid';
    
    EMOJI_CATEGORIES[idx].emojis.forEach(e => {
        if(!e) return;
        const b = document.createElement('button');
        b.className = 'emoji-btn';
        b.innerText = e;
        b.type = 'button';
        b.onclick = () => {
            const input = document.getElementById('post-input');
            input.value += e;
            input.focus();
        };
        grid.appendChild(b);
    });
    contentContainer.appendChild(grid);
}

// Close picker when clicking outside
document.addEventListener('click', (e) => {
    const p = document.getElementById('emoji-picker');
    const toggleBtn = document.querySelector('.emoji-toggle-btn');
    if (p && !p.classList.contains('hidden')) {
        if (!p.contains(e.target) && (!toggleBtn || !toggleBtn.contains(e.target))) {
            p.classList.add('hidden');
        }
    }
});

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

function goToChat() {
    if (window.parent && window.parent.showChatView) {
        window.parent.showChatView();
    }
}
