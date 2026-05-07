import { create } from 'zustand'

export type SidebarPanel = 'feed' | 'my-cards' | 'subscriptions' | 'blocked'

interface SidebarState {
  panel: SidebarPanel | null
  openPanel: (panel: SidebarPanel) => void
  closePanel: () => void
}

export const useSidebarStore = create<SidebarState>((set) => ({
  panel: null,
  openPanel: (panel) => set({ panel }),
  closePanel: () => set({ panel: null }),
}))
