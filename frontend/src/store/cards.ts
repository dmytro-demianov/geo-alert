import { create } from 'zustand'
import { cardsApi, type Card, type CreateCardPayload } from '@/api/cards'

interface CardsState {
  myCards: Card[]
  loading: boolean
  error: string | null
  fetchMyCards: (userId: string) => Promise<void>
  createCard: (payload: CreateCardPayload) => Promise<Card>
  deleteCard: (id: string) => Promise<void>
}

export const useCardsStore = create<CardsState>((set) => ({
  myCards: [],
  loading: false,
  error: null,

  fetchMyCards: async (userId) => {
    set({ loading: true, error: null })
    try {
      const { data } = await cardsApi.listByOwner(userId)
      set({ myCards: data.cards ?? [], loading: false })
    } catch {
      set({ error: 'Не удалось загрузить карты', loading: false })
    }
  },

  createCard: async (payload) => {
    const { data } = await cardsApi.create(payload)
    set((s) => ({ myCards: [data, ...s.myCards] }))
    return data
  },

  deleteCard: async (id) => {
    await cardsApi.delete(id)
    set((s) => ({ myCards: s.myCards.filter((c) => c.id !== id) }))
  },
}))
