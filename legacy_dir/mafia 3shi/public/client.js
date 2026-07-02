const socket = io();
const $ = (s) => document.querySelector(s);
const app = document.getElementById('app');

let state = {};
let myId = null;
let selectedTarget = null;
let selectedAvatar = 0;
let currentScreen = null; // 'home', 'shop', 'inventory', 'pack-opening'

// Avatar system - image-based with game-icons.net SVGs
const AVATAR_COLORS = ['#e63946','#457b9d','#2ec4b6','#f4a261','#a855f7','#22c55e','#ec4899','#f59e0b','#6366f1','#14b8a6','#ef4444','#3b82f6'];
const AVATAR_SYMBOLS = ['wolf','dragon','eagle','lion','snake','raven','bear','fox','owl','shark','panther','phoenix'];
const AVATARS_COUNT = 12;

function getAvatarSVG(index, size = 48) {
    const color = AVATAR_COLORS[index % AVATAR_COLORS.length];
    const symbol = AVATAR_SYMBOLS[index % AVATAR_SYMBOLS.length];
    // Stylized initial-based avatar with game aesthetic
    const letter = symbol[0].toUpperCase();
    return `<svg viewBox="0 0 48 48" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="avGrad${index}" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="${color}"/>
                <stop offset="100%" stop-color="${color}88"/>
            </linearGradient>
            <filter id="avShadow${index}"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.5"/></filter>
        </defs>
        <rect x="2" y="2" width="44" height="44" rx="8" fill="url(#avGrad${index})" filter="url(#avShadow${index})" stroke="${color}" stroke-width="1.5"/>
        <rect x="4" y="4" width="40" height="20" rx="4" fill="rgba(255,255,255,0.12)"/>
        <text x="24" y="32" text-anchor="middle" fill="white" font-size="22" font-weight="900" font-family="sans-serif" style="text-shadow:0 2px 4px rgba(0,0,0,0.5)">${letter}</text>
    </svg>`;
}

// Role to SVG icon mapping (replaces emojis)
const ROLE_ICONS = {
    mafia_boss: () => ICONS.crown(32),
    mafia_muter: () => ICONS.silence(32),
    mafia_regular: () => ICONS.knife(32),
    mayor: () => ICONS.shield(32),
    good_son: () => ICONS.child(32),
    medic: () => ICONS.medic(32),
    sniper: () => ICONS.crosshair(32),
    citizen: () => ICONS.citizen(32),
};

// Card border colors based on team
const TEAM_STYLES = {
    mafia: { border: '#e63946', glow: 'rgba(230,57,70,0.4)', bg: 'linear-gradient(135deg, #2a0a0e 0%, #1a1a3a 100%)' },
    citizen: { border: '#2ec4b6', glow: 'rgba(46,196,182,0.4)', bg: 'linear-gradient(135deg, #0a2a25 0%, #1a1a3a 100%)' },
    neutral: { border: 'rgba(255,215,0,0.3)', glow: 'rgba(255,215,0,0.1)', bg: 'linear-gradient(135deg, #1a1a3a 0%, #2d2d5f 100%)' },
};

function getRoleIcon(role, size) {
    if (!role) return ICONS.ghost(size || 32);
    const fn = ROLE_ICONS[role.id];
    return fn ? fn() : ICONS.citizen(size || 32);
}

// Modifier to icon mapping
const MOD_ICONS = {
    secret_vote: () => ICONS.secretVote(36),
    double_kill: () => ICONS.doubleKnife(36),
    immunity: () => ICONS.shieldPlus(36),
    chaos: () => ICONS.tornado(36),
    speed_round: () => ICONS.bolt(36),
    whispers: () => ICONS.whisper(36),
    bounty: () => ICONS.bounty(36),
};

// ===== SVG Icon Utilities =====
// Maps role IDs and action types to SVG icon function names
const ROLE_ICON_MAP = {
    'mafia_boss': 'crown',        // King/Crown for boss
    'mafia_muter': 'silence',     // Silence icon
    'mafia_regular': 'knife',     // Knife for regular mafia
    'mayor': 'shield',            // Shield for protection
    'good_son': 'child',          // Child icon
    'medic': 'medic',             // Medic icon
    'sniper': 'crosshair',        // Crosshair for sniper
    'citizen': 'citizen',         // Citizen icon
};

// Maps action types to SVG icon names
const ACTION_ICON_MAP = {
    'vote': 'vote',
    'kill': 'sword',
    'protect': 'shield',
    'heal': 'medic',
    'reveal': 'eye',
    'mute': 'silence',
    'night': 'moon',
    'day': 'sun',
    'speaker': 'mic',
    'discussion': 'whisper',
    'voting': 'vote',
    'door': 'door',
    'gamepad': 'gamepad',
    'book': 'book',
    'shop': 'shop',
    'cards': 'cards',
    'coin': 'coin',
    'gem': 'gem',
};

// Get SVG HTML for a role
function getRoleIconSVG(roleId, size = 24) {
    const iconName = ROLE_ICON_MAP[roleId] || 'circle';
    if (!ICONS || !ICONS[iconName]) return `<span style="font-size:${size}px">●</span>`;
    return ICONS[iconName](size);
}

// Get SVG HTML for an action
function getActionIconSVG(action, size = 24) {
    const iconName = ACTION_ICON_MAP[action] || 'circle';
    if (!ICONS || !ICONS[iconName]) return `<span style="font-size:${size}px">●</span>`;
    return ICONS[iconName](size);
}

// Safely render SVG icon in HTML (returns wrapped SVG with container)
function svgIcon(iconName, size = 24) {
    if (!ICONS || !ICONS[iconName]) return '●';
    const svg = ICONS[iconName](size);
    return `<span class="svg-icon" style="display:inline-flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;">${svg}</span>`;
}

// ===== Audio System =====
const Sounds = {
    click: new Audio('/sounds/click.mp3'),
    death: new Audio('/sounds/death.mp3'),
    timer: new Audio('/sounds/timer.mp3'),
    whisper: new Audio('/sounds/whisper.mp3'),
};
Object.values(Sounds).forEach(s => { s.volume = 0.5; });

function playSound(name) {
    if (Sounds[name]) {
        const s = Sounds[name].cloneNode();
        s.volume = 0.5;
        s.play().catch(() => {});
    }
}

// ===== Synthetic Sound Generator (no files needed) =====
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
function getAudioCtx() {
    if (!audioCtx) audioCtx = new AudioCtx();
    return audioCtx;
}

function playSynthSound(type) {
    try {
        const ctx = getAudioCtx();
        const now = ctx.currentTime;
        switch (type) {
            case 'hover': {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain); gain.connect(ctx.destination);
                osc.frequency.setValueAtTime(800, now);
                osc.frequency.exponentialRampToValueAtTime(1200, now + 0.06);
                gain.gain.setValueAtTime(0.08, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
                osc.start(now); osc.stop(now + 0.08);
                break;
            }
            case 'press': {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain); gain.connect(ctx.destination);
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
                osc.start(now); osc.stop(now + 0.12);
                break;
            }
            case 'card_whoosh': {
                const bufferSize = ctx.sampleRate * 0.3;
                const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
                const src = ctx.createBufferSource();
                const gain = ctx.createGain();
                const filter = ctx.createBiquadFilter();
                src.buffer = buffer;
                filter.type = 'bandpass'; filter.frequency.value = 1000; filter.Q.value = 0.5;
                src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
                src.start(now);
                break;
            }
            case 'card_reveal': {
                [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.connect(gain); gain.connect(ctx.destination);
                    osc.frequency.setValueAtTime(freq, now + i * 0.08);
                    gain.gain.setValueAtTime(0, now);
                    gain.gain.linearRampToValueAtTime(0.12, now + i * 0.08);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.3);
                    osc.start(now + i * 0.08); osc.stop(now + i * 0.08 + 0.35);
                });
                break;
            }
            case 'legendary_reveal': {
                [261.63, 329.63, 392.00, 523.25, 659.25, 783.99].forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'triangle';
                    osc.connect(gain); gain.connect(ctx.destination);
                    osc.frequency.setValueAtTime(freq, now + i * 0.1);
                    gain.gain.setValueAtTime(0, now);
                    gain.gain.linearRampToValueAtTime(0.15, now + i * 0.1 + 0.05);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.5);
                    osc.start(now + i * 0.1); osc.stop(now + i * 0.1 + 0.55);
                });
                break;
            }
            case 'coins': {
                [1200, 1400, 1600, 1800].forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'square';
                    osc.connect(gain); gain.connect(ctx.destination);
                    osc.frequency.setValueAtTime(freq, now + i * 0.05);
                    gain.gain.setValueAtTime(0.04, now + i * 0.05);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.1);
                    osc.start(now + i * 0.05); osc.stop(now + i * 0.05 + 0.12);
                });
                break;
            }
            case 'level_up': {
                [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.connect(gain); gain.connect(ctx.destination);
                    osc.frequency.setValueAtTime(freq, now + i * 0.12);
                    gain.gain.setValueAtTime(0.15, now + i * 0.12);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.4);
                    osc.start(now + i * 0.12); osc.stop(now + i * 0.12 + 0.45);
                });
                break;
            }
            case 'error': {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sawtooth';
                osc.connect(gain); gain.connect(ctx.destination);
                osc.frequency.setValueAtTime(200, now);
                osc.frequency.setValueAtTime(150, now + 0.1);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
                osc.start(now); osc.stop(now + 0.25);
                break;
            }
        }
    } catch (e) {}
}

// ===== 3D Card Tilt System =====
function initCardTilt(container) {
    if (!container) return;
    const cards = container.querySelectorAll('.tilt-card');
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = ((y - centerY) / centerY) * -15;
            const rotateY = ((x - centerX) / centerX) * 15;
            card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;
            // Glare
            const glare = card.querySelector('.card-glare');
            if (glare) {
                const glareX = (x / rect.width) * 100;
                const glareY = (y / rect.height) * 100;
                glare.style.background = `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.3) 0%, transparent 60%)`;
                glare.style.opacity = '1';
            }
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(800px) rotateX(0) rotateY(0) scale(1)';
            const glare = card.querySelector('.card-glare');
            if (glare) glare.style.opacity = '0';
        });
    });
}

// ===== Screen Shake =====
function screenShake(intensity = 10, duration = 500) {
    const el = document.body;
    const start = Date.now();
    function shake() {
        const elapsed = Date.now() - start;
        if (elapsed > duration) { el.style.transform = ''; return; }
        const decay = 1 - elapsed / duration;
        const x = (Math.random() - 0.5) * 2 * intensity * decay;
        const y = (Math.random() - 0.5) * 2 * intensity * decay;
        el.style.transform = `translate(${x}px, ${y}px)`;
        requestAnimationFrame(shake);
    }
    shake();
}

// ===== Particle Explosion System =====
function createParticleExplosion(x, y, color = '#ffd700', count = 40) {
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:99999;';
    document.body.appendChild(container);
    for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
        const velocity = 80 + Math.random() * 200;
        const size = 4 + Math.random() * 8;
        const endX = x + Math.cos(angle) * velocity;
        const endY = y + Math.sin(angle) * velocity;
        p.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${size}px;height:${size}px;background:${color};border-radius:50%;pointer-events:none;box-shadow:0 0 ${size}px ${color};`;
        p.animate([
            { transform: 'translate(0,0) scale(1)', opacity: 1 },
            { transform: `translate(${endX - x}px, ${endY - y}px) scale(0)`, opacity: 0 }
        ], { duration: 600 + Math.random() * 600, easing: 'cubic-bezier(.25,.8,.25,1)', fill: 'forwards' });
        container.appendChild(p);
    }
    setTimeout(() => container.remove(), 1500);
}

// ===== Juicy Button Setup =====
function initJuicyButtons(container) {
    if (!container) return;
    container.querySelectorAll('.btn').forEach(btn => {
        if (btn.dataset.juiced) return;
        btn.dataset.juiced = 'true';
        btn.addEventListener('mouseenter', () => { playSynthSound('hover'); });
        btn.addEventListener('mousedown', (e) => {
            playSynthSound('press');
            createParticleExplosion(e.clientX, e.clientY, getComputedStyle(btn).borderColor || '#e63946', 12);
        });
    });
}

// ===== Session =====
function saveSession(roomCode, playerId) {
    localStorage.setItem('mafia_room', roomCode);
    localStorage.setItem('mafia_player', playerId);
}
function clearSession() {
    localStorage.removeItem('mafia_room');
    localStorage.removeItem('mafia_player');
}
function getSavedSession() {
    return { room: localStorage.getItem('mafia_room'), player: localStorage.getItem('mafia_player') };
}

// ===== HUD (persistent role display) =====
function initSVGContainers() {
    // Initialize speaker icon
    const speakerContainer = document.getElementById('speaker-icon-container');
    if (speakerContainer) {
        if (ICONS && ICONS.mic) {
            speakerContainer.innerHTML = ICONS.mic(24);
        } else {
            speakerContainer.textContent = '🎤';
        }
    }
    
    // Initialize feed title
    const feedTitle = document.getElementById('feed-title-container');
    if (feedTitle) {
        if (ICONS && ICONS.whisper) {
            feedTitle.innerHTML = `${ICONS.whisper(20)} المناقشات`;
        } else {
            feedTitle.textContent = '💬 المناقشات';
        }
    }
    
    // Initialize vote title
    const voteTitle = document.getElementById('vote-title-container');
    if (voteTitle) {
        if (ICONS && ICONS.vote) {
            voteTitle.innerHTML = `${ICONS.vote(20)} التصويت الحي`;
        } else {
            voteTitle.textContent = '🗳️ التصويت الحي';
        }
    }
}

function renderHUD() {
    // Remove old HUD
    const old = document.getElementById('hud-role');
    if (old) old.remove();

    if (!state.myRole || !state.phase || state.phase === 'lobby' || state.phase === 'gameover') return;

    const role = state.myRole;
    const hud = document.createElement('div');
    hud.id = 'hud-role';
    hud.className = `hud-role ${role.team}`;
    const roleIcon = getRoleIconSVG(role.id, 32);
    hud.innerHTML = `
        <div class="hud-role-icon">${roleIcon}</div>
        <div class="hud-role-info">
            <div class="hud-role-label">كرتك</div>
            <div class="hud-role-name">${role.name}</div>
        </div>
    `;
    document.body.appendChild(hud);
}

// ===== Render Router =====
function render() {
    // If we're on a special screen (shop, inventory, pack opening), don't override
    if (currentScreen === 'shop' || currentScreen === 'inventory' || currentScreen === 'pack-opening') return;

    if (!state.phase) { renderHome(); return; }
    switch (state.phase) {
        case 'lobby': renderLobby(); break;
        case 'role_reveal': renderRoleReveal(); break;
        case 'night': renderNight(); break;
        case 'day': renderDay(); break;
        case 'vote_result': renderVoteResult(); break;
        case 'gameover': renderGameOver(); break;
        default: renderHome();
    }
    renderHUD();
    renderProfileHUD();
    setTimeout(() => { initJuicyButtons(app); initCardTilt(app); }, 50);
}

// ===== Profile HUD (coins/level bar) =====
function renderProfileHUD() {
    let hud = document.getElementById('profile-hud');
    if (!state.myProfile) { if (hud) hud.remove(); return; }
    if (!hud) {
        hud = document.createElement('div');
        hud.id = 'profile-hud';
        hud.className = 'profile-hud';
        document.body.appendChild(hud);
    }
    const p = state.myProfile;
    hud.innerHTML = `
        <div class="phud-level" title="المستوى ${p.level}">
            <div class="phud-level-num">${p.level}</div>
            <div class="phud-xp-bar"><div class="phud-xp-fill" style="width:${(p.xpProgress * 100).toFixed(1)}%"></div></div>
        </div>
        <div class="phud-currency" onclick="showShop()" title="المتجر">
            <span class="phud-coins">${getActionIconSVG('coin', 20)} ${p.coins}</span>
            <span class="phud-gems">${getActionIconSVG('gem', 20)} ${p.gems}</span>
        </div>
    `;
}

// ===== CINEMATIC CARD-BASED GAME SYSTEM =====

/**
 * Create a cinematic card element for a player
 */
function createCinematicCard(player, isActiveProfile = false) {
    const div = document.createElement('div');
    const cardClass = isActiveProfile ? 'player-own-card' : 'opponent-card';
    div.className = `${cardClass} playing-card`;
    div.dataset.playerId = player.id;
    
    const teamClass = player.role ? player.role.team : 'citizen';
    div.style.setProperty('--team', teamClass);
    
    // All player data stays INSIDE the card DOM
    div.innerHTML = `
        <div class="card-content">
            <div class="card-avatar">${player.avatar}</div>
            <div class="card-name">${player.name}</div>
            <div class="card-team">${teamClass}</div>
            ${player.role ? `<div class="card-role">${player.role.name}</div>` : ''}
        </div>
    `;
    
    return div;
}

/**
 * CINEMATIC SEQUENCE: Role Reveal
 * 1. Player's card moves to center
 * 2. Screen shakes intensely
 * 3. Card vibrates and flips
 * 4. Sound effect plays
 * 5. Card scales down and flies to top-left dock
 */
async function cinematicRoleReveal(currentPlayerId) {
    const player = state.players.find(p => p.id === currentPlayerId);
    if (!player) return;
    
    // Create board structure
    app.innerHTML = '';
    const boardContainer = document.createElement('div');
    boardContainer.className = 'game-board';
    app.appendChild(boardContainer);
    
    // Create opponents section (empty during reveal)
    const opponentsSec = document.createElement('div');
    opponentsSec.className = 'opponents-section';
    boardContainer.appendChild(opponentsSec);
    
    // Create and position player card at center bottom area for reveal
    const card = createCinematicCard(player, true);
    boardContainer.appendChild(card);
    
    // STEP 1: Card enters with animation (1s)
    card.style.animation = 'cardFlyIn 1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // STEP 2: Screen shakes (0.5s)
    screenShake(16, 500);
    playSynthSound('card_reveal');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // STEP 3: Card vibrates
    card.style.animation = 'cardVibrate 0.4s ease-in-out';
    await new Promise(resolve => setTimeout(resolve, 400));
    
    // STEP 4: Card flip to reveal role
    card.style.animation = 'cardFlipReveal 0.6s ease-in-out';
    await new Promise(resolve => setTimeout(resolve, 600));
    
    // Card is now docked as active profile
    card.style.animation = 'none';
    
    // Distribute other players around the board
    await distributePlayersInUShape();
}

/**
 * Distribute players in U-Shape (Inverted Arch) formation
 * Opponent cards arranged in horseshoe arch around top-center
 * Player's own card fixed at bottom-center
 */
async function distributePlayersInUShape() {
    const otherPlayers = state.players.filter(p => p.id !== myId);
    
    // Create board container structure
    let boardContainer = app.querySelector('.game-board');
    if (!boardContainer) {
        app.innerHTML = '';
        boardContainer = document.createElement('div');
        boardContainer.className = 'game-board';
        app.appendChild(boardContainer);
    }
    
    // Ensure opponents section exists
    let opponentsSec = boardContainer.querySelector('.opponents-section');
    if (!opponentsSec) {
        opponentsSec = document.createElement('div');
        opponentsSec.className = 'opponents-section';
        boardContainer.appendChild(opponentsSec);
    }
    
    // Clear and add opponent cards
    opponentsSec.innerHTML = '';
    const positions = calculateUShapePositions(otherPlayers.length);
    
    otherPlayers.forEach((player, idx) => {
        const card = createCinematicCard(player, false);
        const pos = positions[idx];
        
        // Apply position as transform for smooth animation
        card.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
        card.style.setProperty('--tx', `${pos.x}px`);
        card.style.setProperty('--ty', `${pos.y}px`);
        
        opponentsSec.appendChild(card);
    });
    
    // Add player's own card at bottom-center
    let playerCardContainer = boardContainer.querySelector('.player-own-card');
    if (!playerCardContainer) {
        const playerCard = createCinematicCard(state.players.find(p => p.id === myId), true);
        boardContainer.appendChild(playerCard);
    }
    
    return new Promise(resolve => setTimeout(resolve, 1000));
}

/**
 * Calculate even distribution of cards in U-Shape (horseshoe) formation
 * Uses trigonometry (sine/cosine) for proper arch calculation
 * Returns { x, y } offsets from center of opponents-section
 */
function calculateUShapePositions(count) {
    const positions = [];
    
    if (count === 0) return positions;
    if (count === 1) return [{ x: 0, y: 0 }]; // Single player at center
    
    // Horseshoe arch parameters
    const radius = 300; // Arch radius in pixels
    const arcSpan = Math.PI * 0.8; // 160 degrees (0.8π) for nice U-shape
    const startAngle = Math.PI * 0.6; // Start 110 degrees from right
    
    for (let i = 0; i < count; i++) {
        // Normalize position along arc (0 to 1)
        const t = i / (count - 1);
        
        // Calculate angle for this position
        const angle = startAngle + (arcSpan * t);
        
        // Use trigonometry to get (x, y) position
        // Sine for X (left-right), Cosine for Y (up-down, inverted)
        const x = Math.sin(angle) * radius;
        const y = -Math.cos(angle) * radius + 60; // Offset up slightly
        
        positions.push({ x, y });
    }
    
    return positions;
}

/**
 * INTERROGATION PHASE: Round-robin introductions with focus
 * Each player gets 15 seconds to introduce themselves
 */
async function startInterrogationPhase() {
    let currentSpeaker = 0;
    const boardContainer = app.querySelector('.game-board');
    const opponentCards = boardContainer.querySelectorAll('.opponent-card');
    
    // Find player index
    for (let i = 0; i < state.players.length; i++) {
        if (state.players[i].id === myId) {
            currentSpeaker = i;
            break;
        }
    }
    
    // Show timer at top
    const timerEl = document.createElement('div');
    timerEl.className = 'interrogation-timer';
    timerEl.style.cssText = 'position: fixed; top: 20px; right: 20px; font-size: 36px; font-weight: 700; color: #ffd700; z-index: 100; text-shadow: 0 0 10px rgba(255, 215, 0, 0.6);';
    timerEl.textContent = '15s';
    document.body.appendChild(timerEl);
    
    // Rotate through each player
    for (let i = 0; i < state.players.length; i++) {
        const player = state.players[currentSpeaker];
        const cardEl = boardContainer.querySelector(`[data-player-id="${player.id}"]`);
        
        // Focus on current speaker
        opponentCards.forEach(el => {
            el.classList.remove('card-focused');
            el.classList.add('card-dimmed');
        });
        if (cardEl) {
            cardEl.classList.remove('card-dimmed');
            cardEl.classList.add('card-focused');
        }
        
        // Update timer (15 seconds)
        for (let sec = 15; sec >= 0; sec--) {
            timerEl.textContent = `${sec}s`;
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        currentSpeaker = (currentSpeaker + 1) % state.players.length;
    }
    
    // Remove timer
    timerEl.remove();
    
    // Clear focus
    opponentCards.forEach(el => {
        el.classList.remove('card-focused', 'card-dimmed');
    });
}

/**
 * NIGHT PHASE: Cinematic "Closing Eyes" effect
 * Black curtains drop from top and bottom like eyelids
 */
async function triggerNightPhase() {
    // Create eyelid overlay container
    const eyelidOverlay = document.createElement('div');
    eyelidOverlay.className = 'night-eyelid-overlay';
    
    // Create top eyelid
    const eyelidTop = document.createElement('div');
    eyelidTop.className = 'eyelid-top';
    eyelidOverlay.appendChild(eyelidTop);
    
    // Create bottom eyelid
    const eyelidBottom = document.createElement('div');
    eyelidBottom.className = 'eyelid-bottom';
    eyelidOverlay.appendChild(eyelidBottom);
    
    document.body.appendChild(eyelidOverlay);
    
    // Wait for eyelids to close (1.2s from animation)
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    // Dim board
    const boardCards = app.querySelectorAll('.opponent-card, .player-own-card');
    boardCards.forEach(el => el.style.opacity = '0.1');
    
    return { eyelidTop, eyelidBottom, eyelidOverlay };
}

/**
 * Open eyes after night phase action
 */
async function openNightPhaseEyes(eyelids) {
    if (eyelids) {
        eyelids.eyelidTop.classList.add('opening');
        eyelids.eyelidBottom.classList.add('opening');
        
        // Wait for opening animation (1.2s from animation)
        await new Promise(resolve => setTimeout(resolve, 1200));
        eyelids.eyelidOverlay.remove();
    }
    
    // Restore board visibility
    const boardCards = app.querySelectorAll('.opponent-card, .player-own-card');
    boardCards.forEach(el => el.style.opacity = '1');
}

/**
 * NIGHT ACTION PHASE: Mafia must choose a target
 * Shows action buttons and 20-second timed target selection
 */
async function showMafiaActionPhase(actionType = 'kill') {
    return new Promise((resolve) => {
        const container = document.createElement('div');
        container.className = 'action-overlay';
        
        const actionContainer = document.createElement('div');
        actionContainer.className = 'action-container';
        
        const timerDuration = 20;
        let timeRemaining = timerDuration;
        
        actionContainer.innerHTML = `
            <div class="action-title">اختر الهدف</div>
            <div class="timer-bar">
                <div class="timer-bar-fill" style="animation: timerDrain ${timerDuration}s linear forwards;"></div>
            </div>
            <div class="timer-text"><span id="timer-count">${timerDuration}</span>s</div>
            <div class="action-buttons">
                <button class="action-button action-button-kill">اقتل</button>
                <button class="action-button action-button-skip">تجاوز</button>
            </div>
        `;
        container.appendChild(actionContainer);
        document.body.appendChild(container);
        
        // Get board cards
        const boardContainer = app.querySelector('.game-board');
        const opponentCards = boardContainer.querySelectorAll('.opponent-card');
        
        // Make opponent cards selectable as targets
        opponentCards.forEach(card => {
            card.classList.add('card-target-selectable');
            card.addEventListener('click', (e) => {
                e.stopPropagation();
                opponentCards.forEach(c => c.classList.remove('card-target-selectable'));
                resolve({
                    action: 'kill',
                    targetId: card.dataset.playerId
                });
                container.remove();
            });
        });
        
        // Timer countdown
        const timerInterval = setInterval(() => {
            timeRemaining--;
            const timerCount = actionContainer.querySelector('#timer-count');
            if (timerCount) {
                timerCount.textContent = Math.max(0, timeRemaining);
            }
            
            if (timeRemaining <= 0) {
                clearInterval(timerInterval);
                // Auto-skip if no target selected
                if (container.parentNode) {
                    opponentCards.forEach(c => c.classList.remove('card-target-selectable'));
                    resolve({ action: 'skip' });
                    container.remove();
                }
            }
        }, 1000);
        
        // Button handlers
        const killBtn = actionContainer.querySelector('.action-button-kill');
        const skipBtn = actionContainer.querySelector('.action-button-skip');
        
        killBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            killBtn.disabled = true;
            killBtn.textContent = 'اختر...';
        });
        
        skipBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            clearInterval(timerInterval);
            opponentCards.forEach(c => c.classList.remove('card-target-selectable'));
            resolve({ action: 'skip' });
            container.remove();
        });
    });
}

/**
 * KILL EFFECT: "Slash and Drop" animation
 * Shows a dynamic slash across the target card
 * Then card falls with gravity and rotation
 */
async function executeFinalKill(targetId) {
    const boardContainer = app.querySelector('.game-board');
    const targetCard = boardContainer.querySelector(`[data-player-id="${targetId}"]`);
    if (!targetCard) return;
    
    // Play kill sound
    playSynthSound('card_reveal');
    
    // Create and animate slash effect
    const slash = document.createElement('div');
    slash.style.cssText = `
        position: absolute;
        top: 50%;
        left: -100%;
        width: 3px;
        height: 200%;
        background: linear-gradient(90deg, transparent, #ff3333, transparent);
        transform: rotate(25deg);
        animation: cardSlash 0.6s ease-in-out forwards;
        z-index: 20;
        box-shadow: 0 0 15px rgba(255, 51, 51, 0.8);
    `;
    targetCard.appendChild(slash);
    
    // Wait for slash to complete (0.6s)
    await new Promise(resolve => setTimeout(resolve, 600));
    
    // Apply drop animation
    targetCard.style.animation = 'cardDrop 0.8s ease-in forwards';
    
    // Wait for card to fall off screen (0.8s)
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Mark card as dead
    targetCard.classList.add('card-dead');
    targetCard.style.opacity = '0.3';
}

// ===== ARCADE HORIZONTAL SYSTEM =====

/**
 * ARCADE HOME: Horizontal Card-Based Menu
 */
function renderArcadeHome() {
    app.innerHTML = `
        <div class="screen-arcade-home">
            <div class="arcade-home-content">
                <div class="arcade-home-left">
                    <div class="arcade-home-logo">🎮</div>
                    <div class="arcade-home-title">المافيا</div>
                    <div class="arcade-home-subtitle">لعبة الذكاء والخداع</div>
                </div>
                <div class="arcade-home-right">
                    <button class="arcade-button arcade-button-primary" onclick="renderArcadeRoomCreate()">
                        ▶ إنشاء غرفة
                    </button>
                    <button class="arcade-button arcade-button-secondary" onclick="renderArcadeRoomJoin()">
                        ▶ دخول غرفة
                    </button>
                    <button class="arcade-button arcade-button-primary" onclick="renderArcadeStore()">
                        💎 المتجر
                    </button>
                    <button class="arcade-button arcade-button-secondary" onclick="renderArcadeCollection()">
                        🃏 مجموعتي
                    </button>
                    <button class="arcade-button arcade-button-primary" onclick="renderArcadeRules()">
                        📖 القوانين
                    </button>
                </div>
            </div>
        </div>
    `;
    setTimeout(() => { initJuicyButtons(app); }, 50);
}

/**
 * ARCADE RULES: Visual Map with Steps
 */
function renderArcadeRules() {
    const rules = [
        {
            title: '🌟 الهدف',
            image: '🎯',
            desc: 'اقضِ على الفريق المعاكس. المافيا تريد السيطرة، والمواطنون يريدون الأمان.',
            step: 1
        },
        {
            title: '🌙 الليل',
            image: '😴',
            desc: 'يغمض الجميع عينيه. المافيا تختار ضحيتها، والأدوار الخاصة تتحرك.',
            step: 2
        },
        {
            title: '☀️ النهار',
            image: '🗣️',
            desc: 'يصحو الجميع. يناقشون ويصوتون على من يموت.',
            step: 3
        },
        {
            title: '🏆 النهاية',
            image: '👑',
            desc: 'فريق واحد ينتصر عندما ينتهي الفريق الآخر.',
            step: 4
        }
    ];

    let currentStep = 0;

    const render = () => {
        const rule = rules[currentStep];
        app.innerHTML = `
            <div class="arcade-header">
                <button class="arcade-back-btn" onclick="renderArcadeHome()">← رجوع</button>
                <div class="arcade-title">القوانين</div>
                <div style="width:40px;"></div>
            </div>
            <div class="screen-arcade-rules">
                <div class="rules-container">
                    <div class="rules-image">${rule.image}</div>
                    <div class="rules-text">
                        <div class="rules-step-title">${rule.title}</div>
                        <div class="rules-step-desc">${rule.desc}</div>
                        <div class="rules-nav">
                            <button ${currentStep === 0 ? 'disabled' : ''} onclick="this.parentElement.parentElement.parentElement.querySelector('.rules-text').updateStep(-1)">
                                ← السابقة
                            </button>
                            <button ${currentStep === rules.length - 1 ? 'disabled' : ''} onclick="this.parentElement.parentElement.parentElement.querySelector('.rules-text').updateStep(1)">
                                التالية →
                            </button>
                        </div>
                    </div>
                </div>
                <div class="rules-dots">
                    ${rules.map((_, i) => `<div class="rules-dot ${i === currentStep ? 'active' : ''}"></div>`).join('')}
                </div>
            </div>
        `;
    };

    render();
}

/**
 * ARCADE STORE: Horizontal Card Scrolling
 */
function renderArcadeStore() {
    const packs = [
        { name: 'Pack Basic', emoji: '🎁', price: '50', desc: '5 بطاقات عشوائية' },
        { name: 'Pack Gold', emoji: '👑', price: '200', desc: '10 بطاقات + ألوان نادرة' },
        { name: 'Pack Diamond', emoji: '💎', price: '500', desc: '20 بطاقة + تأثيرات خاصة' },
        { name: 'Pack Legendary', emoji: '🏆', price: '1000', desc: '50 بطاقة ضمان نادرة' },
        { name: 'Pack Unlimited', emoji: '∞', price: '2000', desc: 'بطاقات بلا حد + امتيازات VIP' }
    ];

    app.innerHTML = `
        <div class="arcade-header">
            <button class="arcade-back-btn" onclick="renderArcadeHome()">← رجوع</button>
            <div class="arcade-title">المتجر</div>
            <div style="color: var(--arcade-gold); font-weight: 700;">💰 ${state.coins || 0}</div>
        </div>
        <div class="screen-arcade-store">
            <div class="store-container">
                ${packs.map(pack => `
                    <div class="store-item-wrapper">
                        <div class="arcade-card">
                            <div class="arcade-card-content">
                                <div class="arcade-card-image">${pack.emoji}</div>
                                <div class="arcade-card-title">${pack.name}</div>
                                <div class="arcade-card-desc">${pack.desc}</div>
                            </div>
                            <div class="store-card-price">${pack.price}💰</div>
                            <button class="store-card-buy" onclick="buyPack('${pack.name}', ${pack.price})">🛒</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    setTimeout(() => { initJuicyButtons(app); }, 50);
}

/**
 * ARCADE COLLECTION: Card Grid Display
 */
function renderArcadeCollection() {
    const myCards = state.myCards || [
        { name: 'Lion Knight', emoji: '🦁', rarity: 'common', count: 3 },
        { name: 'Dragon', emoji: '🐉', rarity: 'rare', count: 1 },
        { name: 'Phoenix', emoji: '🔥', rarity: 'legendary', count: 1 }
    ];

    app.innerHTML = `
        <div class="arcade-header">
            <button class="arcade-back-btn" onclick="renderArcadeHome()">← رجوع</button>
            <div class="arcade-title">مجموعتي</div>
            <div style="color: var(--arcade-secondary); font-weight: 700;">${myCards.length} بطاقات</div>
        </div>
        <div class="screen-arcade-store">
            <div class="store-container">
                ${myCards.map(card => `
                    <div class="store-item-wrapper">
                        <div class="arcade-card">
                            <div class="arcade-card-content">
                                <div class="arcade-card-image">${card.emoji}</div>
                                <div class="arcade-card-title">${card.name}</div>
                                <div class="arcade-card-desc">${card.rarity}</div>
                            </div>
                            <div class="store-card-price">×${card.count}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    setTimeout(() => { initJuicyButtons(app); }, 50);
}

/**
 * ARCADE LOBBY: Semi-Circle Player Cards
 */
function renderArcadeLobby() {
    app.innerHTML = `
        <div class="arcade-header">
            <button class="arcade-back-btn" onclick="renderArcadeHome()">← رجوع</button>
            <div class="arcade-title">غرفة رقم: ${state.roomCode}</div>
            <button class="arcade-button arcade-button-primary" style="position: absolute; right: 30px; top: 12px; width: auto; min-width: 120px; padding: 10px 20px; font-size: 14px;" onclick="startGame()">▶ ابدأ</button>
        </div>
        <div class="screen-arcade-home">
            <div class="semi-circle-container">
                ${state.players.map((p, i) => `
                    <div class="player-card-slot arcade-card" data-position="${i}" style="--angle: ${(i * 45 - 90)}deg; left: 50%; top: 50%; margin-left: -${90}px;">
                        <div class="arcade-card-content">
                            <div class="arcade-card-image" style="font-size: 48px;">${p.avatar}</div>
                            <div class="arcade-card-title">${p.name}</div>
                            <div class="arcade-card-stats">
                                <span>⭐ ${Math.floor(Math.random() * 100)}</span>
                                <span>🎯 ${p.level || 1}</span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    setTimeout(() => { initJuicyButtons(app); }, 50);
}

/**
 * ROOM CREATE/JOIN FORM WITH DATA COLLECTION
 */
function renderArcadeRoomCreate() {
    app.innerHTML = `
        <div class="arcade-header">
            <button class="arcade-back-btn" onclick="renderArcadeHome()">← رجوع</button>
            <div class="arcade-title">إنشاء غرفة</div>
        </div>
        <div class="screen-arcade-home">
            <div style="text-align: center;">
                <input type="text" id="create-name" placeholder="اسمك" style="padding: 12px 20px; margin: 10px; border-radius: 8px; border: 2px solid var(--arcade-primary); background: var(--arcade-dark); color: white; font-size: 16px;">
                <button class="arcade-button arcade-button-primary" style="margin-top: 20px;" onclick="createRoomArcade()">✓ إنشاء</button>
            </div>
        </div>
    `;
}

window.createRoomArcade = function() {
    const nameInput = document.getElementById('create-name');
    const playerName = nameInput ? nameInput.value.trim() : 'Player';
    if (!playerName) {
        alert('أدخل اسمك!');
        return;
    }
    socket.emit('create-room', { playerName, avatar: Math.floor(Math.random() * 12) });
};

function renderArcadeRoomJoin() {
    app.innerHTML = `
        <div class="arcade-header">
            <button class="arcade-back-btn" onclick="renderArcadeHome()">← رجوع</button>
            <div class="arcade-title">دخول غرفة</div>
        </div>
        <div class="screen-arcade-home">
            <div style="text-align: center;">
                <input type="text" id="join-code" placeholder="كود الغرفة" style="padding: 12px 20px; margin: 10px; border-radius: 8px; border: 2px solid var(--arcade-primary); background: var(--arcade-dark); color: white; font-size: 16px;">
                <input type="text" id="join-name" placeholder="اسمك" style="padding: 12px 20px; margin: 10px; border-radius: 8px; border: 2px solid var(--arcade-secondary); background: var(--arcade-dark); color: white; font-size: 16px;">
                <button class="arcade-button arcade-button-secondary" style="margin-top: 20px;" onclick="joinRoomArcade()">✓ دخول</button>
            </div>
        </div>
    `;
}

window.joinRoomArcade = function() {
    const codeInput = document.getElementById('join-code');
    const nameInput = document.getElementById('join-name');
    const roomCode = codeInput ? codeInput.value.trim().toUpperCase() : '';
    const playerName = nameInput ? nameInput.value.trim() : 'Player';
    if (!roomCode || !playerName) {
        alert('أدخل الكود واسمك!');
        return;
    }
    socket.emit('join-room', { roomCode, playerName, avatar: Math.floor(Math.random() * 12) });
};

// ===== Home =====
function renderHome() {
    renderArcadeHome();
}

// ===== LEGACY HOME (KEPT FOR COMPATIBILITY) =====
function renderHomeLegacy() {
    app.innerHTML = `
        <div class="screen-home">
            <div>
                <div class="logo">${svgIcon('logo', 80)}</div>
                <div class="title">المافيا</div>
                <div class="subtitle">لعبة الذكاء والخداع</div>
            </div>
            <div class="home-btns">
                <button class="btn btn-primary btn-large btn-full" onclick="showCreate()">${getActionIconSVG('gamepad', 20)} إنشاء غرفة</button>
                <button class="btn btn-secondary btn-large btn-full" onclick="showJoin()">${getActionIconSVG('door', 20)} دخول غرفة</button>
                <div style="display:flex;gap:8px;">
                    <button class="btn btn-shop btn-large" style="flex:1;" onclick="showShop()">${getActionIconSVG('shop', 20)} المتجر</button>
                    <button class="btn btn-inventory btn-large" style="flex:1;" onclick="showInventory()">${getActionIconSVG('cards', 20)} مجموعتي</button>
                </div>
                <button class="btn btn-ghost btn-full" onclick="showRules()">${getActionIconSVG('book', 20)} قوانين اللعبة</button>
            </div>
        </div>
    `;
    setTimeout(() => initJuicyButtons(app), 50);
}

// ===== Create Room =====
function showCreate() {
    app.innerHTML = `
        <div class="screen-create fade-in">
            <button class="back-btn game-back-btn" onclick="render()">${ICONS.door(18)} رجوع</button>
            <h2 class="game-section-title">${ICONS.gamepad(28)} إنشاء غرفة</h2>
            <div class="game-input-group">
                <label class="game-input-label">${ICONS.citizen(18)} اسم اللاعب</label>
                <input class="game-input" id="create-name" placeholder="أدخل اسمك..." maxlength="20" autofocus>
            </div>
            <div class="game-input-group">
                <label class="game-input-label">${ICONS.eye(18)} اختر شعارك</label>
                <div class="avatar-picker-grid">
                    ${Array.from({length: AVATARS_COUNT}, (_, i) => `
                        <div class="avatar-card ${i === selectedAvatar ? 'selected' : ''}" onclick="pickAvatar(${i}, this)" data-idx="${i}">
                            ${getAvatarSVG(i, 44)}
                            <div class="avatar-label">${AVATAR_SYMBOLS[i]}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            <button class="game-btn game-btn-green game-btn-full" onclick="createRoom()">${ICONS.sword(20)} إنشاء الغرفة</button>
            <div id="error-box"></div>
        </div>
    `;
    setTimeout(() => initJuicyButtons(app), 50);
}

function pickAvatar(idx, el) {
    playSynthSound('press');
    selectedAvatar = idx;
    document.querySelectorAll('.avatar-card').forEach(e => e.classList.remove('selected'));
    el.classList.add('selected');
}

function createRoom() {
    const name = document.getElementById('create-name').value.trim();
    if (!name) { showError('اكتب اسمك'); playSynthSound('error'); return; }
    playSynthSound('press');
    socket.emit('create-room', { playerName: name, avatar: selectedAvatar });
}

// ===== Join Room =====
function showJoin() {
    app.innerHTML = `
        <div class="screen-join fade-in">
            <button class="back-btn game-back-btn" onclick="render()">${ICONS.door(18)} رجوع</button>
            <h2 class="game-section-title">${ICONS.door(28)} دخول غرفة</h2>
            <div class="game-input-group">
                <label class="game-input-label">${ICONS.lock(18)} كود الغرفة</label>
                <div class="room-code-entry">
                    <input class="game-input game-input-code" id="join-code" placeholder="XXXX" maxlength="4" style="text-transform:uppercase;text-align:center;letter-spacing:12px;font-size:28px;font-weight:900;" autofocus>
                </div>
            </div>
            <div class="game-input-group">
                <label class="game-input-label">${ICONS.citizen(18)} اسم اللاعب</label>
                <input class="game-input" id="join-name" placeholder="أدخل اسمك..." maxlength="20">
            </div>
            <div class="game-input-group">
                <label class="game-input-label">${ICONS.eye(18)} اختر شعارك</label>
                <div class="avatar-picker-grid">
                    ${Array.from({length: AVATARS_COUNT}, (_, i) => `
                        <div class="avatar-card ${i === selectedAvatar ? 'selected' : ''}" onclick="pickAvatar(${i}, this)" data-idx="${i}">
                            ${getAvatarSVG(i, 44)}
                            <div class="avatar-label">${AVATAR_SYMBOLS[i]}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            <button class="game-btn game-btn-green game-btn-full" onclick="joinRoom()">${ICONS.door(20)} دخول</button>
            <div id="error-box"></div>
        </div>
    `;
    setTimeout(() => initJuicyButtons(app), 50);
}

function joinRoom() {
    const code = document.getElementById('join-code').value.trim().toUpperCase();
    const name = document.getElementById('join-name').value.trim();
    if (!code || code.length < 4) { showError('أدخل كود الغرفة'); playSynthSound('error'); return; }
    if (!name) { showError('اكتب اسمك'); playSynthSound('error'); return; }
    playSynthSound('press');
    socket.emit('join-room', { roomCode: code, playerName: name, avatar: selectedAvatar });
}

function showError(msg) {
    const box = document.getElementById('error-box');
    if (box) box.innerHTML = `<div class="error-msg">${msg}</div>`;
}

// ===== Rules =====
function showRules() {
    const roles = [
        { iconName: 'vote', title: 'الهدف', desc: 'الصالحين يكتشفون المافيا ويخرجونهم. المافيا تتخفى وتخرج الصالحين حتى يتساوى العدد.' },
        { iconName: 'moon', title: 'الليل', desc: 'الجميع ينام. المافيا تغتال، والأدوار الخاصة تنفذ مهامها.' },
        { iconName: 'sun', title: 'النهار', desc: 'الجميع يستيقظ. كل لاعب يتحدث بدوره ثم يبدأ التصويت.' },
        { iconName: 'crown', title: 'شيخ المافيا', desc: 'يختار ضحية للاغتيال كل ليلة.', team: 'mafia' },
        { iconName: 'silence', title: 'مافيا التسكيت', desc: 'يمنع شخصاً من الكلام في الجولة التالية.', team: 'mafia' },
        { iconName: 'shield', title: 'العمدة', desc: 'يكشف كرته أثناء اللعب. صوته يصبح ×3.', team: 'citizen' },
        { iconName: 'child', title: 'الولد الصالح', desc: 'عند خروجه يسحب معه أي لاعب.', team: 'citizen' },
        { iconName: 'medic', title: 'الإسعاف', desc: 'ينقذ شخصاً من الاغتيال كل ليلة.', team: 'citizen' },
        { iconName: 'crosshair', title: 'القناص', desc: 'رصاصة واحدة. أصاب مافيا يخرجه، أصاب صالح يخرجان معاً.', team: 'citizen' },
    ];

    app.innerHTML = `
        <div style="padding: 20px; max-width: 700px; margin: 0 auto;">
            <button class="back-btn" onclick="render()">→ رجوع</button>
            <h2 style="text-align:center; font-size:32px; margin-bottom:24px;">${getActionIconSVG('book', 28)} قوانين اللعبة</h2>
            <div style="display:flex; flex-direction:column; gap:12px;">
                ${roles.map(r => {
                    const bc = r.team === 'mafia' ? 'border-color:rgba(230,57,70,0.3);' : r.team === 'citizen' ? 'border-color:rgba(46,196,182,0.3);' : '';
                    const iconSvg = ICONS[r.iconName] ? ICONS[r.iconName](32) : '●';
                    return `<div class="card" style="${bc}">
                        <div style="font-size:32px; margin-bottom:8px;">${iconSvg}</div>
                        <div style="font-size:18px; font-weight:700; margin-bottom:4px;">${r.title}</div>
                        <div style="font-size:14px; color:var(--text-dim); line-height:1.6;">${r.desc}</div>
                    </div>`;
                }).join('')}
            </div>
        </div>
    `;
}

// ===== Lobby =====
function renderLobby() {
    const isHost = myId === state.hostId;
    const canStart = state.players.length >= 6;
    const mafiaCount = getMafiaCount(state.players.length);

    // Build player cards in semicircle
    const playerCards = state.players.map((p, i) => {
        const avatarIdx = typeof p.avatar === 'number' ? p.avatar : (i % AVATARS_COUNT);
        const isMe = p.id === myId;
        const badges = [];
        if (p.isBot) badges.push(`<span class="card-badge badge-bot">${ICONS.robot(12)} BOT</span>`);
        if (p.isHost) badges.push(`<span class="card-badge badge-host">${ICONS.crown(12)} HOST</span>`);
        if (isMe) badges.push(`<span class="card-badge badge-you">${ICONS.star(12)} YOU</span>`);

        return `
            <div class="lobby-player-card playing-card ${isMe ? 'card-is-me' : ''}"
                 data-player-id="${p.id}"
                 style="animation: cardFlyIn 0.6s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.1}s both;">
                <div class="card-content">
                    <div class="card-avatar-frame">
                        ${getAvatarSVG(avatarIdx, 52)}
                    </div>
                    <div class="card-name">${p.name}</div>
                    <div class="card-badges">${badges.join('')}</div>
                </div>
                ${isHost && !isMe && p.id !== state.hostId ? `
                    <button class="card-kick-btn" onclick="event.stopPropagation(); kickPlayer('${p.id}')" title="طرد">
                        ${ICONS.kick(14)}
                    </button>
                ` : ''}
            </div>
        `;
    }).join('');

    // Room code tiles
    const codeTiles = state.roomCode.split('').map((ch, i) =>
        `<span class="code-tile" style="animation-delay:${i * 0.1}s">${ch}</span>`
    ).join('');

    app.innerHTML = `
        <div class="game-board lobby-board">
            <!-- Atmospheric background -->
            <div class="lobby-atmosphere">
                <div class="atmo-vignette"></div>
                <div class="atmo-particles"></div>
                <div class="atmo-felt"></div>
            </div>

            <!-- Top HUD: Room Code -->
            <div class="lobby-top-hud">
                <div class="room-code-display">
                    <div class="room-code-label">ROOM CODE</div>
                    <div class="room-code-tiles">${codeTiles}</div>
                </div>
                <div class="lobby-stats">
                    <div class="lobby-stat">
                        ${ICONS.citizen(18)}
                        <span class="stat-num">${state.players.length}</span>
                        <span class="stat-label">لاعب</span>
                    </div>
                    <div class="lobby-stat stat-mafia">
                        ${ICONS.knife(18)}
                        <span class="stat-num">${mafiaCount}</span>
                        <span class="stat-label">مافيا</span>
                    </div>
                    <div class="lobby-stat stat-citizen">
                        ${ICONS.shield(18)}
                        <span class="stat-num">${state.players.length - mafiaCount}</span>
                        <span class="stat-label">صالحين</span>
                    </div>
                </div>
            </div>

            <!-- Player Cards - Semicircle Table -->
            <div class="lobby-table">
                <div class="lobby-cards-arc">
                    ${playerCards}
                </div>
            </div>

            <!-- Bottom Controls -->
            <div class="lobby-bottom-controls">
                ${isHost ? `
                    <div class="lobby-host-controls">
                        <div class="host-btn-row">
                            <button class="game-btn game-btn-secondary game-btn-sm" onclick="socket.emit('add-bots', {count:1})">${ICONS.robot(16)} +1 بوت</button>
                            <button class="game-btn game-btn-secondary game-btn-sm" onclick="socket.emit('add-bots', {count:5})">${ICONS.robot(16)} +5 بوت</button>
                            <button class="game-btn game-btn-secondary game-btn-sm" onclick="addBotsToFill()">${ICONS.robot(16)} تعبئة</button>
                        </div>
                        <div class="host-settings-row">
                            <div class="game-setting">
                                <span class="setting-icon">${ICONS.timer(18)}</span>
                                <span class="setting-label">وقت المتحدث</span>
                                <select class="game-select" id="speak-time" onchange="updateSettings()">
                                    <option value="15">15 ثانية</option>
                                    <option value="30" selected>30 ثانية</option>
                                    <option value="45">45 ثانية</option>
                                    <option value="60">دقيقة</option>
                                    <option value="90">دقيقة ونص</option>
                                    <option value="0">بدون حد</option>
                                </select>
                            </div>
                        </div>
                        <!-- Joker Modifiers -->
                        <div class="joker-section">
                            <div class="joker-section-title">${ICONS.joker(22)} بطاقات الطفرة</div>
                            <div class="joker-cards-row" id="modifiers-grid"></div>
                        </div>
                    </div>
                    <button class="game-btn game-btn-green game-btn-start ${!canStart ? 'disabled' : ''}" ${!canStart ? 'disabled' : ''} onclick="startGame()">
                        ${ICONS.sword(24)} ابدأ اللعبة ${!canStart ? '(يجب 6+)' : ''}
                    </button>
                ` : `
                    <div class="lobby-waiting-msg">
                        <div class="waiting-pulse">${ICONS.timer(28)}</div>
                        <div>بانتظار المضيف لبدء اللعبة...</div>
                    </div>
                `}
            </div>
        </div>
    `;
    setTimeout(() => { initJuicyButtons(app); initCardTilt(app); loadModifiers(); }, 80);
}

// Load modifiers when lobby renders
function loadModifiers() {
    socket.emit('get-modifiers');
}
socket.on('modifiers-data', ({ modifiers }) => {
    const grid = document.getElementById('modifiers-grid');
    if (!grid) return;
    const active = state.activeModifiers || [];
    grid.innerHTML = modifiers.map(m => {
        const modIcon = MOD_ICONS[m.id] ? MOD_ICONS[m.id]() : ICONS.joker(36);
        const isActive = active.includes(m.id);
        return `
        <div class="joker-card ${isActive ? 'active' : ''}"
             onclick="toggleModifier('${m.id}')" style="--mod-color:${m.color};">
            <div class="joker-card-back"></div>
            <div class="joker-card-front">
                <div class="joker-icon">${modIcon}</div>
                <div class="joker-name">${m.name}</div>
                <div class="joker-desc">${m.desc}</div>
                ${isActive ? '<div style="color:#ffd700;font-size:10px;font-weight:700;margin-top:4px;">مُفعّل</div>' : ''}
            </div>
        </div>`;
    }).join('');
    setTimeout(() => initCardTilt(grid), 50);
});

function toggleModifier(id) {
    playSynthSound('press');
    socket.emit('toggle-modifier', { modifierId: id });
}

function getMafiaCount(count) {
    if (count < 6) return 2;
    let m = Math.max(2, Math.floor(count / 4));
    if (count >= 12) m = 3;
    if (count >= 16) m = 4;
    return m;
}

function kickPlayer(id) { socket.emit('kick-player', { playerId: id }); }

function addBotsToFill() {
    const need = Math.max(0, 8 - state.players.length);
    if (need > 0) socket.emit('add-bots', { count: need });
}

function startGame() {
    const speakTimeEl = document.getElementById('speak-time');
    const speakTime = speakTimeEl ? parseInt(speakTimeEl.value) : 30;
    playSound('click');
    socket.emit('start-game', { speakTime });
}

function updateSettings() {}

// ===== Role Reveal =====
function renderRoleReveal() {
    if (!state.myRole) return;
    const role = state.myRole;
    const team = role.team;

    // Trigger cinematic role reveal sequence
    cinematicRoleReveal(myId).then(async () => {
        // Show mafia team info if applicable
        if (team === 'mafia' && state.mafiaTeam) {
            playSound('whisper');
            const infoBox = document.createElement('div');
            infoBox.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.9);
                border: 2px solid #e63946;
                border-radius: 12px;
                padding: 30px;
                z-index: 500;
                max-width: 400px;
                text-align: center;
            `;
            infoBox.innerHTML = `
                <h3 style="color: #e63946; margin-bottom: 20px; text-shadow: 0 0 10px rgba(230, 57, 70, 0.6);">🔴 فريق المافيا</h3>
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    ${state.mafiaTeam.map(m => `
                        <div style="padding: 12px; background: rgba(230, 57, 70, 0.1); border-radius: 8px; border-left: 3px solid #e63946;">
                            <div style="font-weight: 700; color: #f1faee;">${m.name}</div>
                            <div style="font-size: 12px; color: #8d99ae;">${m.role.name}</div>
                        </div>
                    `).join('')}
                </div>
                <button class="btn btn-primary" style="margin-top: 20px; width: 100%;" onclick="this.parentElement.remove()">فهمت</button>
            `;
            document.body.appendChild(infoBox);
            await new Promise(resolve => setTimeout(resolve, 8000));
            if (infoBox.parentNode) infoBox.remove();
        }
        
        // Start interrogation phase
        await startInterrogationPhase();
    });
}

// ===== Night =====
function renderNight() {
    const isMyTurn = state.waitingFor === myId;
    
    if (isMyTurn && state.nightPhase) {
        // Show a placeholder while cinematic plays
        app.innerHTML = `
            <div class="waiting-msg">
                <div style="font-size:50px; margin-bottom:16px;">🌙</div>
                <div style="font-size:20px; font-weight:700; margin-bottom:8px;">حان دورك...</div>
                <div style="color:var(--text-dim);">اختر هدفك</div>
            </div>
        `;
        
        // CINEMATIC: Trigger night phase with curtain effect
        (async () => {
            const eyelids = await triggerNightPhase();
            
            // Show action phase UI
            const result = await showMafiaActionPhase('kill');
            
            // Open eyes after action selected
            await openNightPhaseEyes(eyelids);
            
            // Execute the kill if a target was selected
            if (result.action === 'kill' && result.targetId) {
                await executeFinalKill(result.targetId);
                socket.emit('night-action', { action: state.nightPhase, targetId: result.targetId });
            } else {
                socket.emit('night-action', { action: state.nightPhase, targetId: null });
            }
        })();
    } else {
        // Other players waiting
        const phaseNames = {
            mafia_kill: '🔪 مرحلة الاغتيال',
            mafia_mute: '🤫 مرحلة التسكيت',
            medic_heal: '🚑 مرحلة الإسعاف',
            sniper_shoot: '🎯 مرحلة القناص',
        };
        const phaseName = phaseNames[state.nightPhase] || 'جاري...';
        
        app.innerHTML = `
            <div class="screen-night">
                <div class="night-moon" style="font-size:60px; animation: float 3s ease-in-out infinite;">🌙</div>
                <div class="night-title">الليلة ${state.round}</div>
                <div class="night-sub">الجميع يغمض عينيه</div>
                <div class="waiting-msg">
                    <div style="font-size:50px; margin-bottom:16px;">😴</div>
                    <div style="font-size:20px; font-weight:700; margin-bottom:8px;">أنت نائم...</div>
                    <div style="color:var(--text-dim);">${phaseName}</div>
                    <div style="margin-top:10px; color:var(--text-muted);">بانتظار<span class="waiting-dots"></span></div>
                </div>
            </div>
        `;
    }
}

function renderNightAction() {
    const role = state.myRole;
    const alivePlayers = state.players.filter(p => p.alive);
    let targets = [];
    let title = '';
    let desc = '';
    let allowSkip = false;
    let skipText = 'تخطي';
    let selectClass = 'selected';

    if (role.team === 'mafia') playSound('whisper');

    switch (state.nightPhase) {
        case 'mafia_kill':
            title = `${role.icon} ${role.name} - الاغتيال`;
            desc = 'اختر من تريد اغتياله';
            targets = alivePlayers.filter(p => !getMafiaTeamIds().includes(p.id));
            break;
        case 'mafia_mute':
            title = `${role.icon} ${role.name} - التسكيت`;
            desc = 'اختر من تريد تسكيته';
            targets = alivePlayers;
            allowSkip = true;
            break;
        case 'medic_heal':
            title = `${role.icon} ${role.name}`;
            desc = 'اختر من تريد إنقاذه من الاغتيال';
            targets = alivePlayers;
            selectClass = 'selected-green';
            break;
        case 'sniper_shoot':
            title = `${role.icon} ${role.name}`;
            desc = 'اطلق رصاصتك الوحيدة أو أجّلها';
            targets = alivePlayers.filter(p => p.id !== myId);
            allowSkip = true;
            skipText = '⏳ تأجيل الرصاصة';
            break;
    }

    return `
        <div class="night-action-card slide-up">
            <div class="night-action-title">${title}</div>
            <div class="night-action-desc">${desc}</div>
            <div class="target-list">
                ${targets.map(p => `
                    <button class="target-btn" data-id="${p.id}"
                        onclick="selectNTarget('${p.id}', '${selectClass}')">
                        ${p.avatar} ${p.name}
                    </button>
                `).join('')}
                ${allowSkip ? `<button class="btn btn-ghost btn-full btn-sm" data-id="skip" onclick="selectNTarget('skip', 'selected')">${skipText}</button>` : ''}
            </div>
            <button class="btn btn-primary btn-full" onclick="submitNightAction()">تأكيد</button>
        </div>
    `;
}

function getMafiaTeamIds() {
    return state.mafiaTeam ? state.mafiaTeam.map(m => m.id) : [];
}

function selectNTarget(id, cls) {
    playSound('click');
    selectedTarget = id;
    document.querySelectorAll('.target-btn, .btn-ghost').forEach(b => b.classList.remove('selected', 'selected-green'));
    const el = document.querySelector(`[data-id="${id}"]`);
    if (el) el.classList.add(cls);
}

function submitNightAction() {
    if (!selectedTarget) return;
    playSound('click');
    socket.emit('night-action', { action: state.nightPhase, targetId: selectedTarget });
    selectedTarget = null;
}

// ===== Day =====
function renderDay() {
    const me = state.players.find(p => p.id === myId);
    const alivePlayers = state.players.filter(p => p.alive);
    const isMuted = me && me.muted;
    const myVote = state.votes ? state.votes[myId] : undefined;
    const totalVoters = alivePlayers.filter(p => !p.muted).length;
    const votedCount = state.votes ? Object.keys(state.votes).length : 0;
    const isHost = myId === state.hostId;

    // Vote tally
    const voteTally = {};
    if (state.votes) {
        Object.values(state.votes).forEach(tid => {
            if (tid !== 'skip') voteTally[tid] = (voteTally[tid] || 0) + 1;
        });
    }

    // Update live vote display
    Object.entries(voteTally).forEach(([tid, count]) => {
        const tp = state.players.find(p => p.id === tid);
        if (tp) liveVoteDisplay.updateVote(tid, tp.name, count);
    });

    // Speaking turn banner
    let speakingBanner = '';
    if (state.currentSpeaker) {
        const sp = state.players.find(p => p.id === state.currentSpeaker);
        if (sp) {
            speakingBanner = `
                <div class="speaking-banner">
                    <div class="speaking-avatar">${sp.avatar}</div>
                    <div class="speaking-info">
                        <div class="speaking-label">🎤 يتحدث الآن</div>
                        <div class="speaking-name">${sp.name}</div>
                    </div>
                    ${state.speakTimer > 0 ? `
                        <div class="speaking-timer-wrap">
                            <div class="speaking-timer-num" id="speak-countdown">${state.speakTimer}</div>
                            <div class="speaking-timer-bar">
                                <div class="speaking-timer-fill" id="speak-fill" style="width:100%"></div>
                            </div>
                        </div>
                    ` : ''}
                    ${isHost ? `<button class="btn btn-sm btn-secondary" onclick="socket.emit('next-speaker')">التالي ⏭️</button>` : ''}
                </div>
            `;
        }
    }

    // Mayor reveal button
    let mayorBtn = '';
    if (me && me.alive && state.myRole && state.myRole.id === 'mayor' && !me.mayorRevealed) {
        mayorBtn = `<button class="mayor-btn" onclick="socket.emit('mayor-reveal')">🏛️ كشف كرت العمدة (صوتك ×3)</button>`;
    }

    // Day sub-phase
    const daySubPhase = state.daySubPhase || 'voting';
    const isDiscussionPhase = daySubPhase === 'discussion';

    app.innerHTML = `
        <div class="screen-day">
            <div class="day-header">
                <div class="day-title">☀️ الجولة ${state.round}</div>
            </div>

            ${state.events.map((e, i) => `
                <div class="event-card ${e.type}" style="animation-delay:${i * 0.1}s">
                    <span class="event-icon">${e.icon}</span>
                    <span class="event-text">${e.text}</span>
                </div>
            `).join('')}

            ${speakingBanner}

            <div class="section-title">اللاعبون (${alivePlayers.length} حي)</div>
            <div class="players-grid">
                ${state.players.map(p => {
                    let cls = 'p-chip';
                    if (!p.alive) cls += ' dead';
                    if (p.muted && p.alive) cls += ' muted';
                    if (p.mayorRevealed && p.alive) cls += ' mayor-rev';
                    if (p.id === myId) cls += ' is-me';
                    if (state.votes && state.votes[myId] === p.id) cls += ' voted';
                    if (state.currentSpeaker === p.id && p.alive) cls += ' speaking-now';
                    return `<div class="${cls}">
                        <span class="p-avatar">${p.avatar}</span>
                        ${p.name}
                        ${p.mayorRevealed && p.alive ? '<div style="font-size:10px;color:var(--gold);">🏛️ عمدة</div>' : ''}
                        ${voteTally[p.id] ? `<div style="font-size:11px;color:var(--accent);margin-top:2px;">${voteTally[p.id]} صوت</div>` : ''}
                        ${!p.alive && p.role ? `<div style="font-size:10px;color:var(--text-muted);">${p.role.icon} ${p.role.name}</div>` : ''}
                    </div>`;
                }).join('')}
            </div>

            ${mayorBtn}

            ${isMuted ? '<div class="vote-status" style="color:var(--warning);">🤫 أنت مسكّت - لا تستطيع الكلام أو التصويت هذه الجولة</div>' : ''}

            ${isDiscussionPhase ? `
                <div class="vote-status" style="color:var(--accent);">🎤 مرحلة النقاش - كل لاعب يتحدث بدوره</div>
                ${isHost && !state.currentSpeaker ? `
                    <button class="btn btn-success btn-full" onclick="socket.emit('start-speaking')">🎤 ابدأ جولة الكلام</button>
                ` : ''}
            ` : ''}

            ${(!isDiscussionPhase || !state.currentSpeaker) && me && me.alive && !isMuted ? `
                <div class="section-title">🗳️ التصويت (${votedCount}/${totalVoters})</div>
                <div class="vote-section">
                    ${alivePlayers.filter(p => p.id !== myId).map(p => `
                        <button class="vote-btn ${myVote === p.id ? 'my-vote' : ''}"
                                onclick="castVote('${p.id}')">
                            <span>${p.avatar} ${p.name}</span>
                            <span class="vote-count-badge">${voteTally[p.id] || 0}</span>
                        </button>
                    `).join('')}
                    <button class="btn btn-ghost btn-full btn-sm ${myVote === 'skip' ? 'selected' : ''}"
                            onclick="castVote('skip')">
                        امتناع عن التصويت
                    </button>
                </div>
            ` : ''}

            ${!me || !me.alive ? '<div class="vote-status">💀 أنت خارج اللعبة - شاهد فقط</div>' : ''}

            <div class="vote-status">
                ${votedCount >= totalVoters ? '⏳ جاري احتساب الأصوات...' : `بانتظار تصويت ${totalVoters - votedCount} لاعب`}
            </div>
        </div>
    `;

    // Start countdown animation if speaking
    if (state.currentSpeaker && state.speakTimer > 0) {
        startSpeakCountdown(state.speakTimer, state.speakTotalTime || state.speakTimer);
    }
}

let speakCountdownInterval = null;

function startSpeakCountdown(remaining, total) {
    if (speakCountdownInterval) clearInterval(speakCountdownInterval);
    const countEl = document.getElementById('speak-countdown');
    const fillEl = document.getElementById('speak-fill');
    if (!countEl || !fillEl) return;

    const startTime = Date.now();
    const endTime = startTime + (remaining * 1000);

    speakCountdownInterval = setInterval(() => {
        const now = Date.now();
        const rem = Math.max(0, Math.ceil((endTime - now) / 1000));
        const pct = Math.max(0, ((endTime - now) / (total * 1000)) * 100);

        if (countEl) countEl.textContent = rem;
        if (fillEl) fillEl.style.width = pct + '%';

        if (rem <= 0) {
            clearInterval(speakCountdownInterval);
            playSound('timer');
        }
    }, 200);
}

function castVote(targetId) {
    socket.emit('cast-vote', { targetId });
    playSound('click');
}

// ===== Vote Result =====
function renderVoteResult() {
    const isHost = myId === state.hostId;
    const counts = state.voteCounts || {};
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).filter(([_, c]) => c > 0);
    const maxVotes = sorted.length > 0 ? sorted[0][1] : 1;

    let elimHtml = '';
    if (state.eliminated) {
        const e = state.eliminated;
        const tc = e.role.team === 'mafia' ? 'mafia' : 'citizen';
        elimHtml = `
            <div class="elim-card">
                <div class="elim-icon">${e.role.icon}</div>
                <div class="elim-name">${e.name}</div>
                <span class="elim-role ${tc}">${e.role.name}</span>
            </div>
        `;
    } else {
        elimHtml = `<div class="elim-card" style="border-color:var(--text-muted);">
            <div class="elim-icon">⚖️</div>
            <div class="elim-name">لم يتم إخراج أحد</div>
        </div>`;
    }

    let gsHtml = '';
    if (state.goodSonPending && state.goodSonPlayerId === myId) {
        const alive = state.players.filter(p => p.alive);
        gsHtml = `
            <div class="gs-section">
                <div style="font-size:32px; margin-bottom:8px;">👦</div>
                <h3 style="margin-bottom:12px;">الولد الصالح - اختر من تسحب معك!</h3>
                <div class="target-list">
                    ${alive.map(p => `
                        <button class="target-btn" data-id="${p.id}"
                            onclick="selectNTarget('${p.id}', 'selected')">
                            ${p.avatar} ${p.name}
                        </button>
                    `).join('')}
                </div>
                <button class="btn btn-danger btn-full" onclick="goodSonPull()" style="margin-top:10px;">💀 سحب اللاعب</button>
            </div>
        `;
    } else if (state.goodSonPending) {
        gsHtml = '<div class="vote-status">👦 الولد الصالح يختار من يسحب معه...</div>';
    }

    app.innerHTML = `
        <div class="screen-result">
            <h2 style="font-size:28px;">📊 نتيجة التصويت</h2>

            ${sorted.map(([id, count], i) => {
                const p = state.players.find(x => x.id === id);
                const pct = (count / maxVotes * 100);
                return `<div class="result-bar-row" style="animation: slideIn 0.4s ease both; animation-delay:${i * 0.1}s">
                    <span class="result-name">${p ? p.name : '?'}</span>
                    <div class="result-bar-wrap"><div class="result-bar" style="width:${pct}%"></div></div>
                    <span class="result-count">${count}</span>
                </div>`;
            }).join('')}

            ${elimHtml}
            ${gsHtml}

            ${!state.goodSonPending && isHost ? `
                <button class="btn btn-primary btn-large btn-full" onclick="socket.emit('continue-to-night')">
                    🌙 استمرار للّيل
                </button>
            ` : ''}
            ${!state.goodSonPending && !isHost ? '<div class="vote-status">بانتظار المضيف للاستمرار...</div>' : ''}
        </div>
    `;
}

function goodSonPull() {
    if (!selectedTarget) return;
    socket.emit('good-son-pull', { targetId: selectedTarget });
    selectedTarget = null;
}

// ===== Shop Screen =====
function showShop() {
    currentScreen = 'shop';
    socket.emit('get-shop');
    socket.emit('get-profile');
}

socket.on('shop-data', ({ packs, coins, gems }) => {
    if (currentScreen !== 'shop') return;
    app.innerHTML = `
        <div class="screen-shop fade-in">
            <div class="shop-header">
                <button class="back-btn" onclick="closeShop()">→ رجوع</button>
                <h2>🛒 المتجر</h2>
                <div class="shop-wallet">
                    <span class="wallet-coins">🪙 ${coins}</span>
                    <span class="wallet-gems">💎 ${gems}</span>
                </div>
            </div>
            <div class="pack-grid">
                ${packs.map(pack => `
                    <div class="pack-item tilt-card" onclick="buyPack('${pack.id}')" data-pack="${pack.id}">
                        <div class="card-glare"></div>
                        <div class="pack-glow" style="background:${pack.color};"></div>
                        <div class="pack-icon">${pack.icon}</div>
                        <div class="pack-name">${pack.name}</div>
                        <div class="pack-info">${pack.cards} بطاقات${pack.guaranteedRare ? ' • نادرة مضمونة' : ''}</div>
                        <div class="pack-price">🪙 ${pack.price}</div>
                        ${coins < pack.price ? '<div class="pack-locked">عملات غير كافية</div>' : ''}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    setTimeout(() => { initJuicyButtons(app); initCardTilt(app); }, 50);
});

function buyPack(packId) {
    playSynthSound('press');
    socket.emit('open-pack', { packType: packId.toUpperCase() });
}

function closeShop() {
    currentScreen = null;
    render();
}

// ===== Pack Opening Screen =====
socket.on('pack-result', (data) => {
    if (data.error) {
        playSynthSound('error');
        showError(data.error);
        // Refresh shop
        if (currentScreen === 'shop') socket.emit('get-shop');
        return;
    }
    currentScreen = 'pack-opening';
    renderPackOpening(data.cards, data.packName, data.remainingCoins);
});

function renderPackOpening(cards, packName, remainingCoins) {
    let revealedCount = 0;
    const totalCards = cards.length;

    app.innerHTML = `
        <div class="screen-pack-opening">
            <div class="pack-opening-bg"></div>
            <div class="pack-opening-header">
                <h2 class="pack-title-anim">${packName}</h2>
                <div class="pack-subtitle">اضغط على كل بطاقة لكشفها!</div>
            </div>
            <div class="pack-cards-row" id="pack-cards">
                ${cards.map((card, i) => `
                    <div class="pack-card-wrapper" style="animation-delay:${i * 0.15}s" onclick="revealPackCard(this, ${i})" data-index="${i}">
                        <div class="pack-card-inner">
                            <div class="pack-card-back">
                                <div class="card-back-pattern"></div>
                                <div class="card-back-icon">❓</div>
                                <div class="card-back-glow"></div>
                            </div>
                            <div class="pack-card-front rarity-${card.rarity}">
                                <div class="card-glare"></div>
                                <div class="card-rarity-band" style="background:${card.rarityColor};">${card.rarityName}</div>
                                <div class="card-role-icon">${card.roleIcon}</div>
                                <div class="card-role-name">${card.roleName}</div>
                                <div class="card-skin-name">${card.skin}</div>
                                <div class="card-holo-overlay"></div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="pack-actions" id="pack-actions" style="display:none;">
                <div class="pack-remaining">🪙 المتبقي: ${remainingCoins}</div>
                <button class="btn btn-primary btn-large" onclick="showShop()">🛒 شراء المزيد</button>
                <button class="btn btn-secondary" onclick="closeShop()">🏠 الرئيسية</button>
            </div>
        </div>
    `;

    // Store cards data for reveal
    window._packCards = cards;
    window._packRevealedCount = 0;
    window._packTotal = totalCards;

    screenShake(5, 300);
    playSynthSound('card_whoosh');
    setTimeout(() => initCardTilt(document.getElementById('pack-cards')), 100);
}

function revealPackCard(el, index) {
    if (el.classList.contains('revealed')) return;
    el.classList.add('revealed');

    const card = window._packCards[index];
    window._packRevealedCount++;

    // Sound based on rarity
    if (card.rarity === 'foil' || card.rarity === 'holographic') {
        playSynthSound('legendary_reveal');
        screenShake(15, 600);
        const rect = el.getBoundingClientRect();
        createParticleExplosion(rect.left + rect.width / 2, rect.top + rect.height / 2, card.rarityColor, 60);
        // Extra dramatic particles
        setTimeout(() => createParticleExplosion(rect.left + rect.width / 2, rect.top + rect.height / 2, '#ffd700', 30), 200);
    } else if (card.rarity === 'epic') {
        playSynthSound('card_reveal');
        screenShake(8, 400);
        const rect = el.getBoundingClientRect();
        createParticleExplosion(rect.left + rect.width / 2, rect.top + rect.height / 2, card.rarityColor, 35);
    } else if (card.rarity === 'rare') {
        playSynthSound('card_reveal');
        screenShake(4, 200);
        const rect = el.getBoundingClientRect();
        createParticleExplosion(rect.left + rect.width / 2, rect.top + rect.height / 2, card.rarityColor, 20);
    } else {
        playSynthSound('card_whoosh');
    }

    // Show actions when all revealed
    if (window._packRevealedCount >= window._packTotal) {
        setTimeout(() => {
            const actions = document.getElementById('pack-actions');
            if (actions) actions.style.display = 'flex';
            playSynthSound('coins');
        }, 800);
    }
}

// ===== Inventory Screen =====
function showInventory() {
    currentScreen = 'inventory';
    socket.emit('get-inventory');
}

socket.on('inventory-data', ({ cards, equippedSkins }) => {
    if (currentScreen !== 'inventory') return;
    // Group cards by role
    const groups = {};
    cards.forEach(c => {
        if (!groups[c.roleId]) groups[c.roleId] = [];
        groups[c.roleId].push(c);
    });

    app.innerHTML = `
        <div class="screen-inventory fade-in">
            <div class="inv-header">
                <button class="back-btn" onclick="closeShop()">→ رجوع</button>
                <h2>🃏 مجموعتي (${cards.length} بطاقة)</h2>
            </div>
            ${cards.length === 0 ? `
                <div class="inv-empty">
                    <div style="font-size:60px;">📦</div>
                    <div>لا توجد بطاقات بعد!</div>
                    <button class="btn btn-primary btn-large" onclick="showShop()">🛒 اذهب للمتجر</button>
                </div>
            ` : `
                <div class="inv-grid">
                    ${cards.sort((a,b) => {
                        const rarityOrder = {foil:0,holographic:1,epic:2,rare:3,common:4};
                        return (rarityOrder[a.rarity]||5) - (rarityOrder[b.rarity]||5);
                    }).map(card => `
                        <div class="inv-card tilt-card rarity-${card.rarity}" onclick="equipCard('${card.roleId}','${card.skin}')">
                            <div class="card-glare"></div>
                            <div class="card-holo-overlay"></div>
                            <div class="card-rarity-dot" style="background:${card.rarityColor};"></div>
                            <div class="inv-card-icon">${card.roleIcon}</div>
                            <div class="inv-card-name">${card.roleName}</div>
                            <div class="inv-card-skin">${card.skin}</div>
                            <div class="inv-card-rarity" style="color:${card.rarityColor};">${card.rarityName}</div>
                            ${equippedSkins[card.roleId] === card.skin ? '<div class="inv-equipped-badge">مُجهّز ✓</div>' : ''}
                        </div>
                    `).join('')}
                </div>
            `}
        </div>
    `;
    setTimeout(() => { initJuicyButtons(app); initCardTilt(app); }, 50);
});

function equipCard(roleId, skin) {
    playSynthSound('press');
    socket.emit('equip-skin', { roleId, skin });
}

socket.on('skin-equipped', ({ roleId, skin }) => {
    playSynthSound('coins');
    // Refresh inventory
    if (currentScreen === 'inventory') socket.emit('get-inventory');
});

// ===== Game Over =====
function renderGameOver() {
    const w = state.winner;
    const isHost = myId === state.hostId;
    const rewards = state.gameRewards && state.gameRewards[myId];

    let rewardsHtml = '';
    if (rewards) {
        rewardsHtml = `
            <div class="go-rewards">
                <div class="go-rewards-title">🏆 مكافآتك</div>
                <div class="go-rewards-grid">
                    ${rewards.bonuses.map((b, i) => `
                        <div class="reward-item" style="animation-delay:${0.5 + i * 0.15}s">
                            <span class="reward-text">${b.text}</span>
                            <span class="reward-values">
                                ${b.coins ? `<span class="reward-coins">+${b.coins} 🪙</span>` : ''}
                                ${b.xp ? `<span class="reward-xp">+${b.xp} XP</span>` : ''}
                            </span>
                        </div>
                    `).join('')}
                </div>
                <div class="go-rewards-total">
                    <div class="reward-total-item">🪙 ${rewards.totalCoins} عملة (إجمالي)</div>
                    <div class="reward-total-item">⭐ المستوى ${rewards.newLevel}</div>
                    <div class="go-xp-bar"><div class="go-xp-fill" style="width:${(rewards.xpProgress * 100).toFixed(1)}%"></div></div>
                </div>
                ${rewards.leveledUp ? `
                    <div class="level-up-banner">
                        🎉 ارتفع مستواك إلى ${rewards.newLevel}!
                    </div>
                ` : ''}
            </div>
        `;
    }

    app.innerHTML = `
        <div class="screen-gameover">
            <div class="go-icon">${w === 'citizens' ? '🏆' : '😈'}</div>
            <div class="go-title">${w === 'citizens' ? 'فاز الصالحون!' : 'فازت المافيا!'}</div>
            <div class="go-desc">${w === 'citizens' ? 'تم القبض على جميع أعضاء المافيا!' : 'سيطرت المافيا على المدينة!'}</div>
            ${rewardsHtml}
            <div class="go-players">
                ${state.players.map((p, i) => {
                    const r = p.role;
                    const tc = r.team === 'mafia' ? 'mafia' : 'citizen';
                    return `<div class="go-player ${tc}" style="animation-delay:${i * 0.08}s">${r.icon} ${p.name} - ${r.name}</div>`;
                }).join('')}
            </div>
            <div style="display:flex; flex-direction:column; gap:10px; width:100%; max-width:300px;">
                ${isHost ? `<button class="btn btn-primary btn-large btn-full" onclick="socket.emit('restart-game')">🔄 لعبة جديدة</button>` : ''}
                <button class="btn btn-shop btn-full" onclick="showShop()">🛒 افتح حزم بطاقات</button>
                <button class="btn btn-secondary btn-full" onclick="clearSession(); state={}; myId=null; render();">🏠 الرئيسية</button>
            </div>
        </div>
    `;

    // Level up celebration
    if (rewards && rewards.leveledUp) {
        setTimeout(() => {
            playSynthSound('level_up');
            screenShake(12, 500);
            createParticleExplosion(window.innerWidth / 2, window.innerHeight / 2, '#ffd700', 80);
        }, 1000);
    } else {
        setTimeout(() => playSynthSound('coins'), 500);
    }
    setTimeout(() => initJuicyButtons(app), 50);
}

// ===== Socket Events =====
socket.on('room-joined', ({ roomCode, playerId }) => {
    myId = playerId;
    saveSession(roomCode, playerId);
    initSVGContainers();
});

socket.on('game-state', (newState) => {
    // Death sound
    if (state.players && newState.players) {
        for (let i = 0; i < newState.players.length; i++) {
            const oldP = state.players[i];
            const newP = newState.players[i];
            if (oldP && newP && oldP.alive && !newP.alive) {
                playSound('death');
                break;
            }
        }
    }

    state = newState;
    myId = newState.myId || myId;
    render();
});

socket.on('error-msg', ({ message }) => { showError(message); });

socket.on('kicked', () => {
    clearSession();
    state = {};
    myId = null;
    render();
    alert('تم طردك من الغرفة');
});

socket.on('speaker-update', ({ playerId, name, duration, quote }) => {
    const player = state.players?.find(p => p.id === playerId);
    if (player) speakerManager.setSpeaker({ name: name || player.name, quote: quote || '...' }, duration);
});

socket.on('speaker-clear', () => { speakerManager.clearSpeaker(); });

socket.on('discussion-message', ({ playerName, playerAvatar, message }) => {
    discussionFeed.addMessage(playerName, playerAvatar, message);
});

socket.on('vote-update', ({ playerId, playerName, voteCount }) => {
    liveVoteDisplay.updateVote(playerId, playerName, voteCount);
});

socket.on('clear-votes', () => { liveVoteDisplay.clear(); liveVoteDisplay.hide(); });

socket.on('show-elimination', ({ playerName, role, team }) => {
    resultCelebration.show(playerName, role, team);
});

socket.on('hide-elimination', () => { resultCelebration.hide(); });

// ===== Speaker Panel Management =====
class SpeakerManager {
    constructor() {
        this.panel = document.getElementById('speaker-panel');
        this.currentSpeaker = null;
        this.speakerTimer = null;
    }

    setSpeaker(player, duration = 0) {
        if (!player || !this.panel) return;
        this.currentSpeaker = player;
        const nameEl = this.panel.querySelector('.speaker-name');
        const quoteEl = this.panel.querySelector('.speaker-quote');
        if (nameEl) nameEl.textContent = player.name || 'مجهول';
        if (quoteEl) quoteEl.textContent = player.quote || '...';
        this.panel.classList.remove('hidden');
        this.panel.classList.add('active');
        playSound('click');
        if (duration > 0) this.animateTimer(duration);
    }

    animateTimer(duration) {
        if (this.speakerTimer) clearInterval(this.speakerTimer);
        const timerTextEl = this.panel.querySelector('.timer-text');
        const timerFillEl = this.panel.querySelector('.timer-fill');
        if (!timerTextEl || !timerFillEl) return;

        const startTime = Date.now();
        const endTime = startTime + (duration * 1000);

        this.speakerTimer = setInterval(() => {
            const now = Date.now();
            const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));
            const percent = Math.max(0, ((endTime - now) / (duration * 1000)) * 100);
            if (timerTextEl) timerTextEl.textContent = remaining + 's';
            if (timerFillEl) {
                timerFillEl.style.width = percent + '%';
                timerFillEl.style.background = remaining <= 10
                    ? 'linear-gradient(90deg, var(--danger), #ff6b6b)'
                    : 'linear-gradient(90deg, var(--primary), var(--accent))';
            }
            if (remaining === 0) { clearInterval(this.speakerTimer); playSound('timer'); }
        }, 100);
    }

    clearSpeaker() {
        if (this.speakerTimer) clearInterval(this.speakerTimer);
        if (this.panel) { this.panel.classList.add('hidden'); this.panel.classList.remove('active'); }
        this.currentSpeaker = null;
    }
}

const speakerManager = new SpeakerManager();

// ===== Discussion Feed =====
class DiscussionFeed {
    constructor() {
        this.container = document.getElementById('discussion-feed');
        this.messagesEl = this.container?.querySelector('.discussion-messages');
        this.visible = false;
        this.maxMessages = 10;
    }

    addMessage(playerName, playerAvatar, message) {
        if (!this.messagesEl) return;
        const el = document.createElement('div');
        el.className = 'discussion-message';
        el.innerHTML = `<span class="msg-speaker">${playerAvatar} ${playerName}</span><div class="msg-text">${message}</div>`;
        this.messagesEl.appendChild(el);
        const msgs = this.messagesEl.querySelectorAll('.discussion-message');
        if (msgs.length > this.maxMessages) msgs[0].remove();
        this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
        this.show();
    }

    show() { if (!this.visible && this.container) { this.container.classList.remove('hidden'); this.visible = true; } }
    hide() { if (this.container) { this.container.classList.add('hidden'); this.visible = false; } }
    toggle() { this.visible ? this.hide() : this.show(); }
    clear() { if (this.messagesEl) this.messagesEl.innerHTML = ''; }
}

const discussionFeed = new DiscussionFeed();

// ===== Live Vote Display =====
class LiveVoteDisplay {
    constructor() {
        this.container = document.getElementById('live-vote-display');
        this.barsEl = this.container?.querySelector('.vote-bars');
        this.visible = false;
        this.voteData = {};
    }

    updateVote(playerId, playerName, votes) {
        this.voteData[playerId] = { name: playerName, votes };
        this.renderBars();
        this.show();
    }

    renderBars() {
        if (!this.barsEl) return;
        this.barsEl.innerHTML = '';
        const sorted = Object.values(this.voteData).sort((a, b) => b.votes - a.votes);
        const maxV = sorted.length > 0 ? Math.max(...sorted.map(v => v.votes), 1) : 1;

        sorted.forEach(item => {
            const pct = (item.votes / maxV) * 100;
            const el = document.createElement('div');
            el.className = 'vote-bar-item';
            el.innerHTML = `
                <div class="vote-bar-label">${item.name}</div>
                <div class="vote-bar-container">
                    <div class="vote-bar-fill" style="width:${pct}%">
                        ${item.votes > 0 ? `<span class="vote-bar-count">${item.votes}</span>` : ''}
                    </div>
                </div>
            `;
            this.barsEl.appendChild(el);
        });
    }

    show() { if (!this.visible && this.container) { this.container.classList.remove('hidden'); this.visible = true; } }
    hide() { if (this.container) { this.container.classList.add('hidden'); this.visible = false; } }
    clear() { this.voteData = {}; if (this.barsEl) this.barsEl.innerHTML = ''; }
}

const liveVoteDisplay = new LiveVoteDisplay();

// ===== Confetti System =====
class ConfettiSystem {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.animationId = null;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        window.addEventListener('resize', () => { this.canvas.width = window.innerWidth; this.canvas.height = window.innerHeight; });
    }

    createParticles(count = 120) {
        const colors = ['#e63946', '#f4a261', '#2ec4b6', '#457b9d', '#ffd700', '#f1faee'];
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height - this.canvas.height,
                vx: (Math.random() - 0.5) * 5,
                vy: Math.random() * 4 + 2,
                size: Math.random() * 8 + 3,
                color: colors[Math.floor(Math.random() * colors.length)],
                opacity: 1,
                rotation: Math.random() * Math.PI * 2,
                rotationVel: (Math.random() - 0.5) * 0.2
            });
        }
    }

    animate() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.particles = this.particles.filter(p => {
            p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.rotation += p.rotationVel; p.opacity -= 0.008;
            if (p.opacity > 0) {
                this.ctx.save();
                this.ctx.translate(p.x, p.y);
                this.ctx.rotate(p.rotation);
                this.ctx.globalAlpha = p.opacity;
                this.ctx.fillStyle = p.color;
                this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
                this.ctx.restore();
                return true;
            }
            return false;
        });
        if (this.particles.length > 0) this.animationId = requestAnimationFrame(() => this.animate());
    }

    start() { this.particles = []; this.createParticles(); this.animate(); }
    stop() { if (this.animationId) cancelAnimationFrame(this.animationId); this.particles = []; if (this.ctx) this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); }
}

// ===== Result Celebration =====
class ResultCelebration {
    constructor() {
        this.container = document.getElementById('result-celebration');
        this.confetti = new ConfettiSystem('confetti-canvas');
        this.isVisible = false;
    }

    show(playerName, playerRole, playerTeam) {
        if (!this.container) return;
        const nameEl = this.container.querySelector('.celebration-name');
        const roleIconEl = this.container.querySelector('.role-icon');
        const roleNameEl = this.container.querySelector('.role-name');
        if (nameEl) nameEl.textContent = playerName || '؟؟؟';
        if (roleIconEl) roleIconEl.textContent = playerRole?.icon || '🎭';
        if (roleNameEl) roleNameEl.textContent = playerRole?.name || 'دور مجهول';
        this.container.classList.remove('hidden');
        this.isVisible = true;
        this.confetti.start();
        playSound('death');
    }

    hide() {
        if (!this.container) return;
        this.container.classList.add('hidden');
        this.isVisible = false;
        this.confetti.stop();
    }
}

const resultCelebration = new ResultCelebration();
function closeCelebration() { resultCelebration.hide(); }

// ===== Auto Reconnect =====
const saved = getSavedSession();
if (saved.room && saved.player) {
    socket.emit('reconnect-room', { roomCode: saved.room, playerId: saved.player });
} else {
    render();
}

setTimeout(() => { if (!state.phase) render(); }, 2000);
