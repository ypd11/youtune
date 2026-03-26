document.addEventListener('DOMContentLoaded', () => {
    initContentProtection();
});

function initContentProtection() {
    // Disable context menu (right-click)
    document.addEventListener('contextmenu', event => event.preventDefault());

    // Disable copy event (Ctrl+C or Menu)
    document.addEventListener('copy', event => {
        const tag = event.target.tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA') event.preventDefault();
    });
}

function closeTab(e) {
    e.preventDefault();
    window.close();
}