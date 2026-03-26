// --- CONFIG ---
const SUPABASE_URL = "https://ojmwufjrxgxegxfewfql.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qbXd1ZmpyeGd4ZWd4ZmV3ZnFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNjg4ODUsImV4cCI6MjA4NDk0NDg4NX0.sJ-FGTBDX070EjLmvFvwJF2tyihEUs4Ltfw7PNrAWFo";

// --- STATE ---
let supabaseClient = null;
let myNickname = localStorage.getItem('yt_nickname') || "Guest";
let myVotes = new Set();
let currentFilter = 'all';
let isAdmin = localStorage.getItem('yt_admin_mode') === 'true';
let confirmActionCallback = null;

// --- INIT ---
window.onload = () => {
    initContentProtection();
    initSupabase();
    initRealtime();
    updateAdminUI();
    loadPosts();
};

function initSupabase() {
    if (window.supabase) {
        const { createClient } = window.supabase;
        supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
    }
}

function updateAdminUI() {
    const btn = document.querySelector('.admin-login-btn span');
    if (btn) {
        btn.innerText = isAdmin ? 'lock_open' : 'lock';
    }
}

function initRealtime() {
    if (!supabaseClient) return;
    const channel = supabaseClient.channel('feedback-feed');
    channel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'feedback_posts' }, () => loadPosts())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'feedback_votes' }, () => loadPosts())
        .subscribe();
}

// --- LOAD POSTS ---
async function loadPosts() {
    if (!supabaseClient) return;
    
    const loader = document.getElementById('loader');
    // Only show loader if empty
    if (document.getElementById('feed-container').children.length === 0) loader.classList.remove('hidden');

    // Fetch posts + vote count
    let query = supabaseClient
        .from('feedback_posts')
        .select('*, feedback_votes(count)')
        .order('created_at', { ascending: false });

    if (currentFilter !== 'all') {
        query = query.eq('tag', currentFilter);
    }

    const { data, error } = await query;

    if (error) {
        console.error(error);
        showToast("Error loading feedback");
        return;
    }

    // Fetch my votes
    if (data.length > 0) {
        const postIds = data.map(p => p.id);
        const { data: votes } = await supabaseClient
            .from('feedback_votes')
            .select('post_id')
            .eq('username', myNickname)
            .in('post_id', postIds);
        
        myVotes.clear();
        if (votes) votes.forEach(v => myVotes.add(v.post_id));
    }

    renderPosts(data);
    loader.classList.add('hidden');
}

function renderPosts(posts) {
    const container = document.getElementById('feed-container');
    container.innerHTML = '';

    if (posts.length === 0) {
        container.innerHTML = '<div style="text-align:center; color:#9ca3af; margin-top:20px;">No posts found.</div>';
        return;
    }

    posts.forEach(post => {
        const voteCount = post.feedback_votes ? post.feedback_votes[0].count : 0;
        const isVoted = myVotes.has(post.id);
        const voteIcon = isVoted ? 'favorite' : 'favorite_border';
        
        const el = document.createElement('div');
        el.className = 'post-card';
        el.innerHTML = `
            <div class="vote-column">
                <button class="vote-btn ${isVoted ? 'voted' : ''}" onclick="toggleVote(${post.id})">
                    <span class="material-icons">${voteIcon}</span>
                </button>
                <span class="vote-count">${voteCount}</span>
            </div>
            <div class="content-column">
                <div class="post-meta">
                    <div class="meta-left">
                        <span class="post-tag ${post.tag}">${post.tag === 'bug' ? 'Bug' : 'Feedback'}</span>
                        <span class="post-status status-${post.status}">${formatStatus(post.status)}</span>
                    </div>
                    ${isAdmin ? getAdminControls(post) : ''}
                </div>
                <div class="post-text">${escapeHtml(post.content)}</div>
                <div class="post-footer">
                    by <strong>${escapeHtml(post.username)}</strong> • ${formatDate(post.created_at)}
                </div>
            </div>
        `;
        container.appendChild(el);
    });
}

// --- ACTIONS ---
async function createPost() {
    const input = document.getElementById('post-input');
    const content = input.value.trim();
    const tag = document.querySelector('input[name="tag"]:checked').value;

    if (!content) return;

    const { error } = await supabaseClient
        .from('feedback_posts')
        .insert([{ username: myNickname, content: content, tag: tag }]);

    if (error) {
        showToast("Failed to submit");
    } else {
        input.value = '';
        showToast("Feedback submitted!");
        //loadPosts();
    }
}

async function toggleVote(id) {
    try {
        if (myVotes.has(id)) {
            // Remove vote
            const { error } = await supabaseClient.from('feedback_votes').delete().match({ post_id: id, username: myNickname });
            if (error) throw error;
            myVotes.delete(id);
        } else {
            // Add vote
            const { error } = await supabaseClient.from('feedback_votes').insert([{ post_id: id, username: myNickname }]);
            if (error) throw error;
            myVotes.add(id);
        }
        //loadPosts(); 
    } catch (e) {
        console.error("Vote failed:", e);
        showToast("Vote failed: " + e.message);
    }
}

function filterPosts(type, btn) {
    currentFilter = type;
    
    // Update UI
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    loadPosts();
}

// --- ADMIN ---
function getAdminControls(post) {
    return `
        <select class="status-select" onchange="updateStatus(${post.id}, this.value)">
            <option value="open" ${post.status === 'open' ? 'selected' : ''}>Open</option>
            <option value="in_progress" ${post.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
            <option value="done" ${post.status === 'done' ? 'selected' : ''}>Done</option>
        </select>
        <button class="vote-btn" onclick="deletePost(${post.id})" style="color:#ef4444;"><span class="material-icons">delete</span></button>
    `;
}

async function updateStatus(id, newStatus) {
    if (!isAdmin) return;
    const { error } = await supabaseClient.from('feedback_posts').update({ status: newStatus }).eq('id', id);
    if (error) {
        console.error("Update failed:", error);
        showToast("Error: " + error.message);
        loadPosts(); // Revert UI on failure
    } else {
        showToast("Status updated");
    }
}

async function deletePost(id) {
    if (!isAdmin) return;
    openConfirmationModal("Delete Post?", "Are you sure you want to delete this post? This cannot be undone.", "Delete", async () => {
        const { error } = await supabaseClient.from('feedback_posts').delete().eq('id', id);
        if (error) {
            console.error("Delete failed:", error);
            showToast("Error: " + error.message);
        } else {
            showToast("Post deleted");
        }
    });
}

// --- UTILS ---
function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[s]);
}

function formatDate(isoStr) {
    const d = new Date(isoStr);
    return d.toLocaleDateString();
}

function formatStatus(status) {
    if (status === 'in_progress') return 'In Progress';
    return status.charAt(0).toUpperCase() + status.slice(1);
}

function showToast(msg) {
    const t = document.getElementById('toast');
    t.innerText = msg;
    t.classList.remove('hidden');
    setTimeout(() => t.classList.add('hidden'), 3000);
}

// --- ADMIN LOGIN ---
function openAdminModal() {
    if (isAdmin) {
        openConfirmationModal("Logout", "Are you sure you want to logout of Admin Mode?", "Logout", () => {
            localStorage.removeItem('yt_admin_mode');
            location.reload();
        });
        return;
    }
    document.getElementById('admin-modal').classList.remove('hidden');
    document.getElementById('admin-password').focus();
}

function closeAdminModal() {
    document.getElementById('admin-modal').classList.add('hidden');
    document.getElementById('admin-password').value = '';
}

async function submitAdminLogin() {
    const pwd = document.getElementById('admin-password').value;
    if (!pwd) return;

    const { data, error } = await supabaseClient.rpc('verify_admin_password', { password: pwd });

    if (data === true) {
        localStorage.setItem('yt_admin_mode', 'true');
        showToast("Login Successful 🛡️");
        setTimeout(() => location.reload(), 500);
    } else {
        closeAdminModal();
        showToast("Incorrect Password ❌");
    }
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