// Plain ES module, no imports. Pure WebAudio 4-track jukebox.
//
// Each track is defined data-driven in TRACK_DEFS: a baseBPM, whatever
// pattern/chord data it needs, and a schedule(time, step, env) method that
// the single lookahead scheduler calls once per sixteenth-note "step".
// `step` is a monotonically increasing integer counter (reset whenever a
// track starts or is switched) so every track can derive its own bar/beat
// position from it at whatever subdivision it needs.

export const TRACKS = [
  { id: "heya", title: "部屋とくまとおしり" },
  { id: "sekkai", title: "石灰の終わり" },
  { id: "android", title: "ぴっちぴち・アンドロイド" },
  { id: "gedatsu", title: "解脱" },
];

// ---------------------------------------------------------------------
// Small stateless synth helpers shared by every track.
// ---------------------------------------------------------------------

// MIDI note number to Hz.
const noteToFreq = (note) => 440 * Math.pow(2, (note - 69) / 12);

// Build a buffer of white noise, reused (from time 0) for every noise hit,
// long or short — a one-shot source just stops sounding once its own
// envelope/stop() cuts it off, so one shared buffer covers hi-hats, kicks
// and slow ambient swells alike.
const NOISE_BUFFER_SECONDS = 8;
const makeNoiseBuffer = (audioContext) => {
  const len = Math.floor(audioContext.sampleRate * NOISE_BUFFER_SECONDS);
  const buffer = audioContext.createBuffer(1, len, audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
};

// Plain oscillator note with a quick exponential attack/decay envelope.
const playTone = (audioContext, dest, { type, freq, time, peak, attack = 0.005, release }) => {
  const osc = audioContext.createOscillator();
  const env = audioContext.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, time);
  env.gain.setValueAtTime(0.0001, time);
  env.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), time + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, time + attack + release);
  osc.connect(env);
  env.connect(dest);
  osc.start(time);
  osc.stop(time + attack + release + 0.05);
};

// Filtered noise burst (hi-hats, kicks, swells, airy pads).
const playNoise = (audioContext, buffer, dest, { time, filterType = "highpass", filterFreq = 4000, q = 1, peak = 0.05, attack = 0.001, release = 0.05 }) => {
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  const filter = audioContext.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.setValueAtTime(filterFreq, time);
  filter.Q.setValueAtTime(q, time);
  const env = audioContext.createGain();
  env.gain.setValueAtTime(0.0001, time);
  env.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), time + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, time + attack + release);
  source.connect(filter);
  filter.connect(env);
  env.connect(dest);
  source.start(time);
  source.stop(time + attack + release + 0.05);
};

// Lowpassed noise "thump" kick for four-on-the-floor techno.
const playKick = (audioContext, buffer, dest, { time, peak = 0.18 }) => {
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  const filter = audioContext.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(320, time);
  filter.frequency.exponentialRampToValueAtTime(45, time + 0.09);
  filter.Q.value = 1;
  const env = audioContext.createGain();
  env.gain.setValueAtTime(Math.max(peak, 0.0002), time);
  env.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
  source.connect(filter);
  filter.connect(env);
  env.connect(dest);
  source.start(time);
  source.stop(time + 0.15);
};

// Temple-bell tone: fundamental + inharmonic partials, long decay.
const playBell = (audioContext, dest, { time, freq, peak = 0.12, decay = 5 }) => {
  const partials = [1, 2.76, 5.4];
  const gains = [1, 0.35, 0.15];
  partials.forEach((mult, i) => {
    const osc = audioContext.createOscillator();
    const env = audioContext.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq * mult, time);
    const p = peak * gains[i];
    env.gain.setValueAtTime(0.0001, time);
    env.gain.exponentialRampToValueAtTime(Math.max(p, 0.0002), time + 0.015);
    env.gain.exponentialRampToValueAtTime(0.0001, time + decay);
    osc.connect(env);
    env.connect(dest);
    osc.start(time);
    osc.stop(time + decay + 0.1);
  });
};

// Long sine drone note, retriggered every cycle with generous overlap so
// it reads as continuous rather than pulsing.
const playDrone = (audioContext, dest, { time, freqs, dur, peak = 0.05 }) => {
  freqs.forEach((freq) => {
    const osc = audioContext.createOscillator();
    const env = audioContext.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, time);
    env.gain.setValueAtTime(0.0001, time);
    env.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), time + dur * 0.3);
    env.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(env);
    env.connect(dest);
    osc.start(time);
    osc.stop(time + dur + 0.1);
  });
};

// Pitch-bending "wow" blip (android's robotic flourish).
const playWowBlip = (audioContext, dest, { time, startFreq, endFreq, dur, peak = 0.06 }) => {
  const osc = audioContext.createOscillator();
  const env = audioContext.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(startFreq, time);
  osc.frequency.exponentialRampToValueAtTime(endFreq, time + dur);
  env.gain.setValueAtTime(0.0001, time);
  env.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), time + dur * 0.2);
  env.gain.exponentialRampToValueAtTime(0.0001, time + dur);
  osc.connect(env);
  env.connect(dest);
  osc.start(time);
  osc.stop(time + dur + 0.05);
};

// ---------------------------------------------------------------------
// Track definitions. All step indices are in sixteenth notes; 4 steps
// per beat, 16 steps per 4/4 bar.
// ---------------------------------------------------------------------

const TRACK_DEFS = {
  // --- 部屋とくまとおしり: the original cheerful office chiptune loop ---
  heya: {
    baseBPM: 84,
    tempoCap: 2.0,
    chordRoots: [60, 65, 62, 67], // C, F, Dm, G
    melodyPattern: [
      [64, null, 66, null, 68, null, 69, null],
      [72, null, 70, null, 68, null, 66, null],
      [69, null, 68, null, 66, null, 64, null],
      [72, null, 71, null, 69, null, 68, null],
      [64, null, 66, null, 68, null, 69, null],
      [72, null, 70, null, 68, null, 66, null],
      [70, null, 69, null, 68, null, 67, null],
      [66, null, 64, null, 65, null, 64, null],
    ],
    schedule(time, step, env) {
      const { audioContext, masterGain, noiseBuffer, intensity, stepLen } = env;

      // hi-hat on every eighth note
      if (step % 2 === 0) {
        playNoise(audioContext, noiseBuffer, masterGain, {
          time,
          filterType: "highpass",
          filterFreq: 8000,
          peak: 0.05 + intensity * 0.02,
          release: 0.05,
        });
      }

      // triangle bass on quarter notes
      if (step % 4 === 0) {
        const beatIndex = step / 4;
        const chordIndex = beatIndex % 4;
        const quarterLen = stepLen * 4;
        playTone(audioContext, masterGain, {
          type: "triangle",
          freq: noteToFreq(this.chordRoots[chordIndex]),
          time,
          peak: 0.05,
          attack: 0.005,
          release: quarterLen * 0.7,
        });
      }

      // square lead, 8-bar melody on eighth notes
      if (step % 2 === 0) {
        const eighthIndex = step / 2;
        const barInLoop = Math.floor(eighthIndex / 8) % 8;
        const eighthInBar = eighthIndex % 8;
        const note = this.melodyPattern[barInLoop][eighthInBar];
        if (note !== null) {
          const eighthLen = stepLen * 2;
          playTone(audioContext, masterGain, {
            type: "square",
            freq: noteToFreq(note),
            time,
            peak: 0.08,
            attack: 0.003,
            release: eighthLen * 0.8,
          });
        }
      }
    },
  },

  // --- 石灰の終わり: 疾走するガレージロック(オリジナルリフ) ---
  sekkai: {
    baseBPM: 155,
    tempoCap: 1.6,
    // Eマイナーのパワーコード進行(8小節、ルートのMIDIノート)
    riffRoots: [40, 40, 43, 45, 40, 40, 48, 47], // E E G A | E E C B
    // 2小節サイクルの合いの手フレーズ(8分音符×16、ペンタトニック)
    hookNotes: [
      null, null, null, null, 64, 67, 64, null,
      62, null, 64, null, 67, 64, 62, 59,
    ],
    schedule(time, step, env) {
      const { audioContext, masterGain, noiseBuffer, intensity, stepLen } = env;
      const eighthLen = stepLen * 2;

      if (step % 2 !== 0) return;
      const eighthIndex = step / 2;
      const inBar = eighthIndex % 8;
      const barInLoop = Math.floor(eighthIndex / 8) % 8;

      // ハット(全8分)+ 開放気味のアクセント
      playNoise(audioContext, noiseBuffer, masterGain, {
        time,
        filterType: "highpass",
        filterFreq: 9000,
        peak: (inBar % 2 === 0 ? 0.055 : 0.035) + intensity * 0.02,
        release: inBar === 7 ? 0.12 : 0.04,
      });
      // キック(1・3拍+3拍裏で前のめりに)
      if (inBar === 0 || inBar === 4 || inBar === 5) {
        playTone(audioContext, masterGain, {
          type: "sine", freq: 52, time,
          peak: 0.17, attack: 0.002, release: 0.1,
        });
        playNoise(audioContext, noiseBuffer, masterGain, {
          time, filterType: "lowpass", filterFreq: 140,
          peak: 0.1, release: 0.07,
        });
      }
      // スネア(2・4拍)
      if (inBar === 2 || inBar === 6) {
        playNoise(audioContext, noiseBuffer, masterGain, {
          time, filterType: "bandpass", filterFreq: 1900, q: 0.9,
          peak: 0.13, release: 0.13,
        });
      }
      // パワーコードの刻み(ルート+5度のノコギリ波、小節頭はアクセント)
      const root = this.riffRoots[barInLoop];
      const accent = inBar === 0;
      for (const semi of [0, 7]) {
        playTone(audioContext, masterGain, {
          type: "sawtooth",
          freq: noteToFreq(root + semi),
          time,
          peak: accent ? 0.08 : 0.055,
          attack: 0.002,
          release: accent ? eighthLen * 0.95 : eighthLen * 0.45,
        });
      }
      // 合いの手リフ(2小節サイクル)
      const hook = this.hookNotes[eighthIndex % 16];
      if (hook !== null) {
        playTone(audioContext, masterGain, {
          type: "square",
          freq: noteToFreq(hook + 12),
          time,
          peak: 0.06 + intensity * 0.02,
          attack: 0.002,
          release: eighthLen * 0.7,
        });
      }
    },
  },

  // --- ぴっちぴち・アンドロイド: hyper techno-pop ---
  android: {
    baseBPM: 132,
    tempoCap: 2.0,
    // Em - C - D - B7(ish), 4 arpeggio tones per chord
    chordArp: [
      [64, 67, 71, 76], // Em: E4 G4 B4 E5
      [60, 64, 67, 72], // C:  C4 E4 G4 C5
      [62, 66, 69, 74], // D:  D4 F#4 A4 D5
      [59, 63, 66, 69], // B7: B3 D#4 F#4 A4
    ],
    leadPattern: [
      [76, null, 79, null, 76, null, 74, null],
      [72, null, 76, null, 79, null, 76, null],
      [74, null, 78, null, 81, null, 78, null],
      [71, null, 75, null, 78, null, null, 83],
    ],
    schedule(time, step, env) {
      const { audioContext, masterGain, noiseBuffer, intensity, stepLen } = env;

      // driving 16th-note square arpeggio, chord changes every bar
      const barIndex = Math.floor(step / 16) % 4;
      const stepInBar = step % 16;
      const arpNote = this.chordArp[barIndex][stepInBar % 4];
      playTone(audioContext, masterGain, {
        type: "square",
        freq: noteToFreq(arpNote),
        time,
        peak: 0.05,
        attack: 0.002,
        release: stepLen * 0.55,
      });

      // four-on-the-floor lowpassed noise kick
      if (step % 4 === 0) {
        playKick(audioContext, noiseBuffer, masterGain, {
          time,
          peak: 0.16 + intensity * 0.03,
        });
      }

      // bright hats on the eighth-note offbeat
      if (step % 4 === 2) {
        playNoise(audioContext, noiseBuffer, masterGain, {
          time,
          filterType: "highpass",
          filterFreq: 9500,
          peak: 0.045 + intensity * 0.015,
          release: 0.04,
        });
      }

      // robotic staccato square lead, eighth notes over a 4-bar phrase
      if (step % 2 === 0) {
        const eighthIndex = step / 2;
        const barInLoop = Math.floor(eighthIndex / 8) % 4;
        const eighthInBar = eighthIndex % 8;
        const note = this.leadPattern[barInLoop][eighthInBar];
        if (note !== null) {
          const eighthLen = stepLen * 2;
          playTone(audioContext, masterGain, {
            type: "square",
            freq: noteToFreq(note),
            time,
            peak: 0.09,
            attack: 0.002,
            release: eighthLen * 0.4,
          });
          // occasional octave-jump flourish
          if (barInLoop === 1 && eighthInBar === 4) {
            playTone(audioContext, masterGain, {
              type: "square",
              freq: noteToFreq(note - 12),
              time,
              peak: 0.06,
              attack: 0.002,
              release: eighthLen * 0.4,
            });
          }
        }
      }

      // pitch-bend "wow" blip every 4 bars
      if (step % 64 === 0) {
        playWowBlip(audioContext, masterGain, {
          time,
          startFreq: noteToFreq(84),
          endFreq: noteToFreq(96),
          dur: stepLen * 3,
          peak: 0.06,
        });
      }
    },
  },

  // --- 解脱: zen ambient ---
  gedatsu: {
    baseBPM: 45,
    tempoCap: 1.3, // intensity should not rush this track
    droneFreqs: [noteToFreq(33), noteToFreq(40)], // A1, E2
    bellFreq: noteToFreq(76), // E5
    schedule(time, step, env) {
      const { audioContext, masterGain, noiseBuffer, intensity, stepLen } = env;
      const cycleSteps = 32; // 8 beats
      const stepInCycle = step % cycleSteps;
      const cycleLen = stepLen * cycleSteps;

      // deep sine drone, always sounding: retrigger once per cycle with
      // generous overlap so the note never fully decays before the next
      if (stepInCycle === 0) {
        playDrone(audioContext, masterGain, {
          time,
          freqs: this.droneFreqs,
          dur: cycleLen * 1.08,
          peak: 0.05,
        });
      }

      // temple bell on beats 1 and 7; intensity adds a couple more hits
      const bellSteps = [0, 24];
      if (intensity > 0.33) bellSteps.push(12);
      if (intensity > 0.66) bellSteps.push(20);
      if (bellSteps.includes(stepInCycle)) {
        playBell(audioContext, masterGain, {
          time,
          freq: this.bellFreq,
          peak: 0.12,
          decay: 5.5,
        });
      }

      // faint airy noise-pad swell once per cycle
      if (stepInCycle === 16) {
        playNoise(audioContext, noiseBuffer, masterGain, {
          time,
          filterType: "highpass",
          filterFreq: 3200,
          q: 0.6,
          peak: 0.02,
          attack: cycleLen * 0.3,
          release: cycleLen * 0.35,
        });
      }
    },
  },
};

// ---------------------------------------------------------------------
// Jukebox: single lookahead scheduler shared by all tracks.
// ---------------------------------------------------------------------

export function createBGM() {
  let audioContext = null;
  let isPlaying = false;
  let schedulerID = null;
  let nextEventTime = 0;
  let intensity = 0;
  let currentTrackId = TRACKS[0].id; // "heya"
  let stepCounter = 0;

  const scheduleAheadTime = 0.1; // 100ms lookahead
  const lookAhead = 25; // 25ms scheduler interval

  let masterGain = null;
  let noiseBuffer = null;

  const getTempoMultiplier = () => {
    const cap = TRACK_DEFS[currentTrackId].tempoCap ?? 2.0;
    return 1.0 + intensity * (cap - 1.0);
  };

  // step length = one sixteenth note at the track's current effective tempo
  const getStepLength = () => {
    const bpm = TRACK_DEFS[currentTrackId].baseBPM;
    const beatLen = 60 / bpm / getTempoMultiplier();
    return beatLen / 4;
  };

  // Main scheduler: runs every ~25ms, schedules events 100ms ahead.
  const scheduler = () => {
    if (!isPlaying || !audioContext) return;

    const endTime = audioContext.currentTime + scheduleAheadTime;
    const stepLen = getStepLength();
    const def = TRACK_DEFS[currentTrackId];

    while (nextEventTime < endTime) {
      def.schedule(nextEventTime, stepCounter, {
        audioContext,
        masterGain,
        noiseBuffer,
        intensity,
        stepLen,
      });
      stepCounter++;
      nextEventTime += stepLen;
    }
  };

  const start = () => {
    // Create or get audio context (must happen inside a user gesture)
    if (audioContext === null) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    // Resume if suspended (after user gesture)
    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    // Create master gain once
    if (masterGain === null) {
      masterGain = audioContext.createGain();
      masterGain.gain.value = 0.15; // moderate volume, sits under sound effects
      masterGain.connect(audioContext.destination);
    }

    // Create shared noise buffer once
    if (noiseBuffer === null) {
      noiseBuffer = makeNoiseBuffer(audioContext);
    }

    // Already playing, avoid double-start
    if (isPlaying) return;

    isPlaying = true;
    stepCounter = 0;
    nextEventTime = audioContext.currentTime;
    schedulerID = setInterval(scheduler, lookAhead);
  };

  const stop = () => {
    isPlaying = false;
    if (schedulerID) {
      clearInterval(schedulerID);
      schedulerID = null;
    }
  };

  const setIntensity = (p) => {
    intensity = Math.max(0, Math.min(1, p));
    // Subtle gain increase: 0.15 to ~0.18 at p=1, on top of tempo scaling
    // that each track already reads per-note via getStepLength/intensity.
    if (masterGain) {
      masterGain.gain.value = 0.15 + intensity * 0.03;
    }
  };

  const setTrack = (id) => {
    if (!TRACK_DEFS[id] || id === currentTrackId) return;

    currentTrackId = id;
    stepCounter = 0; // reset pattern position for the new track

    if (isPlaying && audioContext && masterGain) {
      const now = audioContext.currentTime;
      const targetGain = 0.15 + intensity * 0.03;
      // brief fade to mask the switch, then continue scheduling cleanly
      masterGain.gain.cancelScheduledValues(now);
      masterGain.gain.setValueAtTime(masterGain.gain.value, now);
      masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.05);
      masterGain.gain.linearRampToValueAtTime(targetGain, now + 0.15);
      nextEventTime = now + 0.05;
    }
  };

  return {
    start,
    stop,
    setIntensity,
    setTrack,
    get playing() {
      return isPlaying;
    },
    get track() {
      return currentTrackId;
    },
  };
}
