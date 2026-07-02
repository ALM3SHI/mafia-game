// Plays sentence-level audio chunks in order, with no gap between them.
//
// Subscribes to AIBridgeClient.OnAudioChunk. As soon as the first chunk
// arrives it starts playing — subsequent chunks are queued and chained
// the moment the previous one finishes. This is how we hide the per-
// sentence TTS latency from the player: by the time chunk 1 finishes
// playing (~3-5s of audio), chunk 2 has already been generated and is
// ready to start.
using System.Collections.Generic;
using UnityEngine;

namespace MafiaAI
{
    [RequireComponent(typeof(AudioSource))]
    public class AudioPlaybackQueue : MonoBehaviour
    {
        AudioSource source;
        readonly Queue<AudioClip> queue = new();

        // Useful for LipSync to know when the bot is currently speaking.
        public bool IsSpeaking => source != null && source.isPlaying;
        public AudioSource Source => source;

        void Awake()
        {
            source = GetComponent<AudioSource>();
            source.playOnAwake = false;
            source.loop = false;
            source.spatialBlend = 0f;  // 2D — UI bot reply, no positional audio
        }

        void OnEnable()
        {
            if (AIBridgeClient.Instance != null)
                AIBridgeClient.Instance.OnAudioChunk += HandleChunk;
        }

        void OnDisable()
        {
            if (AIBridgeClient.Instance != null)
                AIBridgeClient.Instance.OnAudioChunk -= HandleChunk;
        }

        void HandleChunk(int index, string text, byte[] wavBytes, AIBridgeClient.TtsTimings timings)
        {
            if (wavBytes == null || wavBytes.Length == 0)
            {
                Debug.LogWarning($"[AudioQueue] Chunk {index} arrived without audio (text-only).");
                return;
            }
            var clip = WavUtility.ToAudioClip(wavBytes, $"chunk_{index}");
            if (clip == null) return;

            queue.Enqueue(clip);
            Debug.Log($"[AudioQueue] +chunk {index}: \"{text}\" (gen {timings.gen_s:F2}s, queued: {queue.Count})");
        }

        void Update()
        {
            if (!source.isPlaying && queue.Count > 0)
            {
                source.clip = queue.Dequeue();
                source.Play();
            }
        }

        public void StopAndClear()
        {
            source.Stop();
            queue.Clear();
        }
    }
}
