// WebSocket bridge between Unity Host and the FastAPI backend.
//
// Owns a single connection to ws://<host>:8000/ws/audio and exposes:
//   - SendAudio(wavBytes, ctx)        : push captured mic to the pipeline
//   - OnAudioChunk  event             : fired per sentence-level audio chunk
//   - OnTranscript  event             : final transcript + timings
//   - OnError       event             : pipeline / network errors
//
// Requires NativeWebSocket package:
//   Packages/manifest.json  →  "com.endel.nativewebsocket": "https://github.com/endel/NativeWebSocket.git#upm"
//
// Singleton pattern so any script (MicRecorder, BotSpeaker, etc.) can grab
// the same instance via AIBridgeClient.Instance.
using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;
using NativeWebSocket;
using UnityEngine;

namespace MafiaAI
{
    public class AIBridgeClient : MonoBehaviour
    {
        public static AIBridgeClient Instance { get; private set; }

        [Header("Backend")]
        [Tooltip("Host's IP. Use 127.0.0.1 if Unity runs on the same machine as FastAPI.")]
        public string serverHost = "127.0.0.1";
        public int serverPort = 8000;
        [Tooltip("Optional Bearer token if MAFIA_API_KEY is set on the backend.")]
        public string apiKey = "";

        [Header("Behavior")]
        public bool autoConnect = true;
        public bool reconnectOnDisconnect = true;
        public float reconnectDelaySeconds = 2f;

        WebSocket ws;
        bool intentionalClose;

        // ───── Public events (raised on Unity main thread) ─────
        public event Action<int, string, byte[], TtsTimings> OnAudioChunk;
        public event Action<string, ServerTimings> OnTranscript;
        public event Action<string> OnError;
        public event Action OnConnected;
        public event Action OnDisconnected;

        // ───── Lifecycle ─────
        void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }

        async void Start()
        {
            if (autoConnect) await Connect();
        }

        void Update()
        {
            // Required on non-WebGL platforms so OnMessage fires on main thread.
#if !UNITY_WEBGL || UNITY_EDITOR
            ws?.DispatchMessageQueue();
#endif
        }

        async void OnApplicationQuit()
        {
            intentionalClose = true;
            if (ws != null) await ws.Close();
        }

        // ───── Connection ─────
        public async Task Connect()
        {
            if (ws != null && ws.State == WebSocketState.Open) return;
            intentionalClose = false;

            var url = $"ws://{serverHost}:{serverPort}/ws/audio";
            var headers = new Dictionary<string, string>();
            if (!string.IsNullOrEmpty(apiKey))
                headers["Authorization"] = "Bearer " + apiKey;

            ws = new WebSocket(url, headers);

            ws.OnOpen += () => { Debug.Log($"[AIBridge] Connected to {url}"); OnConnected?.Invoke(); };
            ws.OnError += (e) => { Debug.LogError($"[AIBridge] WS error: {e}"); OnError?.Invoke(e); };
            ws.OnClose += (code) =>
            {
                Debug.LogWarning($"[AIBridge] Closed (code {code}).");
                OnDisconnected?.Invoke();
                if (!intentionalClose && reconnectOnDisconnect)
                    Invoke(nameof(Reconnect), reconnectDelaySeconds);
            };
            ws.OnMessage += HandleMessage;

            await ws.Connect();
        }

        async void Reconnect() => await Connect();

        // ───── Outgoing: push captured mic audio ─────
        public async Task SendAudio(byte[] wavBytes, GameContext ctx,
                                    string speakerId = "default_bot")
        {
            if (ws == null || ws.State != WebSocketState.Open)
            {
                OnError?.Invoke("WebSocket not connected.");
                return;
            }
            var req = new AudioRequest
            {
                @event = "audio_complete",
                audio_data = Convert.ToBase64String(wavBytes),
                speaker_id = speakerId,
                game_context = ctx,
            };
            string json = JsonUtility.ToJson(req);
            await ws.SendText(json);
        }

        // ───── Incoming: parse JSON, demultiplex by status ─────
        void HandleMessage(byte[] bytes)
        {
            string json = Encoding.UTF8.GetString(bytes);
            // Fast path: peek at status without full deserialize first.
            // JsonUtility doesn't support partial parsing, so just deserialize
            // into the union envelope and branch on `status`.
            var env = JsonUtility.FromJson<ServerEnvelope>(json);
            switch (env.status)
            {
                case "chunk":
                    byte[] audio = string.IsNullOrEmpty(env.audio_data)
                        ? null : Convert.FromBase64String(env.audio_data);
                    OnAudioChunk?.Invoke(env.index, env.text, audio, env.tts_timings);
                    break;

                case "done":
                    OnTranscript?.Invoke(env.full_text, env.timings);
                    break;

                case "error":
                    OnError?.Invoke(env.message);
                    break;
            }
        }

        // ───── DTOs (must match FastAPI JSON shape) ─────
        [Serializable]
        public class GameContext
        {
            public string phase = "نهار";
            public int day = 1;
            public List<PlayerInfo> alivePlayers = new();
        }

        [Serializable]
        public class PlayerInfo
        {
            public string name;
            public string role;
            public bool isBot;
        }

        [Serializable]
        class AudioRequest
        {
            public string @event;
            public string audio_data;
            public string speaker_id;
            public GameContext game_context;
        }

        [Serializable]
        public class TtsTimings
        {
            public bool cached;
            public float gen_s;
            public float wait_s;
        }

        [Serializable]
        public class ServerTimings
        {
            public float stt_s;
            public float llm_s;
            public float tts_total_gen_s;
            public float total_s;
        }

        [Serializable]
        class ServerEnvelope
        {
            public string status;
            // chunk fields:
            public int index;
            public string text;
            public string audio_data;
            public TtsTimings tts_timings;
            // done fields:
            public string full_text;
            public int sentence_count;
            public ServerTimings timings;
            // error fields:
            public string message;
        }
    }
}
