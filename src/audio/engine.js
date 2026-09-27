import { settings } from '../core/settings.js'
import { Samples } from './samples.js'

export const Sound = (() => {
      let ac;
      let bus;
      let master;
      let compressor;
      let reverb;
      let wet;
      let white;
      let pink;
      let ambient = null;
      let unlocking = null;
      let error = "";
      const voices = new Set();

      function buffer(seconds, colored = false) {
        const result = ac.createBuffer(1, Math.ceil(ac.sampleRate * seconds), ac.sampleRate);
        const data = result.getChannelData(0);
        let b0 = 0;
        let b1 = 0;
        let b2 = 0;

        for (let i = 0; i < data.length; i++) {
          const n = Math.random() * 2 - 1;
          b0 = 0.99765 * b0 + n * 0.099046;
          b1 = 0.963 * b1 + n * 0.2965164;
          b2 = 0.57 * b2 + n * 1.0526913;
          data[i] = colored ? (b0 + b1 + b2 + n * 0.1848) * 0.15 : n;
        }

        return result;
      }

      function create() {
        if (ac) return;
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) throw new Error("이 브라우저는 Web Audio를 지원하지 않습니다.");
        ac = new AC();

        bus = ac.createGain();
        master = ac.createGain();
        compressor = ac.createDynamicsCompressor();
        reverb = ac.createConvolver();
        wet = ac.createGain();

        const impulse = buffer(1.4);
        const data = impulse.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
          data[i] *= Math.pow(1 - i / data.length, 3.6);
        }
        reverb.buffer = impulse;
        wet.gain.value = 0.19;

        compressor.threshold.value = -17;
        compressor.knee.value = 12;
        compressor.ratio.value = 5;
        compressor.attack.value = 0.002;
        compressor.release.value = 0.18;

        bus.connect(compressor);
        reverb.connect(wet);
        wet.connect(compressor);
        compressor.connect(master);
        master.connect(ac.destination);

        white = buffer(5);
        pink = buffer(7, true);
        updateVolume();
      }

      async function unlock() {
        if (document.hidden) return false;
        if (unlocking) return unlocking;

        unlocking = (async () => {
          try {
            create();
            if (ac.state !== "running") await ac.resume();
            if (ac.state !== "running") return false;
            error = "";
            ambience();
            return true;
          } catch (e) {
            error = e.message;
            return false;
          }
        })();

        try {
          return await unlocking;
        } finally {
          unlocking = null;
        }
      }

      function updateVolume() {
        if (!ac) return;
        master.gain.setTargetAtTime(
          settings.muted ? 0 : settings.volume / 100 * 0.6,
          ac.currentTime,
          0.025
        );
      }

      function attach(source, nodes, output, room = 0) {
        output.connect(bus);
        if (room > 0) {
          const send = ac.createGain();
          send.gain.value = room;
          output.connect(send);
          send.connect(reverb);
          nodes.push(send);
        }

        const voice = { source, nodes };
        voices.add(voice);
        source.onended = () => {
          voices.delete(voice);
          source.disconnect();
          nodes.forEach((node) => node.disconnect());
        };
      }

      function noise({
        at,
        duration = 0.1,
        volume = 0.2,
        highpass = 100,
        lowpass = 7000,
        band = 0,
        q = 0.7,
        attack = 0.001,
        room = 0.1,
        colored = false,
        roughness = 0,
        pan = 0
      }) {
        const source = ac.createBufferSource();
        source.buffer = colored ? pink : white;
        const high = ac.createBiquadFilter();
        const low = ac.createBiquadFilter();
        high.type = "highpass";
        high.frequency.value = highpass;
        high.Q.value = 0.5;
        low.type = "lowpass";
        low.frequency.value = lowpass;
        low.Q.value = 0.5;
        source.connect(high);
        high.connect(low);

        const nodes = [high, low];
        let tail = low;

        if (band) {
          const filter = ac.createBiquadFilter();
          filter.type = "bandpass";
          filter.frequency.value = band;
          filter.Q.value = q;
          tail.connect(filter);
          tail = filter;
          nodes.push(filter);
        }

        const gain = ac.createGain();
        tail.connect(gain);
        nodes.push(gain);
        const curve = new Float32Array(96);
        const a = Math.min(0.35, attack / duration);

        for (let i = 0; i < curve.length; i++) {
          const x = i / (curve.length - 1);
          const rise = Math.min(1, x / Math.max(0.002, a));
          const decay = Math.exp(-5.2 * Math.max(0, x - a));
          curve[i] = volume * rise * decay * (1 - roughness + Math.random() * roughness);
        }

        curve[0] = 0;
        curve[curve.length - 1] = 0;
        gain.gain.setValueCurveAtTime(curve, at, duration);
        let output = gain;

        if (pan && ac.createStereoPanner) {
          const panner = ac.createStereoPanner();
          panner.pan.value = pan;
          gain.connect(panner);
          output = panner;
          nodes.push(panner);
        }

        attach(source, nodes, output, room);
        source.start(at, Math.random() * 2);
        source.stop(at + duration + 0.02);
      }

      function metal(at, frequencies, duration = 0.1, volume = 0.02, room = 0.1) {
        frequencies.forEach((frequency, i) => {
          const source = ac.createOscillator();
          const gain = ac.createGain();
          const length = duration * (1 - i * 0.09);
          source.type = "sine";
          source.frequency.value = frequency;
          gain.gain.setValueAtTime(0, at);
          gain.gain.linearRampToValueAtTime(volume / (1 + i * 0.85), at + 0.0015);
          gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
          source.connect(gain);
          attach(source, [gain], gain, room);
          source.start(at);
          source.stop(at + length + 0.02);
        });
      }

      function mechanical(at, strength = 1) {
        noise({
          at,
          duration: 0.024,
          volume: 0.19 * strength,
          highpass: 1400,
          lowpass: 8400,
          band: 3800,
          q: 0.65,
          room: 0.07
        });
        metal(at + 0.003, [1420, 2330, 3910], 0.045, 0.018 * strength, 0.08);
      }

      function reflections(at, heavy = false) {
        const taps = heavy
          ? [[0.057, 0.20, -0.55], [0.103, 0.13, 0.65], [0.178, 0.085, -0.3]]
          : [[0.048, 0.13, -0.45], [0.096, 0.075, 0.5], [0.157, 0.04, -0.2]];

        for (const [delay, volume, pan] of taps) {
          noise({
            at: at + delay,
            duration: heavy ? 0.14 : 0.065,
            volume,
            highpass: 500,
            lowpass: 4700 - delay * 11000,
            roughness: 0.45,
            room: 0.16,
            pan
          });
        }
      }

      function cloth(at, duration, volume) {
        noise({
          at,
          duration,
          volume,
          highpass: 550,
          lowpass: 3100,
          band: 1450,
          q: 0.5,
          attack: 0.025,
          roughness: 0.7,
          room: 0
        });
      }

      function coin(at) {
        [0, 0.46, 0.86, 1.2, 1.48, 1.71, 1.9, 2.08].forEach((delay, i) => {
          [620, 1040, 1710].forEach((frequency, j) => {
            const source = ac.createOscillator();
            const gain = ac.createGain();
            const start = at + delay;
            const duration = 0.3 - i * 0.018;
            source.frequency.value = frequency - i * 7;
            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.045 * (1 - i * 0.07) / (j + 1), start + 0.006);
            gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
            source.connect(gain);
            attach(source, [gain], gain, 1);
            source.start(start);
            source.stop(start + duration + 0.03);
          });

          const source = ac.createBufferSource();
          const filter = ac.createBiquadFilter();
          const gain = ac.createGain();
          const start = at + delay;
          source.buffer = white;
          filter.type = "lowpass";
          filter.frequency.value = 4200;
          filter.Q.value = 0.5;
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(0.055 * (1 - i * 0.08), start + 0.004);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.018);
          source.connect(filter);
          filter.connect(gain);
          attach(source, [filter, gain], gain, 1);
          source.start(start, Math.random() * 0.5);
          source.stop(start + 0.048);
        });
      }

      function play(key) {
        if (!ac || ac.state !== "running" || document.hidden) return;
        Samples.play(key);
        // 녹음 샘플(Sonniss)이 있는 소리는 합성음을 겹치지 않는다. 없는 소리만 합성으로 낸다.
        if (Samples.has(key)) return;
        const at = ac.currentTime + 0.006;

        switch (key) {
          case "pistol":
            noise({
              at,
              duration: 0.015,
              volume: 0.92,
              highpass: 1800,
              lowpass: 12000,
              room: 0.18
            });
            noise({
              at: at + 0.002,
              duration: 0.055,
              volume: 0.57,
              highpass: 600,
              lowpass: 7600,
              roughness: 0.35,
              room: 0.19
            });
            noise({
              at: at + 0.009,
              duration: 0.075,
              volume: 0.25,
              highpass: 190,
              lowpass: 1600,
              colored: true,
              room: 0.08
            });
            mechanical(at + 0.042, 0.7);
            mechanical(at + 0.095, 0.33);
            reflections(at);
            metal(at + 0.3, [2700, 4290, 5970], 0.07, 0.014, 0.1);
            break;

          case "shotgun":
            noise({
              at,
              duration: 0.021,
              volume: 0.9,
              highpass: 1400,
              lowpass: 11000,
              room: 0.2
            });
            noise({
              at: at + 0.004,
              duration: 0.16,
              volume: 0.75,
              highpass: 230,
              lowpass: 6200,
              roughness: 0.64,
              room: 0.35
            });
            noise({
              at: at + 0.012,
              duration: 0.18,
              volume: 0.44,
              highpass: 90,
              lowpass: 950,
              colored: true,
              roughness: 0.35,
              room: 0.12
            });
            [0.027, 0.049, 0.079, 0.114].forEach((delay, i) => {
              noise({
                at: at + delay,
                duration: 0.018 + i * 0.008,
                volume: 0.23 / (1 + i * 0.4),
                highpass: 1200,
                lowpass: 6800,
                roughness: 0.65,
                pan: i % 2 ? 0.3 : -0.3,
                room: 0.2
              });
            });
            reflections(at, true);
            noise({
              at: at + 0.57,
              duration: 0.14,
              volume: 0.23,
              highpass: 800,
              lowpass: 6000,
              band: 2300,
              q: 0.55,
              attack: 0.012,
              roughness: 0.75
            });
            mechanical(at + 0.585, 0.95);
            mechanical(at + 0.72, 0.7);
            noise({
              at: at + 0.83,
              duration: 0.09,
              volume: 0.17,
              highpass: 1000,
              lowpass: 5400,
              roughness: 0.6
            });
            mechanical(at + 0.91, 1.05);
            break;

          case "knife":
            noise({
              at,
              duration: 0.13,
              volume: 0.20,
              highpass: 1100,
              lowpass: 6700,
              band: 2800,
              q: 0.6,
              attack: 0.044,
              room: 0.02
            });
            noise({
              at: at + 0.105,
              duration: 0.025,
              volume: 0.37,
              highpass: 1100,
              lowpass: 7300,
              room: 0.04
            });
            noise({
              at: at + 0.119,
              duration: 0.14,
              volume: 0.24,
              highpass: 550,
              lowpass: 4300,
              band: 1750,
              roughness: 0.8,
              room: 0.025
            });
            [0.14, 0.159, 0.185, 0.218].forEach((delay, i) => {
              noise({
                at: at + delay,
                duration: 0.018,
                volume: 0.105 - i * 0.014,
                highpass: 900,
                lowpass: 3900,
                roughness: 0.7,
                room: 0
              });
            });
            break;

          case "guard":
            [0, 0.105, 0.245].forEach((delay, i) => {
              noise({
                at: at + delay,
                duration: 0.055,
                volume: 0.39 - i * 0.06,
                highpass: 200,
                lowpass: 3500,
                band: 750 + i * 170,
                q: 0.6,
                roughness: 0.4,
                room: 0.14
              });
              metal(at + delay, [310 + i * 31, 680 + i * 63, 1180], 0.08, 0.022, 0.1);
            });
            noise({
              at: at + 0.05,
              duration: 0.21,
              volume: 0.15,
              highpass: 500,
              lowpass: 3400,
              roughness: 0.8,
              room: 0.05
            });
            mechanical(at + 0.31, 0.26);
            break;

          case "coin":
            coin(at);
            break;

          case "grenade":
            noise({ at, duration: 0.035, volume: 0.92, highpass: 500, lowpass: 9800, roughness: 0.45, room: 0.22 });
            noise({ at: at + 0.008, duration: 0.42, volume: 0.82, highpass: 45, lowpass: 1250, colored: true, roughness: 0.78, room: 0.48 });
            noise({ at: at + 0.14, duration: 0.75, volume: 0.26, highpass: 80, lowpass: 680, colored: true, roughness: 0.7, room: 0.6 });
            reflections(at, true);
            break;

          case "flare":
            noise({ at, duration: 0.08, volume: 0.36, highpass: 900, lowpass: 6200, roughness: 0.5, room: 0.15 });
            noise({ at: at + 0.05, duration: 0.46, volume: 0.18, highpass: 1700, lowpass: 7200, colored: true, roughness: 0.8, room: 0.28 });
            break;

          case "heal":
            cloth(at, 0.16, 0.20);
            noise({
              at: at + 0.04,
              duration: 0.06,
              volume: 0.12,
              highpass: 1600,
              lowpass: 5000,
              roughness: 0.85,
              room: 0
            });
            cloth(at + 0.24, 0.23, 0.16);
            cloth(at + 0.52, 0.24, 0.145);
            cloth(at + 0.82, 0.12, 0.17);
            noise({
              at: at + 0.93,
              duration: 0.025,
              volume: 0.12,
              highpass: 450,
              lowpass: 2000,
              room: 0
            });
            break;

          case "reward":
            noise({
              at,
              duration: 0.19,
              volume: 0.16,
              highpass: 850,
              lowpass: 4400,
              attack: 0.03,
              roughness: 0.65,
              room: 0.025
            });
            noise({
              at: at + 0.14,
              duration: 0.03,
              volume: 0.24,
              highpass: 500,
              lowpass: 3400,
              room: 0.06
            });
            metal(at + 0.17, [183, 417, 731, 1129], 0.38, 0.055, 0.4);
            break;

          case "axe":
            noise({
              at,
              duration: 0.17,
              volume: 0.2,
              highpass: 500,
              lowpass: 4200,
              attack: 0.055,
              room: 0.02
            });
            noise({
              at: at + 0.17,
              duration: 0.065,
              volume: 0.43,
              highpass: 220,
              lowpass: 3300,
              roughness: 0.5,
              room: 0.08
            });
            break;

          case "glass":
            [0, 0.025, 0.055, 0.09].forEach((delay, i) => {
              noise({
                at: at + delay,
                duration: 0.045,
                volume: 0.22 / (1 + i * 0.4),
                highpass: 2500,
                lowpass: 10000,
                roughness: 0.6,
                room: 0.1
              });
            });
            noise({
              at: at + 0.04,
              duration: 0.5,
              volume: 0.19,
              highpass: 200,
              lowpass: 2700,
              colored: true,
              roughness: 0.7,
              room: 0.08
            });
            break;

          case "blockHit":
            noise({
              at,
              duration: 0.07,
              volume: 0.28,
              highpass: 250,
              lowpass: 2500,
              roughness: 0.45
            });
            break;

          case "hit":
            noise({
              at,
              duration: 0.045,
              volume: 0.18,
              highpass: 250,
              lowpass: 1600,
              roughness: 0.6,
              room: 0.015
            });
            break;

          case "quiet":
            cloth(at, 0.24, 0.1);
            cloth(at + 0.16, 0.19, 0.075);
            break;

          case "search":
            cloth(at, 0.18, 0.1);
            mechanical(at + 0.14, 0.3);
            break;
        }
      }

      function ambience() {
        if (!ac || ac.state !== "running" || document.hidden) return;
        if (!settings.ambience) {
          stopAmbience();
          return;
        }
        if (ambient) return;

        const source = ac.createBufferSource();
        const high = ac.createBiquadFilter();
        const low = ac.createBiquadFilter();
        const gain = ac.createGain();
        const lfo = ac.createOscillator();
        const depth = ac.createGain();

        source.buffer = pink;
        source.loop = true;
        high.type = "highpass";
        high.frequency.value = 65;
        low.type = "lowpass";
        low.frequency.value = 1300;
        gain.gain.setValueAtTime(0, ac.currentTime);
        gain.gain.linearRampToValueAtTime(0.075, ac.currentTime + 1.2);
        lfo.frequency.value = 0.11;
        depth.gain.value = 500;

        source.connect(high);
        high.connect(low);
        low.connect(gain);
        gain.connect(bus);
        lfo.connect(depth);
        depth.connect(low.frequency);
        source.start();
        lfo.start();

        const entry = { source, lfo, high, low, gain, depth };
        ambient = entry;
        source.onended = () => {
          Object.values(entry).forEach((node) => node.disconnect());
        };
      }

      function stopAmbience() {
        if (!ambient || !ac) return;
        const entry = ambient;
        ambient = null;
        const now = ac.currentTime;
        entry.gain.gain.cancelScheduledValues(now);
        entry.gain.gain.setTargetAtTime(0, now, 0.04);
        entry.source.stop(now + 0.2);
        entry.lfo.stop(now + 0.2);
      }

      function stop() {
        if (!ac) return;
        for (const voice of [...voices]) {
          try {
            voice.source.stop();
          } catch {
            // 이미 종료된 소리는 무시합니다.
          }
        }
        stopAmbience();
        wet.gain.cancelScheduledValues(ac.currentTime);
        wet.gain.setValueAtTime(0, ac.currentTime);
      }

      function resumeWet() {
        if (ac) wet.gain.setTargetAtTime(0.19, ac.currentTime, 0.02);
      }

      function status() {
        if (error) return error;
        if (!ac || ac.state !== "running") return "첫 클릭이나 키 입력 후 소리가 활성화됩니다.";
        return settings.muted ? "음소거 중" : "소리 활성화됨";
      }

      document.addEventListener("visibilitychange", () => {
        if (!ac) return;
        if (document.hidden) {
          stop();
          ac.suspend().catch(() => {});
          return;
        }
        // 이미 한 번 활성화된 컨텍스트는 제스처 없이도 다시 켤 수 있다.
        ac.resume().then(() => {
          if (ac.state !== "running" || document.hidden) return;
          resumeWet();
          ambience();
        }).catch(() => {});
      });

      return {
        unlock,
        play,
        updateVolume,
        ambience,
        stop,
        resumeWet,
        status
      };
    })();
