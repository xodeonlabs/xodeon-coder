import { useCallback, useRef } from 'react';

const NOTIFICATION_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';
const STORAGE_KEY = 'ngc-notification-sound';
const TOAST_STORAGE_KEY = 'ngc-notification-toast';
const DND_STORAGE_KEY = 'ngc-do-not-disturb';

export function getNotificationSoundEnabled(): boolean {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
}

export function setNotificationSoundEnabled(enabled: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, String(enabled));
  } catch {
    // ignore
  }
}

export function getNotificationToastEnabled(): boolean {
  try {
    const val = localStorage.getItem(TOAST_STORAGE_KEY);
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
}

export function setNotificationToastEnabled(enabled: boolean) {
  try {
    localStorage.setItem(TOAST_STORAGE_KEY, String(enabled));
  } catch {
    // ignore
  }
}

export function useNotificationSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const play = useCallback(() => {
    if (getDoNotDisturbEnabled() || !getNotificationSoundEnabled()) return;
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
        audioRef.current.volume = 0.5;
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    } catch {
      // Ignore audio errors
    }
  }, []);

  return { play };
}
