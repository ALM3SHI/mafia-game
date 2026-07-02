// Amplitude-driven lip sync.
//
// Pulls the live output amplitude from the AudioSource (RMS over 256 samples)
// and drives a target Transform's local Y scale OR a SkinnedMeshRenderer
// blendshape weight. No phoneme analysis — for a card game this is plenty
// convincing and costs ~zero CPU.
//
// Setup:
//   - Drop on the same GameObject as AudioPlaybackQueue OR target the
//     queue's AudioSource via the inspector.
//   - For a 2D card / sprite mouth: assign `mouthTransform`.
//   - For a 3D character with blendshapes: assign `mouthRenderer` + index.
using UnityEngine;

namespace MafiaAI
{
    public class LipSync : MonoBehaviour
    {
        [Header("Audio source to read")]
        public AudioSource source;

        [Header("Driver — pick one or both")]
        [Tooltip("Optional: a transform whose Y scale opens with amplitude.")]
        public Transform mouthTransform;
        public float mouthClosedScaleY = 0.1f;
        public float mouthOpenScaleY = 1.0f;

        [Tooltip("Optional: a SkinnedMeshRenderer with a 'mouthOpen' blendshape.")]
        public SkinnedMeshRenderer mouthRenderer;
        public int blendShapeIndex = 0;
        public float blendShapeMaxWeight = 100f;

        [Header("Tuning")]
        [Tooltip("Higher = more sensitive (smaller voices still open the mouth).")]
        public float gain = 6f;
        [Tooltip("Smoothing — lower = snappier, higher = softer.")]
        [Range(0f, 0.95f)] public float smoothing = 0.5f;

        readonly float[] sampleBuffer = new float[256];
        float currentLevel;

        void Awake()
        {
            if (source == null) source = GetComponent<AudioSource>();
        }

        void LateUpdate()
        {
            float target = 0f;
            if (source != null && source.isPlaying)
            {
                source.GetOutputData(sampleBuffer, 0);
                float sumSq = 0f;
                for (int i = 0; i < sampleBuffer.Length; i++)
                    sumSq += sampleBuffer[i] * sampleBuffer[i];
                float rms = Mathf.Sqrt(sumSq / sampleBuffer.Length);
                target = Mathf.Clamp01(rms * gain);
            }

            // Exponential smoothing — frame-rate independent.
            currentLevel = Mathf.Lerp(target, currentLevel, smoothing);

            if (mouthTransform != null)
            {
                var s = mouthTransform.localScale;
                s.y = Mathf.Lerp(mouthClosedScaleY, mouthOpenScaleY, currentLevel);
                mouthTransform.localScale = s;
            }

            if (mouthRenderer != null)
            {
                mouthRenderer.SetBlendShapeWeight(
                    blendShapeIndex, currentLevel * blendShapeMaxWeight);
            }
        }
    }
}
