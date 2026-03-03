class ChromaGridApp {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? document.querySelector(container) : container;
        this.items = options.items || [];
        this.radius = options.radius || 300;
        this.damping = options.damping || 0.45;
        this.fadeOut = options.fadeOut || 0.6;

        // Define some beautiful dark gradients and border colors
        this.themeColors = [
            { border: '#4F46E5', gradient: 'linear-gradient(145deg, #1e1b4b, #000)' }, // Indigo
            { border: '#10B981', gradient: 'linear-gradient(210deg, #064e3b, #000)' }, // Emerald
            { border: '#F59E0B', gradient: 'linear-gradient(165deg, #78350f, #000)' }, // Amber
            { border: '#ec4899', gradient: 'linear-gradient(200deg, #831843, #000)' }, // Pink
            { border: '#8b5cf6', gradient: 'linear-gradient(180deg, #4c1d95, #000)' }  // Violet
        ];

        this.initDOM();
        this.bindEvents();
    }

    initDOM() {
        this.container.innerHTML = '';

        // Make sure container acts properly
        this.container.style.position = 'absolute';
        this.container.style.top = '0';
        this.container.style.left = '0';
        this.container.style.width = '100vw';
        this.container.style.height = '100vh';
        this.container.style.overflowY = 'auto'; // allow scrolling if lots of items
        this.container.style.overflowX = 'hidden';
        this.container.style.zIndex = '9998';
        this.container.style.display = 'block';

        const grid = document.createElement('div');
        grid.className = 'chroma-grid';
        grid.style.setProperty('--r', `${this.radius}px`);

        this.items.forEach((item, i) => {
            const article = document.createElement('article');
            article.className = 'chroma-card';

            // Assign a theme color scheme round-robin style
            const theme = this.themeColors[i % this.themeColors.length];
            article.style.setProperty('--card-border', theme.border);
            article.style.setProperty('--card-gradient', theme.gradient);

            // Add inner HTML structure
            article.innerHTML = `
                <div class="chroma-img-wrapper">
                    <img src="${item.image}" alt="Gallery Image" loading="lazy">
                </div>
                <footer class="chroma-info">
                    <h3 class="name">${item.text || ''}</h3>
                    <p class="role">${item.subtitle || 'BDN Projeto Oficial'}</p>
                </footer>
            `;

            article.addEventListener('mousemove', (e) => {
                const rect = article.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                article.style.setProperty('--mouse-x', `${x}px`);
                article.style.setProperty('--mouse-y', `${y}px`);
            });

            grid.appendChild(article);
        });

        const overlay = document.createElement('div');
        overlay.className = 'chroma-overlay';
        grid.appendChild(overlay);

        this.fadeEl = document.createElement('div');
        this.fadeEl.className = 'chroma-fade';
        grid.appendChild(this.fadeEl);

        this.container.appendChild(grid);
        this.grid = grid;

        // Initialize GSAP setters
        const gridRect = grid.getBoundingClientRect();
        this.pos = { x: gridRect.width / 2, y: gridRect.height / 2 };
        this.setX = gsap.quickSetter(grid, '--x', 'px');
        this.setY = gsap.quickSetter(grid, '--y', 'px');
        this.setX(this.pos.x);
        this.setY(this.pos.y);
    }

    bindEvents() {
        this.handleMove = (e) => {
            if (!this.grid) return;
            const rect = this.grid.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            gsap.to(this.pos, {
                x, y, duration: this.damping, ease: "power3.out",
                onUpdate: () => {
                    this.setX(this.pos.x);
                    this.setY(this.pos.y);
                },
                overwrite: true
            });
            gsap.to(this.fadeEl, { opacity: 0, duration: 0.25, overwrite: true });
        };

        this.handleLeave = () => {
            if (!this.fadeEl) return;
            gsap.to(this.fadeEl, { opacity: 1, duration: this.fadeOut, overwrite: true });
        };

        this.grid.addEventListener('pointermove', this.handleMove);
        this.grid.addEventListener('pointerleave', this.handleLeave);
    }

    destroy() {
        if (this.grid) {
            this.grid.removeEventListener('pointermove', this.handleMove);
            this.grid.removeEventListener('pointerleave', this.handleLeave);
            gsap.killTweensOf(this.pos);
            if (this.fadeEl) gsap.killTweensOf(this.fadeEl);
        }
        this.container.innerHTML = '';
        this.grid = null;
    }
}
window.ChromaGridApp = ChromaGridApp;
