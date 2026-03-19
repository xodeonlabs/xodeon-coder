/**
 * Proper TypeScript types for Supabase tables
 * This replaces many `as any` casts with proper types
 */

export interface Profile {
  id: string;
  created_at: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
}

export interface UserCoins {
  id: string;
  user_id: string;
  balance: number;
  last_daily_bonus?: string;
  last_weekly_bonus?: string;
  last_monthly_bonus?: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  app_id?: string;
  org_id?: string;
  content: string;
  created_at: string;
}

export interface App {
  id: string;
  owner_id: string;
  name: string;
  description?: string;
  visibility: 'private' | 'public' | 'open';
  icon: string;
  created_at: string;
  updated_at: string;
  code?: string;
  featured_at?: string;
}

export interface AppWithCollaborators extends App {
  project_collaborators?: ProjectCollaborator[];
}

export interface ProjectCollaborator {
  id: string;
  app_id: string;
  user_id: string;
  percentage: number;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  owner_id: string;
  description?: string;
  logo_url?: string;
  join_code?: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon_emoji: string;
  requirement: Record<string, any>;
  points_reward: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
}

export interface Advertisement {
  id: string;
  page: string;
  title: string;
  description?: string;
  image_url?: string;
  link_url?: string;
  created_at: string;
  active: boolean;
}

export interface OrgCoinTransaction {
  id: string;
  organization_id: string;
  amount: number;
  type: 'earn' | 'spend' | 'adjust';
  description?: string;
  created_at: string;
}

export interface AIConversation {
  id: string;
  user_id: string;
  title: string;
  model: string;
  created_at: string;
  updated_at: string;
}

export interface AIMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'moderator' | 'user';
  created_at: string;
}

export interface Template {
  id: string;
  name: string;
  description?: string;
  code: string;
  category: string;
  tags?: string[];
  rating: number;
  downloads: number;
  preview_url?: string;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface FriendshipRequest {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}
