import { create } from 'zustand';

const STORAGE_KEY = 'activeSessionId';

interface SessionState {
  activeSessionId: number | null;
  hydrated: boolean;
  setActiveSessionId: (id: number | null) => Promise<void>;
}

async function readActiveSessionId(): Promise<number | null> {
  try {
    const result = await browser.storage.local.get(STORAGE_KEY);
    const value = result[STORAGE_KEY];
    return typeof value === 'number' ? value : null;
  } catch {
    return null;
  }
}

export const useSessionStore = create<SessionState>((set) => ({
  activeSessionId: null,
  hydrated: false,
  setActiveSessionId: async (id) => {
    set({ activeSessionId: id });
    if (id === null) {
      await browser.storage.local.remove(STORAGE_KEY);
    } else {
      await browser.storage.local.set({ [STORAGE_KEY]: id });
    }
  },
}));

void readActiveSessionId().then((id) => {
  useSessionStore.setState({ activeSessionId: id, hydrated: true });
});

browser.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  const change = changes[STORAGE_KEY];
  if (!change) return;
  const next = typeof change.newValue === 'number' ? change.newValue : null;
  if (useSessionStore.getState().activeSessionId !== next) {
    useSessionStore.setState({ activeSessionId: next });
  }
});
