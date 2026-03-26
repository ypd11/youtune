document.addEventListener('DOMContentLoaded', () => {
    initContentProtection();
    const items = document.querySelectorAll('.faq-item');

    items.forEach(item => {
        const question = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');

        // Wrap content for height calculation
        const content = document.createElement('div');
        content.className = 'faq-answer-content';
        while (answer.firstChild) {
            content.appendChild(answer.firstChild);
        }
        answer.appendChild(content);

        question.addEventListener('click', () => {
            const isActive = item.classList.contains('active');

            // Close all others
            items.forEach(other => {
                other.classList.remove('active');
                other.querySelector('.faq-answer').style.maxHeight = null;
            });

            // Toggle current
            if (!isActive) {
                item.classList.add('active');
                answer.style.maxHeight = content.scrollHeight + "px";
            }
        });
    });
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
