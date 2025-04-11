// Navigation toggle functionality
const navToggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('.nav');
const navLinks = document.querySelectorAll('.nav__link');

if (navToggle) {
    navToggle.addEventListener('click', () => {
        document.body.classList.toggle('nav-open');
        // Adjust background color based on theme
        if (document.body.classList.contains('nav-open')) {
            nav.style.backgroundColor = document.documentElement.getAttribute('data-theme') === 'dark' 
                ? 'var(--clr-dark)' 
                : 'var(--clr-bg)';
        }
    });
}

navLinks.forEach(link => {
    link.addEventListener('click', () => {
        document.body.classList.remove('nav-open');
    });
});

// Dark mode initialization and system preference handling
document.addEventListener('DOMContentLoaded', () => {
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    const storedTheme = localStorage.getItem('theme');
    const themeToggle = document.getElementById('theme-toggle');
    
    // Set initial theme based on stored preference or system preference
    const currentTheme = storedTheme || (prefersDarkScheme.matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', currentTheme);
    
    if (themeToggle) {
        const icon = themeToggle.querySelector('i');
        if (currentTheme === 'dark') {
            icon.classList.replace('fa-moon', 'fa-sun');
        }
        
        // Theme toggle handler
        themeToggle.addEventListener('click', () => {
            const theme = document.documentElement.getAttribute('data-theme');
            const newTheme = theme === 'dark' ? 'light' : 'dark';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            
            icon.classList.replace(
                newTheme === 'dark' ? 'fa-moon' : 'fa-sun',
                newTheme === 'dark' ? 'fa-sun' : 'fa-moon'
            );
        });
    }
    
    // Handle system theme changes
    prefersDarkScheme.addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            const newTheme = e.matches ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            
            if (themeToggle) {
                const icon = themeToggle.querySelector('i');
                icon.classList.replace(
                    newTheme === 'dark' ? 'fa-moon' : 'fa-sun',
                    newTheme === 'dark' ? 'fa-sun' : 'fa-moon'
                );
            }
        }
    });
});

// Reading time estimation
function addReadingTime() {
    const WORDS_PER_MINUTE = 200;
    const articles = document.querySelectorAll('.blog-post__content, .blog-content article');
    
    articles.forEach(article => {
        const text = article.textContent;
        const wordCount = text.trim().split(/\s+/).length;
        const readingTime = Math.ceil(wordCount / WORDS_PER_MINUTE);
        
        const timeElement = document.createElement('span');
        timeElement.className = 'reading-time';
        timeElement.innerHTML = `<i class="far fa-clock"></i>${readingTime} min read`;
        
        const meta = article.querySelector('.blog-post__meta');
        if (meta) {
            meta.appendChild(timeElement);
        }
    });
}

// Blog tag functionality
function handleBlogTags() {
    const tags = document.querySelectorAll('.tag');
    
    // Check if there's a tag in the URL hash
    const activeTag = window.location.hash.slice(1);
    if (activeTag) {
        tags.forEach(tag => {
            if (tag.href.includes(activeTag)) {
                tag.classList.add('active');
            }
        });
    }
    
    // Add click handler for tags
    tags.forEach(tag => {
        tag.addEventListener('click', (e) => {
            // Remove active class from all tags
            tags.forEach(t => t.classList.remove('active'));
            // Add active class to clicked tag
            e.target.classList.add('active');
        });
    });
}

// Initialize blog functionality if we're on a blog page
if (document.querySelector('.blog-post')) {
    handleBlogTags();
}

// Initialize all functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    addReadingTime();
    handleBlogTags();
});
