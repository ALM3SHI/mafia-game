const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// ===== Game State =====
const rooms = {};

// ===== Player Profiles Database (in-memory) =====
const profiles = {}; // keyed by playerId

// ===== Card Collection System =====
const CARD_RARITIES = {
    COMMON:      { id: 'common',      name: 'عادي',      color: '#9ca3af', chance: 0.55, coinValue: 5,   glowIntensity: 0 },
    RARE:        { id: 'rare',        name: 'نادر',      color: '#3b82f6', chance: 0.25, coinValue: 15,  glowIntensity: 1 },
    EPIC:        { id: 'epic',        name: 'أسطوري',    color: '#a855f7', chance: 0.12, coinValue: 40,  glowIntensity: 2 },
    HOLOGRAPHIC: { id: 'holographic', name: 'هولوغرافي', color: '#f59e0b', chance: 0.06, coinValue: 100, glowIntensity: 3 },
    FOIL:        { id: 'foil',        name: 'فويل ✦',    color: '#ef4444', chance: 0.02, coinValue: 300, glowIntensity: 4 },
};

const CARD_SKINS = {
    mafia_boss:    ['كلاسيكي', 'الدون', 'ظل الليل', 'الباشا', 'ملك الظلام'],
    mafia_muter:   ['كلاسيكي', 'الصامت', 'كاتم الأصوات', 'الهامس', 'شبح السكوت'],
    mafia_regular: ['كلاسيكي', 'المتخفي', 'الجندي', 'السكين الخفي', 'الظل'],
    mayor:         ['كلاسيكي', 'العمدة الذهبي', 'حاكم المدينة', 'القاضي', 'سيد العدالة'],
    good_son:      ['كلاسيكي', 'المنتقم', 'الشهيد', 'حارس الشرف', 'القنبلة'],
    medic:         ['كلاسيكي', 'الجراح', 'ملاك الرحمة', 'طبيب الحرب', 'المنقذ'],
    sniper:        ['كلاسيكي', 'القناص الأسطوري', 'عين الصقر', 'الرصاصة الذهبية', 'الموت الصامت'],
    citizen:       ['كلاسيكي', 'المواطن الشجاع', 'صوت الحق', 'البطل المجهول', 'حارس المدينة'],
};

const PACK_TYPES = {
    STANDARD: { id: 'standard', name: 'حزمة عادية',    price: 100,  cards: 3, guaranteedRare: false, icon: '📦', color: '#3b82f6' },
    PREMIUM:  { id: 'premium',  name: 'حزمة مميزة',    price: 250,  cards: 5, guaranteedRare: true,  icon: '🎁', color: '#a855f7' },
    LEGENDARY:{ id: 'legendary',name: 'حزمة أسطورية',  price: 500,  cards: 5, guaranteedRare: true,  icon: '👑', color: '#f59e0b' },
};

// ===== Game Modifiers (Jokers) =====
const GAME_MODIFIERS = {
    SECRET_VOTE:    { id: 'secret_vote',    name: 'تصويت سري',        icon: '🕵️', desc: 'التصويت مخفي تماماً - لا أحد يرى من صوّت لمن',           color: '#6366f1' },
    DOUBLE_KILL:    { id: 'double_kill',    name: 'ليلة دموية',       icon: '🔪🔪', desc: 'المافيا تقتل شخصين هذه الليلة لكن يُكشف لون أحدهم',   color: '#dc2626' },
    IMMUNITY:       { id: 'immunity',       name: 'درع المدينة',      icon: '🛡️', desc: 'أول شخص يحصل على أعلى أصوات يحصل على فرصة دفاع ثانية',   color: '#22c55e' },
    CHAOS:          { id: 'chaos',          name: 'فوضى عارمة',       icon: '🌪️', desc: 'يتم تبديل أدوار لاعبين عشوائياً من كل فريق',              color: '#f97316' },
    SPEED_ROUND:    { id: 'speed_round',    name: 'جولة سريعة',       icon: '⚡', desc: 'وقت الكلام والتصويت ينقص للنصف',                           color: '#eab308' },
    WHISPERS:       { id: 'whispers',       name: 'همسات الليل',      icon: '👻', desc: 'الأموات يمكنهم إرسال تلميح واحد مشفر للأحياء',             color: '#8b5cf6' },
    BOUNTY:         { id: 'bounty',         name: 'مطلوب حي أو ميت', icon: '💰', desc: 'يتم اختيار لاعب عشوائي كـ"مطلوب" - من يخرجه يحصل على ×3 عملات', color: '#b45309' },
};

// ===== XP & Level System =====
const XP_PER_LEVEL = 200;
const MAX_LEVEL = 50;

function getLevel(xp) {
    return Math.min(MAX_LEVEL, Math.floor(xp / XP_PER_LEVEL) + 1);
}

function getXpForNextLevel(xp) {
    const level = getLevel(xp);
    if (level >= MAX_LEVEL) return 0;
    return (level * XP_PER_LEVEL) - xp;
}

function getXpProgress(xp) {
    const level = getLevel(xp);
    if (level >= MAX_LEVEL) return 1;
    const xpInLevel = xp - ((level - 1) * XP_PER_LEVEL);
    return xpInLevel / XP_PER_LEVEL;
}

// ===== Profile Management =====
function getOrCreateProfile(playerId, playerName) {
    if (!profiles[playerId]) {
        profiles[playerId] = {
            id: playerId,
            name: playerName || 'لاعب',
            level: 1,
            xp: 0,
            coins: 500, // Starting bonus
            gems: 10,
            totalGames: 0,
            wins: 0,
            inventory: [],        // Array of card objects
            equippedSkins: {},    // { roleId: skinName }
            titles: ['لاعب جديد'],
            activeTitle: 'لاعب جديد',
            stats: {
                kills: 0,
                heals: 0,
                snipes: 0,
                goodSonPulls: 0,
                mayorReveals: 0,
                gamesAsMafia: 0,
                gamesAsCitizen: 0,
            }
        };
    }
    return profiles[playerId];
}

function awardCoins(playerId, amount, reason) {
    const profile = profiles[playerId];
    if (!profile) return;
    profile.coins += amount;
    return { amount, reason, newTotal: profile.coins };
}

function awardXP(playerId, amount) {
    const profile = profiles[playerId];
    if (!profile) return null;
    const oldLevel = getLevel(profile.xp);
    profile.xp += amount;
    const newLevel = getLevel(profile.xp);
    profile.level = newLevel;
    const leveledUp = newLevel > oldLevel;
    if (leveledUp) {
        // Level up bonus
        profile.coins += newLevel * 50;
        profile.gems += 2;
    }
    return { xpGained: amount, leveledUp, newLevel, newXp: profile.xp };
}

function rollRarity(guaranteedRare) {
    const rand = Math.random();
    let cumulative = 0;
    const rarities = Object.values(CARD_RARITIES);
    if (guaranteedRare) {
        // Remove common from pool
        const pool = rarities.filter(r => r.id !== 'common');
        const totalChance = pool.reduce((s, r) => s + r.chance, 0);
        for (const rarity of pool) {
            cumulative += rarity.chance / totalChance;
            if (rand <= cumulative) return rarity;
        }
        return CARD_RARITIES.RARE;
    }
    for (const rarity of rarities) {
        cumulative += rarity.chance;
        if (rand <= cumulative) return rarity;
    }
    return CARD_RARITIES.COMMON;
}

function generateCard(guaranteedRare = false) {
    const roleIds = Object.keys(CARD_SKINS);
    const roleId = roleIds[Math.floor(Math.random() * roleIds.length)];
    const skins = CARD_SKINS[roleId];
    const skin = skins[Math.floor(Math.random() * skins.length)];
    const rarity = rollRarity(guaranteedRare);
    const role = Object.values(ROLES).find(r => r.id === roleId);

    return {
        id: 'card_' + Math.random().toString(36).substr(2, 10),
        roleId,
        roleName: role ? role.name : roleId,
        roleIcon: role ? role.icon : '🎭',
        skin,
        rarity: rarity.id,
        rarityName: rarity.name,
        rarityColor: rarity.color,
        glowIntensity: rarity.glowIntensity,
        coinValue: rarity.coinValue,
        obtainedAt: Date.now(),
    };
}

function openPack(playerId, packType) {
    const profile = profiles[playerId];
    if (!profile) return { error: 'لاعب غير موجود' };
    const pack = PACK_TYPES[packType];
    if (!pack) return { error: 'حزمة غير موجودة' };
    if (profile.coins < pack.price) return { error: 'عملات غير كافية', needed: pack.price, have: profile.coins };

    profile.coins -= pack.price;
    const cards = [];
    for (let i = 0; i < pack.cards; i++) {
        const isLastCard = i === pack.cards - 1;
        const guaranteed = pack.guaranteedRare && isLastCard;
        cards.push(generateCard(guaranteed));
    }

    // Add to inventory
    profile.inventory.push(...cards);

    return { cards, remainingCoins: profile.coins, packName: pack.name };
}

// ===== End-Game Rewards Calculator =====
function calculateGameRewards(room) {
    const rewards = {};
    const winnerTeam = room.winner;

    room.players.forEach(p => {
        if (p.isBot) return;
        const profile = getOrCreateProfile(p.id, p.name);
        let coins = 0;
        let xp = 0;
        const bonuses = [];

        // Participation reward
        coins += 30;
        xp += 50;
        bonuses.push({ text: 'مشاركة في اللعبة', coins: 30, xp: 50 });

        // Win bonus
        if (p.role.team === winnerTeam) {
            coins += 80;
            xp += 100;
            bonuses.push({ text: 'فوز!', coins: 80, xp: 100 });
            profile.wins++;
        }

        // Survival bonus
        if (p.alive) {
            coins += 40;
            xp += 30;
            bonuses.push({ text: 'البقاء حياً', coins: 40, xp: 30 });
        }

        // Role-specific rewards from events
        room.allEvents = room.allEvents || [];
        room.allEvents.forEach(evt => {
            if (evt.rewardPlayerId === p.id) {
                coins += evt.rewardCoins || 0;
                xp += evt.rewardXp || 0;
                if (evt.rewardText) bonuses.push({ text: evt.rewardText, coins: evt.rewardCoins || 0, xp: evt.rewardXp || 0 });
            }
        });

        profile.totalGames++;
        if (p.role.team === 'mafia') profile.stats.gamesAsMafia++;
        else profile.stats.gamesAsCitizen++;

        const coinResult = awardCoins(p.id, coins, 'مكافأة نهاية اللعبة');
        const xpResult = awardXP(p.id, xp);

        rewards[p.id] = {
            coins,
            xp,
            bonuses,
            totalCoins: profile.coins,
            leveledUp: xpResult ? xpResult.leveledUp : false,
            newLevel: xpResult ? xpResult.newLevel : profile.level,
            xpProgress: getXpProgress(profile.xp),
        };
    });

    return rewards;
}

const ROLES = {
    MAFIA_BOSS: { id: 'mafia_boss', name: 'شيخ المافيا', icon: '👑', team: 'mafia', desc: 'تختار شخصاً لاغتياله كل ليلة' },
    MAFIA_MUTER: { id: 'mafia_muter', name: 'مافيا التسكيت', icon: '🤫', team: 'mafia', desc: 'تمنع شخصاً من الكلام في الجولة التالية' },
    MAFIA_REGULAR: { id: 'mafia_regular', name: 'مافيا عادي', icon: '🔪', team: 'mafia', desc: 'ساعد فريقك بالتخفي والتضليل' },
    MAYOR: { id: 'mayor', name: 'العمدة', icon: '🏛️', team: 'citizen', desc: 'يمكنك كشف كرتك. صوتك يصبح ×3' },
    GOOD_SON: { id: 'good_son', name: 'الولد الصالح', icon: '👦', team: 'citizen', desc: 'عند خروجك تسحب معك أي لاعب' },
    MEDIC: { id: 'medic', name: 'الإسعاف', icon: '🚑', team: 'citizen', desc: 'تنقذ شخصاً من الاغتيال كل ليلة' },
    SNIPER: { id: 'sniper', name: 'القناص', icon: '🎯', team: 'citizen', desc: 'رصاصة واحدة فقط. أصب مافيا أو اخرج معاً' },
    CITIZEN: { id: 'citizen', name: 'مواطن صالح', icon: '😇', team: 'citizen', desc: 'اكتشف المافيا وصوّت لإخراجهم' },
};

const BOT_NAMES = [
    'عبدالله', 'عمر', 'حسن', 'بلال', 'أحمد', 'رامي', 'عز الدين',
    'مصطفى', 'أسامة', 'خالد', 'يوسف', 'سعد', 'فهد', 'ماجد',
    'ناصر', 'سلطان', 'تركي', 'نواف', 'بندر', 'وليد',
];
const BOT_AVATARS = ['🤖','🦾','⚙️','🔧','💻','🎮','🕹️','📡','🛸','🧲'];

function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function getRoles(count) {
    let mafiaCount = Math.max(2, Math.floor(count / 4));
    if (count >= 12) mafiaCount = 3;
    if (count >= 16) mafiaCount = 4;
    if (count <= 6) mafiaCount = 2;

    const roles = [ROLES.MAFIA_BOSS, ROLES.MAFIA_MUTER];
    for (let i = 2; i < mafiaCount; i++) roles.push(ROLES.MAFIA_REGULAR);

    const citizenCount = count - mafiaCount;
    roles.push(ROLES.MAYOR);
    roles.push(ROLES.MEDIC);
    if (citizenCount >= 4) roles.push(ROLES.GOOD_SON);
    if (citizenCount >= 5) roles.push(ROLES.SNIPER);
    while (roles.length < count) roles.push(ROLES.CITIZEN);

    return shuffle(roles);
}

function getPublicPlayers(room) {
    return room.players.map(p => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        alive: p.alive,
        muted: p.muted,
        isHost: p.id === room.hostId,
        mayorRevealed: p.mayorRevealed || false,
        isBot: p.isBot || false,
        // Only show role if dead or game over
        role: (!p.alive || room.phase === 'gameover') ? p.role : null,
    }));
}

function getPlayerPrivateData(room, playerId) {
    const player = room.players.find(p => p.id === playerId);
    if (!player) return null;

    const data = {
        role: player.role,
        mafiaTeam: null,
    };

    // Mafia sees their team
    if (player.role && player.role.team === 'mafia') {
        data.mafiaTeam = room.players
            .filter(p => p.role && p.role.team === 'mafia')
            .map(p => ({ id: p.id, name: p.name, role: p.role }));
    }

    return data;
}

function broadcastRoomState(room) {
    const publicPlayers = getPublicPlayers(room);
    room.players.forEach(p => {
        if (p.socketId) {
            const privateData = getPlayerPrivateData(room, p.id);
            const profile = p.isBot ? null : (profiles[p.id] || null);
            io.to(p.socketId).emit('game-state', {
                roomCode: room.code,
                phase: room.phase,
                round: room.round,
                players: publicPlayers,
                myId: p.id,
                myRole: privateData ? privateData.role : null,
                mafiaTeam: privateData ? privateData.mafiaTeam : null,
                hostId: room.hostId,
                nightPhase: room.nightPhase || null,
                events: room.events || [],
                votes: room.publicVotes || {},
                voteCounts: room.voteCounts || {},
                mayorRevealed: room.mayorRevealed || false,
                sniperUsed: room.sniperUsed || false,
                winner: room.winner || null,
                timer: room.timer || null,
                waitingFor: room.waitingFor || null,
                goodSonPending: room.goodSonPending || false,
                goodSonPlayerId: room.goodSonPlayerId || null,
                eliminated: room.eliminated || null,
                // Speaking turn data
                daySubPhase: room.daySubPhase || null,
                currentSpeaker: room.currentSpeaker || null,
                speakTimer: room.speakTimer || 0,
                speakTotalTime: room.speakTime || 30,
                speakingOrder: room.speakingOrder || [],
                speakingIndex: room.speakingIndex || 0,
                // Profile data
                myProfile: profile ? {
                    level: profile.level,
                    xp: profile.xp,
                    xpProgress: getXpProgress(profile.xp),
                    coins: profile.coins,
                    gems: profile.gems,
                    activeTitle: profile.activeTitle,
                    inventoryCount: profile.inventory.length,
                } : null,
                // Game modifiers
                activeModifiers: room.activeModifiers || [],
                // End-game rewards
                gameRewards: room.gameRewards || null,
            });
        }
    });

    // Trigger bot actions after broadcast
    scheduleBotActions(room);
}

function checkWin(room) {
    const aliveMafia = room.players.filter(p => p.alive && p.role.team === 'mafia').length;
    const aliveCitizens = room.players.filter(p => p.alive && p.role.team === 'citizen').length;
    if (aliveMafia === 0) return 'citizens';
    if (aliveMafia >= aliveCitizens) return 'mafia';
    return null;
}

function startNight(room) {
    room.round++;
    room.phase = 'night';
    room.nightPhase = 'mafia_kill';
    room.nightActions = {};
    room.events = [];
    room.eliminated = null;
    room.goodSonPending = false;
    room.goodSonPlayerId = null;

    // Clear muted
    room.players.forEach(p => p.muted = false);

    // Set waiting for
    const boss = room.players.find(p => p.role.id === 'mafia_boss' && p.alive);
    room.waitingFor = boss ? boss.id : null;

    broadcastRoomState(room);
}

function advanceNight(room) {
    const phases = ['mafia_kill', 'mafia_mute', 'medic_heal', 'sniper_shoot'];
    const currentIdx = phases.indexOf(room.nightPhase);

    for (let i = currentIdx + 1; i < phases.length; i++) {
        const nextPhase = phases[i];
        let handler = null;

        if (nextPhase === 'mafia_mute') {
            handler = room.players.find(p => p.role.id === 'mafia_muter' && p.alive);
        } else if (nextPhase === 'medic_heal') {
            handler = room.players.find(p => p.role.id === 'medic' && p.alive);
        } else if (nextPhase === 'sniper_shoot') {
            handler = room.players.find(p => p.role.id === 'sniper' && p.alive && !room.sniperUsed);
        }

        if (handler) {
            room.nightPhase = nextPhase;
            room.waitingFor = handler.id;
            broadcastRoomState(room);
            return;
        }
    }

    // All night phases done - resolve
    resolveNight(room);
}

function resolveNight(room) {
    const events = [];
    const actions = room.nightActions;

    // Mute
    if (actions.mafia_mute && actions.mafia_mute !== 'skip') {
        const target = room.players.find(p => p.id === actions.mafia_mute);
        if (target && target.alive) {
            target.muted = true;
            events.push({ type: 'mute', icon: '🤫', text: `تم تسكيت ${target.name} - ممنوع من الكلام هذه الجولة` });
        }
    }

    // Sniper
    if (actions.sniper_shoot && actions.sniper_shoot !== 'skip') {
        room.sniperUsed = true;
        const target = room.players.find(p => p.id === actions.sniper_shoot);
        const sniper = room.players.find(p => p.role.id === 'sniper');
        if (target) {
            if (target.role.team === 'mafia') {
                target.alive = false;
                events.push({ type: 'snipe', icon: '🎯', text: `القناص أصاب ${target.name} (${target.role.name})! سقط عضو مافيا` });
                // Reward sniper for hitting mafia
                if (sniper && !sniper.isBot) {
                    room.allEvents = room.allEvents || [];
                    room.allEvents.push({ rewardPlayerId: sniper.id, rewardCoins: 80, rewardXp: 60, rewardText: 'قنص مافيا! 🎯' });
                }
            } else {
                target.alive = false;
                if (sniper) sniper.alive = false;
                events.push({ type: 'snipe', icon: '💀', text: `القناص أخطأ وأصاب ${target.name} (مواطن صالح)! خرجا معاً` });
            }
        }
    }

    // Kill / Heal
    if (actions.mafia_kill) {
        if (actions.mafia_kill === actions.medic_heal) {
            const target = room.players.find(p => p.id === actions.mafia_kill);
            const medic = room.players.find(p => p.role.id === 'medic' && p.alive);
            events.push({ type: 'heal', icon: '🚑', text: `الإسعاف أنقذ ${target.name} من الاغتيال!` });
            // Reward medic for successful heal
            if (medic && !medic.isBot) {
                room.allEvents = room.allEvents || [];
                room.allEvents.push({ rewardPlayerId: medic.id, rewardCoins: 50, rewardXp: 40, rewardText: 'إنقاذ ناجح 🚑' });
            }
        } else {
            const target = room.players.find(p => p.id === actions.mafia_kill);
            if (target && target.alive) {
                target.alive = false;
                events.push({ type: 'kill', icon: '💀', text: `تم اغتيال ${target.name} - ${target.role.name}` });
                // Reward mafia boss for successful kill
                const boss = room.players.find(p => p.role.id === 'mafia_boss' && p.alive);
                if (boss && !boss.isBot) {
                    room.allEvents = room.allEvents || [];
                    room.allEvents.push({ rewardPlayerId: boss.id, rewardCoins: 30, rewardXp: 25, rewardText: 'اغتيال ناجح 🔪' });
                }
            }
        }
    }

    if (events.length === 0) {
        events.push({ type: 'heal', icon: '✨', text: 'ليلة هادئة - لم يحدث شيء' });
    }

    room.events = events;
    room.nightPhase = null;
    room.waitingFor = null;

    // Check win
    const winner = checkWin(room);
    if (winner) {
        room.phase = 'gameover';
        room.winner = winner;
        room.gameRewards = calculateGameRewards(room);
        broadcastRoomState(room);
        return;
    }

    room.phase = 'day';
    room.publicVotes = {};
    room.voteCounts = {};

    // Setup speaking turns
    const speakTime = room.speakTime || 30;
    if (speakTime > 0) {
        room.daySubPhase = 'discussion';
        const aliveSpeakers = room.players.filter(p => p.alive && !p.muted);
        room.speakingOrder = shuffle(aliveSpeakers.map(p => p.id));
        room.speakingIndex = 0;
        room.currentSpeaker = null;
    } else {
        room.daySubPhase = 'voting';
        room.currentSpeaker = null;
        room.speakingOrder = [];
    }

    broadcastRoomState(room);
}

function advanceSpeaker(room) {
    if (!room.speakingOrder || room.speakingIndex >= room.speakingOrder.length) {
        // All speakers done - transition to voting phase
        room.daySubPhase = 'voting';
        room.currentSpeaker = null;
        room.speakTimer = 0;
        if (room._speakTimerId) {
            clearTimeout(room._speakTimerId);
            room._speakTimerId = null;
        }
        broadcastRoomState(room);
        return;
    }

    const speakerId = room.speakingOrder[room.speakingIndex];
    const speaker = room.players.find(p => p.id === speakerId);

    // Skip dead/muted players
    if (!speaker || !speaker.alive || speaker.muted) {
        room.speakingIndex++;
        advanceSpeaker(room);
        return;
    }

    // Skip bot speakers (they don't actually talk)
    if (speaker.isBot) {
        room.speakingIndex++;
        advanceSpeaker(room);
        return;
    }

    room.currentSpeaker = speakerId;
    room.speakTimer = room.speakTime || 30;
    broadcastRoomState(room);

    // Auto-advance after speak time
    if (room.speakTime > 0) {
        room._speakTimerId = setTimeout(() => {
            if (rooms[room.code] && rooms[room.code].currentSpeaker === speakerId) {
                room.speakingIndex++;
                advanceSpeaker(room);
            }
        }, (room.speakTime + 2) * 1000); // +2 seconds grace
    }
}

function processVotes(room) {
    // Count votes with mayor weight
    const counts = {};
    room.players.filter(p => p.alive).forEach(p => { counts[p.id] = 0; });

    Object.entries(room.publicVotes).forEach(([voterId, targetId]) => {
        if (targetId === 'skip') return;
        const voter = room.players.find(p => p.id === voterId);
        const weight = (voter && voter.mayorRevealed && voter.role.id === 'mayor') ? 3 : 1;
        if (counts[targetId] !== undefined) {
            counts[targetId] += weight;
        }
    });

    room.voteCounts = counts;

    // Find max
    const maxVotes = Math.max(...Object.values(counts), 0);
    if (maxVotes === 0) {
        room.events = [{ type: 'heal', icon: '⚖️', text: 'لا أصوات - لم يتم إخراج أحد' }];
        room.eliminated = null;
        room.phase = 'vote_result';
        broadcastRoomState(room);
        return;
    }

    const topPlayers = Object.entries(counts).filter(([_, c]) => c === maxVotes);
    if (topPlayers.length > 1) {
        room.events = [{ type: 'heal', icon: '⚖️', text: 'تعادل في الأصوات - لم يتم إخراج أحد' }];
        room.eliminated = null;
        room.phase = 'vote_result';
        broadcastRoomState(room);
        return;
    }

    const eliminatedId = topPlayers[0][0];
    const eliminated = room.players.find(p => p.id === eliminatedId);
    eliminated.alive = false;
    room.eliminated = { id: eliminated.id, name: eliminated.name, role: eliminated.role };

    // Good Son check
    if (eliminated.role.id === 'good_son') {
        room.goodSonPending = true;
        room.goodSonPlayerId = eliminated.id;
        room.phase = 'vote_result';
        broadcastRoomState(room);
        return;
    }

    room.phase = 'vote_result';
    broadcastRoomState(room);
}

// ===== Bot AI =====
function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function botNightAction(room) {
    if (room.phase !== 'night' || !room.waitingFor) return;
    const actor = room.players.find(p => p.id === room.waitingFor);
    if (!actor || !actor.isBot) return;

    let targetId = 'skip';
    const alive = room.players.filter(p => p.alive);
    const aliveCitizens = alive.filter(p => p.role.team === 'citizen');
    const aliveMafia = alive.filter(p => p.role.team === 'mafia');

    switch (room.nightPhase) {
        case 'mafia_kill': {
            // Kill a random citizen, prefer special roles
            const specials = aliveCitizens.filter(p =>
                ['mayor', 'sniper', 'medic'].includes(p.role.id));
            targetId = specials.length > 0
                ? pickRandom(specials).id
                : (aliveCitizens.length > 0 ? pickRandom(aliveCitizens).id : 'skip');
            break;
        }
        case 'mafia_mute': {
            // Mute a random citizen (70%) or skip (30%)
            if (Math.random() < 0.7 && aliveCitizens.length > 0) {
                targetId = pickRandom(aliveCitizens).id;
            } else {
                targetId = 'skip';
            }
            break;
        }
        case 'medic_heal': {
            // Heal a random alive player (sometimes self)
            targetId = pickRandom(alive).id;
            break;
        }
        case 'sniper_shoot': {
            // Shoot if round >= 2, 50% chance, else skip
            if (room.round >= 2 && Math.random() < 0.5) {
                // Try to pick someone who was suspicious (random non-self)
                const targets = alive.filter(p => p.id !== actor.id);
                targetId = targets.length > 0 ? pickRandom(targets).id : 'skip';
            } else {
                targetId = 'skip';
            }
            break;
        }
    }

    room.nightActions[room.nightPhase] = targetId;
    advanceNight(room);
}

function botVote(room) {
    if (room.phase !== 'day') return;

    const botVoters = room.players.filter(p => p.alive && !p.muted && p.isBot && !room.publicVotes[p.id]);
    const alive = room.players.filter(p => p.alive);

    botVoters.forEach(bot => {
        let targetId = 'skip';

        if (bot.role.team === 'mafia') {
            // Mafia bots vote for a random citizen (not fellow mafia)
            const citizenTargets = alive.filter(p => p.role.team === 'citizen' && p.id !== bot.id);
            if (citizenTargets.length > 0) targetId = pickRandom(citizenTargets).id;
        } else {
            // Citizen bots vote randomly (anyone except self), skip 15% of time
            if (Math.random() < 0.15) {
                targetId = 'skip';
            } else {
                const targets = alive.filter(p => p.id !== bot.id);
                if (targets.length > 0) targetId = pickRandom(targets).id;
            }
        }

        room.publicVotes[bot.id] = targetId;
    });

    // Check if all voted
    const mustVote = room.players.filter(p => p.alive && !p.muted);
    const voted = mustVote.filter(p => room.publicVotes[p.id] !== undefined);
    if (voted.length >= mustVote.length) {
        processVotes(room);
    } else {
        broadcastRoomState(room);
    }
}

function botGoodSon(room) {
    if (!room.goodSonPending) return;
    const gs = room.players.find(p => p.id === room.goodSonPlayerId);
    if (!gs || !gs.isBot) return;

    // Pull a random alive player (prefer mafia if known, else random)
    const alive = room.players.filter(p => p.alive);
    if (alive.length > 0) {
        const target = pickRandom(alive);
        target.alive = false;
        room.events.push({ type: 'kill', icon: '👦', text: `الولد الصالح سحب ${target.name} (${target.role.name}) معه` });
    }
    room.goodSonPending = false;
    room.goodSonPlayerId = null;
    broadcastRoomState(room);
}

// Schedule bot actions with small delay for realism
// Use a flag to prevent scheduling duplicates
function scheduleBotActions(room) {
    if (room._botScheduled) return;
    room._botScheduled = true;

    setTimeout(() => {
        room._botScheduled = false;

        // Night bot action
        if (room.phase === 'night' && room.waitingFor) {
            const actor = room.players.find(p => p.id === room.waitingFor);
            if (actor && actor.isBot) {
                botNightAction(room);
                return;
            }
        }
        // Day bot votes
        if (room.phase === 'day') {
            const hasBotToVote = room.players.some(p => p.alive && !p.muted && p.isBot && !room.publicVotes[p.id]);
            if (hasBotToVote) {
                botVote(room);
                return;
            }
        }
        // Good son bot
        if (room.phase === 'vote_result' && room.goodSonPending) {
            const gs = room.players.find(p => p.id === room.goodSonPlayerId);
            if (gs && gs.isBot) {
                botGoodSon(room);
                return;
            }
        }
    }, 800 + Math.random() * 1200);
}

// ===== Socket.IO =====
io.on('connection', (socket) => {
    let currentRoom = null;
    let currentPlayerId = null;

    socket.on('create-room', ({ playerName, avatar }) => {
        const code = generateRoomCode();
        const playerId = 'p_' + Math.random().toString(36).substr(2, 8);
        const room = {
            code,
            hostId: playerId,
            players: [{
                id: playerId,
                name: playerName,
                avatar: avatar || '😎',
                socketId: socket.id,
                alive: true,
                muted: false,
                role: null,
                mayorRevealed: false,
            }],
            phase: 'lobby',
            round: 0,
            nightPhase: null,
            nightActions: {},
            events: [],
            publicVotes: {},
            voteCounts: {},
            mayorRevealed: false,
            sniperUsed: false,
            winner: null,
            waitingFor: null,
            goodSonPending: false,
            goodSonPlayerId: null,
            eliminated: null,
        };

        rooms[code] = room;
        currentRoom = code;
        currentPlayerId = playerId;
        socket.join(code);

        // Create profile for new player
        getOrCreateProfile(playerId, playerName);

        socket.emit('room-joined', { roomCode: code, playerId });
        broadcastRoomState(room);
    });

    socket.on('join-room', ({ roomCode, playerName, avatar }) => {
        const code = roomCode.toUpperCase();
        const room = rooms[code];

        if (!room) {
            socket.emit('error-msg', { message: 'الغرفة غير موجودة' });
            return;
        }
        if (room.phase !== 'lobby') {
            socket.emit('error-msg', { message: 'اللعبة بدأت بالفعل' });
            return;
        }
        if (room.players.length >= 20) {
            socket.emit('error-msg', { message: 'الغرفة ممتلئة' });
            return;
        }

        const playerId = 'p_' + Math.random().toString(36).substr(2, 8);
        room.players.push({
            id: playerId,
            name: playerName,
            avatar: avatar || '😎',
            socketId: socket.id,
            alive: true,
            muted: false,
            role: null,
            mayorRevealed: false,
        });

        // Create profile for new player
        getOrCreateProfile(playerId, playerName);

        currentRoom = code;
        currentPlayerId = playerId;
        socket.join(code);

        socket.emit('room-joined', { roomCode: code, playerId });
        broadcastRoomState(room);
    });

    socket.on('update-profile', ({ name, avatar }) => {
        if (!currentRoom || !rooms[currentRoom]) return;
        const room = rooms[currentRoom];
        const player = room.players.find(p => p.id === currentPlayerId);
        if (player) {
            if (name) player.name = name;
            if (avatar) player.avatar = avatar;
            broadcastRoomState(room);
        }
    });

    socket.on('start-game', (data) => {
        if (!currentRoom || !rooms[currentRoom]) return;
        const room = rooms[currentRoom];
        if (currentPlayerId !== room.hostId) return;
        if (room.players.length < 6) {
            socket.emit('error-msg', { message: 'يجب أن يكون هناك 6 لاعبين على الأقل' });
            return;
        }

        // Save settings
        room.speakTime = (data && data.speakTime !== undefined) ? data.speakTime : 30;

        // Assign roles
        const roles = getRoles(room.players.length);
        room.players.forEach((p, i) => {
            p.role = roles[i];
            p.alive = true;
            p.muted = false;
            p.mayorRevealed = false;
        });

        room.round = 0;
        room.sniperUsed = false;
        room.mayorRevealed = false;
        room.winner = null;
        room.daySubPhase = null;
        room.currentSpeaker = null;
        room.speakingOrder = [];
        room.speakingIndex = 0;
        room.allEvents = [];
        room.gameRewards = null;
        room.activeModifiers = room.activeModifiers || [];

        // Show roles for a moment, then start night
        room.phase = 'role_reveal';
        broadcastRoomState(room);

        // Auto start night after delay
        setTimeout(() => {
            if (rooms[currentRoom] && rooms[currentRoom].phase === 'role_reveal') {
                startNight(rooms[currentRoom]);
            }
        }, 8000);
    });

    socket.on('ready-from-reveal', () => {
        // Player acknowledged their role, can be used for early start
    });

    socket.on('night-action', ({ action, targetId }) => {
        if (!currentRoom || !rooms[currentRoom]) return;
        const room = rooms[currentRoom];
        if (room.phase !== 'night') return;
        if (currentPlayerId !== room.waitingFor) return;

        room.nightActions[room.nightPhase] = targetId || 'skip';
        advanceNight(room);
    });

    socket.on('cast-vote', ({ targetId }) => {
        if (!currentRoom || !rooms[currentRoom]) return;
        const room = rooms[currentRoom];
        if (room.phase !== 'day') return;

        const player = room.players.find(p => p.id === currentPlayerId);
        if (!player || !player.alive || player.muted) return;

        room.publicVotes[currentPlayerId] = targetId; // targetId or 'skip'
        broadcastRoomState(room);

        // Broadcast vote update for live display
        if (targetId && targetId !== 'skip') {
            const targetPlayer = room.players.find(p => p.id === targetId);
            if (targetPlayer) {
                const voteCount = Object.values(room.publicVotes).filter(v => v === targetId).length;
                io.to(currentRoom).emit('vote-update', {
                    playerId: targetId,
                    playerName: targetPlayer.name,
                    voteCount: voteCount
                });
            }
        }

        // Check if all alive non-muted players voted
        const mustVote = room.players.filter(p => p.alive && !p.muted);
        const voted = mustVote.filter(p => room.publicVotes[p.id] !== undefined);
        if (voted.length >= mustVote.length) {
            processVotes(room);
        }
    });

    socket.on('mayor-reveal', () => {
        if (!currentRoom || !rooms[currentRoom]) return;
        const room = rooms[currentRoom];
        const player = room.players.find(p => p.id === currentPlayerId);
        if (!player || player.role.id !== 'mayor' || !player.alive) return;

        player.mayorRevealed = true;
        room.mayorRevealed = true;
        broadcastRoomState(room);
    });

    socket.on('good-son-pull', ({ targetId }) => {
        if (!currentRoom || !rooms[currentRoom]) return;
        const room = rooms[currentRoom];
        if (!room.goodSonPending) return;
        if (currentPlayerId !== room.goodSonPlayerId) return;

        const target = room.players.find(p => p.id === targetId);
        if (target && target.alive) {
            target.alive = false;
            room.events.push({ type: 'kill', icon: '👦', text: `الولد الصالح سحب ${target.name} (${target.role.name}) معه` });
        }

        room.goodSonPending = false;
        room.goodSonPlayerId = null;
        broadcastRoomState(room);
    });

    socket.on('continue-to-night', () => {
        if (!currentRoom || !rooms[currentRoom]) return;
        const room = rooms[currentRoom];
        if (currentPlayerId !== room.hostId) return;

        const winner = checkWin(room);
        if (winner) {
            room.phase = 'gameover';
            room.winner = winner;
            room.gameRewards = calculateGameRewards(room);
            broadcastRoomState(room);
            return;
        }

        startNight(room);
    });

    socket.on('restart-game', () => {
        if (!currentRoom || !rooms[currentRoom]) return;
        const room = rooms[currentRoom];
        if (currentPlayerId !== room.hostId) return;

        if (room._speakTimerId) { clearTimeout(room._speakTimerId); room._speakTimerId = null; }

        room.phase = 'lobby';
        room.round = 0;
        room.players.forEach(p => {
            p.role = null;
            p.alive = true;
            p.muted = false;
            p.mayorRevealed = false;
        });
        room.events = [];
        room.publicVotes = {};
        room.voteCounts = {};
        room.winner = null;
        room.sniperUsed = false;
        room.nightActions = {};
        room.goodSonPending = false;
        room.daySubPhase = null;
        room.currentSpeaker = null;
        room.speakingOrder = [];
        room.speakingIndex = 0;
        broadcastRoomState(room);
    });

    socket.on('add-bots', ({ count }) => {
        if (!currentRoom || !rooms[currentRoom]) return;
        const room = rooms[currentRoom];
        if (currentPlayerId !== room.hostId) return;
        if (room.phase !== 'lobby') return;

        const usedNames = room.players.map(p => p.name);
        const availableNames = BOT_NAMES.filter(n => !usedNames.includes(n));

        const toAdd = Math.min(count || 1, 20 - room.players.length, availableNames.length);
        for (let i = 0; i < toAdd; i++) {
            room.players.push({
                id: 'bot_' + Math.random().toString(36).substr(2, 8),
                name: availableNames[i],
                avatar: BOT_AVATARS[i % BOT_AVATARS.length],
                socketId: null,
                alive: true,
                muted: false,
                role: null,
                mayorRevealed: false,
                isBot: true,
            });
        }
        broadcastRoomState(room);
    });

    socket.on('kick-player', ({ playerId }) => {
        if (!currentRoom || !rooms[currentRoom]) return;
        const room = rooms[currentRoom];
        if (currentPlayerId !== room.hostId) return;
        if (room.phase !== 'lobby') return;

        const idx = room.players.findIndex(p => p.id === playerId);
        if (idx !== -1 && playerId !== room.hostId) {
            const kicked = room.players.splice(idx, 1)[0];
            if (kicked.socketId) {
                io.to(kicked.socketId).emit('kicked');
            }
            broadcastRoomState(room);
        }
    });

    socket.on('set-speaker', ({ playerId, duration, quote }) => {
        if (!currentRoom || !rooms[currentRoom]) return;
        const room = rooms[currentRoom];
        const player = room.players.find(p => p.id === playerId);
        if (player) {
            io.to(currentRoom).emit('speaker-update', {
                playerId,
                name: player.name,
                duration: duration || 0,
                quote: quote || player.name
            });
        }
    });

    socket.on('clear-speaker', () => {
        if (!currentRoom || !rooms[currentRoom]) return;
        io.to(currentRoom).emit('speaker-clear');
    });

    socket.on('send-message', ({ message }) => {
        if (!currentRoom || !rooms[currentRoom]) return;
        const room = rooms[currentRoom];
        const player = room.players.find(p => p.id === currentPlayerId);
        if (player) {
            io.to(currentRoom).emit('discussion-message', {
                playerName: player.name,
                playerAvatar: player.avatar,
                message: message
            });
        }
    });

    socket.on('update-votes', ({ votes }) => {
        if (!currentRoom || !rooms[currentRoom]) return;
        const room = rooms[currentRoom];

        // Calculate vote counts per player
        const voteCounts = {};
        Object.values(votes).forEach(targetId => {
            if (targetId && targetId !== 'skip') {
                voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
            }
        });

        // Emit updated vote counts
        Object.entries(voteCounts).forEach(([targetId, count]) => {
            const targetPlayer = room.players.find(p => p.id === targetId);
            if (targetPlayer) {
                io.to(currentRoom).emit('vote-update', {
                    playerId: targetId,
                    playerName: targetPlayer.name,
                    voteCount: count
                });
            }
        });
    });

    socket.on('show-elimination', ({ playerId }) => {
        if (!currentRoom || !rooms[currentRoom]) return;
        const room = rooms[currentRoom];
        const player = room.players.find(p => p.id === playerId);
        if (player) {
            io.to(currentRoom).emit('show-elimination', {
                playerName: player.name,
                role: player.role,
                team: player.role?.team || 'citizen'
            });
        }
    });

    // ===== Speaking Turn System =====
    socket.on('start-speaking', () => {
        if (!currentRoom || !rooms[currentRoom]) return;
        const room = rooms[currentRoom];
        if (currentPlayerId !== room.hostId) return;
        if (room.phase !== 'day' || room.daySubPhase !== 'discussion') return;

        room.speakingIndex = 0;
        advanceSpeaker(room);
    });

    socket.on('next-speaker', () => {
        if (!currentRoom || !rooms[currentRoom]) return;
        const room = rooms[currentRoom];
        if (currentPlayerId !== room.hostId) return;
        if (room.phase !== 'day') return;

        // Clear current timer
        if (room._speakTimerId) {
            clearTimeout(room._speakTimerId);
            room._speakTimerId = null;
        }

        room.speakingIndex++;
        advanceSpeaker(room);
    });

    // ===== Profile & Economy Events =====
    socket.on('get-profile', () => {
        if (!currentPlayerId) {
            if (!socket._tempProfileId) socket._tempProfileId = 'tmp_' + Math.random().toString(36).substr(2, 8);
            currentPlayerId = socket._tempProfileId;
        }
        const profile = getOrCreateProfile(currentPlayerId, 'لاعب');
        socket.emit('profile-data', {
            profile: {
                ...profile,
                level: getLevel(profile.xp),
                xpProgress: getXpProgress(profile.xp),
                xpForNext: getXpForNextLevel(profile.xp),
            }
        });
    });

    socket.on('get-shop', () => {
        // Create a profile if none exists yet (browsing shop from home)
        if (currentPlayerId) getOrCreateProfile(currentPlayerId, 'لاعب');
        else {
            // Assign a temporary ID for shoppers not in a room
            if (!socket._tempProfileId) socket._tempProfileId = 'tmp_' + Math.random().toString(36).substr(2, 8);
            currentPlayerId = socket._tempProfileId;
            getOrCreateProfile(currentPlayerId, 'لاعب');
        }
        const profile = profiles[currentPlayerId];
        socket.emit('shop-data', {
            packs: Object.values(PACK_TYPES),
            coins: profile ? profile.coins : 0,
            gems: profile ? profile.gems : 0,
        });
    });

    socket.on('open-pack', ({ packType }) => {
        if (!currentPlayerId) {
            if (!socket._tempProfileId) socket._tempProfileId = 'tmp_' + Math.random().toString(36).substr(2, 8);
            currentPlayerId = socket._tempProfileId;
        }
        getOrCreateProfile(currentPlayerId);
        const result = openPack(currentPlayerId, packType);
        if (result.error) {
            socket.emit('pack-result', { error: result.error, needed: result.needed, have: result.have });
        } else {
            socket.emit('pack-result', {
                cards: result.cards,
                remainingCoins: result.remainingCoins,
                packName: result.packName,
            });
        }
    });

    socket.on('get-inventory', () => {
        if (!currentPlayerId) {
            if (!socket._tempProfileId) socket._tempProfileId = 'tmp_' + Math.random().toString(36).substr(2, 8);
            currentPlayerId = socket._tempProfileId;
        }
        const profile = getOrCreateProfile(currentPlayerId, 'لاعب');
        socket.emit('inventory-data', {
            cards: profile.inventory,
            equippedSkins: profile.equippedSkins,
        });
    });

    socket.on('equip-skin', ({ roleId, skin }) => {
        const profile = profiles[currentPlayerId];
        if (!profile) return;
        const hasCard = profile.inventory.some(c => c.roleId === roleId && c.skin === skin);
        if (hasCard) {
            profile.equippedSkins[roleId] = skin;
            socket.emit('skin-equipped', { roleId, skin });
        }
    });

    // ===== Game Modifiers =====
    socket.on('get-modifiers', () => {
        socket.emit('modifiers-data', { modifiers: Object.values(GAME_MODIFIERS) });
    });

    socket.on('toggle-modifier', ({ modifierId }) => {
        if (!currentRoom || !rooms[currentRoom]) return;
        const room = rooms[currentRoom];
        if (currentPlayerId !== room.hostId) return;
        if (room.phase !== 'lobby') return;

        room.activeModifiers = room.activeModifiers || [];
        const idx = room.activeModifiers.indexOf(modifierId);
        if (idx === -1) {
            room.activeModifiers.push(modifierId);
        } else {
            room.activeModifiers.splice(idx, 1);
        }
        broadcastRoomState(room);
    });

    socket.on('disconnect', () => {
        if (!currentRoom || !rooms[currentRoom]) return;
        const room = rooms[currentRoom];
        const player = room.players.find(p => p.id === currentPlayerId);
        if (player) {
            player.socketId = null;
            // Don't remove from game, allow reconnect
        }

        // Clean up empty rooms
        const connected = room.players.filter(p => p.socketId);
        if (connected.length === 0) {
            setTimeout(() => {
                if (rooms[currentRoom]) {
                    const still = rooms[currentRoom].players.filter(p => p.socketId);
                    if (still.length === 0) delete rooms[currentRoom];
                }
            }, 60000);
        }

        broadcastRoomState(room);
    });

    socket.on('reconnect-room', ({ roomCode, playerId }) => {
        const room = rooms[roomCode];
        if (!room) {
            socket.emit('error-msg', { message: 'الغرفة غير موجودة' });
            return;
        }
        const player = room.players.find(p => p.id === playerId);
        if (!player) {
            socket.emit('error-msg', { message: 'اللاعب غير موجود' });
            return;
        }

        player.socketId = socket.id;
        currentRoom = roomCode;
        currentPlayerId = playerId;
        socket.join(roomCode);

        socket.emit('room-joined', { roomCode, playerId });
        broadcastRoomState(room);
    });
});

const PORT = process.env.PORT || 3005;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
