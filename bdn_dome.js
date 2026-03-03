// Dome Gallery Vanilla JS Implementation (adapted from ReactBits DomeGallery)

class VanillaDomeGallery {
    constructor(container, images, options = {}) {
        this.container = typeof container === 'string' ? document.querySelector(container) : container;
        this.images = images || [];
        this.options = Object.assign({
            fit: 0.65,
            minRadius: 400,
            maxRadius: 1000,
            padFactor: 0.25,
            overlayBlurColor: '#050505',
            maxVerticalRotationDeg: 25,
            dragSensitivity: 25,
            enlargeTransitionMs: 300,
            segments: 35,
            dragDampening: 1,
            imageBorderRadius: '12px',
            openedImageBorderRadius: '16px',
            grayscale: false, // Don't use grayscale by default so the images stand out
            fitBasis: 'auto',
            openedImageWidth: 'clamp(280px, 80vw, 450px)',
            openedImageHeight: 'clamp(380px, 85vh, 600px)',
        }, options);

        this.rotation = { x: 0, y: 0 };
        this.startRot = { x: 0, y: 0 };
        this.startPos = { x: 0, y: 0 };
        this.dragging = false;
        this.moved = false;
        this.inertiaRAF = null;
        this.opening = false;
        this.openStartedAt = 0;
        this.lastDragEndAt = 0;
        this.lockedRadius = 0;

        this.focusedEl = null;
        this.originalTilePosition = null;
        this.scrollLocked = false;

        this.initDOM();
        this.bindEvents();
        this.setupResizeObserver();
    }

    clamp(v, min, max) { return Math.min(Math.max(v, min), max); }
    normalizeAngle(d) { return ((d % 360) + 360) % 360; }
    wrapAngleSigned(deg) {
        const a = (((deg + 180) % 360) + 360) % 360;
        return a - 180;
    }

    getDataNumber(el, name, fallback) {
        const attr = el.dataset[name] ?? el.getAttribute(`data-${name}`);
        const n = attr == null ? NaN : parseFloat(attr);
        return Number.isFinite(n) ? n : fallback;
    }

    buildItems(pool, seg) {
        const xCols = Array.from({ length: seg }, (_, i) => -seg + i * 2);
        const evenYs = [-4, -2, 0, 2, 4];
        const oddYs = [-3, -1, 1, 3, 5];

        const coords = xCols.flatMap((x, c) => {
            const ys = c % 2 === 0 ? evenYs : oddYs;
            return ys.map(y => ({ x, y, sizeX: 2, sizeY: 2 }));
        });

        if (pool.length === 0) {
            return coords.map(c => ({ ...c, src: '', alt: '' }));
        }

        const normalizedImages = pool.map(image => {
            if (typeof image === 'string') return { src: image, alt: '' };
            return { src: image.src || '', alt: image.alt || '' };
        });

        const usedImages = Array.from({ length: coords.length }, (_, i) =>
            normalizedImages[i % normalizedImages.length]
        );

        // Simple shuffle-like fix to prevent adj. dups (basic attempt)
        for (let i = 1; i < usedImages.length; i++) {
            if (usedImages[i].src === usedImages[i - 1].src) {
                for (let j = i + 1; j < usedImages.length; j++) {
                    if (usedImages[j].src !== usedImages[i].src) {
                        const tmp = usedImages[i];
                        usedImages[i] = usedImages[j];
                        usedImages[j] = tmp;
                        break;
                    }
                }
            }
        }

        return coords.map((c, i) => ({
            ...c,
            src: usedImages[i].src,
            alt: usedImages[i].alt
        }));
    }

    computeItemBaseRotation(offsetX, offsetY, sizeX, sizeY, segments) {
        const unit = 360 / segments / 2;
        const rotateY = unit * (offsetX + (sizeX - 1) / 2);
        const rotateX = unit * (offsetY - (sizeY - 1) / 2);
        return { rotateX, rotateY };
    }

    applyTransform(xDeg, yDeg) {
        if (this.sphereEl) {
            this.sphereEl.style.transform = `translateZ(calc(var(--radius) * -1)) rotateX(${xDeg}deg) rotateY(${yDeg}deg)`;
        }
    }

    initDOM() {
        this.items = this.buildItems(this.images, this.options.segments);

        // Structure
        this.container.innerHTML = `
            <div class="sphere-root" style="
                --segments-x: ${this.options.segments};
                --segments-y: ${this.options.segments};
                --overlay-blur-color: ${this.options.overlayBlurColor};
                --tile-radius: ${this.options.imageBorderRadius};
                --enlarge-radius: ${this.options.openedImageBorderRadius};
                --image-filter: ${this.options.grayscale ? 'grayscale(1)' : 'none'};
            ">
                <main class="sphere-main">
                    <div class="stage">
                        <div class="sphere"></div>
                    </div>
                    <div class="overlay"></div>
                    <div class="overlay overlay--blur"></div>
                    <div class="edge-fade edge-fade--top"></div>
                    <div class="edge-fade edge-fade--bottom"></div>
                    <div class="viewer">
                        <div class="scrim"></div>
                        <div class="frame"></div>
                    </div>
                </main>
            </div>
        `;

        this.rootEl = this.container.querySelector('.sphere-root');
        this.mainEl = this.container.querySelector('.sphere-main');
        this.sphereEl = this.container.querySelector('.sphere');
        this.viewerEl = this.container.querySelector('.viewer');
        this.scrimEl = this.container.querySelector('.scrim');
        this.frameEl = this.container.querySelector('.frame');

        // Append Items
        const df = document.createDocumentFragment();
        this.items.forEach((it, i) => {
            const itemEl = document.createElement('div');
            itemEl.className = 'item';
            itemEl.dataset.src = it.src;
            itemEl.dataset.offsetX = it.x;
            itemEl.dataset.offsetY = it.y;
            itemEl.dataset.sizeX = it.sizeX;
            itemEl.dataset.sizeY = it.sizeY;
            itemEl.style.setProperty('--offset-x', it.x);
            itemEl.style.setProperty('--offset-y', it.y);
            itemEl.style.setProperty('--item-size-x', it.sizeX);
            itemEl.style.setProperty('--item-size-y', it.sizeY);

            const imageEl = document.createElement('div');
            imageEl.className = 'item__image';
            imageEl.setAttribute('role', 'button');
            imageEl.tabIndex = 0;
            imageEl.setAttribute('aria-label', it.alt || 'Open image');

            imageEl.addEventListener('click', (e) => this.onTileClick(e));
            imageEl.addEventListener('pointerup', (e) => this.onTilePointerUp(e));

            const img = document.createElement('img');
            img.src = it.src;
            img.draggable = false;
            img.alt = it.alt;

            imageEl.appendChild(img);
            itemEl.appendChild(imageEl);
            df.appendChild(itemEl);
        });

        this.sphereEl.appendChild(df);
    }

    setupResizeObserver() {
        if (!this.rootEl) return;
        this.ro = new ResizeObserver((entries) => {
            const cr = entries[0].contentRect;
            const w = Math.max(1, cr.width), h = Math.max(1, cr.height);
            const minDim = Math.min(w, h), maxDim = Math.max(w, h), aspect = w / h;

            let basis;
            switch (this.options.fitBasis) {
                case 'min': basis = minDim; break;
                case 'max': basis = maxDim; break;
                case 'width': basis = w; break;
                case 'height': basis = h; break;
                default: basis = aspect >= 1.3 ? w : minDim;
            }

            let radius = basis * this.options.fit;
            const heightGuard = h * 1.35;
            radius = Math.min(radius, heightGuard);
            radius = this.clamp(radius, this.options.minRadius, this.options.maxRadius);
            this.lockedRadius = Math.round(radius);

            const viewerPad = Math.max(8, Math.round(minDim * this.options.padFactor));
            this.rootEl.style.setProperty('--radius', `${this.lockedRadius}px`);
            this.rootEl.style.setProperty('--viewer-pad', `${viewerPad}px`);

            this.applyTransform(this.rotation.x, this.rotation.y);

            const enlargedOverlay = this.viewerEl?.querySelector('.enlarge');
            if (enlargedOverlay && this.frameEl && this.mainEl) {
                const frameR = this.frameEl.getBoundingClientRect();
                const mainR = this.mainEl.getBoundingClientRect();

                // Reposition logic
                enlargedOverlay.style.left = `${frameR.left - mainR.left}px`;
                enlargedOverlay.style.top = `${frameR.top - mainR.top}px`;
            }
        });
        this.ro.observe(this.rootEl);
    }

    stopInertia() {
        if (this.inertiaRAF) {
            cancelAnimationFrame(this.inertiaRAF);
            this.inertiaRAF = null;
        }
    }

    startInertia(vx, vy) {
        const MAX_V = 1.4;
        let vX = this.clamp(vx, -MAX_V, MAX_V) * 80;
        let vY = this.clamp(vy, -MAX_V, MAX_V) * 80;
        let frames = 0;
        const d = this.clamp(this.options.dragDampening, 0, 1);
        const frictionMul = 0.94 + 0.055 * d;
        const stopThreshold = 0.015 - 0.01 * d;
        const maxFrames = Math.round(90 + 270 * d);

        const step = () => {
            vX *= frictionMul;
            vY *= frictionMul;
            if (Math.abs(vX) < stopThreshold && Math.abs(vY) < stopThreshold || ++frames > maxFrames) {
                this.inertiaRAF = null; return;
            }
            const nextX = this.clamp(this.rotation.x - vY / 200, -this.options.maxVerticalRotationDeg, this.options.maxVerticalRotationDeg);
            const nextY = this.wrapAngleSigned(this.rotation.y + vX / 200);
            this.rotation = { x: nextX, y: nextY };
            this.applyTransform(nextX, nextY);
            this.inertiaRAF = requestAnimationFrame(step);
        };
        this.stopInertia();
        this.inertiaRAF = requestAnimationFrame(step);
    }

    bindEvents() {
        const events = {
            pointerdown: (e) => {
                if (this.focusedEl || e.button !== 0) return;
                this.stopInertia();
                this.dragging = true;
                this.moved = false;
                this.startRot = { ...this.rotation };
                this.startPos = { x: e.clientX, y: e.clientY };
                this.lastVelocity = { x: 0, y: 0 };
                this.lastTime = performance.now();
                this.mainEl.setPointerCapture(e.pointerId);
            },
            pointermove: (e) => {
                if (!this.dragging || !this.startPos) return;
                const dxTotal = e.clientX - this.startPos.x;
                const dyTotal = e.clientY - this.startPos.y;

                if (!this.moved && (dxTotal * dxTotal + dyTotal * dyTotal > 16)) {
                    this.moved = true;
                }

                const nextX = this.clamp(
                    this.startRot.x - dyTotal / this.options.dragSensitivity,
                    -this.options.maxVerticalRotationDeg,
                    this.options.maxVerticalRotationDeg
                );
                const nextY = this.wrapAngleSigned(this.startRot.y + dxTotal / this.options.dragSensitivity);

                if (this.rotation.x !== nextX || this.rotation.y !== nextY) {
                    this.rotation = { x: nextX, y: nextY };
                    this.applyTransform(nextX, nextY);
                }

                const now = performance.now();
                const dt = Math.max(1, now - this.lastTime);
                this.lastVelocity = {
                    x: (e.movementX || 0) / dt,
                    y: (e.movementY || 0) / dt
                };
                this.lastTime = now;
            },
            pointerup: (e) => {
                if (!this.dragging) return;
                this.dragging = false;
                this.mainEl.releasePointerCapture(e.pointerId);

                let vx = this.clamp(this.lastVelocity.x * 10, -1.2, 1.2);
                let vy = this.clamp(this.lastVelocity.y * 10, -1.2, 1.2);

                if (Math.abs(vx) > 0.05 || Math.abs(vy) > 0.05) this.startInertia(vx, vy);
                if (this.moved) this.lastDragEndAt = performance.now();
                this.moved = false;
            }
        };

        this.mainEl.addEventListener('pointerdown', events.pointerdown);
        this.mainEl.addEventListener('pointermove', events.pointermove);
        this.mainEl.addEventListener('pointerup', events.pointerup);

        this.scrimEl.addEventListener('click', () => this.closeFocusedItem());
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeFocusedItem();
        });
    }

    onTileClick(e) {
        if (this.dragging || this.moved || (performance.now() - this.lastDragEndAt < 80) || this.opening) return;
        this.openItemFromElement(e.currentTarget);
    }

    onTilePointerUp(e) {
        if (e.pointerType !== 'touch' || this.dragging || this.moved || (performance.now() - this.lastDragEndAt < 80) || this.opening) return;
        this.openItemFromElement(e.currentTarget);
    }

    openItemFromElement(el) {
        if (this.opening || this.focusedEl) return;
        this.opening = true;
        this.openStartedAt = performance.now();
        this.scrollLocked = true;

        const parent = el.parentElement;
        this.focusedEl = el;
        el.setAttribute('data-focused', 'true');

        const offsetX = this.getDataNumber(parent, 'offsetX', 0);
        const offsetY = this.getDataNumber(parent, 'offsetY', 0);
        const sizeX = this.getDataNumber(parent, 'sizeX', 2);
        const sizeY = this.getDataNumber(parent, 'sizeY', 2);

        const parentRot = this.computeItemBaseRotation(offsetX, offsetY, sizeX, sizeY, this.options.segments);
        const parentY = this.normalizeAngle(parentRot.rotateY);
        const globalY = this.normalizeAngle(this.rotation.y);

        let rotY = -(parentY + globalY) % 360;
        if (rotY < -180) rotY += 360;
        const rotX = -parentRot.rotateX - this.rotation.x;

        parent.style.setProperty('--rot-y-delta', `${rotY}deg`);
        parent.style.setProperty('--rot-x-delta', `${rotX}deg`);

        const refDiv = document.createElement('div');
        refDiv.className = 'item__image item__image--reference';
        refDiv.style.opacity = '0';
        refDiv.style.transform = `rotateX(${-parentRot.rotateX}deg) rotateY(${-parentRot.rotateY}deg)`;
        parent.appendChild(refDiv);

        void refDiv.offsetHeight; // force reflow

        const tileR = refDiv.getBoundingClientRect();
        const mainR = this.mainEl.getBoundingClientRect();
        const frameR = this.frameEl.getBoundingClientRect();

        if (tileR.width <= 0) {
            this.opening = false;
            this.focusedEl = null;
            parent.removeChild(refDiv);
            this.scrollLocked = false;
            return;
        }

        this.originalTilePosition = { left: tileR.left, top: tileR.top, width: tileR.width, height: tileR.height };
        el.style.visibility = 'hidden';

        const overlay = document.createElement('div');
        overlay.className = 'enlarge';
        overlay.style.position = 'absolute';
        overlay.style.left = `${frameR.left - mainR.left}px`;
        overlay.style.top = `${frameR.top - mainR.top}px`;
        overlay.style.width = `${frameR.width}px`;
        overlay.style.height = `${frameR.height}px`;
        overlay.style.opacity = '0';
        overlay.style.zIndex = '30';
        overlay.style.willChange = 'transform, opacity';
        overlay.style.transformOrigin = 'top left';
        overlay.style.transition = `transform ${this.options.enlargeTransitionMs}ms ease, opacity ${this.options.enlargeTransitionMs}ms ease`;

        const rawSrc = parent.dataset.src || '';
        const img = document.createElement('img');
        img.src = rawSrc;
        overlay.appendChild(img);
        this.viewerEl.appendChild(overlay);

        const tx0 = tileR.left - frameR.left;
        const ty0 = tileR.top - frameR.top;
        const sx0 = tileR.width / frameR.width;
        const sy0 = tileR.height / frameR.height;

        overlay.style.transform = `translate(${tx0}px, ${ty0}px) scale(${sx0}, ${sy0})`;

        setTimeout(() => {
            if (!overlay.parentElement) return;
            overlay.style.opacity = '1';
            overlay.style.transform = 'translate(0px, 0px) scale(1, 1)';
            this.rootEl.setAttribute('data-enlarging', 'true');
        }, 16);

        // End transition
        overlay.addEventListener('transitionend', (e) => {
            if (e.propertyName !== 'transform') return;
            // Additional styling logic could go here for custom widths
        }, { once: true });
    }

    closeFocusedItem() {
        if (!this.focusedEl || performance.now() - this.openStartedAt < 250) return;

        const el = this.focusedEl;
        const parent = el.parentElement;
        const overlay = this.viewerEl?.querySelector('.enlarge');
        const refDiv = parent.querySelector('.item__image--reference');

        if (!overlay || !this.originalTilePosition) return;

        const rootRect = this.rootEl.getBoundingClientRect();
        const currentRect = overlay.getBoundingClientRect();

        const origPos = {
            left: this.originalTilePosition.left - rootRect.left,
            top: this.originalTilePosition.top - rootRect.top,
            width: this.originalTilePosition.width,
            height: this.originalTilePosition.height
        };
        const curPos = {
            left: currentRect.left - rootRect.left,
            top: currentRect.top - rootRect.top,
            width: currentRect.width,
            height: currentRect.height
        };

        const animatingOverlay = document.createElement('div');
        animatingOverlay.className = 'enlarge-closing';
        animatingOverlay.style.cssText = `position:absolute;left:${curPos.left}px;top:${curPos.top}px;width:${curPos.width}px;height:${curPos.height}px;z-index:9999;border-radius:${this.options.openedImageBorderRadius};overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.35);transition:all ${this.options.enlargeTransitionMs}ms ease-out;pointer-events:none;`;

        const originalImg = overlay.querySelector('img');
        if (originalImg) {
            const img = originalImg.cloneNode();
            img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
            animatingOverlay.appendChild(img);
        }

        overlay.remove();
        this.rootEl.appendChild(animatingOverlay);

        void animatingOverlay.getBoundingClientRect();

        requestAnimationFrame(() => {
            animatingOverlay.style.left = `${origPos.left}px`;
            animatingOverlay.style.top = `${origPos.top}px`;
            animatingOverlay.style.width = `${origPos.width}px`;
            animatingOverlay.style.height = `${origPos.height}px`;
            animatingOverlay.style.opacity = '0';
        });

        animatingOverlay.addEventListener('transitionend', () => {
            animatingOverlay.remove();
            this.originalTilePosition = null;
            if (refDiv) refDiv.remove();

            parent.style.transition = 'none';
            parent.style.setProperty('--rot-y-delta', '0deg');
            parent.style.setProperty('--rot-x-delta', '0deg');

            requestAnimationFrame(() => {
                el.style.visibility = '';
                el.style.opacity = '0';
                this.focusedEl = null;
                this.rootEl.removeAttribute('data-enlarging');

                requestAnimationFrame(() => {
                    el.style.transition = 'opacity 300ms ease-out';
                    requestAnimationFrame(() => {
                        el.style.opacity = '1';
                        setTimeout(() => {
                            el.style.transition = '';
                            el.style.opacity = '';
                            this.opening = false;
                        }, 300);
                    });
                });
            });
        }, { once: true });
    }
}

window.VanillaDomeGallery = VanillaDomeGallery;
