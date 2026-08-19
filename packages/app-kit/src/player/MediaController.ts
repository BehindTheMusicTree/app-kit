/**
 * Uniform playback interface so PlayerContext and its consumers never need to branch on whether
 * the underlying media is an `HTMLAudioElement` or a YouTube IFrame player. `currentTime` is in
 * seconds, `volume` is 0-100 (matching the UI's existing convention and the YouTube IFrame API's
 * native `getVolume`/`setVolume` scale).
 */
export interface MediaController {
  getCurrentTime(): number;
  setCurrentTime(time: number): void;
  getVolume(): number;
  setVolume(volume: number): void;
  play(): void;
  pause(): void;
}

export class AudioMediaController implements MediaController {
  constructor(private readonly audio: HTMLAudioElement) {}

  getCurrentTime(): number {
    return this.audio.currentTime;
  }

  setCurrentTime(time: number): void {
    this.audio.currentTime = time;
  }

  getVolume(): number {
    return this.audio.volume * 100;
  }

  setVolume(volume: number): void {
    this.audio.volume = volume / 100;
  }

  play(): void {
    this.audio.play().catch((error) => {
      console.error("Error playing audio:", error);
    });
  }

  pause(): void {
    this.audio.pause();
  }
}

export class YoutubeMediaController implements MediaController {
  constructor(private readonly player: YT.Player) {}

  getCurrentTime(): number {
    return this.player.getCurrentTime();
  }

  setCurrentTime(time: number): void {
    this.player.seekTo(time, true);
  }

  getVolume(): number {
    return this.player.getVolume();
  }

  setVolume(volume: number): void {
    this.player.setVolume(volume);
  }

  play(): void {
    this.player.playVideo();
  }

  pause(): void {
    this.player.pauseVideo();
  }
}
