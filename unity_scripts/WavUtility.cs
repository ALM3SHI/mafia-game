// Encode/decode WAV between byte[] (network/file) and Unity AudioClip (playback).
// Supports the only format we actually use: PCM16, mono, any sample rate.
// No external dependencies.
using System;
using System.IO;
using System.Text;
using UnityEngine;

namespace MafiaAI
{
    public static class WavUtility
    {
        // ───── ENCODE: float samples (Unity native) → WAV bytes for upload ─────
        public static byte[] FromFloatSamples(float[] samples, int sampleRate, int channels = 1)
        {
            if (samples == null || samples.Length == 0) return Array.Empty<byte>();

            int byteRate = sampleRate * channels * 2;
            int dataSize = samples.Length * 2;

            using var ms = new MemoryStream(44 + dataSize);
            using var bw = new BinaryWriter(ms);

            bw.Write(Encoding.ASCII.GetBytes("RIFF"));
            bw.Write(36 + dataSize);
            bw.Write(Encoding.ASCII.GetBytes("WAVE"));
            bw.Write(Encoding.ASCII.GetBytes("fmt "));
            bw.Write(16);                       // PCM chunk size
            bw.Write((short)1);                 // PCM format
            bw.Write((short)channels);
            bw.Write(sampleRate);
            bw.Write(byteRate);
            bw.Write((short)(channels * 2));    // block align
            bw.Write((short)16);                // bits per sample
            bw.Write(Encoding.ASCII.GetBytes("data"));
            bw.Write(dataSize);

            for (int i = 0; i < samples.Length; i++)
            {
                float clamped = Mathf.Clamp(samples[i], -1f, 1f);
                bw.Write((short)(clamped * short.MaxValue));
            }
            return ms.ToArray();
        }

        // ───── DECODE: WAV bytes (from server) → AudioClip for playback ─────
        public static AudioClip ToAudioClip(byte[] wavBytes, string clipName = "ttsClip")
        {
            if (wavBytes == null || wavBytes.Length < 44)
            {
                Debug.LogError("[WavUtility] Bytes too small to be WAV.");
                return null;
            }

            // Minimal RIFF/WAVE header walk — find "fmt " and "data" chunks.
            // Robust against extra LIST/JUNK chunks some encoders insert.
            int channels = BitConverter.ToInt16(wavBytes, 22);
            int sampleRate = BitConverter.ToInt32(wavBytes, 24);
            int bitsPerSample = BitConverter.ToInt16(wavBytes, 34);

            int dataOffset = FindChunkOffset(wavBytes, "data");
            if (dataOffset < 0)
            {
                Debug.LogError("[WavUtility] No 'data' chunk found.");
                return null;
            }
            int dataSize = BitConverter.ToInt32(wavBytes, dataOffset + 4);
            int dataStart = dataOffset + 8;

            float[] samples;
            if (bitsPerSample == 16)
            {
                int sampleCount = dataSize / 2;
                samples = new float[sampleCount];
                for (int i = 0; i < sampleCount; i++)
                {
                    short s = BitConverter.ToInt16(wavBytes, dataStart + i * 2);
                    samples[i] = s / 32768f;
                }
            }
            else if (bitsPerSample == 32)
            {
                int sampleCount = dataSize / 4;
                samples = new float[sampleCount];
                Buffer.BlockCopy(wavBytes, dataStart, samples, 0, dataSize);
            }
            else
            {
                Debug.LogError($"[WavUtility] Unsupported bits/sample: {bitsPerSample}");
                return null;
            }

            var clip = AudioClip.Create(clipName, samples.Length / channels, channels, sampleRate, false);
            clip.SetData(samples, 0);
            return clip;
        }

        static int FindChunkOffset(byte[] wav, string chunkId)
        {
            byte[] needle = Encoding.ASCII.GetBytes(chunkId);
            // Start search after RIFF header (12 bytes).
            for (int i = 12; i < wav.Length - 8; i++)
            {
                if (wav[i] == needle[0] && wav[i + 1] == needle[1]
                    && wav[i + 2] == needle[2] && wav[i + 3] == needle[3])
                    return i;
            }
            return -1;
        }
    }
}
