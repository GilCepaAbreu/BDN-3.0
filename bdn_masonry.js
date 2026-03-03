// bdn_masonry.js
class VanillaMasonryGallery {
    constructor(container, images, options = {}) {
        this.container = typeof container === 'string' ? document.querySelector(container) : container;

        // Setup items
        this.items = images.map((img, index) => {
            return {
                id: `masonry-item-${index}`,
                img: typeof img === 'string' ? img : img.src,
                url: typeof img === 'object' && img.url ? img.url : null,
                aspectRatio: null
            };
        });

        this.options = Object.assign({
            ease: 'power3.out',
            duration: 0.6,
            stagger: 0.05,
            animateFrom: 'bottom', // 'top', 'bottom', 'left', 'right', 'center', 'random'
            scaleOnHover: true,
            hoverScale: 0.95,
            blurToFocus: true,
            colorShiftOnHover: false
        }, options);

        this.columns = 1;
        this.width = 0;
        this.imagesReady = false;
        this.hasMounted = false;

        this.container.classList.add('masonry-list');

        // Ensure container has scrolling if needed
        this.container.style.overflowY = 'auto';
        this.container.style.overflowX = 'hidden';
        this.container.style.height = '100%';
        this.container.style.width = '100%';

        this.childElements = new Map();

        this.initDOM();
        this.setupResizeObserver();
        this.preloadImages();
    }

    getColumns(width) {
        if (width >= 1500) return 5;
        if (width >= 1000) return 4;
        if (width >= 600) return 3;
        if (width >= 400) return 2;
        return 1;
    }

    getInitialPosition(item) {
        const containerRect = this.container.getBoundingClientRect();
        if (!containerRect) return { x: item.x, y: item.y };

        let direction = this.options.animateFrom;

        if (direction === 'random') {
            const directions = ['top', 'bottom', 'left', 'right'];
            direction = directions[Math.floor(Math.random() * directions.length)];
        }

        switch (direction) {
            case 'top': return { x: item.x, y: -200 };
            case 'bottom': return { x: item.x, y: window.innerHeight + 200 };
            case 'left': return { x: -200, y: item.y };
            case 'right': return { x: window.innerWidth + 200, y: item.y };
            case 'center': return {
                x: containerRect.width / 2 - item.w / 2,
                y: containerRect.height / 2 - item.h / 2
            };
            default: return { x: item.x, y: item.y + 100 };
        }
    }

    async preloadImages() {
        const urls = this.items.map(i => i.img);
        await Promise.all(
            urls.map(src => new Promise(resolve => {
                const img = new Image();
                img.src = src;
                img.onload = () => {
                    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                        const matchedItem = this.items.find(i => i.img === src);
                        if (matchedItem) {
                            matchedItem.aspectRatio = img.naturalHeight / img.naturalWidth;
                        }
                    }
                    resolve();
                };
                img.onerror = () => resolve(); // continue even if fails
            }))
        );
        this.imagesReady = true;
        this.renderGrid();
    }

    setupResizeObserver() {
        this.resizeObserver = new ResizeObserver((entries) => {
            const { width } = entries[0].contentRect;
            if (this.width !== width) {
                this.width = width;
                this.columns = this.getColumns(width);
                if (this.imagesReady) {
                    this.renderGrid();
                }
            }
        });
        this.resizeObserver.observe(this.container);
    }

    initDOM() {
        this.container.innerHTML = '';
        this.items.forEach((item, index) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'masonry-item-wrapper';
            wrapper.dataset.key = item.id;

            const imgDiv = document.createElement('div');
            imgDiv.className = 'masonry-item-img';
            imgDiv.style.backgroundImage = `url(${item.img})`;

            if (this.options.colorShiftOnHover) {
                const overlay = document.createElement('div');
                overlay.className = 'masonry-color-overlay';
                imgDiv.appendChild(overlay);
            }

            wrapper.appendChild(imgDiv);

            if (item.url) {
                wrapper.addEventListener('click', () => window.open(item.url, '_blank', 'noopener'));
            }

            wrapper.addEventListener('mouseenter', (e) => this.handleMouseEnter(e, item));
            wrapper.addEventListener('mouseleave', (e) => this.handleMouseLeave(e, item));

            this.container.appendChild(wrapper);
            this.childElements.set(item.id, wrapper);
        });
    }

    handleMouseEnter(e, item) {
        const element = e.currentTarget;
        const cursor = document.querySelector('.custom-cursor');
        if (cursor) cursor.classList.add('hover');

        if (this.options.scaleOnHover) {
            gsap.to(element, {
                scale: this.options.hoverScale,
                duration: 0.3,
                ease: 'power2.out'
            });
        }
        if (this.options.colorShiftOnHover) {
            const overlay = element.querySelector('.masonry-color-overlay');
            if (overlay) {
                gsap.to(overlay, { opacity: 0.3, duration: 0.3 });
            }
        }
    }

    handleMouseLeave(e, item) {
        const element = e.currentTarget;
        const cursor = document.querySelector('.custom-cursor');
        if (cursor) cursor.classList.remove('hover');

        if (this.options.scaleOnHover) {
            gsap.to(element, {
                scale: 1,
                duration: 0.3,
                ease: 'power2.out'
            });
        }
        if (this.options.colorShiftOnHover) {
            const overlay = element.querySelector('.masonry-color-overlay');
            if (overlay) {
                gsap.to(overlay, { opacity: 0, duration: 0.3 });
            }
        }
    }

    calculateGrid() {
        if (!this.width) return [];

        const colHeights = new Array(this.columns).fill(0);
        const columnWidth = this.width / this.columns;

        return this.items.map(child => {
            const col = colHeights.indexOf(Math.min(...colHeights));
            const x = columnWidth * col;

            // Allow random fallback heights for demo if aspect is missing
            const height = child.aspectRatio ? (columnWidth * child.aspectRatio) : (250 + Math.random() * 300);

            const y = colHeights[col];
            colHeights[col] += height;

            this.containerHeight = Math.max(...colHeights);

            return { ...child, x, y, w: columnWidth, h: height };
        });
    }

    renderGrid() {
        const grid = this.calculateGrid();

        let scrollSpacer = this.container.querySelector('.masonry-scroll-spacer');
        if (!scrollSpacer) {
            scrollSpacer = document.createElement('div');
            scrollSpacer.className = 'masonry-scroll-spacer';
            scrollSpacer.style.width = '1px';
            scrollSpacer.style.position = 'absolute';
            this.container.appendChild(scrollSpacer);
        }
        scrollSpacer.style.height = `${this.containerHeight}px`;

        grid.forEach((item, index) => {
            const el = this.childElements.get(item.id);
            if (!el) return;

            const animationProps = {
                x: item.x,
                y: item.y,
                width: item.w,
                height: item.h
            };

            if (!this.hasMounted) {
                const initialPos = this.getInitialPosition(item);
                const initialState = {
                    opacity: 0,
                    x: initialPos.x,
                    y: initialPos.y,
                    width: item.w,
                    height: item.h,
                    ...(this.options.blurToFocus && { filter: 'blur(10px)' })
                };

                gsap.fromTo(el, initialState, {
                    opacity: 1,
                    ...animationProps,
                    ...(this.options.blurToFocus && { filter: 'blur(0px)' }),
                    duration: 0.8,
                    ease: 'power3.out',
                    delay: index * this.options.stagger
                });
            } else {
                gsap.to(el, {
                    ...animationProps,
                    duration: this.options.duration,
                    ease: this.options.ease,
                    overwrite: 'auto'
                });
            }
        });

        this.hasMounted = true;
    }

    destroy() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        this.container.innerHTML = '';
        this.hasMounted = false;
        this.imagesReady = false;
        this.childElements.clear();
    }
}

window.VanillaMasonryGallery = VanillaMasonryGallery;
