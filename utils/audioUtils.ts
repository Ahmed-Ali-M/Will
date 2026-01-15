
// Using AudioContext for better synthesized sounds without large assets
class AudioController {
    private ctx: AudioContext | null = null;
    private interactionEnabled: boolean = true;
    private notificationTone: string = 'default';
    private customSoundData: string | null = null;

    private getContext() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        return this.ctx;
    }

    setConfig(interactionEnabled: boolean, tone: string, customData?: string | null) {
        this.interactionEnabled = interactionEnabled;
        this.notificationTone = tone;
        this.customSoundData = customData || null;
    }

    play(type: 'click' | 'pop' | 'success' | 'alarm' | 'tick' | 'timer-done') {
        // Essential sounds play unless tone is specifically 'none' (handled in switch)
        const isEssential = ['alarm', 'timer-done', 'success'].includes(type);
        
        // Block non-essential if interaction sounds are disabled
        if (!isEssential && !this.interactionEnabled) return;

        // Custom Sound Handling for Alarms
        if ((type === 'alarm' || type === 'timer-done') && this.notificationTone === 'custom' && this.customSoundData) {
            try {
                const audio = new Audio(this.customSoundData);
                audio.volume = 0.8;
                audio.play().catch(e => console.error("Custom sound play failed", e));
                return;
            } catch (e) {
                // Fallback to default if custom fails
            }
        }

        try {
            const ctx = this.getContext();
            const now = ctx.currentTime;

            // Oscillators for UI sounds (lightweight)
            if (type === 'click') {
                this.playTone(800, 'sine', 0.05, 0.05); // High blip
                return;
            }
            if (type === 'pop') {
                this.playTone(400, 'sine', 0.05, 0.1); // Bubble
                return;
            }
            if (type === 'tick') {
                this.playTone(1000, 'triangle', 0.03, 0.02); // Woodblock
                return;
            }
            if (type === 'success') {
                this.playNote(523.25, now, 0.1); // C5
                this.playNote(659.25, now + 0.1, 0.1); // E5
                this.playNote(783.99, now + 0.2, 0.2); // G5
                return;
            }

            // Complex Tones for Alarms
            if (type === 'alarm' || type === 'timer-done') {
                if (this.notificationTone === 'none') return;

                switch (this.notificationTone) {
                    // Short
                    case 'beep':
                        this.playNote(880, now, 0.15, 'square');
                        break;
                    case 'ding':
                        this.playNote(1046.5, now, 0.3, 'sine'); // C6
                        break;
                    
                    // Medium
                    case 'digital':
                        this.playNote(660, now, 0.1, 'square');
                        this.playNote(880, now + 0.1, 0.1, 'square');
                        this.playNote(1320, now + 0.2, 0.3, 'square');
                        break;
                    case 'bell':
                        this.playNote(523.25, now, 0.6, 'sine');
                        this.playNote(783.99, now + 0.1, 0.5, 'sine');
                        break;

                    // Long
                    case 'chime':
                        this.playNote(523.25, now, 0.8, 'sine');
                        this.playNote(659.25, now + 0.2, 0.8, 'sine');
                        this.playNote(783.99, now + 0.4, 1.2, 'sine');
                        break;
                    case 'ethereal':
                        // Swelling sine waves
                        this.playSwrenTone(440, now, 1.5);
                        this.playSwrenTone(554.37, now + 0.2, 1.5); // C#
                        this.playSwrenTone(659.25, now + 0.4, 2.0); // E
                        break;
                    case 'meditation':
                        // Low frequency bowl sound
                        this.playNote(196.00, now, 3.0, 'sine'); // G3
                        this.playNote(392.00, now, 2.5, 'sine'); // G4 (harmonic)
                        break;
                    case 'sunrise':
                        // Major triad arpeggio ascending slowly
                        this.playNote(261.63, now, 1.0, 'sine'); // C4
                        this.playNote(329.63, now + 0.3, 1.0, 'sine'); // E4
                        this.playNote(392.00, now + 0.6, 1.0, 'sine'); // G4
                        this.playNote(523.25, now + 0.9, 2.0, 'sine'); // C5
                        break;
                    
                    // Default / Fallback
                    default:
                        // Urgent Beeps
                        for(let i=0; i<3; i++) {
                             this.playNote(880, now + i*0.25, 0.1, 'square');
                        }
                        break;
                }
            }

        } catch (e) {
            // Ignore auto-play policy errors
        }
    }

    private playTone(freq: number, type: OscillatorType, duration: number, vol: number = 0.1) {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        osc.start(now);
        osc.stop(now + duration);
    }

    private playNote(freq: number, time: number, duration: number, type: OscillatorType = 'sine') {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.type = type;
        if (freq > 0) {
            osc.frequency.setValueAtTime(freq, time);
            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.1, time + 0.05); // Attack
            gain.gain.exponentialRampToValueAtTime(0.001, time + duration); // Decay
            osc.start(time);
            osc.stop(time + duration);
        }
    }

    private playSwrenTone(freq: number, time: number, duration: number) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);
        
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.05, time + duration * 0.3); // Slow attack
        gain.gain.linearRampToValueAtTime(0, time + duration); // Slow release
        
        osc.start(time);
        osc.stop(time + duration);
    }
}

export const audio = new AudioController();