// src/components/AudioRecognizer.jsx
import React, { useEffect, useState } from "react";
import * as speechCommands from "@tensorflow-models/speech-commands";

const MODEL_URL = "https://teachablemachine.withgoogle.com/models/fhXLV0zlP/"; // ←差し替え！

export default function AudioRecognizer() {
  const [label, setLabel] = useState("-");
  const [volume, setVolume] = useState(0);
  const [recognizer, setRecognizer] = useState(null);

  const VOLUME_THRESHOLD = 0.05;

  useEffect(() => {
    const loadModel = async () => {
      const recog = speechCommands.create(
        "BROWSER_FFT",
        undefined,
        MODEL_URL + "model.json",
        MODEL_URL + "metadata.json"
      );
      await recog.ensureModelLoaded();
      setRecognizer(recog);
    };
    loadModel();
  }, []);

  useEffect(() => {
    if (!recognizer) return;

    const startMic = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const mic = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      const buffer = new Uint8Array(analyser.fftSize);

      mic.connect(analyser);

      const checkVolume = () => {
        analyser.getByteTimeDomainData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          const val = (buffer[i] - 128) / 128;
          sum += val * val;
        }
        const rms = Math.sqrt(sum / buffer.length);
        setVolume(rms);

        if (rms > VOLUME_THRESHOLD && !recognizer.isListening()) {
          recognizer.listen(result => {
            const scores = result.scores;
            const labels = recognizer.wordLabels();
            const maxIndex = scores.indexOf(Math.max(...scores));
            setLabel(`${labels[maxIndex]} (${(scores[maxIndex] * 100).toFixed(1)}%)`);
          }, {
            probabilityThreshold: 0.75,
            includeSpectrogram: false,
            overlapFactor: 0.5,
          });

          setTimeout(() => recognizer.stopListening(), 1000);
        }

        requestAnimationFrame(checkVolume);
      };

      checkVolume();
    };

    startMic();
  }, [recognizer]);

  return (
    <div style={{ fontFamily: "sans-serif", padding: "1rem" }}>
      <h2>🎤 音声認識（音量フィルター付き）</h2>
      <p>音量: {volume.toFixed(3)}</p>
      <p>認識結果: {label}</p>
    </div>
  );
}
