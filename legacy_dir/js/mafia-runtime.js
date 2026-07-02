(() => {
  const DEFAULT_CONFIG = {
    socketUrl: '',
    socketPath: '/socket.io',
    speechSeconds: 15,
    voteSeconds: 15,
    nightSeconds: 15,
  };

  function clamp(value, min, max, fallback) {
    const num = Number(value);
    if (!Number.isFinite(num)) return fallback;
    return Math.max(min, Math.min(max, num));
  }

  function loadConfig() {
    let stored = {};
    try {
      stored = JSON.parse(localStorage.getItem('maf_runtime_config') || '{}');
    } catch (_) {
      stored = {};
    }

    const query = new URLSearchParams(window.location.search);
    const querySocket = query.get('socketUrl') || query.get('socket');
    const queryPath = query.get('socketPath');
    const injected = window.MAFIA_CONFIG || {};

    return {
      ...DEFAULT_CONFIG,
      ...stored,
      ...injected,
      ...(querySocket ? { socketUrl: querySocket } : {}),
      ...(queryPath ? { socketPath: queryPath } : {}),
    };
  }

  function saveConfig(patch) {
    const merged = { ...loadConfig(), ...patch };
    localStorage.setItem('maf_runtime_config', JSON.stringify(merged));
    return merged;
  }

  function normalizePlayerName(name, fallback = 'لاعب') {
    const value = String(name || '').trim();
    return value || fallback;
  }

  function hashSeed(input) {
    const text = String(input || 'seed');
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  function buildPlayerVisual(seed, avatar = '🎭') {
    const palette = [
      ['#6f3027', '#2d1312', '#d7b17b'],
      ['#5b4632', '#231814', '#cfb06f'],
      ['#59444a', '#241516', '#d7c0d4'],
      ['#4a5760', '#1a1414', '#d1d8dd'],
      ['#556044', '#1b1412', '#dbe1b8'],
      ['#7a5a33', '#261714', '#f2ddb0'],
    ];
    const idx = hashSeed(seed) % palette.length;
    const [accent, base, ink] = palette[idx];

    return {
      accent,
      ink,
      background: `
        radial-gradient(circle at 50% 24%, rgba(255,248,230,0.18), transparent 28%),
        linear-gradient(160deg, ${accent} 0%, ${base} 100%)
      `,
      emblem: avatar,
    };
  }

  function clampPhaseSettings(settings = {}) {
    const config = loadConfig();
    return {
      mafia_count: clamp(settings.mafia_count, 1, 4, 2),
      day_duration: clamp(settings.day_duration, 10, 45, config.speechSeconds),
      vote_duration: clamp(settings.vote_duration, 10, 45, config.voteSeconds),
      night_duration: clamp(settings.night_duration, 10, 35, config.nightSeconds),
      has_doctor: settings.has_doctor !== false,
      has_sheriff: settings.has_sheriff !== false,
      has_bodyguard: !!settings.has_bodyguard,
      has_mayor: !!settings.has_mayor,
      has_medium: !!settings.has_medium,
      has_jester: !!settings.has_jester,
      has_sk: !!settings.has_sk,
      has_executioner: !!settings.has_executioner,
      has_witch: !!settings.has_witch,
      has_framer: !!settings.has_framer,
      has_consigliere: !!settings.has_consigliere,
    };
  }

  function createRealtimeBridge({ supabase, channelName, roomId, userId, onEvent }) {
    const config = loadConfig();
    const socketEnabled = Boolean(config.socketUrl && window.io);
    let channel = null;
    let socket = null;

    function dispatch(message) {
      if (!message || typeof onEvent !== 'function') return;
      onEvent(message);
    }

    function connect() {
      if (socketEnabled) {
        socket = window.io(config.socketUrl, {
          path: config.socketPath || '/socket.io',
          transports: ['websocket'],
          auth: { roomId, userId },
          query: { roomId, channelName, userId },
        });

        socket.on('connect', () => dispatch({ type: 'bridge:connected', payload: { mode: 'socket', id: socket.id } }));
        socket.on('mafia:event', dispatch);
        socket.on('disconnect', (reason) => dispatch({ type: 'bridge:disconnected', payload: { reason } }));
        return;
      }

      if (supabase) {
        channel = supabase.channel(channelName);
        channel
          .on('broadcast', { event: 'mafia:event' }, ({ payload }) => dispatch(payload))
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              dispatch({ type: 'bridge:connected', payload: { mode: 'broadcast', id: channelName } });
            }
          });
      }
    }

    async function emit(type, payload = {}) {
      const envelope = {
        type,
        payload,
        meta: {
          roomId,
          senderId: userId,
          ts: Date.now(),
        },
      };

      if (socket) {
        socket.emit('mafia:event', envelope);
        return envelope;
      }

      if (channel) {
        await channel.send({
          type: 'broadcast',
          event: 'mafia:event',
          payload: envelope,
        });
        return envelope;
      }

      return envelope;
    }

    function close() {
      if (socket) socket.disconnect();
      if (channel) channel.unsubscribe();
    }

    return {
      config,
      connect,
      emit,
      close,
      isSocket: () => Boolean(socket),
    };
  }

  window.MAFIA_RUNTIME = {
    loadConfig,
    saveConfig,
    normalizePlayerName,
    buildPlayerVisual,
    clampPhaseSettings,
    createRealtimeBridge,
  };
})();
