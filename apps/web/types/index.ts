export type UserStatus = "online" | "away" | "focus" | "offline";
export type Emotion = "happy" | "sad" | "angry" | "anxious" | "neutral";

export type Chat = {
  id: string;
  type: "DIRECT" | "GROUP" | "SPATIAL_ROOM" | "STORY_CANVAS";
  name: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  unreadCount?: number;
  lastMessage?: {
    id: string;
    content: string | null;
    createdAt: string | Date;
  } | null;
};

export type Message = {
  id: string;
  chatId: string;
  senderId: string;
  content: string | null;
  type: string;
  mediaUrl?: string | null;
  mediaType?: string | null;
  replyToId?: string | null;
  isDeleted: boolean;
  isEdited: boolean;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  emotionTag?: Emotion;
  emotionScore?: number;
  deliveryStatus?: "sending" | "sent" | "delivered" | "read" | "failed";
  reactions?: Array<{ userId: string; emoji: string }>;
  metadata?: Record<string, unknown> | null;
};

export type ChatDetail = {
  id: string;
  members: Array<{
    userId: string;
    user: {
      id: string;
      displayName: string;
      username: string;
    };
  }>;
};

export type UserProfile = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  moodWord: string | null;
  currentSong: string | null;
  trustScore: number;
  currentPersona: string;
  personas: unknown;
};

export type DailyQuest = {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  tokenReward: number;
  progress: { status: "IN_PROGRESS" | "COMPLETED" | "CLAIMED" } | null;
};

export type MemoryItem = {
  id: string;
  title: string;
  content: string | null;
  mediaUrls: string[];
  isStarred: boolean;
  createdAt: string;
};

export type TimeCapsuleItem = {
  id: string;
  content: string;
  deliverAt: string;
  isDelivered: boolean;
};

export type RoomItem = {
  id: string;
  name: string | null;
  roomConfig: unknown;
};

export type RelationshipScore = {
  id: string;
  userAId: string;
  userBId: string;
  score: number;
  frequencyScore: number;
  positivityScore: number;
  engagementScore: number;
  lastUpdated: string;
};

export type XPData = {
  xp: number;
  level: number;
  streak: number;
};

export type SearchResult = {
  users: Array<{ id: string; username: string; displayName: string }>;
  messages: Array<{ id: string; chatId: string; senderId: string; content: string; createdAt: string }>;
};

export type GameSession = {
  id: string;
  chatId: string;
  gameType: string;
  state: Record<string, unknown>;
  status: string;
  createdAt: string;
};
