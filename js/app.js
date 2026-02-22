// WikiBlueboop App Logic

async function loadArticle(articleName) {
    const titleElement = document.getElementById('article-title');
    const contentElement = document.getElementById('article-content');

    // Normalize article name
    if (!articleName || articleName === '/' || articleName === '#') {
        articleName = 'Main_Page';
    } else {
        articleName = articleName.replace(/^#\//, '');
    }

    // Update title
    const displayTitle = articleName.replace(/_/g, ' ');
    titleElement.textContent = displayTitle;
    document.title = displayTitle + " - WikiBlueboop";

    try {
        // Fetch article content
        const response = await fetch(`content/${articleName}.mw`);
        if (!response.ok) {
            throw new Error('Article not found');
        }
        const wikitext = await response.text();

        // Render Wikitext to HTML
        let html = wiky.process(wikitext);

        // Generate Table of Contents
        const headers = [];
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        const hTags = tempDiv.querySelectorAll('h2, h3');

        if (hTags.length > 3) {
            let tocHtml = '<div id="toc" style="border: 1px solid #6fbaff; background: rgba(255,255,255,0.05); padding: 10px; display: inline-block; margin-bottom: 20px;">';
            tocHtml += '<div style="font-weight: bold; text-align: center;">Contents</div><ul>';
            hTags.forEach((h, index) => {
                const id = `section-${index}`;
                h.id = id;
                const level = h.tagName === 'H2' ? 1 : 2;
                tocHtml += `<li style="margin-left: ${(level-1)*20}px"><a href="#${id}" onclick="document.getElementById('${id}').scrollIntoView(); return false;">${h.textContent}</a></li>`;
            });
            tocHtml += '</ul></div>';
            html = tocHtml + tempDiv.innerHTML;
        } else {
            html = tempDiv.innerHTML;
        }

        contentElement.innerHTML = html;

        // Scroll to top
        window.scrollTo(0, 0);
    } catch (error) {
        contentElement.innerHTML = `
            <div style="border: 2px dashed #f00; padding: 20px; background: rgba(255,0,0,0.1);">
                <h2>Article not found</h2>
                <p>The article "<b>${displayTitle}</b>" does not exist yet.</p>
                <p>To create it, add a file named <code>${articleName}.mw</code> to the <code>content/</code> folder in the GitHub repository.</p>
                <a href="#/Main_Page">Return to Main Page</a>
            </div>
        `;
    }
}

function wikiSearch() {
    const query = document.getElementById('wikiSearch').value.trim();
    if (query) {
        window.location.hash = `#/${query.replace(/ /g, '_')}`;
    }
}

// Random counter vibe
document.getElementById('random-counter').textContent = Math.floor(Math.random() * 100000);

// Routing
window.addEventListener('hashchange', () => {
    loadArticle(window.location.hash);
});

// Initial load
window.addEventListener('DOMContentLoaded', () => {
    loadArticle(window.location.hash);
});

// Search on Enter
document.getElementById('wikiSearch').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        wikiSearch();
    }
});
