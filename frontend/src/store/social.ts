import { create } from 'zustand'
import { usersApi, subscriptionsApi, type UserProfile, type Subscription, type BlockedListResponse } from '@/api/users'

interface SocialState {
  // Profile
  profile: UserProfile | null
  profileLoading: boolean
  profileError: string | null

  // Subscriptions
  subscriptions: Subscription[]
  subscriptionsLoading: boolean

  // Blocked
  blocked: BlockedListResponse | null
  blockedLoading: boolean

  // Actions
  fetchProfile: (userId: string) => Promise<void>
  fetchMySubscriptions: () => Promise<void>
  subscribeToCard: (cardId: string) => Promise<Subscription>
  unsubscribeFromCard: (subscriptionId: string) => Promise<void>
  blockUser: (userId: string) => Promise<void>
  unblockUser: (userId: string) => Promise<void>
  blockCard: (cardId: string) => Promise<void>
  unblockCard: (cardId: string) => Promise<void>
  fetchBlocked: () => Promise<void>
}

export const useSocialStore = create<SocialState>((set, get) => ({
  profile: null,
  profileLoading: false,
  profileError: null,

  subscriptions: [],
  subscriptionsLoading: false,

  blocked: null,
  blockedLoading: false,

  fetchProfile: async (userId) => {
    set({ profileLoading: true, profileError: null })
    try {
      const { data } = await usersApi.getProfile(userId)
      set({ profile: data, profileLoading: false })
    } catch {
      set({ profileError: 'Не удалось загрузить профиль', profileLoading: false })
    }
  },

  fetchMySubscriptions: async () => {
    set({ subscriptionsLoading: true })
    try {
      const { data } = await subscriptionsApi.getMySubscriptions()
      set({ subscriptions: [...(data.cards ?? []), ...(data.users ?? [])], subscriptionsLoading: false })
    } catch {
      set({ subscriptionsLoading: false })
    }
  },

  subscribeToCard: async (cardId) => {
    const { data } = await subscriptionsApi.subscribe(cardId)
    set((s) => ({ subscriptions: [...s.subscriptions, data] }))
    return data
  },

  unsubscribeFromCard: async (subscriptionId) => {
    await subscriptionsApi.unsubscribe(subscriptionId)
    set((s) => ({
      subscriptions: s.subscriptions.filter((sub) => sub.id !== subscriptionId),
    }))
  },

  blockUser: async (userId) => {
    await usersApi.blockUser(userId)
    // Re-fetch blocked list after action
    await get().fetchBlocked()
  },

  unblockUser: async (userId) => {
    await usersApi.unblockUser(userId)
    set((s) => {
      if (!s.blocked) return {}
      return {
        blocked: {
          ...s.blocked,
          blocked_users: s.blocked.blocked_users.filter((b) => b.target_id !== userId),
        },
      }
    })
  },

  blockCard: async (cardId) => {
    await usersApi.blockCard(cardId)
    await get().fetchBlocked()
  },

  unblockCard: async (cardId) => {
    await usersApi.unblockCard(cardId)
    set((s) => {
      if (!s.blocked) return {}
      return {
        blocked: {
          ...s.blocked,
          blocked_cards: s.blocked.blocked_cards.filter((b) => b.target_id !== cardId),
        },
      }
    })
  },

  fetchBlocked: async () => {
    set({ blockedLoading: true })
    try {
      const { data } = await usersApi.getBlocked()
      set({ blocked: data, blockedLoading: false })
    } catch {
      set({ blockedLoading: false })
    }
  },
}))
