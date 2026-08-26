export type AudioBus = {
  unlock: () => void;
  setMuted: (m: boolean) => void;
  update: (speedNorm: number, boostAmt: number, jumpAmt: number) => void;
  fireEngage: (pitch: number) => void;
  fireDrop: (pitch: number) => void;
  fireBoost: () => void;
  dispose: () => void;
};



export function createAudio(): AudioBus {
  let audioCtx: AudioContext | null = null;
  let masterGain: GainNode | null = null;
  let fxBus: GainNode | null = null;
  let engOsc: OscillatorNode | null = null;
  let engOsc2: OscillatorNode | null = null;
  let engGain: GainNode | null = null;
  let engGain2: GainNode | null = null;
  let cruiseFilt: BiquadFilterNode | null = null;
  let cruiseGain: GainNode | null = null;
  let tunnelOsc: OscillatorNode | null = null;
  let tunnelOsc2: OscillatorNode | null = null;
  let tunnelGain: GainNode | null = null;
  let tunnelGain2: GainNode | null = null;
  let chargeOsc: OscillatorNode | null = null;
  let chargeGain: GainNode | null = null;
  let airFilt: BiquadFilterNode | null = null;
  let airGain: GainNode | null = null;
  let muted = false;
  const oscillators: OscillatorNode[] = [];
  const sources: AudioBufferSourceNode[] = [];

  function makeBrown(sr: number, secs: number) {
    const buf = audioCtx!.createBuffer(1, Math.floor(sr * secs), sr);
    const d = buf.getChannelData(0);
    let n = 0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      n = (n + 0.02 * w) / 1.02;
      d[i] = n * 3.5;
    }
    return buf;
  }

  function unlock() {
    if (!audioCtx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtx = new AC({ latencyHint: "interactive" });
      masterGain = audioCtx.createGain();
      masterGain.gain.value = 0;
      masterGain.connect(audioCtx.destination);

      fxBus = audioCtx.createGain();
      fxBus.gain.value = 1;
      fxBus.connect(masterGain);

      engOsc = audioCtx.createOscillator();
      engOsc.type = "sine";
      engOsc.frequency.value = 36;
      engGain = audioCtx.createGain();
      engGain.gain.value = 0.16;
      const engLp = audioCtx.createBiquadFilter();
      engLp.type = "lowpass";
      engLp.frequency.value = 140;
      engOsc.connect(engGain);
      engGain.connect(engLp);
      engLp.connect(masterGain);

      engOsc2 = audioCtx.createOscillator();
      engOsc2.type = "triangle";
      engOsc2.frequency.value = 72;
      engGain2 = audioCtx.createGain();
      engGain2.gain.value = 0.04;
      const engLp2 = audioCtx.createBiquadFilter();
      engLp2.type = "lowpass";
      engLp2.frequency.value = 320;
      engOsc2.connect(engGain2);
      engGain2.connect(engLp2);
      engLp2.connect(masterGain);

      const brown = makeBrown(audioCtx.sampleRate, 2.5);
      const nSrc = audioCtx.createBufferSource();
      nSrc.buffer = brown;
      nSrc.loop = true;
      cruiseFilt = audioCtx.createBiquadFilter();
      cruiseFilt.type = "bandpass";
      cruiseFilt.frequency.value = 220;
      cruiseFilt.Q.value = 0.55;
      cruiseGain = audioCtx.createGain();
      cruiseGain.gain.value = 0.12;
      nSrc.connect(cruiseFilt);
      cruiseFilt.connect(cruiseGain);
      cruiseGain.connect(masterGain);

      const nSrc2 = audioCtx.createBufferSource();
      nSrc2.buffer = brown;
      nSrc2.loop = true;
      airFilt = audioCtx.createBiquadFilter();
      airFilt.type = "highpass";
      airFilt.frequency.value = 1800;
      airGain = audioCtx.createGain();
      airGain.gain.value = 0.025;
      nSrc2.connect(airFilt);
      airFilt.connect(airGain);
      airGain.connect(masterGain);

      tunnelOsc = audioCtx.createOscillator();
      tunnelOsc.type = "sine";
      tunnelOsc.frequency.value = 55;
      tunnelGain = audioCtx.createGain();
      tunnelGain.gain.value = 0;
      const tLp = audioCtx.createBiquadFilter();
      tLp.type = "lowpass";
      tLp.frequency.value = 400;
      tunnelOsc.connect(tunnelGain);
      tunnelGain.connect(tLp);
      tLp.connect(masterGain);

      tunnelOsc2 = audioCtx.createOscillator();
      tunnelOsc2.type = "sawtooth";
      tunnelOsc2.frequency.value = 110;
      tunnelGain2 = audioCtx.createGain();
      tunnelGain2.gain.value = 0;
      const tBp = audioCtx.createBiquadFilter();
      tBp.type = "bandpass";
      tBp.frequency.value = 480;
      tBp.Q.value = 2.2;
      tunnelOsc2.connect(tunnelGain2);
      tunnelGain2.connect(tBp);
      tBp.connect(masterGain);

      chargeOsc = audioCtx.createOscillator();
      chargeOsc.type = "sine";
      chargeOsc.frequency.value = 180;
      chargeGain = audioCtx.createGain();
      chargeGain.gain.value = 0;
      chargeOsc.connect(chargeGain);
      chargeGain.connect(masterGain);

      oscillators.push(engOsc, engOsc2, tunnelOsc, tunnelOsc2, chargeOsc);
      sources.push(nSrc, nSrc2);
      engOsc.start();
      engOsc2.start();
      nSrc.start();
      nSrc2.start();
      tunnelOsc.start();
      tunnelOsc2.start();
      chargeOsc.start();
    }
    if (audioCtx.state === "suspended") void audioCtx.resume();
  }

  function setMuted(m: boolean) {
    muted = m;
  }

  function fireEngage(pitch: number) {
    if (!audioCtx || !fxBus || muted) return;
    const now = audioCtx.currentTime;
    const sr = audioCtx.sampleRate;
    [0, 0.12, 0.24].forEach((tOff, i) => {
      const o = audioCtx!.createOscillator();
      o.type = "sine";
      o.frequency.value = (220 + i * 160) * pitch;
      const g = audioCtx!.createGain();
      g.gain.value = 0.0001;
      o.connect(g);
      g.connect(fxBus!);
      const t0 = now + tOff;
      g.gain.exponentialRampToValueAtTime(0.12 - i * 0.02, t0 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
      o.frequency.linearRampToValueAtTime((320 + i * 200) * pitch, t0 + 0.16);
      o.start(t0);
      o.stop(t0 + 0.2);
    });
    const len = Math.floor(sr * 0.9);
    const buf = audioCtx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    let n = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      n = (n + 0.025 * w) / 1.025;
      d[i] = n * 3.2 * Math.sin((i / len) * Math.PI);
    }
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    const bp = audioCtx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 180;
    bp.Q.value = 0.8;
    const g = audioCtx.createGain();
    g.gain.value = 0.28;
    src.connect(bp);
    bp.connect(g);
    g.connect(fxBus);
    bp.frequency.linearRampToValueAtTime(900, now + 0.55);
    g.gain.setValueAtTime(0.001, now);
    g.gain.exponentialRampToValueAtTime(0.32, now + 0.12);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
    src.start(now);
    src.stop(now + 0.9);
    const sub = audioCtx.createOscillator();
    sub.type = "sine";
    sub.frequency.value = 48 * pitch;
    const sg = audioCtx.createGain();
    sg.gain.value = 0.0001;
    sub.connect(sg);
    sg.connect(fxBus);
    sg.gain.exponentialRampToValueAtTime(0.35, now + 0.05);
    sg.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
    sub.frequency.exponentialRampToValueAtTime(28 * pitch, now + 0.5);
    sub.start(now);
    sub.stop(now + 0.55);
  }

  function fireDrop(pitch: number) {
    if (!audioCtx || !fxBus || muted) return;
    const now = audioCtx.currentTime;
    const sr = audioCtx.sampleRate;
    const len = Math.floor(sr * 0.45);
    const buf = audioCtx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    let n = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      n = (n + 0.04 * w) / 1.04;
      d[i] = n * 4 * Math.exp(-i / (sr * 0.1));
    }
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    const lp = audioCtx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 1200;
    const g = audioCtx.createGain();
    g.gain.value = 0.3;
    src.connect(lp);
    lp.connect(g);
    g.connect(fxBus);
    lp.frequency.exponentialRampToValueAtTime(200, now + 0.35);
    src.start(now);
    src.stop(now + 0.45);
    const o = audioCtx.createOscillator();
    o.type = "triangle";
    o.frequency.value = 420 * pitch;
    const og = audioCtx.createGain();
    og.gain.value = 0.0001;
    o.connect(og);
    og.connect(fxBus);
    og.gain.exponentialRampToValueAtTime(0.1, now + 0.02);
    og.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
    o.frequency.exponentialRampToValueAtTime(90 * pitch, now + 0.38);
    o.start(now);
    o.stop(now + 0.42);
  }

  function fireBoost() {
    if (!audioCtx || !fxBus || muted) return;
    const now = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    o.type = "sine";
    o.frequency.value = 90;
    const g = audioCtx.createGain();
    g.gain.value = 0.0001;
    o.connect(g);
    g.connect(fxBus);
    g.gain.exponentialRampToValueAtTime(0.12, now + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    o.frequency.exponentialRampToValueAtTime(140, now + 0.22);
    o.start(now);
    o.stop(now + 0.3);
  }

  function update(speedNorm: number, boostAmt: number, jumpAmt: number) {
    if (!audioCtx || !masterGain) return;
    if (audioCtx.state === "suspended") void audioCtx.resume();
    const now = audioCtx.currentTime;
    const live = muted ? 0 : 1;
    const amp = 0.03 + speedNorm * 0.09 + boostAmt * 0.05 + jumpAmt * 0.1;
    masterGain.gain.setTargetAtTime(live * amp, now, 0.08);
    engOsc?.frequency.setTargetAtTime(32 + speedNorm * 40 + boostAmt * 22, now, 0.12);
    engOsc2?.frequency.setTargetAtTime(64 + speedNorm * 70 + boostAmt * 36, now, 0.12);
    engGain?.gain.setTargetAtTime(0.12 + speedNorm * 0.08 + boostAmt * 0.05, now, 0.1);
    engGain2?.gain.setTargetAtTime(0.03 + speedNorm * 0.04, now, 0.1);
    cruiseFilt?.frequency.setTargetAtTime(160 + speedNorm * 500 + boostAmt * 280, now, 0.1);
    cruiseGain?.gain.setTargetAtTime(0.08 + speedNorm * 0.12 + boostAmt * 0.08, now, 0.1);
    airFilt?.frequency.setTargetAtTime(1400 + speedNorm * 1600 + boostAmt * 900, now, 0.1);
    airGain?.gain.setTargetAtTime(0.015 + speedNorm * 0.05 + boostAmt * 0.05, now, 0.1);
    tunnelOsc?.frequency.setTargetAtTime(48 + jumpAmt * 70 + speedNorm * 20, now, 0.15);
    tunnelOsc2?.frequency.setTargetAtTime(95 + jumpAmt * 180 + speedNorm * 40, now, 0.12);
    tunnelGain?.gain.setTargetAtTime(jumpAmt * 0.14, now, 0.12);
    tunnelGain2?.gain.setTargetAtTime(jumpAmt * 0.055, now, 0.12);
    const charge = jumpAmt > 0.02 && jumpAmt < 0.85 ? 1 - Math.abs(jumpAmt - 0.4) / 0.45 : 0;
    chargeOsc?.frequency.setTargetAtTime(160 + jumpAmt * 520, now, 0.08);
    chargeGain?.gain.setTargetAtTime(Math.max(0, charge) * 0.07, now, 0.06);
  }

  function dispose() {
    try {
      oscillators.forEach((o) => {
        try { o.stop(); } catch { /* already stopped */ }
      });
      sources.forEach((s) => {
        try { s.stop(); } catch { /* already stopped */ }
      });
      void audioCtx?.close();
    } catch {
      /* ignore */
    }
    audioCtx = null;
  }

  return { unlock, setMuted, update, fireEngage, fireDrop, fireBoost, dispose };
}


