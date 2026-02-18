import { useState } from 'react';

export interface AutoSyncSettings {
  enabled: boolean;
  intervalMinutes: number;
}

const DEFAULT_SETTINGS: AutoSyncSettings = {
  enabled: false,
  intervalMinutes: 15,
};

const STORAGE_KEY = 'oms:autosync-settings';

export function useAutoSyncSettings() {
  const [settings, setSettings] = useState<AutoSyncSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const updateSettings = (updates: Partial<AutoSyncSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...updates };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  return { settings, updateSettings };
}
