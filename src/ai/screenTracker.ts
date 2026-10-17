export interface ScreenTrackerCallbacks {
  onTabSwitch: () => void;
  onFullscreenExit: () => void;
  onWindowBlur: () => void;
  onWindowFocus: () => void;
  onSuspiciousKey: (keyCombo: string) => void;
}

export class ScreenTracker {
  private screenStream: MediaStream | null = null;
  private isTracking = false;
  private tabSwitchCount = 0;
  private callbacks: ScreenTrackerCallbacks;
  private keyListener: ((e: KeyboardEvent) => void) | null = null;
  private visibilityListener: (() => void) | null = null;
  private blurListener: (() => void) | null = null;
  private focusListener: (() => void) | null = null;
  private fullscreenListener: (() => void) | null = null;

  constructor(callbacks: ScreenTrackerCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * Requests Display Media for screen sharing
   */
  async startScreenCapture(): Promise<MediaStream | null> {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        this.screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            displaySurface: 'monitor',
          } as any,
          audio: false,
        });

        // Listen for user stopping screen share from browser banner
        this.screenStream.getVideoTracks()[0].addEventListener('ended', () => {
          this.callbacks.onTabSwitch();
        });

        return this.screenStream;
      }
    } catch (err) {
      console.warn('Screen capture permission was dismissed or not available:', err);
    }
    return null;
  }

  /**
   * Initializes browser activity and window focus monitoring
   */
  startActivityMonitoring(): void {
    if (this.isTracking) return;
    this.isTracking = true;

    // 1. Visibility Change (Tab switched or minimized)
    this.visibilityListener = () => {
      if (document.hidden) {
        this.tabSwitchCount++;
        this.callbacks.onTabSwitch();
      } else {
        this.callbacks.onWindowFocus();
      }
    };
    document.addEventListener('visibilitychange', this.visibilityListener);

    // 2. Window Blur (User clicked outside exam window)
    this.blurListener = () => {
      this.callbacks.onWindowBlur();
    };
    window.addEventListener('blur', this.blurListener);

    // 3. Window Focus
    this.focusListener = () => {
      this.callbacks.onWindowFocus();
    };
    window.addEventListener('focus', this.focusListener);

    // 4. Fullscreen Exit
    this.fullscreenListener = () => {
      if (!document.fullscreenElement) {
        this.callbacks.onFullscreenExit();
      }
    };
    document.addEventListener('fullscreenchange', this.fullscreenListener);

    // 5. Suspicious Keyboard Shortcut Interception (e.g. Alt+Tab, Cmd+Tab, Ctrl+C, Ctrl+V, PrintScreen, F12)
    this.keyListener = (e: KeyboardEvent) => {
      const isAltTab = e.altKey && e.key === 'Tab';
      const isCtrlC = (e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C');
      const isCtrlV = (e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V');
      const isPrintScreen = e.key === 'PrintScreen';
      const isDevTools = e.key === 'F12' || ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i'));

      if (isAltTab || isCtrlC || isCtrlV || isPrintScreen || isDevTools) {
        let desc = 'Key Combination';
        if (isAltTab) desc = 'Alt + Tab';
        else if (isCtrlC) desc = 'Clipboard Copy (Ctrl/Cmd + C)';
        else if (isCtrlV) desc = 'Clipboard Paste (Ctrl/Cmd + V)';
        else if (isPrintScreen) desc = 'Screen Capture Attempt (PrintScreen)';
        else if (isDevTools) desc = 'Inspect / DevTools Key (F12 / Cmd+Option+I)';

        this.callbacks.onSuspiciousKey(desc);
      }
    };
    window.addEventListener('keydown', this.keyListener);
  }

  /**
   * Request Fullscreen mode
   */
  async requestFullscreen(): Promise<boolean> {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        return true;
      }
    } catch (e) {
      console.warn('Fullscreen request denied', e);
    }
    return false;
  }

  /**
   * Captures snapshot frame of current screen share stream if active
   */
  captureScreenFrame(): string | null {
    if (!this.screenStream) return null;
    const videoTrack = this.screenStream.getVideoTracks()[0];
    if (!videoTrack || videoTrack.readyState !== 'live') return null;

    try {
      const video = document.createElement('video');
      video.srcObject = this.screenStream;
      video.play();

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 360;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.8);
      }
    } catch (err) {
      console.warn('Failed to capture screen frame:', err);
    }
    return null;
  }

  /**
   * Stops all tracking listeners and streams
   */
  stop(): void {
    this.isTracking = false;
    if (this.visibilityListener) document.removeEventListener('visibilitychange', this.visibilityListener);
    if (this.blurListener) window.removeEventListener('blur', this.blurListener);
    if (this.focusListener) window.removeEventListener('focus', this.focusListener);
    if (this.fullscreenListener) document.removeEventListener('fullscreenchange', this.fullscreenListener);
    if (this.keyListener) window.removeEventListener('keydown', this.keyListener);

    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop());
      this.screenStream = null;
    }
  }

  getTabSwitchCount(): number {
    return this.tabSwitchCount;
  }
}
