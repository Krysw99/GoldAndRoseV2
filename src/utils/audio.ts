/**
 * Simple, extremely lightweight synthesizer for tactile UI audio feedback using Web Audio API.
 * Synthesizing sounds on the fly avoids downloading audio assets and eliminates network latency.
 */

let audioCtx: AudioContext | null = null;

export type ClickSoundType = 'click' | 'tab' | 'success' | 'delete' | 'clear';

export function playClickSound(type: ClickSoundType = 'click') {
  try {
    // Lazy initialisation to comply with browser autoplay/gesture requirements
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    // Resume if suspended (common browser security state)
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    if (type === 'tab') {
      // Soft modern organic pop/tap for tabs
      osc.type = 'sine';
      osc.frequency.setValueAtTime(650, now);
      osc.frequency.exponentialRampToValueAtTime(350, now + 0.04);
      
      gainNode.gain.setValueAtTime(0.06, now); // soft, unobtrusive
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      
      osc.start(now);
      osc.stop(now + 0.04);
    } else if (type === 'success') {
      // Gentle dual-tone ascending notification sound for success/saving
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
      
      gainNode.gain.setValueAtTime(0.07, now);
      gainNode.gain.setValueAtTime(0.07, now + 0.08);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      
      osc.start(now);
      osc.stop(now + 0.22);
    } else if (type === 'delete') {
      // Fast sliding down low-frequency click for deleting elements
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.06);

      gainNode.gain.setValueAtTime(0.12, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.start(now);
      osc.stop(now + 0.06);
    } else if (type === 'clear') {
      // Whoosh or gentle sliding tone for clearing
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.1);

      gainNode.gain.setValueAtTime(0.08, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.start(now);
      osc.stop(now + 0.1);
    } else {
      // Default 'click': Crisp, tight, extremely brief tactical click
      osc.type = 'sine';
      // Pitch sweeps down quickly from 1100Hz to 180Hz in 22ms
      osc.frequency.setValueAtTime(1100, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.022);

      gainNode.gain.setValueAtTime(0.10, now); // highly responsive, low volume click
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.022);

      osc.start(now);
      osc.stop(now + 0.022);
    }
  } catch (e) {
    // Fail silently so it doesn't interrupt application execution in case of restriction/absence
    console.warn("Click sound failed to play:", e);
  }
}
