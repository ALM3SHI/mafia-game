// effects.js - MAFIA Visual & Audio Effects Engine
// This file handles particles, page transitions, and audio hooks used across all pages.

window.MafiaFX = {
    // -------------------------
    // 1. Audio System with Volume Control
    // -------------------------
    // SFX files needed in /assets/ folder (USER WILL ADD THESE)
    sounds: {
        // Core Game Sounds
        click: new Audio('assets/sfx-click.mp3'),
        hover: new Audio('assets/sfx-hover.mp3'),
        slash: new Audio('assets/sfx-slash.mp3'),
        reveal: new Audio('assets/sfx-reveal.mp3'),
        day: new Audio('assets/sfx-day.mp3'),
        night: new Audio('assets/sfx-night.mp3'),
        win: new Audio('assets/sfx-win.mp3'),
        lose: new Audio('assets/sfx-lose.mp3'),
        // Additional Polish Sounds
        vote: new Audio('assets/sfx-vote.mp3'),
        notification: new Audio('assets/sfx-notification.mp3'),
        heartbeat: new Audio('assets/sfx-heartbeat.mp3'),
        error: new Audio('assets/sfx-error.mp3'),
        success: new Audio('assets/sfx-success.mp3'),
        purchase: new Audio('assets/sfx-purchase.mp3'),
    },
    
    getSfxEnabled() {
        return localStorage.getItem('maf_sfx') !== 'false';
    },
    
    getVolume() {
        return parseFloat(localStorage.getItem('maf_sfx_volume') || '0.7');
    },
    
    setVolume(vol) {
        localStorage.setItem('maf_sfx_volume', Math.max(0, Math.min(1, vol)).toString());
        Object.values(this.sounds).forEach(snd => snd.volume = vol);
    },
    
    play(soundName) {
        if (!this.getSfxEnabled()) return;
        const snd = this.sounds[soundName];
        if (snd) {
            snd.volume = this.getVolume();
            snd.currentTime = 0;
            snd.play().catch(e => {}); // Gracefully ignore auto-play blocking
        }
    },
    
    playComplex(soundName, options = {}) {
        // Enhanced play with options: loop, delay, volume override
        if (!this.getSfxEnabled()) return;
        const snd = this.sounds[soundName];
        if (snd) {
            snd.volume = options.volume || this.getVolume();
            snd.loop = options.loop || false;
            snd.currentTime = 0;
            setTimeout(() => {
                snd.play().catch(e => {});
            }, options.delay || 0);
        }
    },

    // -------------------------
    // 2. Global Particle Engine
    // -------------------------
    createParticles({ x, y, colors, count = 20, element = document.body, scale = 1 }) {
        if (localStorage.getItem('maf_particles') === 'false') return;
        
        for (let i = 0; i < count; i++) {
            const p = document.createElement('div');
            p.style.position = 'fixed';
            p.style.width = (Math.random() * 8 + 4) * scale + 'px';
            p.style.height = p.style.width;
            p.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
            p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            p.style.left = x + 'px';
            p.style.top = y + 'px';
            p.style.pointerEvents = 'none';
            p.style.zIndex = '99999';
            p.style.boxShadow = `0 0 ${10 * scale}px ${p.style.backgroundColor}`;
            element.appendChild(p);

            const angle = Math.random() * Math.PI * 2;
            const velocity = (Math.random() * 100 + 50) * scale;
            
            gsap.to(p, {
                x: Math.cos(angle) * velocity,
                y: Math.sin(angle) * velocity + (Math.random() * 50),
                opacity: 0,
                rotation: Math.random() * 360,
                scale: 0,
                duration: Math.random() * 0.8 + 0.4,
                ease: 'power2.out',
                onComplete: () => p.remove()
            });
        }
    },

    // Specific Effects
    explodeRole(x, y) {
        this.play('reveal');
        this.createParticles({ x, y, colors: ['#cfb06f', '#fff', '#f3e8d4'], count: 40, scale: 1.5 });
    },
    
    bloodSlash(x, y) {
        this.play('slash');
        this.createParticles({ x, y, colors: ['#b64f43', '#8a1c1c', '#ff0000'], count: 50, scale: 2 });
        // Screen shake + Chromatic Aberration
        gsap.to(document.body, {
            x: 10, y: 10,
            filter: 'drop-shadow(5px 0 0 rgba(255,0,0,0.5)) drop-shadow(-5px 0 0 rgba(0,255,255,0.5))',
            yoyo: true, repeat: 5, duration: 0.05,
            clearProps: "x,y,filter"
        });
    },

    // -------------------------
    // 2.5 New Polish Effects
    // -------------------------
    confettiRain() {
        if (localStorage.getItem('maf_particles') === 'false') return;
        const colors = ['#cfb06f', '#fff', '#f3e8d4', '#7f95a1'];
        for(let i=0; i<100; i++) {
            setTimeout(() => {
                this.createParticles({
                    x: Math.random() * window.innerWidth,
                    y: -20,
                    colors: [colors[Math.floor(Math.random() * colors.length)]],
                    count: 1,
                    scale: Math.random() * 2 + 1
                });
            }, Math.random() * 2000);
        }
    },

    screenFlash(color = 'rgba(255, 0, 0, 0.4)') {
        const flash = document.createElement('div');
        flash.style.position = 'fixed';
        flash.style.inset = '0';
        flash.style.backgroundColor = color;
        flash.style.zIndex = '999999';
        flash.style.pointerEvents = 'none';
        document.body.appendChild(flash);

        gsap.to(flash, {
            opacity: 0,
            duration: 0.5,
            ease: 'power2.out',
            onComplete: () => flash.remove()
        });
    },

    // ===== NEW POLISH EFFECTS =====
    
    // Victory Effect - Celebrations!
    victory(element = document.body) {
        this.play('win');
        this.confettiRain();
        this.screenFlash('rgba(127, 143, 95, 0.3)'); // Green flash for victory
        if (element) {
            gsap.to(element, {
                scale: 1.05,
                yoyo: true,
                repeat: 3,
                duration: 0.25,
                ease: 'elastic.out'
            });
        }
    },

    // Defeat Effect - Sad animations
    defeat(element = document.body) {
        this.play('lose');
        this.screenFlash('rgba(182, 79, 67, 0.3)'); // Red flash
        if (element) {
            gsap.to(element, {
                x: -5,
                yoyo: true,
                repeat: 4,
                duration: 0.1,
                ease: 'sine.inOut'
            });
        }
    },

    // Vote confirmation
    voteConfirm(x, y) {
        this.play('vote');
        this.createParticles({
            x, y,
            colors: ['#cfb06f', '#f2ddb0'],
            count: 25,
            scale: 1.2
        });
    },

    // Purchase/Coin effect
    coinGain(element, amount = 100) {
        this.play('purchase');
        if (element) {
            gsap.to(element, {
                scale: 1.15,
                duration: 0.3,
                yoyo: true,
                repeat: 1,
                ease: 'back.out'
            });
        }
        // Create floating coin particles
        const rect = element?.getBoundingClientRect() || { x: window.innerWidth/2, y: window.innerHeight/2 };
        this.createParticles({
            x: rect.x || window.innerWidth/2,
            y: rect.y || window.innerHeight/2,
            colors: ['#cfb06f', '#f2ddb0', '#d4a538'],
            count: 15,
            scale: 0.8
        });
    },

    // Success notification
    success(message = 'Success!', element = null) {
        this.play('success');
        if (element) {
            gsap.fromTo(element, 
                { scale: 0.8, opacity: 0 },
                { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out' }
            );
        }
    },

    // Error/Alert with shake
    error(element = document.body) {
        this.play('error');
        if (element) {
            gsap.to(element, {
                x: -8,
                yoyo: true,
                repeat: 5,
                duration: 0.06,
                ease: 'sine.inOut'
            });
        }
        this.screenFlash('rgba(182, 79, 67, 0.2)');
    },

    // Notification ping
    notification() {
        this.play('notification');
        // Create pulse effect on notification element if it exists
        const notif = document.querySelector('[role="status"]');
        if (notif) {
            gsap.to(notif, {
                scale: 1.1,
                duration: 0.2,
                yoyo: true,
                repeat: 1,
                ease: 'back.out'
            });
        }
    },

    // Danger/Urgency heartbeat
    danger(element = document.body) {
        this.playComplex('heartbeat', { loop: true });
        if (element) {
            gsap.to(element, {
                boxShadow: [
                    '0 0 0 0 rgba(182, 79, 67, 0.5)',
                    '0 0 0 10px rgba(182, 79, 67, 0)'
                ],
                duration: 0.6,
                repeat: -1,
                ease: 'sine.inOut'
            });
        }
    },

    // Stop danger effect
    stopDanger(element = document.body) {
        gsap.killTweensOf(element);
        if (this.sounds.heartbeat) {
            this.sounds.heartbeat.pause();
        }
    },

    // Card reveal polish
    cardReveal(element) {
        this.play('reveal');
        if (element) {
            gsap.fromTo(element,
                { scale: 0.5, rotationY: 180 },
                { scale: 1, rotationY: 0, duration: 0.6, ease: 'back.out' }
            );
        }
        // Explosion of particles
        const rect = element?.getBoundingClientRect() || { x: window.innerWidth/2, y: window.innerHeight/2 };
        this.createParticles({
            x: rect.x + (rect.width || 0) / 2,
            y: rect.y + (rect.height || 0) / 2,
            colors: ['#cfb06f', '#fff', '#f3e8d4', '#7f95a1'],
            count: 35,
            scale: 1
        });
    },

    // -------------------------
    // 3. Page Transitions
    // -------------------------
    pageTransitionOut(url) {
        this.play('click');
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.inset = '0';
        overlay.style.backgroundColor = '#160709';
        overlay.style.zIndex = '100000';
        overlay.style.opacity = '0';
        document.body.appendChild(overlay);

        // Animate out
        gsap.to(overlay, { 
            opacity: 1, 
            duration: 0.4, 
            onComplete: () => window.location.href = url 
        });
        
        // Scale down UI if exists
        const container = document.getElementById('ui-container') || document.body;
        gsap.to(container, { scale: 0.95, opacity: 0, duration: 0.4 });
    },
    
    autoBind() {
        // Add click particle effects to .px-btn and others
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.px-btn, .action-btn, .currency-box, .ds-card, .enemy-card, .arcade-btn');
            if (btn) {
                this.play('click');
                const rect = btn.getBoundingClientRect();
                this.createParticles({
                    x: e.clientX,
                    y: e.clientY,
                    colors: ['#cfb06f', '#7f95a1', '#7f8f5f', '#fff'],
                    count: 8,
                    scale: 0.5
                });
            }
        });
        
        document.addEventListener('mouseover', (e) => {
            const btn = e.target.closest('.px-btn, .action-btn, .arcade-btn');
            if (btn && !btn.dataset.hovered) {
                this.play('hover');
                btn.dataset.hovered = 'true';
                setTimeout(() => btn.dataset.hovered = '', 200); // debounce hover sound
            }
        });
    }
};

window.addEventListener('DOMContentLoaded', () => {
    // Reveal page smoothly
    gsap.from(document.body, { opacity: 0, duration: 0.6 });
    MafiaFX.autoBind();
});
