export function createBGM() {
  let audioContext = null;
  let isPlaying = false;
  let schedulerID = null;
  let nextEventTime = 0;
  let intensity = 0;

  const scheduleAheadTime = 0.1; // 100ms lookahead
  const lookAhead = 25; // 25ms scheduler interval
  const baseBPM = 84; // 最初はゆっくり、ポイントが貯まるほど加速
  const eighthNoteLength = (60 / baseBPM) / 2; // Eighth note in seconds

  let masterGain = null;
  let hiHatBuffer = null;

  // Tempo multiplier from intensity: 84BPM at p=0 to ~168BPM at p=1
  const getTempoMultiplier = () => 1.0 + intensity * 1.0;
  const getEighthLength = () => eighthNoteLength / getTempoMultiplier();

  // MIDI note to Hz
  const noteToFreq = (note) => 440 * Math.pow(2, (note - 69) / 12);

  // Create filtered noise buffer for hi-hats
  const createHiHatBuffer = () => {
    const len = Math.floor(audioContext.sampleRate * 0.05);
    const buffer = audioContext.createBuffer(1, len, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  };

  // Chord progression: C, F, Dm, G (MIDI root notes)
  const chordRoots = [60, 65, 62, 67];

  // 8-bar lead melody (MIDI notes, nulls are rests)
  const melodyPattern = [
    [64, null, 66, null, 68, null, 69, null], // Bar 1: C major scale up
    [72, null, 70, null, 68, null, 66, null], // Bar 2: descending arpeggio
    [69, null, 68, null, 66, null, 64, null], // Bar 3: pentatonic
    [72, null, 71, null, 69, null, 68, null], // Bar 4: jump and fall
    [64, null, 66, null, 68, null, 69, null], // Bar 5: repeat
    [72, null, 70, null, 68, null, 66, null], // Bar 6: repeat
    [70, null, 69, null, 68, null, 67, null], // Bar 7: riff
    [66, null, 64, null, 65, null, 64, null], // Bar 8: cadence
  ];

  // Schedule triangle-wave bass note (quarter notes only, i.e., every 2 eighths)
  const scheduleBass = (time, eighthIndex) => {
    if (eighthIndex % 2 !== 0) return; // Only on quarter notes

    const beatIndex = Math.floor(eighthIndex / 2);
    const chordIndex = beatIndex % 4; // Chord changes every bar (4 beats)
    const freq = noteToFreq(chordRoots[chordIndex]);

    const osc = audioContext.createOscillator();
    const env = audioContext.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    const quarterLen = getEighthLength() * 2;
    env.gain.setValueAtTime(0.05, time);
    env.gain.exponentialRampToValueAtTime(0.01, time + quarterLen * 0.7);

    osc.connect(env);
    env.connect(masterGain);

    osc.start(time);
    osc.stop(time + quarterLen * 0.85);
  };

  // Schedule square-wave lead note (eighth notes with rests)
  const scheduleLead = (time, eighthIndex) => {
    const barInLoop = Math.floor(eighthIndex / 8) % 8;
    const eighthInBar = eighthIndex % 8;

    const note = melodyPattern[barInLoop][eighthInBar];
    if (note === null) return; // Rest

    const osc = audioContext.createOscillator();
    const env = audioContext.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(noteToFreq(note), time);

    const eighthLen = getEighthLength();
    env.gain.setValueAtTime(0.08, time);
    env.gain.exponentialRampToValueAtTime(0.01, time + eighthLen * 0.8);

    osc.connect(env);
    env.connect(masterGain);

    osc.start(time);
    osc.stop(time + eighthLen * 0.95);
  };

  // Schedule high-pass filtered noise hi-hat tick (eighth notes)
  const scheduleHiHat = (time) => {
    const source = audioContext.createBufferSource();
    source.buffer = hiHatBuffer;

    const env = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();

    filter.type = 'highpass';
    filter.frequency.setValueAtTime(8000, time);

    // Subtle gain increase with intensity
    const baseGain = 0.05 + intensity * 0.02;
    env.gain.setValueAtTime(baseGain, time);
    env.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    source.connect(filter);
    filter.connect(env);
    env.connect(masterGain);

    source.start(time);
  };

  // Main scheduler: runs every ~25ms, schedules events 100ms ahead
  const scheduler = () => {
    if (!isPlaying || !audioContext) return;

    const currentTime = audioContext.currentTime;
    const endTime = currentTime + scheduleAheadTime;
    const eighthLen = getEighthLength();

    while (nextEventTime < endTime) {
      const eighthIndex = Math.round(nextEventTime / eighthLen);

      scheduleBass(nextEventTime, eighthIndex);
      scheduleLead(nextEventTime, eighthIndex);
      scheduleHiHat(nextEventTime);

      nextEventTime += eighthLen;
    }
  };

  const start = () => {
    // Create or get audio context
    if (audioContext === null) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    // Resume if suspended (after user gesture)
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    // Create master gain once
    if (masterGain === null) {
      masterGain = audioContext.createGain();
      masterGain.gain.value = 0.15; // Moderate volume, sits under sound effects
      masterGain.connect(audioContext.destination);
    }

    // Create hi-hat buffer once
    if (hiHatBuffer === null) {
      hiHatBuffer = createHiHatBuffer();
    }

    // Already playing, avoid double-start
    if (isPlaying) return;

    isPlaying = true;
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
    // Tempo multiplier applies to newly-scheduled notes
    // Subtle gain increase: 0.15 to ~0.18 at p=1
    if (masterGain) {
      masterGain.gain.value = 0.15 + intensity * 0.03;
    }
  };

  return {
    start,
    stop,
    setIntensity,
    get playing() {
      return isPlaying;
    }
  };
}
