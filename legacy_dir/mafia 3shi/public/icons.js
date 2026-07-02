// ============================================================
// ICONS.js - Mafia Game SVG Icon Library
// Rich, detailed, dark-themed SVG icons for the Mafia game UI
// ============================================================

const ICONS = {

    // ── 1. LOGO - Dramatic theatrical mask with gold/red gradient ──
    logo: (size = 120) => `<svg viewBox="0 0 120 120" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="logoGold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#FFD700"/>
                <stop offset="50%" stop-color="#FFA500"/>
                <stop offset="100%" stop-color="#B8860B"/>
            </linearGradient>
            <linearGradient id="logoRed" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#DC143C"/>
                <stop offset="100%" stop-color="#8B0000"/>
            </linearGradient>
            <radialGradient id="logoGlow" cx="50%" cy="40%" r="50%">
                <stop offset="0%" stop-color="#FFD700" stop-opacity="0.4"/>
                <stop offset="100%" stop-color="#FFD700" stop-opacity="0"/>
            </radialGradient>
            <filter id="logoShadow">
                <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000" flood-opacity="0.6"/>
            </filter>
            <filter id="logoInnerGlow">
                <feGaussianBlur stdDeviation="2" result="blur"/>
                <feComposite in="SourceGraphic" in2="blur" operator="over"/>
            </filter>
        </defs>
        <circle cx="60" cy="60" r="55" fill="url(#logoGlow)"/>
        <g filter="url(#logoShadow)">
            <!-- Left mask (tragedy) -->
            <path d="M20 45 Q20 25 40 20 Q55 18 58 30 L58 75 Q58 90 45 95 Q25 98 20 80 Z" fill="url(#logoRed)" stroke="url(#logoGold)" stroke-width="2"/>
            <path d="M30 50 Q35 48 40 50" stroke="#1a0000" stroke-width="2.5" fill="none" stroke-linecap="round"/>
            <path d="M44 50 Q49 48 54 50" stroke="#1a0000" stroke-width="2.5" fill="none" stroke-linecap="round"/>
            <ellipse cx="35" cy="46" rx="4" ry="5" fill="#1a0000"/>
            <ellipse cx="49" cy="46" rx="4" ry="5" fill="#1a0000"/>
            <path d="M32 68 Q42 80 54 68" stroke="#1a0000" stroke-width="2.5" fill="none" stroke-linecap="round"/>
            <!-- Right mask (comedy) -->
            <path d="M62 30 Q65 18 80 20 Q100 25 100 45 L100 80 Q95 98 75 95 Q62 90 62 75 Z" fill="url(#logoGold)" stroke="url(#logoRed)" stroke-width="2"/>
            <ellipse cx="73" cy="46" rx="4" ry="5" fill="#4a3000"/>
            <ellipse cx="87" cy="46" rx="4" ry="5" fill="#4a3000"/>
            <path d="M68 50 Q73 52 78 50" stroke="#4a3000" stroke-width="2" fill="none" stroke-linecap="round"/>
            <path d="M82 50 Q87 52 92 50" stroke="#4a3000" stroke-width="2" fill="none" stroke-linecap="round"/>
            <path d="M70 65 Q80 75 92 65" stroke="#4a3000" stroke-width="2.5" fill="none" stroke-linecap="round"/>
            <!-- Ribbons -->
            <path d="M45 95 Q42 110 35 115" stroke="url(#logoRed)" stroke-width="3" fill="none" stroke-linecap="round"/>
            <path d="M75 95 Q78 110 85 115" stroke="url(#logoGold)" stroke-width="3" fill="none" stroke-linecap="round"/>
        </g>
    </svg>`,

    // ── 2. SKULL - Detailed skull with red glow for death events ──
    skull: (size = 24) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <radialGradient id="skullGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#ff3333" stop-opacity="0.3"/>
                <stop offset="100%" stop-color="#ff0000" stop-opacity="0"/>
            </radialGradient>
            <linearGradient id="skullBone" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#e8e0d4"/>
                <stop offset="50%" stop-color="#d4c8b8"/>
                <stop offset="100%" stop-color="#b0a090"/>
            </linearGradient>
            <filter id="skullShadow">
                <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#ff0000" flood-opacity="0.5"/>
            </filter>
        </defs>
        <circle cx="12" cy="12" r="11" fill="url(#skullGlow)"/>
        <g filter="url(#skullShadow)">
            <path d="M12 2C7.5 2 4 5.5 4 9.5C4 12 5 13.5 5 15C5 16 4.5 16.5 4.5 17.5C4.5 18.5 5.5 19 6.5 19L8 19L8 21C8 21.5 8.5 22 9 22L15 22C15.5 22 16 21.5 16 21L16 19L17.5 19C18.5 19 19.5 18.5 19.5 17.5C19.5 16.5 19 16 19 15C19 13.5 20 12 20 9.5C20 5.5 16.5 2 12 2Z" fill="url(#skullBone)"/>
            <ellipse cx="9" cy="10" rx="2.2" ry="2.5" fill="#1a0000"/>
            <ellipse cx="15" cy="10" rx="2.2" ry="2.5" fill="#1a0000"/>
            <ellipse cx="9" cy="9.8" rx="1" ry="1.2" fill="#ff3333" opacity="0.4"/>
            <ellipse cx="15" cy="9.8" rx="1" ry="1.2" fill="#ff3333" opacity="0.4"/>
            <path d="M11 13.5 L12 15 L13 13.5" fill="#1a0000"/>
            <path d="M9 17 L9 19" stroke="#8a7a6a" stroke-width="0.7"/>
            <path d="M12 17 L12 19" stroke="#8a7a6a" stroke-width="0.7"/>
            <path d="M15 17 L15 19" stroke="#8a7a6a" stroke-width="0.7"/>
            <path d="M8 16.5 Q12 18 16 16.5" stroke="#8a7a6a" stroke-width="0.7" fill="none"/>
        </g>
    </svg>`,

    // ── 3. CROWN - Ornate gold crown for Mafia Boss ──
    crown: (size = 24) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="crownGold" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#FFD700"/>
                <stop offset="40%" stop-color="#FFC125"/>
                <stop offset="100%" stop-color="#B8860B"/>
            </linearGradient>
            <linearGradient id="crownJewel" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#ff4444"/>
                <stop offset="100%" stop-color="#8B0000"/>
            </linearGradient>
            <filter id="crownShadow">
                <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#FFD700" flood-opacity="0.4"/>
            </filter>
        </defs>
        <g filter="url(#crownShadow)">
            <path d="M3 18 L4 9 L8 13 L12 5 L16 13 L20 9 L21 18 Z" fill="url(#crownGold)" stroke="#B8860B" stroke-width="0.5"/>
            <rect x="3" y="17" width="18" height="3" rx="1" fill="url(#crownGold)" stroke="#8B6914" stroke-width="0.5"/>
            <circle cx="12" cy="8" r="1.5" fill="url(#crownJewel)" stroke="#FFD700" stroke-width="0.3"/>
            <circle cx="7" cy="12" r="1" fill="#4169E1" stroke="#FFD700" stroke-width="0.3"/>
            <circle cx="17" cy="12" r="1" fill="#4169E1" stroke="#FFD700" stroke-width="0.3"/>
            <circle cx="12" cy="18.5" r="1.2" fill="url(#crownJewel)" stroke="#FFD700" stroke-width="0.3"/>
            <circle cx="8" cy="18.5" r="0.8" fill="#50C878" stroke="#FFD700" stroke-width="0.3"/>
            <circle cx="16" cy="18.5" r="0.8" fill="#50C878" stroke="#FFD700" stroke-width="0.3"/>
            <!-- Filigree lines -->
            <path d="M5 15 Q8 14 10 15" stroke="#8B6914" stroke-width="0.4" fill="none"/>
            <path d="M14 15 Q16 14 19 15" stroke="#8B6914" stroke-width="0.4" fill="none"/>
        </g>
    </svg>`,

    // ── 4. SILENCE - Finger over lips for Mafia Muter ──
    silence: (size = 24) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="silenceSkin" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#d4a574"/>
                <stop offset="100%" stop-color="#a67c52"/>
            </linearGradient>
            <radialGradient id="silenceGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#9966ff" stop-opacity="0.25"/>
                <stop offset="100%" stop-color="#9966ff" stop-opacity="0"/>
            </radialGradient>
            <filter id="silenceShadow">
                <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#6633cc" flood-opacity="0.5"/>
            </filter>
        </defs>
        <circle cx="12" cy="12" r="11" fill="url(#silenceGlow)"/>
        <g filter="url(#silenceShadow)">
            <!-- Face outline -->
            <ellipse cx="12" cy="13" rx="7" ry="8.5" fill="url(#silenceSkin)"/>
            <!-- Eyes -->
            <ellipse cx="9.5" cy="11" rx="1.3" ry="0.8" fill="#2a1a0a"/>
            <ellipse cx="14.5" cy="11" rx="1.3" ry="0.8" fill="#2a1a0a"/>
            <!-- Lips -->
            <path d="M9.5 16 Q12 17.5 14.5 16" stroke="#c46a6a" stroke-width="1" fill="#b55555"/>
            <!-- Finger (vertical over lips) -->
            <rect x="11" y="6" width="2.2" height="12" rx="1.1" fill="url(#silenceSkin)" stroke="#8a6a4a" stroke-width="0.4"/>
            <!-- Fingernail -->
            <ellipse cx="12.1" cy="6.8" rx="0.9" ry="0.7" fill="#e8d0b8" stroke="#c4a882" stroke-width="0.3"/>
            <!-- Shh lines -->
            <path d="M17 8 L19 7" stroke="#9966ff" stroke-width="0.6" opacity="0.6" stroke-linecap="round"/>
            <path d="M17.5 10 L19.5 9.5" stroke="#9966ff" stroke-width="0.6" opacity="0.4" stroke-linecap="round"/>
            <path d="M17 12 L19 12" stroke="#9966ff" stroke-width="0.6" opacity="0.3" stroke-linecap="round"/>
        </g>
    </svg>`,

    // ── 5. KNIFE - Sharp dagger for regular mafia ──
    knife: (size = 24) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="knifeBlade" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#e8e8f0"/>
                <stop offset="40%" stop-color="#c0c0d0"/>
                <stop offset="60%" stop-color="#e0e0e8"/>
                <stop offset="100%" stop-color="#a0a0b0"/>
            </linearGradient>
            <linearGradient id="knifeHandle" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#4a2800"/>
                <stop offset="50%" stop-color="#6b3a10"/>
                <stop offset="100%" stop-color="#3a1a00"/>
            </linearGradient>
            <filter id="knifeShadow">
                <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#ff0000" flood-opacity="0.4"/>
            </filter>
        </defs>
        <g filter="url(#knifeShadow)" transform="rotate(-45, 12, 12)">
            <!-- Blade -->
            <path d="M12 2 L14 12 L12 13 L10 12 Z" fill="url(#knifeBlade)" stroke="#808090" stroke-width="0.3"/>
            <!-- Blade edge highlight -->
            <path d="M12 3 L13 11" stroke="#ffffff" stroke-width="0.3" opacity="0.6"/>
            <!-- Guard -->
            <rect x="8.5" y="12.5" width="7" height="1.5" rx="0.5" fill="#B8860B" stroke="#8B6914" stroke-width="0.3"/>
            <!-- Handle -->
            <rect x="10.5" y="14" width="3" height="6" rx="0.8" fill="url(#knifeHandle)" stroke="#2a1400" stroke-width="0.3"/>
            <!-- Handle wrap lines -->
            <path d="M10.5 15.5 L13.5 15.5" stroke="#5a3000" stroke-width="0.4"/>
            <path d="M10.5 17 L13.5 17" stroke="#5a3000" stroke-width="0.4"/>
            <path d="M10.5 18.5 L13.5 18.5" stroke="#5a3000" stroke-width="0.4"/>
            <!-- Pommel -->
            <ellipse cx="12" cy="20.5" rx="2" ry="1" fill="#B8860B" stroke="#8B6914" stroke-width="0.3"/>
            <!-- Blood drip -->
            <path d="M13.5 5 Q14.5 7 14 8" stroke="#cc0000" stroke-width="0.5" fill="none" opacity="0.7"/>
        </g>
    </svg>`,

    // ── 6. SHIELD - Ornate shield for Mayor ──
    shield: (size = 24) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="shieldBody" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#4a7ab5"/>
                <stop offset="50%" stop-color="#2a5a95"/>
                <stop offset="100%" stop-color="#1a3a65"/>
            </linearGradient>
            <linearGradient id="shieldRim" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#FFD700"/>
                <stop offset="100%" stop-color="#B8860B"/>
            </linearGradient>
            <filter id="shieldShadow">
                <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#2a5a95" flood-opacity="0.5"/>
            </filter>
        </defs>
        <g filter="url(#shieldShadow)">
            <path d="M12 2 L4 6 L4 12 Q4 18 12 22 Q20 18 20 12 L20 6 Z" fill="url(#shieldBody)" stroke="url(#shieldRim)" stroke-width="1.2"/>
            <!-- Inner border -->
            <path d="M12 4 L6 7.5 L6 12 Q6 17 12 20 Q18 17 18 12 L18 7.5 Z" fill="none" stroke="url(#shieldRim)" stroke-width="0.5" opacity="0.6"/>
            <!-- Star emblem -->
            <path d="M12 7 L13.2 10.5 L17 10.5 L14 12.8 L15 16.5 L12 14 L9 16.5 L10 12.8 L7 10.5 L10.8 10.5 Z" fill="url(#shieldRim)" opacity="0.9"/>
            <!-- Highlight -->
            <path d="M7 7 Q9 6 12 5" stroke="#ffffff" stroke-width="0.4" fill="none" opacity="0.3"/>
        </g>
    </svg>`,

    // ── 7. CHILD - Hooded figure for Good Son ──
    child: (size = 24) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="childHood" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#5a8a5a"/>
                <stop offset="100%" stop-color="#2a4a2a"/>
            </linearGradient>
            <radialGradient id="childGlow" cx="50%" cy="40%" r="50%">
                <stop offset="0%" stop-color="#88cc88" stop-opacity="0.2"/>
                <stop offset="100%" stop-color="#88cc88" stop-opacity="0"/>
            </radialGradient>
            <filter id="childShadow">
                <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#2a4a2a" flood-opacity="0.5"/>
            </filter>
        </defs>
        <circle cx="12" cy="12" r="11" fill="url(#childGlow)"/>
        <g filter="url(#childShadow)">
            <!-- Hood/cloak -->
            <path d="M12 2 Q5 3 4 10 L4 20 Q4 22 6 22 L18 22 Q20 22 20 20 L20 10 Q19 3 12 2 Z" fill="url(#childHood)" stroke="#1a3a1a" stroke-width="0.5"/>
            <!-- Face shadow -->
            <ellipse cx="12" cy="11" rx="5" ry="5.5" fill="#1a2a1a"/>
            <!-- Subtle eyes glowing -->
            <ellipse cx="10" cy="11" rx="1" ry="0.7" fill="#88cc88" opacity="0.8"/>
            <ellipse cx="14" cy="11" rx="1" ry="0.7" fill="#88cc88" opacity="0.8"/>
            <!-- Hood detail -->
            <path d="M6 8 Q12 5 18 8" stroke="#3a5a3a" stroke-width="0.5" fill="none"/>
            <!-- Cloak folds -->
            <path d="M8 14 L7 22" stroke="#1a3a1a" stroke-width="0.6"/>
            <path d="M16 14 L17 22" stroke="#1a3a1a" stroke-width="0.6"/>
            <path d="M12 15 L12 22" stroke="#1a3a1a" stroke-width="0.4"/>
        </g>
    </svg>`,

    // ── 8. MEDIC - Medical cross for Medic ──
    medic: (size = 24) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="medicRed" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#ff4444"/>
                <stop offset="100%" stop-color="#cc0000"/>
            </linearGradient>
            <linearGradient id="medicBg" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#ffffff"/>
                <stop offset="100%" stop-color="#e0e0e0"/>
            </linearGradient>
            <filter id="medicShadow">
                <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#cc0000" flood-opacity="0.4"/>
            </filter>
            <filter id="medicGlow">
                <feGaussianBlur stdDeviation="1" result="glow"/>
                <feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
        </defs>
        <g filter="url(#medicShadow)">
            <!-- Background circle -->
            <circle cx="12" cy="12" r="10" fill="url(#medicBg)" stroke="#cc0000" stroke-width="0.8"/>
            <!-- Red cross -->
            <g filter="url(#medicGlow)">
                <rect x="9.5" y="5" width="5" height="14" rx="0.8" fill="url(#medicRed)"/>
                <rect x="5" y="9.5" width="14" height="5" rx="0.8" fill="url(#medicRed)"/>
            </g>
            <!-- Heartbeat line -->
            <path d="M3 18 L7 18 L8 16 L9.5 20 L11 14 L12.5 19 L14 18 L21 18" stroke="#cc0000" stroke-width="0.6" fill="none" opacity="0.5" stroke-linecap="round" stroke-linejoin="round"/>
        </g>
    </svg>`,

    // ── 9. CROSSHAIR - Sniper scope for Sniper ──
    crosshair: (size = 24) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <radialGradient id="crosshairLens" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#223344" stop-opacity="0.1"/>
                <stop offset="70%" stop-color="#112233" stop-opacity="0.3"/>
                <stop offset="100%" stop-color="#001122" stop-opacity="0.6"/>
            </radialGradient>
            <filter id="crosshairShadow">
                <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#ff3300" flood-opacity="0.4"/>
            </filter>
        </defs>
        <g filter="url(#crosshairShadow)">
            <!-- Outer ring -->
            <circle cx="12" cy="12" r="10" fill="url(#crosshairLens)" stroke="#ff4433" stroke-width="1.2"/>
            <!-- Inner ring -->
            <circle cx="12" cy="12" r="6" fill="none" stroke="#ff4433" stroke-width="0.6" opacity="0.7"/>
            <!-- Crosshairs -->
            <line x1="12" y1="1" x2="12" y2="6" stroke="#ff4433" stroke-width="1" stroke-linecap="round"/>
            <line x1="12" y1="18" x2="12" y2="23" stroke="#ff4433" stroke-width="1" stroke-linecap="round"/>
            <line x1="1" y1="12" x2="6" y2="12" stroke="#ff4433" stroke-width="1" stroke-linecap="round"/>
            <line x1="18" y1="12" x2="23" y2="12" stroke="#ff4433" stroke-width="1" stroke-linecap="round"/>
            <!-- Center dot -->
            <circle cx="12" cy="12" r="1.2" fill="#ff3300"/>
            <circle cx="12" cy="12" r="0.5" fill="#ff6644"/>
            <!-- Tick marks -->
            <line x1="12" y1="8" x2="12" y2="9" stroke="#ff4433" stroke-width="0.5"/>
            <line x1="12" y1="15" x2="12" y2="16" stroke="#ff4433" stroke-width="0.5"/>
            <line x1="8" y1="12" x2="9" y2="12" stroke="#ff4433" stroke-width="0.5"/>
            <line x1="15" y1="12" x2="16" y2="12" stroke="#ff4433" stroke-width="0.5"/>
        </g>
    </svg>`,

    // ── 10. CITIZEN - Peaceful dove silhouette ──
    citizen: (size = 24) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="citizenDove" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#ffffff"/>
                <stop offset="100%" stop-color="#c8d8e8"/>
            </linearGradient>
            <radialGradient id="citizenGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#aaccff" stop-opacity="0.2"/>
                <stop offset="100%" stop-color="#aaccff" stop-opacity="0"/>
            </radialGradient>
            <filter id="citizenShadow">
                <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#4488cc" flood-opacity="0.4"/>
            </filter>
        </defs>
        <circle cx="12" cy="12" r="11" fill="url(#citizenGlow)"/>
        <g filter="url(#citizenShadow)">
            <!-- Dove body -->
            <path d="M8 16 Q6 14 7 11 Q8 8 12 7 Q16 6 18 9 Q20 12 17 14 L14 16 Z" fill="url(#citizenDove)" stroke="#8899aa" stroke-width="0.4"/>
            <!-- Wing -->
            <path d="M10 12 Q6 8 3 5 Q6 7 9 7 Q7 9 9 11 Z" fill="url(#citizenDove)" stroke="#8899aa" stroke-width="0.3"/>
            <path d="M10 11 Q7 6 5 3 Q7 6 10 8" fill="url(#citizenDove)" stroke="#8899aa" stroke-width="0.3"/>
            <!-- Tail -->
            <path d="M8 16 Q5 17 3 19 Q6 18 8 17" fill="url(#citizenDove)" stroke="#8899aa" stroke-width="0.3"/>
            <!-- Eye -->
            <circle cx="16" cy="9" r="0.7" fill="#334455"/>
            <!-- Beak -->
            <path d="M18 9 L20 9.5 L18 10" fill="#e8a040" stroke="#c08030" stroke-width="0.2"/>
            <!-- Olive branch -->
            <path d="M12 16 Q13 18 11 20" stroke="#558833" stroke-width="0.6" fill="none"/>
            <ellipse cx="11" cy="18" rx="1.5" ry="0.8" fill="#66aa44" transform="rotate(-20,11,18)"/>
            <ellipse cx="12" cy="19.5" rx="1.5" ry="0.8" fill="#66aa44" transform="rotate(10,12,19.5)"/>
        </g>
    </svg>`,

    // ── 11. MOON - Crescent moon for night phase ──
    moon: (size = 24) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="moonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#f0e68c"/>
                <stop offset="50%" stop-color="#daa520"/>
                <stop offset="100%" stop-color="#b8860b"/>
            </linearGradient>
            <radialGradient id="moonGlow" cx="40%" cy="40%" r="60%">
                <stop offset="0%" stop-color="#f0e68c" stop-opacity="0.3"/>
                <stop offset="100%" stop-color="#f0e68c" stop-opacity="0"/>
            </radialGradient>
            <filter id="moonShadow">
                <feDropShadow dx="0" dy="0" stdDeviation="2" flood-color="#f0e68c" flood-opacity="0.6"/>
            </filter>
        </defs>
        <circle cx="12" cy="12" r="11" fill="url(#moonGlow)"/>
        <g filter="url(#moonShadow)">
            <path d="M15 3 Q10 5 8 10 Q6 16 10 20 Q14 24 19 21 Q14 22 11 18 Q8 13 10 8 Q12 4 15 3 Z" fill="url(#moonGrad)"/>
            <!-- Craters -->
            <circle cx="12" cy="10" r="1" fill="#c8a820" opacity="0.4"/>
            <circle cx="14" cy="15" r="0.6" fill="#c8a820" opacity="0.3"/>
            <!-- Stars -->
            <circle cx="5" cy="5" r="0.5" fill="#f0e68c" opacity="0.7"/>
            <circle cx="20" cy="8" r="0.4" fill="#f0e68c" opacity="0.5"/>
            <circle cx="18" cy="4" r="0.6" fill="#f0e68c" opacity="0.6"/>
            <circle cx="3" cy="14" r="0.3" fill="#f0e68c" opacity="0.4"/>
            <circle cx="21" cy="16" r="0.35" fill="#f0e68c" opacity="0.5"/>
        </g>
    </svg>`,

    // ── 12. SUN - Sun for day phase ──
    sun: (size = 24) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <radialGradient id="sunCenter" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#fff8dc"/>
                <stop offset="50%" stop-color="#FFD700"/>
                <stop offset="100%" stop-color="#FFA500"/>
            </radialGradient>
            <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#FFD700" stop-opacity="0.3"/>
                <stop offset="100%" stop-color="#FFD700" stop-opacity="0"/>
            </radialGradient>
            <filter id="sunShadow">
                <feDropShadow dx="0" dy="0" stdDeviation="1.5" flood-color="#FFD700" flood-opacity="0.6"/>
            </filter>
        </defs>
        <circle cx="12" cy="12" r="11" fill="url(#sunGlow)"/>
        <g filter="url(#sunShadow)">
            <!-- Rays -->
            <g stroke="#FFA500" stroke-width="1.5" stroke-linecap="round">
                <line x1="12" y1="1" x2="12" y2="4"/>
                <line x1="12" y1="20" x2="12" y2="23"/>
                <line x1="1" y1="12" x2="4" y2="12"/>
                <line x1="20" y1="12" x2="23" y2="12"/>
                <line x1="4.2" y1="4.2" x2="6.3" y2="6.3"/>
                <line x1="17.7" y1="17.7" x2="19.8" y2="19.8"/>
                <line x1="19.8" y1="4.2" x2="17.7" y2="6.3"/>
                <line x1="6.3" y1="17.7" x2="4.2" y2="19.8"/>
            </g>
            <!-- Sun body -->
            <circle cx="12" cy="12" r="6" fill="url(#sunCenter)"/>
            <!-- Face details -->
            <circle cx="10" cy="11" r="0.6" fill="#c89020"/>
            <circle cx="14" cy="11" r="0.6" fill="#c89020"/>
            <path d="M10 14 Q12 15.5 14 14" stroke="#c89020" stroke-width="0.7" fill="none" stroke-linecap="round"/>
        </g>
    </svg>`,

    // ── 13. VOTE - Ballot box for voting ──
    vote: (size = 24) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="voteBox" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#4a4a5a"/>
                <stop offset="100%" stop-color="#2a2a3a"/>
            </linearGradient>
            <linearGradient id="votePaper" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#ffffff"/>
                <stop offset="100%" stop-color="#e0e0e0"/>
            </linearGradient>
            <filter id="voteShadow">
                <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#000" flood-opacity="0.5"/>
            </filter>
        </defs>
        <g filter="url(#voteShadow)">
            <!-- Box -->
            <rect x="3" y="10" width="18" height="12" rx="2" fill="url(#voteBox)" stroke="#666" stroke-width="0.5"/>
            <!-- Box lid -->
            <rect x="2" y="9" width="20" height="3" rx="1" fill="#5a5a6a" stroke="#666" stroke-width="0.5"/>
            <!-- Slot -->
            <rect x="8" y="9.5" width="8" height="1.5" rx="0.5" fill="#1a1a2a"/>
            <!-- Ballot paper -->
            <rect x="9" y="2" width="7" height="10" rx="0.5" fill="url(#votePaper)" transform="rotate(10, 12, 7)" stroke="#aaa" stroke-width="0.3"/>
            <!-- Checkmark on paper -->
            <path d="M10.5 6 L12 8 L15 4" stroke="#cc0000" stroke-width="1" fill="none" stroke-linecap="round" stroke-linejoin="round" transform="rotate(10, 12, 7)"/>
            <!-- Lock detail on box -->
            <circle cx="12" cy="16" r="1.5" fill="none" stroke="#888" stroke-width="0.7"/>
            <rect x="11.5" y="16" width="1" height="2" fill="#888"/>
        </g>
    </svg>`,

    // ── 14. ROBOT - Robot head for bots ──
    robot: (size = 24) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="robotMetal" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#8899aa"/>
                <stop offset="50%" stop-color="#667788"/>
                <stop offset="100%" stop-color="#556677"/>
            </linearGradient>
            <radialGradient id="robotEye" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#00ffcc"/>
                <stop offset="100%" stop-color="#008866"/>
            </radialGradient>
            <filter id="robotShadow">
                <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#00aa88" flood-opacity="0.4"/>
            </filter>
        </defs>
        <g filter="url(#robotShadow)">
            <!-- Antenna -->
            <line x1="12" y1="2" x2="12" y2="5" stroke="#889" stroke-width="1"/>
            <circle cx="12" cy="2" r="1.2" fill="#00ffcc"/>
            <!-- Head -->
            <rect x="4" y="5" width="16" height="13" rx="3" fill="url(#robotMetal)" stroke="#556" stroke-width="0.5"/>
            <!-- Eyes -->
            <rect x="6.5" y="8" width="4" height="3.5" rx="1" fill="url(#robotEye)" stroke="#006644" stroke-width="0.4"/>
            <rect x="13.5" y="8" width="4" height="3.5" rx="1" fill="url(#robotEye)" stroke="#006644" stroke-width="0.4"/>
            <!-- Eye pupils -->
            <circle cx="8.5" cy="9.7" r="0.8" fill="#003322"/>
            <circle cx="15.5" cy="9.7" r="0.8" fill="#003322"/>
            <!-- Mouth -->
            <rect x="8" y="14" width="8" height="2" rx="0.5" fill="#445566" stroke="#334" stroke-width="0.3"/>
            <line x1="10" y1="14" x2="10" y2="16" stroke="#556" stroke-width="0.4"/>
            <line x1="12" y1="14" x2="12" y2="16" stroke="#556" stroke-width="0.4"/>
            <line x1="14" y1="14" x2="14" y2="16" stroke="#556" stroke-width="0.4"/>
            <!-- Ear bolts -->
            <circle cx="3.5" cy="11" r="1.2" fill="#778899" stroke="#556" stroke-width="0.4"/>
            <circle cx="20.5" cy="11" r="1.2" fill="#778899" stroke="#556" stroke-width="0.4"/>
            <!-- Neck -->
            <rect x="9" y="18" width="6" height="3" rx="0.5" fill="#667788" stroke="#556" stroke-width="0.3"/>
        </g>
    </svg>`,

    // ── 15. MIC - Microphone for speaking ──
    mic: (size = 24) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="micBody" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#555"/>
                <stop offset="30%" stop-color="#888"/>
                <stop offset="70%" stop-color="#888"/>
                <stop offset="100%" stop-color="#555"/>
            </linearGradient>
            <filter id="micShadow">
                <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#4488ff" flood-opacity="0.3"/>
            </filter>
        </defs>
        <g filter="url(#micShadow)">
            <!-- Mic head -->
            <rect x="8" y="2" width="8" height="11" rx="4" fill="url(#micBody)" stroke="#444" stroke-width="0.5"/>
            <!-- Grill lines -->
            <line x1="9" y1="4" x2="15" y2="4" stroke="#666" stroke-width="0.4"/>
            <line x1="9" y1="5.5" x2="15" y2="5.5" stroke="#666" stroke-width="0.4"/>
            <line x1="9" y1="7" x2="15" y2="7" stroke="#666" stroke-width="0.4"/>
            <line x1="9" y1="8.5" x2="15" y2="8.5" stroke="#666" stroke-width="0.4"/>
            <line x1="9" y1="10" x2="15" y2="10" stroke="#666" stroke-width="0.4"/>
            <!-- Sound waves -->
            <path d="M5 8 Q4 8 4 10 Q4 12 5 12" stroke="#4488ff" stroke-width="0.6" fill="none" opacity="0.4"/>
            <path d="M3 7 Q1 9 1 10.5 Q1 13 3 14" stroke="#4488ff" stroke-width="0.5" fill="none" opacity="0.25"/>
            <path d="M19 8 Q20 8 20 10 Q20 12 19 12" stroke="#4488ff" stroke-width="0.6" fill="none" opacity="0.4"/>
            <path d="M21 7 Q23 9 23 10.5 Q23 13 21 14" stroke="#4488ff" stroke-width="0.5" fill="none" opacity="0.25"/>
            <!-- Stand arc -->
            <path d="M6 13 Q6 18 12 18 Q18 18 18 13" fill="none" stroke="#666" stroke-width="1.2"/>
            <!-- Stand -->
            <line x1="12" y1="18" x2="12" y2="21" stroke="#666" stroke-width="1.2"/>
            <line x1="8" y1="21" x2="16" y2="21" stroke="#666" stroke-width="1.5" stroke-linecap="round"/>
        </g>
    </svg>`,

    // ── 16. TIMER - Hourglass for timer ──
    timer: (size = 24) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="timerGlass" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#aabbcc" stop-opacity="0.3"/>
                <stop offset="50%" stop-color="#ddeeff" stop-opacity="0.5"/>
                <stop offset="100%" stop-color="#aabbcc" stop-opacity="0.3"/>
            </linearGradient>
            <linearGradient id="timerSand" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#FFD700"/>
                <stop offset="100%" stop-color="#DAA520"/>
            </linearGradient>
            <filter id="timerShadow">
                <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#DAA520" flood-opacity="0.4"/>
            </filter>
        </defs>
        <g filter="url(#timerShadow)">
            <!-- Top frame -->
            <rect x="5" y="2" width="14" height="2" rx="0.5" fill="#8899aa" stroke="#667" stroke-width="0.3"/>
            <!-- Bottom frame -->
            <rect x="5" y="20" width="14" height="2" rx="0.5" fill="#8899aa" stroke="#667" stroke-width="0.3"/>
            <!-- Glass body -->
            <path d="M7 4 L7 8 Q7 12 12 12 Q17 12 17 8 L17 4 Z" fill="url(#timerGlass)" stroke="#889" stroke-width="0.5"/>
            <path d="M7 20 L7 16 Q7 12 12 12 Q17 12 17 16 L17 20 Z" fill="url(#timerGlass)" stroke="#889" stroke-width="0.5"/>
            <!-- Sand top -->
            <path d="M8 4 L8 7 Q8 10 12 11 Q16 10 16 7 L16 4 Z" fill="url(#timerSand)" opacity="0.5"/>
            <!-- Sand bottom -->
            <path d="M9 20 L9 17 Q9 15 12 14 Q15 15 15 17 L15 20 Z" fill="url(#timerSand)" opacity="0.8"/>
            <!-- Sand stream -->
            <line x1="12" y1="11" x2="12" y2="14" stroke="#DAA520" stroke-width="0.8"/>
            <!-- Sand particles -->
            <circle cx="11" cy="12.5" r="0.3" fill="#FFD700" opacity="0.5"/>
            <circle cx="13" cy="13" r="0.25" fill="#FFD700" opacity="0.4"/>
        </g>
    </svg>`,

    // ── 17. COIN - Gold coin for currency ──
    coin: (size = 24) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <radialGradient id="coinFace" cx="40%" cy="35%" r="60%">
                <stop offset="0%" stop-color="#fff0a0"/>
                <stop offset="40%" stop-color="#FFD700"/>
                <stop offset="100%" stop-color="#B8860B"/>
            </radialGradient>
            <linearGradient id="coinEdge" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#DAA520"/>
                <stop offset="100%" stop-color="#8B6914"/>
            </linearGradient>
            <filter id="coinShadow">
                <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="#FFD700" flood-opacity="0.5"/>
            </filter>
        </defs>
        <g filter="url(#coinShadow)">
            <!-- Coin edge (3D effect) -->
            <ellipse cx="12" cy="13" rx="9.5" ry="9.5" fill="url(#coinEdge)"/>
            <!-- Coin face -->
            <ellipse cx="12" cy="12" rx="9.5" ry="9.5" fill="url(#coinFace)" stroke="#8B6914" stroke-width="0.5"/>
            <!-- Inner ring -->
            <circle cx="12" cy="12" r="7.5" fill="none" stroke="#DAA520" stroke-width="0.8"/>
            <!-- Dollar sign / M for Mafia -->
            <text x="12" y="16" text-anchor="middle" font-size="10" font-weight="bold" fill="#8B6914" font-family="serif">M</text>
            <!-- Rim notches -->
            <circle cx="12" cy="3" r="0.4" fill="#DAA520"/>
            <circle cx="12" cy="21" r="0.4" fill="#8B6914"/>
            <circle cx="3" cy="12" r="0.4" fill="#DAA520"/>
            <circle cx="21" cy="12" r="0.4" fill="#8B6914"/>
            <!-- Shine -->
            <path d="M7 6 Q9 4 12 4" stroke="#fff8dc" stroke-width="0.6" fill="none" opacity="0.5"/>
        </g>
    </svg>`,

    // ── 18. GEM - Diamond for premium currency ──
    gem: (size = 24) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="gemTop" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#88ccff"/>
                <stop offset="50%" stop-color="#4488ee"/>
                <stop offset="100%" stop-color="#6699dd"/>
            </linearGradient>
            <linearGradient id="gemBottom" x1="0%" y1="0%" x2="50%" y2="100%">
                <stop offset="0%" stop-color="#4466cc"/>
                <stop offset="50%" stop-color="#2244aa"/>
                <stop offset="100%" stop-color="#3355bb"/>
            </linearGradient>
            <linearGradient id="gemShine" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#ffffff" stop-opacity="0.6"/>
                <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
            </linearGradient>
            <filter id="gemShadow">
                <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="#4488ee" flood-opacity="0.6"/>
            </filter>
        </defs>
        <g filter="url(#gemShadow)">
            <!-- Top facet -->
            <polygon points="12,3 4,9 20,9" fill="url(#gemTop)" stroke="#3366aa" stroke-width="0.4"/>
            <!-- Top left facet -->
            <polygon points="12,3 4,9 8,9" fill="#6699dd" stroke="#3366aa" stroke-width="0.3"/>
            <!-- Top right facet -->
            <polygon points="12,3 20,9 16,9" fill="#5588cc" stroke="#3366aa" stroke-width="0.3"/>
            <!-- Middle band -->
            <polygon points="4,9 8,9 12,11 16,9 20,9 12,11" fill="#5577bb" stroke="#3366aa" stroke-width="0.3"/>
            <!-- Bottom left facet -->
            <polygon points="4,9 12,21 12,11" fill="url(#gemBottom)" stroke="#2244aa" stroke-width="0.3"/>
            <!-- Bottom right facet -->
            <polygon points="20,9 12,21 12,11" fill="#3355bb" stroke="#2244aa" stroke-width="0.3"/>
            <!-- Shine -->
            <polygon points="12,3 8,9 12,8" fill="url(#gemShine)"/>
            <!-- Sparkle -->
            <circle cx="9" cy="7" r="0.5" fill="white" opacity="0.7"/>
            <path d="M18 5 L18.5 4 L19 5 L19.5 4.5 L19 5 L18.5 5.5 Z" fill="white" opacity="0.6"/>
        </g>
    </svg>`,

    // ── 19. PACK - Card pack / gift box ──
    pack: (size = 24) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="packBody" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#6a3a8a"/>
                <stop offset="100%" stop-color="#3a1a5a"/>
            </linearGradient>
            <linearGradient id="packRibbon" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#FFD700"/>
                <stop offset="100%" stop-color="#FFA500"/>
            </linearGradient>
            <filter id="packShadow">
                <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#6a3a8a" flood-opacity="0.5"/>
            </filter>
            <radialGradient id="packGlow" cx="50%" cy="30%" r="60%">
                <stop offset="0%" stop-color="#aa66ee" stop-opacity="0.3"/>
                <stop offset="100%" stop-color="#aa66ee" stop-opacity="0"/>
            </radialGradient>
        </defs>
        <g filter="url(#packShadow)">
            <!-- Glow -->
            <circle cx="12" cy="12" r="11" fill="url(#packGlow)"/>
            <!-- Box body -->
            <rect x="4" y="9" width="16" height="12" rx="1.5" fill="url(#packBody)" stroke="#4a2a6a" stroke-width="0.5"/>
            <!-- Box lid -->
            <rect x="3" y="7" width="18" height="3.5" rx="1" fill="#7a4a9a" stroke="#4a2a6a" stroke-width="0.5"/>
            <!-- Vertical ribbon -->
            <rect x="10.5" y="7" width="3" height="14" fill="url(#packRibbon)" opacity="0.8"/>
            <!-- Horizontal ribbon -->
            <rect x="3" y="7.5" width="18" height="2.5" fill="url(#packRibbon)" opacity="0.6"/>
            <!-- Bow -->
            <path d="M12 7 Q8 3 7 5 Q6 7 10 7.5" fill="url(#packRibbon)" stroke="#cc9900" stroke-width="0.3"/>
            <path d="M12 7 Q16 3 17 5 Q18 7 14 7.5" fill="url(#packRibbon)" stroke="#cc9900" stroke-width="0.3"/>
            <circle cx="12" cy="7" r="1" fill="#FFD700" stroke="#cc9900" stroke-width="0.3"/>
            <!-- Sparkles -->
            <circle cx="6" cy="4" r="0.5" fill="#FFD700" opacity="0.6"/>
            <circle cx="18" cy="3" r="0.4" fill="#FFD700" opacity="0.5"/>
            <circle cx="20" cy="6" r="0.3" fill="#FFD700" opacity="0.4"/>
        </g>
    </svg>`,

    // ── 20. STAR - Star for XP/level ──
    star: (size = 24) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="starGold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#fff8a0"/>
                <stop offset="40%" stop-color="#FFD700"/>
                <stop offset="100%" stop-color="#FFA500"/>
            </linearGradient>
            <filter id="starShadow">
                <feDropShadow dx="0" dy="0" stdDeviation="1.5" flood-color="#FFD700" flood-opacity="0.6"/>
            </filter>
        </defs>
        <g filter="url(#starShadow)">
            <path d="M12 2 L14.5 8.5 L21.5 9.2 L16.2 13.8 L17.8 21 L12 17.5 L6.2 21 L7.8 13.8 L2.5 9.2 L9.5 8.5 Z" fill="url(#starGold)" stroke="#B8860B" stroke-width="0.5"/>
            <!-- Inner star highlight -->
            <path d="M12 5 L13.5 9.5 L18 10 L14.5 13 L15.5 17.5 L12 15.5 L8.5 17.5 L9.5 13 L6 10 L10.5 9.5 Z" fill="#FFE44D" opacity="0.4"/>
            <!-- Shine -->
            <path d="M10 6 L11 8.5" stroke="#ffffff" stroke-width="0.4" opacity="0.5"/>
        </g>
    </svg>`,

    // ── 21. SWORD - Crossed swords for game start ──
    sword: (size = 24) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="swordBlade" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#e0e0ea"/>
                <stop offset="50%" stop-color="#c8c8d8"/>
                <stop offset="100%" stop-color="#a0a0b0"/>
            </linearGradient>
            <filter id="swordShadow">
                <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#ff4444" flood-opacity="0.3"/>
            </filter>
        </defs>
        <g filter="url(#swordShadow)">
            <!-- Sword 1 -->
            <g transform="rotate(-30, 12, 12)">
                <path d="M12 1 L13.2 11 L12 12 L10.8 11 Z" fill="url(#swordBlade)" stroke="#888" stroke-width="0.3"/>
                <rect x="9" y="11.5" width="6" height="1.5" rx="0.3" fill="#B8860B"/>
                <rect x="10.8" y="13" width="2.4" height="5" rx="0.5" fill="#5a3000" stroke="#3a1a00" stroke-width="0.3"/>
                <ellipse cx="12" cy="18.5" rx="1.5" ry="0.8" fill="#B8860B"/>
            </g>
            <!-- Sword 2 -->
            <g transform="rotate(30, 12, 12)">
                <path d="M12 1 L13.2 11 L12 12 L10.8 11 Z" fill="url(#swordBlade)" stroke="#888" stroke-width="0.3"/>
                <rect x="9" y="11.5" width="6" height="1.5" rx="0.3" fill="#B8860B"/>
                <rect x="10.8" y="13" width="2.4" height="5" rx="0.5" fill="#5a3000" stroke="#3a1a00" stroke-width="0.3"/>
                <ellipse cx="12" cy="18.5" rx="1.5" ry="0.8" fill="#B8860B"/>
            </g>
            <!-- Center clash spark -->
            <circle cx="12" cy="6" r="1.5" fill="#FFD700" opacity="0.5"/>
            <circle cx="12" cy="6" r="0.7" fill="#ffffff" opacity="0.7"/>
        </g>
    </svg>`,

    // ── 22. EYE - Watching eye for reveal ──
    eye: (size = 24) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <radialGradient id="eyeIris" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#00cc66"/>
                <stop offset="60%" stop-color="#006633"/>
                <stop offset="100%" stop-color="#003322"/>
            </radialGradient>
            <radialGradient id="eyeGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#00cc66" stop-opacity="0.2"/>
                <stop offset="100%" stop-color="#00cc66" stop-opacity="0"/>
            </radialGradient>
            <filter id="eyeShadow">
                <feDropShadow dx="0" dy="0" stdDeviation="1.5" flood-color="#00cc66" flood-opacity="0.5"/>
            </filter>
        </defs>
        <circle cx="12" cy="12" r="11" fill="url(#eyeGlow)"/>
        <g filter="url(#eyeShadow)">
            <!-- Eye shape -->
            <path d="M2 12 Q7 5 12 5 Q17 5 22 12 Q17 19 12 19 Q7 19 2 12 Z" fill="#f8f0e8" stroke="#886644" stroke-width="0.6"/>
            <!-- Iris -->
            <circle cx="12" cy="12" r="5" fill="url(#eyeIris)"/>
            <!-- Pupil -->
            <circle cx="12" cy="12" r="2.5" fill="#001100"/>
            <!-- Pupil highlight -->
            <circle cx="10.5" cy="10.5" r="1" fill="#ffffff" opacity="0.7"/>
            <circle cx="13.5" cy="13" r="0.5" fill="#ffffff" opacity="0.4"/>
            <!-- Eyelid shadow -->
            <path d="M3 12 Q7 6 12 6 Q17 6 21 12" fill="none" stroke="#664422" stroke-width="0.8"/>
            <!-- Eyelashes -->
            <path d="M5 9 L4 7" stroke="#664422" stroke-width="0.5" stroke-linecap="round"/>
            <path d="M8 7 L7.5 5" stroke="#664422" stroke-width="0.5" stroke-linecap="round"/>
            <path d="M12 6 L12 4" stroke="#664422" stroke-width="0.5" stroke-linecap="round"/>
            <path d="M16 7 L16.5 5" stroke="#664422" stroke-width="0.5" stroke-linecap="round"/>
            <path d="M19 9 L20 7" stroke="#664422" stroke-width="0.5" stroke-linecap="round"/>
        </g>
    </svg>`,

    // ── 23. GHOST - Ghost for dead players ──
    ghost: (size = 24) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="ghostBody" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#e8e8f0" stop-opacity="0.9"/>
                <stop offset="100%" stop-color="#b0b0c8" stop-opacity="0.6"/>
            </linearGradient>
            <radialGradient id="ghostGlow" cx="50%" cy="30%" r="60%">
                <stop offset="0%" stop-color="#ccccff" stop-opacity="0.3"/>
                <stop offset="100%" stop-color="#ccccff" stop-opacity="0"/>
            </radialGradient>
            <filter id="ghostShadow">
                <feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="#8888cc" flood-opacity="0.4"/>
            </filter>
        </defs>
        <circle cx="12" cy="12" r="11" fill="url(#ghostGlow)"/>
        <g filter="url(#ghostShadow)">
            <!-- Ghost body -->
            <path d="M7 22 L7 10 Q7 3 12 3 Q17 3 17 10 L17 22 L15 19 L13 22 L11 19 L9 22 L7 19 Z" fill="url(#ghostBody)" stroke="#9999bb" stroke-width="0.5"/>
            <!-- Eyes -->
            <ellipse cx="9.5" cy="10" rx="2" ry="2.2" fill="#2a2a44"/>
            <ellipse cx="14.5" cy="10" rx="2" ry="2.2" fill="#2a2a44"/>
            <!-- Eye highlights -->
            <circle cx="10" cy="9.5" r="0.7" fill="#ffffff" opacity="0.5"/>
            <circle cx="15" cy="9.5" r="0.7" fill="#ffffff" opacity="0.5"/>
            <!-- Mouth -->
            <ellipse cx="12" cy="14" rx="1.5" ry="1.8" fill="#3a3a5a"/>
            <!-- Transparency streaks -->
            <path d="M8 16 Q7 18 8 20" stroke="#ccccee" stroke-width="0.4" fill="none" opacity="0.4"/>
            <path d="M16 15 Q17 17 16 19" stroke="#ccccee" stroke-width="0.4" fill="none" opacity="0.4"/>
        </g>
    </svg>`,

    // ── 24. FIRE - Flame for effects ──
    fire: (size = 24) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="fireOuter" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stop-color="#ff4500"/>
                <stop offset="50%" stop-color="#ff6600"/>
                <stop offset="100%" stop-color="#ff8800"/>
            </linearGradient>
            <linearGradient id="fireInner" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stop-color="#ffcc00"/>
                <stop offset="100%" stop-color="#ffffff"/>
            </linearGradient>
            <filter id="fireShadow">
                <feDropShadow dx="0" dy="0" stdDeviation="2" flood-color="#ff4500" flood-opacity="0.6"/>
            </filter>
        </defs>
        <g filter="url(#fireShadow)">
            <!-- Outer flame -->
            <path d="M12 2 Q8 8 6 12 Q4 16 6 19 Q8 22 12 22 Q16 22 18 19 Q20 16 18 12 Q16 8 14 6 Q16 10 15 12 Q14 8 12 2 Z" fill="url(#fireOuter)"/>
            <!-- Middle flame -->
            <path d="M12 6 Q9 10 8 14 Q7 17 9 19 Q10 21 12 21 Q14 21 15 19 Q17 17 16 14 Q15 10 12 6 Z" fill="#ffaa00"/>
            <!-- Inner flame -->
            <path d="M12 10 Q10 14 10 16 Q10 19 12 19 Q14 19 14 16 Q14 14 12 10 Z" fill="url(#fireInner)"/>
            <!-- Embers -->
            <circle cx="8" cy="8" r="0.5" fill="#ff6600" opacity="0.6"/>
            <circle cx="16" cy="7" r="0.4" fill="#ff8800" opacity="0.5"/>
            <circle cx="7" cy="5" r="0.3" fill="#ffaa00" opacity="0.4"/>
        </g>
    </svg>`,

    // ── 25. DOOR - Door for joining room ──
    door: (size = 24) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="doorWood" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#6b3a10"/>
                <stop offset="30%" stop-color="#8b5a30"/>
                <stop offset="70%" stop-color="#8b5a30"/>
                <stop offset="100%" stop-color="#5a2a00"/>
            </linearGradient>
            <linearGradient id="doorLight" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#FFD700" stop-opacity="0.6"/>
                <stop offset="100%" stop-color="#FFD700" stop-opacity="0"/>
            </linearGradient>
            <filter id="doorShadow">
                <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#000" flood-opacity="0.5"/>
            </filter>
        </defs>
        <g filter="url(#doorShadow)">
            <!-- Door frame -->
            <rect x="4" y="2" width="16" height="20" rx="1" fill="#4a2a08" stroke="#3a1a00" stroke-width="0.5"/>
            <!-- Door (slightly ajar) -->
            <path d="M6 3 L17 4.5 L17 20.5 L6 21 Z" fill="url(#doorWood)" stroke="#3a1a00" stroke-width="0.3"/>
            <!-- Light spill -->
            <path d="M17 4.5 L21 3 L21 22 L17 20.5 Z" fill="url(#doorLight)"/>
            <!-- Door panels -->
            <rect x="8" y="5" width="7" height="5" rx="0.5" fill="none" stroke="#5a3010" stroke-width="0.6"/>
            <rect x="8" y="12" width="7" height="6" rx="0.5" fill="none" stroke="#5a3010" stroke-width="0.6"/>
            <!-- Handle -->
            <circle cx="15" cy="12.5" r="1" fill="#B8860B" stroke="#8B6914" stroke-width="0.4"/>
            <!-- Keyhole -->
            <ellipse cx="15" cy="14" rx="0.4" ry="0.7" fill="#2a1400"/>
        </g>
    </svg>`,

    // ── 26. GAMEPAD - Controller for creating room ──
    gamepad: (size = 24) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="padBody" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#4a4a5a"/>
                <stop offset="100%" stop-color="#2a2a3a"/>
            </linearGradient>
            <filter id="padShadow">
                <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#4488ff" flood-opacity="0.3"/>
            </filter>
        </defs>
        <g filter="url(#padShadow)">
            <!-- Controller body -->
            <path d="M3 10 Q3 7 6 7 L18 7 Q21 7 21 10 L21 14 Q21 18 18 19 L16 19 Q14 19 13 17 L11 17 Q10 19 8 19 L6 19 Q3 18 3 14 Z" fill="url(#padBody)" stroke="#555" stroke-width="0.5"/>
            <!-- D-pad -->
            <rect x="5.5" y="10.5" width="5" height="1.8" rx="0.3" fill="#333344"/>
            <rect x="7.1" y="9" width="1.8" height="5" rx="0.3" fill="#333344"/>
            <!-- Buttons -->
            <circle cx="17" cy="10" r="1.2" fill="#cc3333" stroke="#aa2222" stroke-width="0.3"/>
            <circle cx="19.5" cy="11.5" r="1.2" fill="#3366cc" stroke="#2244aa" stroke-width="0.3"/>
            <circle cx="14.5" cy="11.5" r="1.2" fill="#33cc33" stroke="#22aa22" stroke-width="0.3"/>
            <circle cx="17" cy="13" r="1.2" fill="#cccc33" stroke="#aaaa22" stroke-width="0.3"/>
            <!-- Sticks -->
            <circle cx="8" cy="15" r="1.5" fill="#444455" stroke="#555566" stroke-width="0.4"/>
            <circle cx="15" cy="15" r="1.5" fill="#444455" stroke="#555566" stroke-width="0.4"/>
            <!-- LED indicator -->
            <circle cx="12" cy="8.5" r="0.5" fill="#00ff00" opacity="0.8"/>
        </g>
    </svg>`,

    // ── 27. BOOK - Book for rules ──
    book: (size = 24) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="bookCover" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#8b1a1a"/>
                <stop offset="100%" stop-color="#5a0a0a"/>
            </linearGradient>
            <linearGradient id="bookPages" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#f5f0e0"/>
                <stop offset="100%" stop-color="#e8e0d0"/>
            </linearGradient>
            <filter id="bookShadow">
                <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#5a0a0a" flood-opacity="0.5"/>
            </filter>
        </defs>
        <g filter="url(#bookShadow)">
            <!-- Back cover -->
            <rect x="4" y="3" width="14" height="18" rx="1" fill="#4a0808"/>
            <!-- Pages -->
            <rect x="5" y="3.5" width="12.5" height="17" rx="0.5" fill="url(#bookPages)"/>
            <!-- Page lines -->
            <line x1="7" y1="7" x2="15" y2="7" stroke="#c8c0b0" stroke-width="0.4"/>
            <line x1="7" y1="9" x2="14" y2="9" stroke="#c8c0b0" stroke-width="0.4"/>
            <line x1="7" y1="11" x2="15" y2="11" stroke="#c8c0b0" stroke-width="0.4"/>
            <line x1="7" y1="13" x2="13" y2="13" stroke="#c8c0b0" stroke-width="0.4"/>
            <line x1="7" y1="15" x2="15" y2="15" stroke="#c8c0b0" stroke-width="0.4"/>
            <line x1="7" y1="17" x2="14" y2="17" stroke="#c8c0b0" stroke-width="0.4"/>
            <!-- Front cover -->
            <rect x="3" y="2.5" width="14" height="18.5" rx="1.5" fill="url(#bookCover)" stroke="#3a0505" stroke-width="0.5"/>
            <!-- Cover decoration -->
            <rect x="6" y="5" width="8" height="10" rx="0.5" fill="none" stroke="#FFD700" stroke-width="0.6"/>
            <!-- Title emblem -->
            <text x="10" y="11.5" text-anchor="middle" font-size="5" font-weight="bold" fill="#FFD700" font-family="serif">M</text>
            <!-- Spine -->
            <line x1="4" y1="2.5" x2="4" y2="21" stroke="#3a0505" stroke-width="1"/>
            <!-- Bookmark -->
            <path d="M14 2 L14 6 L15.5 4.5 L17 6 L17 2" fill="#cc0000" stroke="#aa0000" stroke-width="0.2"/>
        </g>
    </svg>`,

    // ── 28. SHOP - Shopping bag ──
    shop: (size = 24) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="shopBag" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#7a5a9a"/>
                <stop offset="100%" stop-color="#4a2a6a"/>
            </linearGradient>
            <filter id="shopShadow">
                <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#4a2a6a" flood-opacity="0.5"/>
            </filter>
        </defs>
        <g filter="url(#shopShadow)">
            <!-- Bag body -->
            <path d="M4 9 L5 21 Q5 22 6 22 L18 22 Q19 22 19 21 L20 9 Z" fill="url(#shopBag)" stroke="#3a1a5a" stroke-width="0.5"/>
            <!-- Bag handles -->
            <path d="M8 9 Q8 5 12 5 Q16 5 16 9" fill="none" stroke="#3a1a5a" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M8 9 Q8 5.5 12 5.5 Q16 5.5 16 9" fill="none" stroke="#9a7aba" stroke-width="0.8" stroke-linecap="round"/>
            <!-- Star decoration -->
            <path d="M12 13 L13 15.5 L15.5 15.5 L13.5 17 L14.2 19.5 L12 18 L9.8 19.5 L10.5 17 L8.5 15.5 L11 15.5 Z" fill="#FFD700" opacity="0.7"/>
            <!-- Fold at top -->
            <path d="M4 9 L20 9" stroke="#5a3a7a" stroke-width="1"/>
            <!-- Tissue paper -->
            <path d="M8 9 Q9 6 10 8 Q11 5 12 8 Q13 5 14 8 Q15 6 16 9" fill="#f0e0f0" stroke="#d0c0d0" stroke-width="0.3" opacity="0.5"/>
        </g>
    </svg>`,

    // ── 29. CARDS - Fanned cards for collection/inventory ──
    cards: (size = 24) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="cardFace" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#f5f0e0"/>
                <stop offset="100%" stop-color="#e0d8c8"/>
            </linearGradient>
            <linearGradient id="cardBack" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#8b1a1a"/>
                <stop offset="100%" stop-color="#4a0808"/>
            </linearGradient>
            <filter id="cardsShadow">
                <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#000" flood-opacity="0.5"/>
            </filter>
        </defs>
        <g filter="url(#cardsShadow)">
            <!-- Card 1 (back, fanned left) -->
            <rect x="2" y="4" width="10" height="15" rx="1.2" fill="url(#cardBack)" stroke="#3a0505" stroke-width="0.4" transform="rotate(-15, 8, 12)"/>
            <rect x="3.5" y="5.5" width="7" height="12" rx="0.5" fill="none" stroke="#FFD700" stroke-width="0.3" transform="rotate(-15, 8, 12)"/>
            <!-- Card 2 (middle) -->
            <rect x="7" y="3" width="10" height="15" rx="1.2" fill="url(#cardBack)" stroke="#3a0505" stroke-width="0.4"/>
            <rect x="8.5" y="4.5" width="7" height="12" rx="0.5" fill="none" stroke="#FFD700" stroke-width="0.3"/>
            <!-- Card 3 (front, fanned right) -->
            <rect x="10" y="4" width="10" height="15" rx="1.2" fill="url(#cardFace)" stroke="#aaa" stroke-width="0.4" transform="rotate(15, 16, 12)"/>
            <!-- Card 3 face design -->
            <g transform="rotate(15, 16, 12)">
                <text x="12" y="8.5" font-size="4" font-weight="bold" fill="#cc0000" font-family="serif">M</text>
                <path d="M15 10 L15.5 11.5 L17 11.5 L15.8 12.3 L16.3 14 L15 13 L13.7 14 L14.2 12.3 L13 11.5 L14.5 11.5 Z" fill="#cc0000" opacity="0.6"/>
            </g>
        </g>
    </svg>`,

    // ── 30. JOKER - Jester hat for modifiers ──
    joker: (size = 24) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="jokerPurple" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#9933ff"/>
                <stop offset="100%" stop-color="#6600cc"/>
            </linearGradient>
            <linearGradient id="jokerGreen" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#33cc33"/>
                <stop offset="100%" stop-color="#009900"/>
            </linearGradient>
            <filter id="jokerShadow">
                <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#9933ff" flood-opacity="0.4"/>
            </filter>
        </defs>
        <g filter="url(#jokerShadow)">
            <!-- Left prong -->
            <path d="M5 16 Q3 8 2 4 Q2 3 3.5 3.5 Q5 5 6 8 Q6 12 8 14 Z" fill="url(#jokerPurple)" stroke="#5500aa" stroke-width="0.4"/>
            <!-- Middle prong -->
            <path d="M8 14 Q10 6 12 2 Q14 6 16 14 Z" fill="url(#jokerGreen)" stroke="#006600" stroke-width="0.4"/>
            <!-- Right prong -->
            <path d="M16 14 Q18 12 18 8 Q19 5 20.5 3.5 Q22 3 22 4 Q21 8 19 16 Z" fill="url(#jokerPurple)" stroke="#5500aa" stroke-width="0.4"/>
            <!-- Bells -->
            <circle cx="3" cy="3.5" r="1.5" fill="#FFD700" stroke="#B8860B" stroke-width="0.3"/>
            <circle cx="12" cy="2" r="1.5" fill="#FFD700" stroke="#B8860B" stroke-width="0.3"/>
            <circle cx="21" cy="3.5" r="1.5" fill="#FFD700" stroke="#B8860B" stroke-width="0.3"/>
            <!-- Base band -->
            <path d="M4 14 Q8 17 12 15 Q16 17 20 14 L20 17 Q16 20 12 18 Q8 20 4 17 Z" fill="#cc0000" stroke="#aa0000" stroke-width="0.4"/>
            <!-- Face area -->
            <ellipse cx="12" cy="20" rx="5" ry="3" fill="#d4a574"/>
            <!-- Joker eyes -->
            <circle cx="10" cy="19.5" r="0.6" fill="#222"/>
            <circle cx="14" cy="19.5" r="0.6" fill="#222"/>
            <!-- Joker smile -->
            <path d="M9.5 21 Q12 23 14.5 21" stroke="#aa0000" stroke-width="0.7" fill="none"/>
        </g>
    </svg>`,

    // ── 31. LOCK - Padlock for locked content ──
    lock: (size = 24) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="lockBody" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#888899"/>
                <stop offset="50%" stop-color="#667788"/>
                <stop offset="100%" stop-color="#556677"/>
            </linearGradient>
            <linearGradient id="lockShackle" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#99aaaa"/>
                <stop offset="50%" stop-color="#bbcccc"/>
                <stop offset="100%" stop-color="#99aaaa"/>
            </linearGradient>
            <filter id="lockShadow">
                <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#000" flood-opacity="0.5"/>
            </filter>
        </defs>
        <g filter="url(#lockShadow)">
            <!-- Shackle -->
            <path d="M7 10 L7 7 Q7 3 12 3 Q17 3 17 7 L17 10" fill="none" stroke="url(#lockShackle)" stroke-width="2.5" stroke-linecap="round"/>
            <!-- Lock body -->
            <rect x="5" y="10" width="14" height="11" rx="2" fill="url(#lockBody)" stroke="#445566" stroke-width="0.5"/>
            <!-- Keyhole -->
            <circle cx="12" cy="15" r="2" fill="#334455"/>
            <rect x="11.3" y="15" width="1.4" height="3" fill="#334455"/>
            <!-- Keyhole highlight -->
            <circle cx="12" cy="14.5" r="0.7" fill="#556677"/>
            <!-- Body highlight -->
            <path d="M6 11 Q10 11 14 12" stroke="#aabbcc" stroke-width="0.4" fill="none" opacity="0.3"/>
        </g>
    </svg>`,

    // ── 32. BOLT - Lightning bolt for speed modifier ──
    bolt: (size = 24) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="boltGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#ffee44"/>
                <stop offset="50%" stop-color="#ffcc00"/>
                <stop offset="100%" stop-color="#ff9900"/>
            </linearGradient>
            <filter id="boltShadow">
                <feDropShadow dx="0" dy="0" stdDeviation="2" flood-color="#ffcc00" flood-opacity="0.6"/>
            </filter>
            <filter id="boltGlow">
                <feGaussianBlur stdDeviation="1.5" result="glow"/>
                <feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
        </defs>
        <g filter="url(#boltShadow)">
            <g filter="url(#boltGlow)">
                <path d="M14 1 L6 12 L11 12 L10 23 L18 11 L13 11 Z" fill="url(#boltGrad)" stroke="#cc8800" stroke-width="0.5" stroke-linejoin="round"/>
            </g>
            <!-- Inner highlight -->
            <path d="M13 3 L8 11 L12 11 L11 19" stroke="#ffffff" stroke-width="0.5" fill="none" opacity="0.4" stroke-linejoin="round"/>
            <!-- Sparks -->
            <circle cx="5" cy="10" r="0.5" fill="#ffee44" opacity="0.5"/>
            <circle cx="19" cy="13" r="0.4" fill="#ffee44" opacity="0.4"/>
            <circle cx="17" cy="6" r="0.3" fill="#ffcc00" opacity="0.5"/>
        </g>
    </svg>`,

    // ── 33. TORNADO - Tornado/whirlwind for chaos ──
    tornado: (size = 24) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="tornadoGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#8899aa"/>
                <stop offset="50%" stop-color="#667788"/>
                <stop offset="100%" stop-color="#445566"/>
            </linearGradient>
            <filter id="tornadoShadow">
                <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#445566" flood-opacity="0.5"/>
            </filter>
        </defs>
        <g filter="url(#tornadoShadow)">
            <!-- Funnel layers -->
            <path d="M3 3 Q12 5 21 3 Q20 5 4 5 Z" fill="#8899aa" stroke="#667788" stroke-width="0.3" opacity="0.6"/>
            <path d="M5 5 Q12 7.5 19 5.5 Q18 8 6 7.5 Z" fill="#7788aa" stroke="#667788" stroke-width="0.3" opacity="0.7"/>
            <path d="M6 7.5 Q12 10 18 8 Q17 11 7 10 Z" fill="url(#tornadoGrad)" stroke="#556677" stroke-width="0.3" opacity="0.8"/>
            <path d="M7 10 Q12 12.5 16.5 10.5 Q16 13.5 8 12.5 Z" fill="#667788" stroke="#556677" stroke-width="0.3" opacity="0.85"/>
            <path d="M8 12.5 Q12 15 15.5 13 Q15 16 9 15 Z" fill="#5a6a7a" stroke="#445566" stroke-width="0.3" opacity="0.9"/>
            <path d="M9 15 Q12 17 14.5 15.5 Q14 18 10 17 Z" fill="#4a5a6a" stroke="#334455" stroke-width="0.3"/>
            <path d="M10 17 Q12 19 13.5 17.5 Q13 20 10.5 19 Z" fill="#3a4a5a" stroke="#223344" stroke-width="0.3"/>
            <path d="M10.5 19 Q12 21 13 19.5 L12.5 22 L11 22 Z" fill="#2a3a4a" stroke="#112233" stroke-width="0.3"/>
            <!-- Debris -->
            <rect x="4" y="4" width="1" height="0.5" fill="#556" opacity="0.4" transform="rotate(15,4,4)"/>
            <rect x="18" cy="6" width="0.8" height="0.4" fill="#556" opacity="0.3" transform="rotate(-10,18,6)"/>
            <circle cx="16" cy="9" r="0.4" fill="#667" opacity="0.3"/>
        </g>
    </svg>`,

    // ── 34. BOUNTY - Wanted poster for bounty modifier ──
    bounty: (size = 24) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="bountyPaper" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#e8d8b0"/>
                <stop offset="100%" stop-color="#c8b888"/>
            </linearGradient>
            <filter id="bountyShadow">
                <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#8B6914" flood-opacity="0.5"/>
            </filter>
        </defs>
        <g filter="url(#bountyShadow)">
            <!-- Paper with rough edges -->
            <path d="M4 3 Q5 2.5 6 3 L18 3 Q19 2.5 20 3 L20 21 Q19 21.5 18 21 L6 21 Q5 21.5 4 21 Z" fill="url(#bountyPaper)" stroke="#a09060" stroke-width="0.5"/>
            <!-- Nail -->
            <circle cx="12" cy="3" r="1" fill="#888" stroke="#666" stroke-width="0.3"/>
            <!-- WANTED text -->
            <text x="12" y="7" text-anchor="middle" font-size="3.5" font-weight="bold" fill="#5a3000" font-family="serif">WANTED</text>
            <!-- Silhouette frame -->
            <rect x="7" y="8" width="10" height="8" fill="#d0c090" stroke="#a09060" stroke-width="0.3"/>
            <!-- Person silhouette -->
            <circle cx="12" cy="10.5" r="2" fill="#3a2a10"/>
            <path d="M8.5 16 Q8.5 13 12 13 Q15.5 13 15.5 16 Z" fill="#3a2a10"/>
            <!-- Reward text -->
            <text x="12" y="19" text-anchor="middle" font-size="2.2" fill="#5a3000" font-family="serif">REWARD</text>
            <text x="12" y="20.8" text-anchor="middle" font-size="2" fill="#8B0000" font-weight="bold" font-family="serif">$1000</text>
        </g>
    </svg>`,

    // ── 35. WHISPER - Ghost whisper for whispers modifier ──
    whisper: (size = 24) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <radialGradient id="whisperGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#9966ff" stop-opacity="0.2"/>
                <stop offset="100%" stop-color="#9966ff" stop-opacity="0"/>
            </radialGradient>
            <linearGradient id="whisperGhost" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#ccbbee" stop-opacity="0.7"/>
                <stop offset="100%" stop-color="#9988cc" stop-opacity="0.3"/>
            </linearGradient>
            <filter id="whisperShadow">
                <feDropShadow dx="0" dy="0" stdDeviation="2" flood-color="#9966ff" flood-opacity="0.4"/>
            </filter>
        </defs>
        <circle cx="12" cy="12" r="11" fill="url(#whisperGlow)"/>
        <g filter="url(#whisperShadow)">
            <!-- Small ghost figure -->
            <path d="M6 20 L6 12 Q6 6 10 6 Q14 6 14 12 L14 20 L12.5 18 L11 20 L9.5 18 L8 20 L6 18 Z" fill="url(#whisperGhost)" stroke="#8877bb" stroke-width="0.4"/>
            <!-- Ghost eyes -->
            <ellipse cx="8.5" cy="11" rx="1.2" ry="1.4" fill="#3a2a5a"/>
            <ellipse cx="11.5" cy="11" rx="1.2" ry="1.4" fill="#3a2a5a"/>
            <!-- Speech/whisper waves -->
            <path d="M15 8 Q17 7 18 8" stroke="#9966ff" stroke-width="0.7" fill="none" opacity="0.6" stroke-linecap="round"/>
            <path d="M16 10 Q18.5 9 20 10.5" stroke="#9966ff" stroke-width="0.6" fill="none" opacity="0.45" stroke-linecap="round"/>
            <path d="M15 12.5 Q17.5 12 19 13" stroke="#9966ff" stroke-width="0.5" fill="none" opacity="0.3" stroke-linecap="round"/>
            <!-- Sparkles -->
            <circle cx="19" cy="7" r="0.4" fill="#bb99ff" opacity="0.5"/>
            <circle cx="21" cy="11" r="0.3" fill="#bb99ff" opacity="0.4"/>
        </g>
    </svg>`,

    // ── 36. DOUBLE KNIFE - Double daggers for double kill ──
    doubleKnife: (size = 24) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="dkBlade" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#e8e8f0"/>
                <stop offset="50%" stop-color="#d0d0e0"/>
                <stop offset="100%" stop-color="#a0a0b0"/>
            </linearGradient>
            <filter id="dkShadow">
                <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#cc0000" flood-opacity="0.5"/>
            </filter>
        </defs>
        <g filter="url(#dkShadow)">
            <!-- Knife 1 (left, pointing up-left) -->
            <g transform="rotate(-25, 12, 12)">
                <path d="M8 2 L9.5 10 L8 11 L6.5 10 Z" fill="url(#dkBlade)" stroke="#888" stroke-width="0.3"/>
                <rect x="5.5" y="10.5" width="5" height="1.2" rx="0.3" fill="#B8860B"/>
                <rect x="6.8" y="11.7" width="2.4" height="4" rx="0.5" fill="#5a3000"/>
                <ellipse cx="8" cy="16" rx="1.5" ry="0.7" fill="#B8860B"/>
            </g>
            <!-- Knife 2 (right, pointing up-right) -->
            <g transform="rotate(25, 12, 12)">
                <path d="M16 2 L17.5 10 L16 11 L14.5 10 Z" fill="url(#dkBlade)" stroke="#888" stroke-width="0.3"/>
                <rect x="13.5" y="10.5" width="5" height="1.2" rx="0.3" fill="#B8860B"/>
                <rect x="14.8" y="11.7" width="2.4" height="4" rx="0.5" fill="#5a3000"/>
                <ellipse cx="16" cy="16" rx="1.5" ry="0.7" fill="#B8860B"/>
            </g>
            <!-- Blood drops -->
            <circle cx="10" cy="4" r="0.6" fill="#cc0000" opacity="0.7"/>
            <circle cx="15" cy="5" r="0.5" fill="#cc0000" opacity="0.6"/>
            <path d="M12 3 L12.3 1.5 Q12.5 0.5 12 1.5 Z" fill="#cc0000" opacity="0.5"/>
        </g>
    </svg>`,

    // ── 37. SHIELD PLUS - Shield with plus for immunity modifier ──
    shieldPlus: (size = 24) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="spShield" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#44aa44"/>
                <stop offset="50%" stop-color="#228822"/>
                <stop offset="100%" stop-color="#115511"/>
            </linearGradient>
            <linearGradient id="spRim" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#FFD700"/>
                <stop offset="100%" stop-color="#B8860B"/>
            </linearGradient>
            <filter id="spShadow">
                <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#228822" flood-opacity="0.5"/>
            </filter>
            <filter id="spGlow">
                <feGaussianBlur stdDeviation="0.8" result="glow"/>
                <feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
        </defs>
        <g filter="url(#spShadow)">
            <path d="M12 2 L4 6 L4 12 Q4 18 12 22 Q20 18 20 12 L20 6 Z" fill="url(#spShield)" stroke="url(#spRim)" stroke-width="1"/>
            <!-- Inner border -->
            <path d="M12 4 L6 7.5 L6 12 Q6 17 12 20 Q18 17 18 12 L18 7.5 Z" fill="none" stroke="url(#spRim)" stroke-width="0.4" opacity="0.5"/>
            <!-- Plus sign -->
            <g filter="url(#spGlow)">
                <rect x="10" y="7" width="4" height="10" rx="0.8" fill="#ffffff" opacity="0.9"/>
                <rect x="7" y="10" width="10" height="4" rx="0.8" fill="#ffffff" opacity="0.9"/>
            </g>
        </g>
    </svg>`,

    // ── 38. SECRET VOTE - Spy/detective for secret vote modifier ──
    secretVote: (size = 24) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="svHat" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#4a4a5a"/>
                <stop offset="100%" stop-color="#2a2a3a"/>
            </linearGradient>
            <linearGradient id="svCoat" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#5a5a6a"/>
                <stop offset="100%" stop-color="#3a3a4a"/>
            </linearGradient>
            <filter id="svShadow">
                <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#000" flood-opacity="0.5"/>
            </filter>
        </defs>
        <g filter="url(#svShadow)">
            <!-- Hat brim -->
            <ellipse cx="12" cy="7" rx="9" ry="2" fill="url(#svHat)" stroke="#222" stroke-width="0.3"/>
            <!-- Hat top -->
            <path d="M6 7 Q6 2 12 2 Q18 2 18 7" fill="url(#svHat)" stroke="#222" stroke-width="0.3"/>
            <!-- Hat band -->
            <rect x="6" y="6" width="12" height="1.2" fill="#333344"/>
            <!-- Face (shadowed) -->
            <ellipse cx="12" cy="11" rx="5" ry="4" fill="#d4a574"/>
            <!-- Sunglasses -->
            <rect x="6.5" y="9.5" width="4.5" height="3" rx="1" fill="#111122" stroke="#333" stroke-width="0.3"/>
            <rect x="13" y="9.5" width="4.5" height="3" rx="1" fill="#111122" stroke="#333" stroke-width="0.3"/>
            <line x1="11" y1="10.5" x2="13" y2="10.5" stroke="#333" stroke-width="0.5"/>
            <!-- Lens glare -->
            <path d="M7.5 10 L9 10.5" stroke="#334" stroke-width="0.3" opacity="0.3"/>
            <path d="M14 10 L15.5 10.5" stroke="#334" stroke-width="0.3" opacity="0.3"/>
            <!-- Collar -->
            <path d="M5 14 L8 22 L12 18 L16 22 L19 14 Q16 16 12 16 Q8 16 5 14 Z" fill="url(#svCoat)" stroke="#222" stroke-width="0.3"/>
            <!-- Collar fold lines -->
            <path d="M8 16 L10 20" stroke="#2a2a3a" stroke-width="0.4"/>
            <path d="M16 16 L14 20" stroke="#2a2a3a" stroke-width="0.4"/>
            <!-- Question mark (mystery) -->
            <text x="20" y="20" font-size="5" fill="#ffcc00" opacity="0.6" font-weight="bold">?</text>
        </g>
    </svg>`,

    // ── 39. KICK - Boot/kick icon ──
    kick: (size = 24) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="kickBoot" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#5a3a20"/>
                <stop offset="50%" stop-color="#7a4a28"/>
                <stop offset="100%" stop-color="#4a2a10"/>
            </linearGradient>
            <linearGradient id="kickSole" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#333"/>
                <stop offset="100%" stop-color="#111"/>
            </linearGradient>
            <filter id="kickShadow">
                <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#cc4400" flood-opacity="0.4"/>
            </filter>
        </defs>
        <g filter="url(#kickShadow)">
            <!-- Boot shaft -->
            <path d="M8 2 L14 2 Q15 2 15 3 L15 12 L8 12 Q7 12 7 11 L7 3 Q7 2 8 2 Z" fill="url(#kickBoot)" stroke="#3a1a00" stroke-width="0.5"/>
            <!-- Boot foot -->
            <path d="M7 12 L15 12 L18 14 Q20 15 20 16 L20 17 Q20 18 19 18 L5 18 Q4 18 4 17 L4 15 Q4 14 5 13 Z" fill="url(#kickBoot)" stroke="#3a1a00" stroke-width="0.5"/>
            <!-- Sole -->
            <rect x="4" y="17.5" width="16" height="2.5" rx="0.5" fill="url(#kickSole)" stroke="#000" stroke-width="0.3"/>
            <!-- Sole tread -->
            <line x1="6" y1="18.5" x2="6" y2="19.5" stroke="#222" stroke-width="0.5"/>
            <line x1="8" y1="18.5" x2="8" y2="19.5" stroke="#222" stroke-width="0.5"/>
            <line x1="10" y1="18.5" x2="10" y2="19.5" stroke="#222" stroke-width="0.5"/>
            <line x1="12" y1="18.5" x2="12" y2="19.5" stroke="#222" stroke-width="0.5"/>
            <line x1="14" y1="18.5" x2="14" y2="19.5" stroke="#222" stroke-width="0.5"/>
            <line x1="16" y1="18.5" x2="16" y2="19.5" stroke="#222" stroke-width="0.5"/>
            <!-- Boot strap -->
            <rect x="7.5" y="5" width="7" height="1.2" rx="0.3" fill="#3a1a00"/>
            <rect x="7.5" y="8" width="7" height="1.2" rx="0.3" fill="#3a1a00"/>
            <!-- Buckle -->
            <rect x="10" y="4.7" width="2" height="1.8" rx="0.3" fill="#B8860B" stroke="#8B6914" stroke-width="0.2"/>
            <!-- Motion lines -->
            <path d="M21 13 L23 11" stroke="#ff6644" stroke-width="0.8" stroke-linecap="round" opacity="0.6"/>
            <path d="M21 15 L23 14" stroke="#ff6644" stroke-width="0.6" stroke-linecap="round" opacity="0.4"/>
            <path d="M20 17 L22 17" stroke="#ff6644" stroke-width="0.5" stroke-linecap="round" opacity="0.3"/>
        </g>
    </svg>`
};

// Make ICONS available globally
if (typeof window !== 'undefined') {
    window.ICONS = ICONS;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ICONS;
}
