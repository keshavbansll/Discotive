import { create } from "zustand";

export const useConnectiveStore = create((set, get) => ({
  // Feed
  feedPosts: [],
  feedCursor: null,
  feedLoading: false,
  feedHasMore: true,
  setFeedPosts: (posts) => set({ feedPosts: posts }),
  appendFeedPosts: (posts, cursor) =>
    set((s) => ({
      feedPosts: [...s.feedPosts, ...posts],
      feedCursor: cursor,
      feedHasMore: posts.length >= 10,
    })),
  setFeedLoading: (v) => set({ feedLoading: v }),

  // DMs
  activeConvoId: null,
  conversations: [],
  messages: {},
  dmLoading: false,
  setActiveConvo: (id) => set({ activeConvoId: id }),
  setConversations: (c) => set({ conversations: c }),
  appendMessages: (convoId, msgs) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [convoId]: [...(s.messages[convoId] || []), ...msgs],
      },
    })),
  prependMessage: (convoId, msg) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [convoId]: [msg, ...(s.messages[convoId] || [])],
      },
    })),
  setDmLoading: (v) => set({ dmLoading: v }),

  // Intelligence / Telemetry
  liveEvents: [],
  onlineCount: 0,
  setLiveEvents: (e) => set({ liveEvents: e }),
  pushLiveEvent: (e) =>
    set((s) => ({ liveEvents: [e, ...s.liveEvents].slice(0, 12) })),
  setOnlineCount: (n) => set({ onlineCount: n }),

  // Bounties
  activeBounties: [],
  setActiveBounties: (b) => set({ activeBounties: b }),

  reset: () =>
    set({
      feedPosts: [],
      feedCursor: null,
      feedLoading: false,
      feedHasMore: true,
      activeConvoId: null,
      conversations: [],
      messages: {},
      dmLoading: false,
      liveEvents: [],
      onlineCount: 0,
    }),
}));
