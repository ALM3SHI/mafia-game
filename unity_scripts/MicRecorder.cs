// Push-to-talk recorder.
// Hold the push-to-talk key (default R), speak, release → audio is encoded
// as 16 kHz mono WAV and pushed to AIBridgeClient.
//
// 16 kHz = Whisper's native sample rate. Higher rates waste bandwidth and
// CPU on the backend without quality gain.
using System.Linq;
using UnityEngine;

namespace MafiaAI
{
    [RequireComponent(typeof(AIBridgeClient))]
    public class MicRecorder : MonoBehaviour
    {
        [Header("Capture")]
        public KeyCode pushToTalkKey = KeyCode.R;
        [Tooltip("Whisper's native rate. Don't change unless you know why.")]
        public int sampleRate = 16000;
        [Tooltip("Hard cap so a stuck key can't allocate gigabytes of RAM.")]
        public int maxRecordSeconds = 15;
        [Tooltip("Empty = system default microphone.")]
        public string deviceName = null;

        [Header("Game context (sent with each request)")]
        public string speakerId = "default_bot";
        public AIBridgeClient.GameContext gameContext = new();

        AudioClip recordingClip;
        bool isRecording;
        AIBridgeClient bridge;

        void Awake()
        {
            bridge = GetComponent<AIBridgeClient>();
            if (Microphone.devices.Length == 0)
                Debug.LogError("[MicRecorder] No microphone detected.");
            else
                Debug.Log($"[MicRecorder] Using mic: {(string.IsNullOrEmpty(deviceName) ? Microphone.devices[0] : deviceName)}");
        }

        void Update()
        {
            if (Input.GetKeyDown(pushToTalkKey)) StartRecording();
            else if (Input.GetKeyUp(pushToTalkKey) && isRecording) StopAndSend();
        }

        void StartRecording()
        {
            if (isRecording) return;
            recordingClip = Microphone.Start(deviceName, false, maxRecordSeconds, sampleRate);
            isRecording = true;
            Debug.Log("[MicRecorder] Recording…");
        }

        async void StopAndSend()
        {
            if (!isRecording || recordingClip == null) return;

            // Capture how many samples were actually recorded BEFORE ending,
            // because Microphone.End() resets the position.
            int writtenSamples = Microphone.GetPosition(deviceName);
            Microphone.End(deviceName);
            isRecording = false;

            if (writtenSamples <= 0)
            {
                Debug.LogWarning("[MicRecorder] Empty recording — ignored.");
                return;
            }

            // Pull only the recorded portion (clip is allocated for max length).
            float[] samples = new float[writtenSamples * recordingClip.channels];
            recordingClip.GetData(samples, 0);

            // Down-mix to mono if the device captured stereo.
            float[] mono = recordingClip.channels == 1
                ? samples
                : DownmixToMono(samples, recordingClip.channels);

            byte[] wav = WavUtility.FromFloatSamples(mono, sampleRate, 1);
            Debug.Log($"[MicRecorder] Sending {wav.Length / 1024f:F1} KB ({writtenSamples / (float)sampleRate:F2}s).");

            await bridge.SendAudio(wav, gameContext, speakerId);
        }

        static float[] DownmixToMono(float[] interleaved, int channels)
        {
            int frames = interleaved.Length / channels;
            var mono = new float[frames];
            for (int i = 0; i < frames; i++)
            {
                float sum = 0f;
                for (int c = 0; c < channels; c++) sum += interleaved[i * channels + c];
                mono[i] = sum / channels;
            }
            return mono;
        }
    }
}
