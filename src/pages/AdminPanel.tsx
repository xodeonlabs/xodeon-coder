import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Shield, Users, Trash2, UserPlus, Crown, ShieldCheck, User, Building2, AppWindow, Megaphone, Plus, Eye, EyeOff, Pencil, Ban, ShieldOff, Activity, MessageCircle, Send, Coins, Handshake, BarChart3, Globe, Lock, BookTemplate, Save, Tags, RotateCcw, Dice5 } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { WorldMapChart } from '@/components/WorldMapChart';

const EMOJI_LIST = [
  { emoji: '🚀', label: 'rocket' }, { emoji: '🎮', label: 'game' }, { emoji: '🐍', label: 'snake' },
  { emoji: '💡', label: 'lightbulb idea' }, { emoji: '🎯', label: 'target' }, { emoji: '🔥', label: 'fire' },
  { emoji: '⭐', label: 'star' }, { emoji: '❤️', label: 'heart' }, { emoji: '🎵', label: 'music' },
  { emoji: '📱', label: 'phone mobile' }, { emoji: '💻', label: 'laptop computer' }, { emoji: '🖥️', label: 'desktop monitor' },
  { emoji: '🎨', label: 'art palette' }, { emoji: '📷', label: 'camera photo' }, { emoji: '🎬', label: 'film movie' },
  { emoji: '📚', label: 'books' }, { emoji: '✏️', label: 'pencil write' }, { emoji: '🔧', label: 'wrench tool' },
  { emoji: '⚡', label: 'lightning energy' }, { emoji: '🌍', label: 'globe world earth' }, { emoji: '🏠', label: 'home house' },
  { emoji: '🛒', label: 'shopping cart' }, { emoji: '💰', label: 'money bag' }, { emoji: '🎁', label: 'gift present' },
  { emoji: '🏆', label: 'trophy winner' }, { emoji: '👑', label: 'crown king' }, { emoji: '💎', label: 'gem diamond' },
  { emoji: '🔒', label: 'lock security' }, { emoji: '🔑', label: 'key' }, { emoji: '🛡️', label: 'shield protect' },
  { emoji: '📊', label: 'chart stats' }, { emoji: '📈', label: 'graph trending up' }, { emoji: '🗓️', label: 'calendar date' },
  { emoji: '⏰', label: 'clock time alarm' }, { emoji: '🌟', label: 'glowing star' }, { emoji: '✨', label: 'sparkles' },
  { emoji: '🎉', label: 'party celebration' }, { emoji: '🎪', label: 'circus tent' }, { emoji: '🎲', label: 'dice game' },
  { emoji: '🧩', label: 'puzzle' }, { emoji: '🤖', label: 'robot ai' }, { emoji: '👾', label: 'alien space invader' },
  { emoji: '🦊', label: 'fox' }, { emoji: '🐱', label: 'cat' }, { emoji: '🐶', label: 'dog' },
  { emoji: '☕', label: 'coffee' }, { emoji: '🍕', label: 'pizza food' }, { emoji: '🍎', label: 'apple fruit' },
  { emoji: '🌈', label: 'rainbow' }, { emoji: '☀️', label: 'sun' }, { emoji: '🌙', label: 'moon night' },
  { emoji: '🎸', label: 'guitar' }, { emoji: '🎧', label: 'headphones' }, { emoji: '📡', label: 'satellite signal' },
  { emoji: '🧪', label: 'test tube science' }, { emoji: '🔬', label: 'microscope' }, { emoji: '💊', label: 'pill medicine' },
  { emoji: '🚗', label: 'car' }, { emoji: '✈️', label: 'airplane travel' }, { emoji: '🚂', label: 'train' },
  { emoji: '📝', label: 'memo note' }, { emoji: '📌', label: 'pin' }, { emoji: '🏷️', label: 'tag label' },
];

interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  country: string | null;
}

interface AuthUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
}

interface UserRoleRow {
  id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'moderator' | 'user';
}

interface AppRow {
  id: string;
  name: string;
  owner_id: string;
  is_public: boolean;
  updated_at: string;
}

interface OrgRow {
  id: string;
  name: string;
  owner_id: string;
  level: number;
}

interface AdRow {
  id: string;
  emoji: string;
  title: string;
  description: string;
  url: string;
  gradient: string;
  is_active: boolean;
  sort_order: number;
  pages: string[];
  created_at: string;
}

const PAGE_OPTIONS = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'organizations', label: 'Bedrijven' },
];

export default function AdminPanel() {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [authUsers, setAuthUsers] = useState<AuthUser[]>([]);
  const [roles, setRoles] = useState<UserRoleRow[]>([]);
  const [apps, setApps] = useState<AppRow[]>([]);
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [ads, setAds] = useState<AdRow[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [appChats, setAppChats] = useState<any[]>([]);
  const [orgChats, setOrgChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatReplyInputs, setChatReplyInputs] = useState<Record<string, string>>({});
  const [chatSending, setChatSending] = useState<string | null>(null);
  const [tab, setTab] = useState<'users' | 'apps' | 'orgs' | 'ads' | 'chats' | 'activity' | 'coins' | 'alliances' | 'templates' | 'categories'>('users');
  
  // Templates management
  const [adminTemplates, setAdminTemplates] = useState<{ id: string; name: string; description: string; category: string; visibility: string; author_id: string; downloads: number; is_published: boolean; created_at: string }[]>([]);
  const [templatesLoaded, setTemplatesLoaded] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [templateEditName, setTemplateEditName] = useState('');
  const [templateEditCategory, setTemplateEditCategory] = useState('');
  const [templateEditDescription, setTemplateEditDescription] = useState('');
  const [templateEditVisibility, setTemplateEditVisibility] = useState('public');
  
  // Categories management
  const [adminCategories, setAdminCategories] = useState<{ id: string; value: string; label: string; icon: string; sort_order: number }[]>([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [newCatValue, setNewCatValue] = useState('');
  const [newCatLabel, setNewCatLabel] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('sparkles');
  const [catSaving, setCatSaving] = useState(false);
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editCatLabel, setEditCatLabel] = useState('');
  const [editCatIcon, setEditCatIcon] = useState('');

  // Country filter
  const [countryFilter, setCountryFilter] = useState<string>('all');

  const [adminAlliances, setAdminAlliances] = useState<any[]>([]);
  const [adminAllianceMembers, setAdminAllianceMembers] = useState<Record<string, any[]>>({});
  const [adminAllianceCoins, setAdminAllianceCoins] = useState<Record<string, number>>({});
  const [adminAllianceChats, setAdminAllianceChats] = useState<Record<string, any[]>>({});
  const [adminAllianceStats, setAdminAllianceStats] = useState<Record<string, { apps: number; views: number }>>({});
  const [selectedAdminAlliance, setSelectedAdminAlliance] = useState<string | null>(null);
  const [alliancesLoaded, setAlliancesLoaded] = useState(false);

  // Coins management
  const [userCoins, setUserCoins] = useState<{ user_id: string; balance: number }[]>([]);
  const [coinUserId, setCoinUserId] = useState('');
  const [coinAmount, setCoinAmount] = useState('');
  const [coinAction, setCoinAction] = useState<'add' | 'set'>('add');
  const [coinSaving, setCoinSaving] = useState(false);
  const [collabAppId, setCollabAppId] = useState<string | null>(null);
  const [collabEmail, setCollabEmail] = useState('');
  const [collabAdding, setCollabAdding] = useState(false);

  // Add role
  const [addRoleUserId, setAddRoleUserId] = useState('');
  const [addRoleValue, setAddRoleValue] = useState<'admin' | 'moderator' | 'user'>('user');
  const [addingRole, setAddingRole] = useState(false);

  // Ad form
  const [showAdForm, setShowAdForm] = useState(false);
  const [editingAd, setEditingAd] = useState<AdRow | null>(null);
  const [adForm, setAdForm] = useState({ emoji: '🚀', title: '', description: '', url: '', gradient: 'linear-gradient(135deg, hsl(200 40% 14%), hsl(var(--secondary)))', pages: ['dashboard', 'organizations'] as string[] });
  const [savingAd, setSavingAd] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiSearch, setEmojiSearch] = useState('');

  // Management confirmations
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: string; type: 'user' | 'app' | 'org' | 'ad' | 'alliance' | 'template'; name: string } | null>(null);
  const [managingUser, setManagingUser] = useState(false);

  useEffect(() => {
    checkAdmin();
  }, [session]);

  async function checkAdmin() {
    if (!session?.user?.id) { setIsAdmin(false); return; }
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .in('role', ['admin', 'owner'] as any[]);
    const hasAdmin = (data && data.length > 0);
    setIsAdmin(hasAdmin);
    if (hasAdmin) fetchAll();
    else setLoading(false);
  }

  async function fetchAll() {
    setLoading(true);
    const [profilesRes, rolesRes, appsRes, orgsRes, adsRes, logsRes] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('user_roles').select('*'),
      supabase.from('apps').select('id, name, owner_id, is_public, updated_at').order('updated_at', { ascending: false }),
      supabase.from('organizations').select('id, name, owner_id, level'),
      supabase.from('ads' as any).select('*').order('sort_order', { ascending: true }),
      supabase.from('admin_activity_log' as any).select('*').order('created_at', { ascending: false }).limit(100),
    ]);
    if (profilesRes.data) setProfiles(profilesRes.data as UserProfile[]);
    if (rolesRes.data) setRoles(rolesRes.data as unknown as UserRoleRow[]);
    if (appsRes.data) setApps(appsRes.data as unknown as AppRow[]);
    if (orgsRes.data) setOrgs(orgsRes.data as unknown as OrgRow[]);
    if (adsRes.data) setAds(adsRes.data as unknown as AdRow[]);
    if (logsRes.data) setActivityLogs(logsRes.data as any[]);

    // Fetch chats via edge function
    try {
      const { data: chatData } = await supabase.functions.invoke('admin-list-chats');
      if (chatData) {
        setAppChats(chatData.app_chats || []);
        setOrgChats(chatData.org_chats || []);
      }
    } catch (e) {
      console.error('Failed to fetch chats:', e);
    }

    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke('admin-list-users');
      if (!fnError && fnData) {
        setAuthUsers(fnData as AuthUser[]);
      }
    } catch { /* ignore */ }

    setLoading(false);
  }

  async function loadAllCoins() {
    const { data } = await supabase.functions.invoke('admin-manage-coins', { body: { action: 'list', user_id: '_', amount: 0 } });
    if (data?.coins) setUserCoins(data.coins);
  }

  async function loadAdminTemplates(force = false) {
    if (templatesLoaded && !force) return;
    setTemplatesLoaded(true);
    const { data } = await supabase.from('templates').select('id, name, description, category, author_id, downloads, is_published, created_at, visibility' as any).order('created_at', { ascending: false });
    setAdminTemplates((data as any[]) || []);
  }

  async function deleteTemplate(id: string, name: string) {
    const { error } = await supabase.from('templates').delete().eq('id', id);
    if (error) { toast({ title: 'Fout', description: error.message, variant: 'destructive' }); return; }
    setAdminTemplates(ts => ts.filter(t => t.id !== id));
    toast({ title: 'Template verwijderd', description: `"${name}" is verwijderd.` });
  }

  async function saveTemplateEdit(id: string) {
    const { error } = await supabase.from('templates').update({ name: templateEditName, category: templateEditCategory, description: templateEditDescription, visibility: templateEditVisibility } as any).eq('id', id);
    if (error) { toast({ title: 'Fout', description: error.message, variant: 'destructive' }); return; }
    setAdminTemplates(ts => ts.map(t => t.id === id ? { ...t, name: templateEditName, category: templateEditCategory, description: templateEditDescription, visibility: templateEditVisibility } : t));
    setEditingTemplate(null);
    toast({ title: 'Template bijgewerkt' });
  }

  async function loadAdminCategories(force = false) {
    if (categoriesLoaded && !force) return;
    setCategoriesLoaded(true);
    const { data } = await supabase.from('categories' as any).select('*').order('sort_order', { ascending: true });
    setAdminCategories((data as any[]) || []);
  }

  async function addCategory() {
    if (!newCatValue.trim() || !newCatLabel.trim()) return;
    setCatSaving(true);
    const nextOrder = adminCategories.length > 0 ? Math.max(...adminCategories.map(c => c.sort_order)) + 1 : 1;
    const { data, error } = await supabase.from('categories' as any).insert({
      value: newCatValue.trim().toLowerCase().replace(/\s+/g, '-'),
      label: newCatLabel.trim(),
      icon: newCatIcon,
      sort_order: nextOrder,
    } as any).select().single();
    if (error) { toast({ title: 'Fout', description: error.message, variant: 'destructive' }); }
    else if (data) {
      setAdminCategories([...adminCategories, data as any]);
      setNewCatValue('');
      setNewCatLabel('');
      setNewCatIcon('sparkles');
      toast({ title: 'Categorie toegevoegd!' });
    }
    setCatSaving(false);
  }

  async function updateCategory(id: string) {
    const { error } = await supabase.from('categories' as any).update({ label: editCatLabel, icon: editCatIcon } as any).eq('id', id);
    if (error) { toast({ title: 'Fout', description: error.message, variant: 'destructive' }); return; }
    setAdminCategories(cats => cats.map(c => c.id === id ? { ...c, label: editCatLabel, icon: editCatIcon } : c));
    setEditingCat(null);
    toast({ title: 'Categorie bijgewerkt' });
  }

  async function deleteCategory(id: string, label: string) {
    const { error } = await supabase.from('categories' as any).delete().eq('id', id);
    if (error) { toast({ title: 'Fout', description: error.message, variant: 'destructive' }); return; }
    setAdminCategories(cats => cats.filter(c => c.id !== id));
    toast({ title: 'Categorie verwijderd', description: `"${label}" is verwijderd.` });
  }

  async function loadAdminAlliances(force = false) {
    if (alliancesLoaded && !force) return;
    setAlliancesLoaded(true);
    // Load alliances
    const { data: allianceData } = await supabase.from('alliances' as any).select('*').order('created_at', { ascending: false });
    const allList = (allianceData as any[]) || [];
    setAdminAlliances(allList);

    if (allList.length === 0) return;

    const allianceIds = allList.map((a: any) => a.id);

    // Load members
    const { data: memberData } = await supabase.from('alliance_members' as any).select('*').in('alliance_id', allianceIds);
    const memberMap: Record<string, any[]> = {};
    (memberData as any[] || []).forEach(m => {
      if (!memberMap[m.alliance_id]) memberMap[m.alliance_id] = [];
      memberMap[m.alliance_id].push(m);
    });
    setAdminAllianceMembers(memberMap);

    // Load coins
    const { data: coinData } = await supabase.from('alliance_coins' as any).select('*').in('alliance_id', allianceIds);
    const coinMap: Record<string, number> = {};
    (coinData as any[] || []).forEach(c => { coinMap[c.alliance_id] = c.balance; });
    setAdminAllianceCoins(coinMap);

    // Load chats
    const { data: chatData } = await supabase.from('alliance_chat_messages' as any).select('*').in('alliance_id', allianceIds).order('created_at', { ascending: true }).limit(500);
    const chatMap: Record<string, any[]> = {};
    (chatData as any[] || []).forEach(c => {
      if (!chatMap[c.alliance_id]) chatMap[c.alliance_id] = [];
      chatMap[c.alliance_id].push(c);
    });
    setAdminAllianceChats(chatMap);

    // Load stats - get org IDs from members, then apps and views
    const allOrgIds = [...new Set((memberData as any[] || []).map(m => m.organization_id))];
    if (allOrgIds.length > 0) {
      const { data: appsData } = await supabase.from('apps').select('id, organization_id').in('organization_id', allOrgIds);
      const appsList = (appsData || []);
      const appIds = appsList.map(a => a.id);
      let viewCounts: Record<string, number> = {};
      if (appIds.length > 0) {
        const { data: viewData } = await supabase.from('app_views').select('app_id').in('app_id', appIds);
        (viewData || []).forEach(v => { viewCounts[v.app_id] = (viewCounts[v.app_id] || 0) + 1; });
      }

      const statsMap: Record<string, { apps: number; views: number }> = {};
      allianceIds.forEach(aid => {
        const orgIds = (memberMap[aid] || []).map(m => m.organization_id);
        const allianceApps = appsList.filter(a => orgIds.includes(a.organization_id));
        const totalViews = allianceApps.reduce((s, a) => s + (viewCounts[a.id] || 0), 0);
        statsMap[aid] = { apps: allianceApps.length, views: totalViews };
      });
      setAdminAllianceStats(statsMap);
    }
  }

  async function adminDeleteAlliance(id: string) {
    const alliance = adminAlliances.find(a => a.id === id);
    const { data, error } = await supabase.functions.invoke('admin-delete-resource', {
      body: { type: 'alliance', target_id: id },
    });
    if (error || data?.error) {
      toast({ title: 'Fout', description: error?.message || data?.error, variant: 'destructive' });
    } else {
      await logAction('Alliantie verwijderd', 'alliance', id, alliance?.name || '');
      setAdminAlliances(adminAlliances.filter(a => a.id !== id));
      toast({ title: 'Alliantie verwijderd' });
    }
  }

  async function adminUpdateCoins() {
    if (!coinUserId || !coinAmount) return;
    setCoinSaving(true);
    const { error } = await supabase.functions.invoke('admin-manage-coins', {
      body: { action: coinAction, user_id: coinUserId, amount: parseInt(coinAmount) },
    });
    if (error) {
      toast({ title: 'Fout', description: String(error), variant: 'destructive' });
    } else {
      toast({ title: 'Coins bijgewerkt!' });
      setCoinAmount('');
      await loadAllCoins();
      await logAction(`coins_${coinAction}`, 'user', coinUserId, `${coinAction === 'add' ? '+' : '='}${coinAmount}`);
    }
    setCoinSaving(false);
  }

  async function logAction(action: string, targetType: string, targetId?: string, details?: string) {
    if (!session?.user?.id) return;
    await (supabase.from('admin_activity_log' as any) as any).insert({
      admin_id: session.user.id,
      action,
      target_type: targetType,
      target_id: targetId || null,
      details: details || '',
    });
  }

  async function handleAdminChatSend(type: 'app' | 'org', targetId: string, replyKey: string) {
    const content = (chatReplyInputs[replyKey] || '').trim();
    if (!content) return;
    setChatSending(replyKey);
    try {
      const { data, error } = await supabase.functions.invoke('admin-send-chat', {
        body: { type, target_id: targetId, content },
      });
      if (error) throw error;
      setChatReplyInputs(prev => ({ ...prev, [replyKey]: '' }));
      // Refresh chats
      const { data: chatData } = await supabase.functions.invoke('admin-list-chats');
      if (chatData) {
        setAppChats(chatData.app_chats || []);
        setOrgChats(chatData.org_chats || []);
      }
      toast({ title: 'Bericht verstuurd' });
    } catch (e: any) {
      toast({ title: 'Fout', description: e.message, variant: 'destructive' });
    }
    setChatSending(null);
  }

  async function addCollaborator() {
    if (!collabEmail.trim() || !collabAppId) return;
    setCollabAdding(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-add-collaborator', {
        body: { email: collabEmail.trim(), app_id: collabAppId },
      });
      if (error) throw error;
      if (data?.error) {
        toast({ title: 'Fout', description: data.error, variant: 'destructive' });
      } else {
        toast({ title: 'Collaborator toegevoegd' });
        setCollabEmail('');
        setCollabAppId(null);
      }
    } catch (e: any) {
      toast({ title: 'Fout', description: e.message, variant: 'destructive' });
    }
    setCollabAdding(false);
  }

  async function removeRole(roleId: string) {
    const role = roles.find(r => r.id === roleId);
    if (role?.role === 'owner') {
      toast({ title: 'Niet toegestaan', description: 'De owner rol kan niet worden verwijderd.', variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('user_roles').delete().eq('id', roleId);
    if (error) {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    } else {
      await logAction('Rol verwijderd', 'user', role?.user_id, `Rol: ${role?.role}`);
      setRoles(roles.filter(r => r.id !== roleId));
      toast({ title: 'Rol verwijderd' });
    }
  }

  async function addRole() {
    if (!addRoleUserId.trim()) return;
    setAddingRole(true);
    const { error } = await supabase.from('user_roles').insert({
      user_id: addRoleUserId.trim(),
      role: addRoleValue,
    } as any);
    if (error) {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    } else {
      await logAction('Rol toegevoegd', 'user', addRoleUserId.trim(), `Rol: ${addRoleValue}`);
      toast({ title: 'Rol toegevoegd!' });
      setAddRoleUserId('');
      fetchAll();
    }
    setAddingRole(false);
  }

  async function manageUser(userId: string, action: 'ban' | 'unban' | 'delete') {
    setManagingUser(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-manage-user', {
        body: { target_user_id: userId, action },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const messages = { ban: 'Gebruiker geblokkeerd', unban: 'Gebruiker gedeblokkeerd', delete: 'Gebruiker verwijderd' };
      await logAction(messages[action], 'user', userId);
      toast({ title: messages[action] });
      setConfirmAction(null);
      fetchAll();
    } catch (e: any) {
      toast({ title: 'Fout', description: e.message, variant: 'destructive' });
    }
    setManagingUser(false);
  }

  function isUserBanned(userId: string): boolean {
    const authUser = authUsers.find(u => u.id === userId);
    return !!(authUser as any)?.banned_until && new Date((authUser as any).banned_until) > new Date();
  }

  function getUserEmail(userId: string) {
    return authUsers.find(u => u.id === userId)?.email || null;
  }

  function getUserNameText(userId: string) {
    const p = profiles.find(p => p.id === userId);
    if (p?.display_name) return p.display_name;
    const email = getUserEmail(userId);
    if (email) return email;
    return `${userId.slice(0, 8)}...`;
  }

  function getUserName(userId: string) {
    return getUserNameText(userId);
  }

  function UserLink({ userId, className }: { userId: string; className?: string }) {
    const name = getUserNameText(userId);
    const p = profiles.find(p => p.id === userId);
    const profileSlug = (p as any)?.username || userId;
    return (
      <span
        onClick={(e) => { e.stopPropagation(); navigate(`/profiel/${profileSlug}`); }}
        className={`cursor-pointer hover:text-primary hover:underline transition-colors ${className || ''}`}
      >
        {name}
      </span>
    );
  }

  function getUserAvatar(userId: string) {
    return profiles.find(p => p.id === userId)?.avatar_url || null;
  }

  const roleIcon = (role: string) => {
    if (role === 'owner') return <Crown className="h-4 w-4 text-amber-500" />;
    if (role === 'admin') return <Crown className="h-4 w-4 text-yellow-400" />;
    if (role === 'moderator') return <ShieldCheck className="h-4 w-4 text-primary" />;
    return <User className="h-4 w-4 text-muted-foreground" />;
  };

  const roleLabel = (role: string) => {
    if (role === 'owner') return 'Owner';
    if (role === 'admin') return 'Admin';
    if (role === 'moderator') return 'Moderator';
    return 'Gebruiker';
  };

  // === Ad CRUD ===
  function openAdForm(ad?: AdRow) {
    if (ad) {
      setEditingAd(ad);
      setAdForm({ emoji: ad.emoji, title: ad.title, description: ad.description, url: ad.url, gradient: ad.gradient, pages: ad.pages || ['dashboard', 'organizations'] });
    } else {
      setEditingAd(null);
      setAdForm({ emoji: '🚀', title: '', description: '', url: '', gradient: 'linear-gradient(135deg, hsl(200 40% 14%), hsl(var(--secondary)))', pages: ['dashboard', 'organizations'] });
    }
    setShowAdForm(true);
  }

  async function saveAd() {
    if (!adForm.title.trim()) return;
    setSavingAd(true);
    if (editingAd) {
      const { error } = await (supabase.from('ads' as any) as any).update({
        emoji: adForm.emoji,
        title: adForm.title,
        description: adForm.description,
        url: adForm.url,
        gradient: adForm.gradient,
        pages: adForm.pages,
      }).eq('id', editingAd.id);
      if (error) toast({ title: 'Fout', description: error.message, variant: 'destructive' });
      else {
        await logAction('Advertentie bijgewerkt', 'ad', editingAd.id, adForm.title);
        toast({ title: 'Advertentie bijgewerkt!' });
      }
    } else {
      const { error } = await (supabase.from('ads' as any) as any).insert({
        emoji: adForm.emoji,
        title: adForm.title,
        description: adForm.description,
        url: adForm.url,
        gradient: adForm.gradient,
        pages: adForm.pages,
        sort_order: ads.length,
      });
      if (error) toast({ title: 'Fout', description: error.message, variant: 'destructive' });
      else {
        await logAction('Advertentie aangemaakt', 'ad', undefined, adForm.title);
        toast({ title: 'Advertentie toegevoegd!' });
      }
    }
    setShowAdForm(false);
    setSavingAd(false);
    fetchAll();
  }

  async function toggleAdActive(ad: AdRow) {
    await (supabase.from('ads' as any) as any).update({ is_active: !ad.is_active }).eq('id', ad.id);
    await logAction(ad.is_active ? 'Advertentie gedeactiveerd' : 'Advertentie geactiveerd', 'ad', ad.id, ad.title);
    setAds(ads.map(a => a.id === ad.id ? { ...a, is_active: !a.is_active } : a));
  }

  async function deleteAd(id: string) {
    const ad = ads.find(a => a.id === id);
    const { error } = await (supabase.from('ads' as any) as any).delete().eq('id', id);
    if (error) toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    else {
      await logAction('Advertentie verwijderd', 'ad', id, ad?.title || '');
      setAds(ads.filter(a => a.id !== id));
      toast({ title: 'Advertentie verwijderd' });
    }
  }

  async function deleteApp(id: string) {
    const app = apps.find(a => a.id === id);
    const { data, error } = await supabase.functions.invoke('admin-delete-resource', {
      body: { type: 'app', target_id: id },
    });
    if (error || data?.error) {
      toast({ title: 'Fout', description: error?.message || data?.error, variant: 'destructive' });
    } else {
      await logAction('App verwijderd', 'app', id, app?.name || '');
      setApps(apps.filter(a => a.id !== id));
      toast({ title: 'App verwijderd' });
    }
  }

  async function deleteOrg(id: string) {
    const org = orgs.find(o => o.id === id);
    const { data, error } = await supabase.functions.invoke('admin-delete-resource', {
      body: { type: 'org', target_id: id },
    });
    if (error || data?.error) {
      toast({ title: 'Fout', description: error?.message || data?.error, variant: 'destructive' });
    } else {
      await logAction('Bedrijf verwijderd', 'org', id, org?.name || '');
      setOrgs(orgs.filter(o => o.id !== id));
      toast({ title: 'Bedrijf verwijderd' });
    }
  }

  async function handleConfirmAction() {
    if (!confirmAction) return;
    setManagingUser(true);
    try {
      if (confirmAction.type === 'user') {
        await manageUser(confirmAction.id, confirmAction.action as 'ban' | 'unban' | 'delete');
      } else if (confirmAction.type === 'app') {
        await deleteApp(confirmAction.id);
        setConfirmAction(null);
      } else if (confirmAction.type === 'org') {
        await deleteOrg(confirmAction.id);
        setConfirmAction(null);
      } else if (confirmAction.type === 'ad') {
        await deleteAd(confirmAction.id);
        setConfirmAction(null);
      } else if (confirmAction.type === 'alliance') {
        await adminDeleteAlliance(confirmAction.id);
        setConfirmAction(null);
      } else if (confirmAction.type === 'template') {
        await deleteTemplate(confirmAction.id, confirmAction.name);
        setConfirmAction(null);
      }
    } catch (e: any) {
      toast({ title: 'Fout', description: e.message, variant: 'destructive' });
    }
    setManagingUser(false);
  }

  const GRADIENT_PRESETS = [
    { label: 'Groen', value: 'linear-gradient(135deg, hsl(145 40% 14%), hsl(var(--secondary)))' },
    { label: 'Blauw', value: 'linear-gradient(135deg, hsl(200 40% 14%), hsl(var(--secondary)))' },
    { label: 'Paars', value: 'linear-gradient(135deg, hsl(280 40% 14%), hsl(var(--secondary)))' },
    { label: 'Goud', value: 'linear-gradient(135deg, hsl(40 40% 14%), hsl(var(--secondary)))' },
    { label: 'Rood', value: 'linear-gradient(135deg, hsl(0 40% 14%), hsl(var(--secondary)))' },
    { label: 'Roze', value: 'linear-gradient(135deg, hsl(330 40% 14%), hsl(var(--secondary)))' },
    { label: 'Cyaan', value: 'linear-gradient(135deg, hsl(180 40% 14%), hsl(var(--secondary)))' },
    { label: 'Oranje', value: 'linear-gradient(135deg, hsl(25 50% 14%), hsl(var(--secondary)))' },
    { label: 'Indigo', value: 'linear-gradient(135deg, hsl(240 40% 14%), hsl(var(--secondary)))' },
    { label: 'Lime', value: 'linear-gradient(135deg, hsl(80 40% 14%), hsl(var(--secondary)))' },
    { label: 'Magenta', value: 'linear-gradient(135deg, hsl(300 40% 14%), hsl(var(--secondary)))' },
    { label: 'Warm', value: 'linear-gradient(135deg, hsl(15 45% 16%), hsl(35 40% 12%))' },
    { label: 'Ocean', value: 'linear-gradient(135deg, hsl(210 50% 16%), hsl(190 40% 12%))' },
    { label: 'Sunset', value: 'linear-gradient(135deg, hsl(350 45% 16%), hsl(30 50% 12%))' },
    { label: 'Forest', value: 'linear-gradient(135deg, hsl(140 35% 14%), hsl(100 30% 10%))' },
    { label: 'Night', value: 'linear-gradient(135deg, hsl(250 35% 12%), hsl(220 40% 8%))' },
  ];

  if (isAdmin === null || loading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: 'hsl(var(--background))' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary/20 border-t-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center flex-col gap-4" style={{ background: 'hsl(var(--background))' }}>
        <Shield className="h-12 w-12 text-destructive" />
        <h1 className="text-xl font-bold text-foreground">Geen toegang</h1>
        <p className="text-muted-foreground text-sm">Je hebt geen admin rechten.</p>
        <button onClick={() => navigate('/')} className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
          Terug naar dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'hsl(var(--background))' }}>
      {/* Header */}
      <header className="border-b border-border/50 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between backdrop-blur-sm" style={{ background: 'hsl(var(--ide-toolbar) / 0.8)' }}>
        <div className="flex items-center gap-2 sm:gap-3">
          <button onClick={() => navigate('/')} className="p-1.5 sm:p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-destructive to-destructive/60 flex items-center justify-center">
            <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
          </div>
          <h1 className="text-base sm:text-xl font-bold text-foreground tracking-tight">Admin Paneel</h1>
        </div>
        <button
          onClick={async () => {
            await supabase.channel('admin-force-refresh').send({ type: 'broadcast', event: 'force-refresh', payload: {} });
            toast({ title: 'Force refresh verstuurd', description: 'Alle gebruikers worden nu herladen.' });
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Force Refresh Iedereen</span>
        </button>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 border-b border-border/50 pb-3 overflow-x-auto">
          <button
            onClick={() => setTab('users')}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${tab === 'users' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}
          >
            <Users className="h-3 w-3" />
            <span className="hidden xs:inline">Gebruikers & Rollen</span>
          </button>
          <button
            onClick={() => setTab('apps')}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${tab === 'apps' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}
          >
            <AppWindow className="h-3 w-3" />
            <span className="hidden xs:inline">Apps</span>
          </button>
          <button
            onClick={() => setTab('orgs')}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${tab === 'orgs' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}
          >
            <Building2 className="h-3 w-3" />
            <span className="hidden xs:inline">Bedrijven</span>
          </button>
          <button
            onClick={() => setTab('ads')}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${tab === 'ads' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}
          >
            <Megaphone className="h-3 w-3" />
            <span className="hidden xs:inline">Advertenties</span>
          </button>
          <button
            onClick={() => setTab('chats')}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${tab === 'chats' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}
          >
            <MessageCircle className="h-3 w-3" />
            <span className="hidden xs:inline">Chats</span>
          </button>
          <button
            onClick={() => { setTab('alliances'); loadAdminAlliances(); }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${tab === 'alliances' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}
          >
            <Handshake className="h-3 w-3" />
            <span className="hidden xs:inline">Allianties</span>
          </button>
          <button
            onClick={() => { setTab('templates'); loadAdminTemplates(); loadAdminCategories(); }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${tab === 'templates' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}
          >
            <BookTemplate className="h-3 w-3" />
            <span className="hidden xs:inline">Templates</span>
          </button>
          <button
            onClick={() => { setTab('categories'); loadAdminCategories(); }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${tab === 'categories' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}
          >
            <Tags className="h-3 w-3" />
            <span className="hidden xs:inline">Categorieën</span>
          </button>
          <button
            onClick={() => setTab('activity')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${tab === 'activity' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}
          >
            <Activity className="h-3 w-3" />
            <span className="hidden xs:inline">Activiteit</span>
          </button>
          <button
            onClick={() => { setTab('coins'); loadAllCoins(); }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${tab === 'coins' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}
          >
            <Coins className="h-3 w-3" />
            <span className="hidden xs:inline">Coins</span>
          </button>
        </div>

        {/* Users & Roles tab */}
        {tab === 'users' && (
          <div className="space-y-6">
            <div className="rounded-xl border border-border/50 p-5" style={{ background: 'hsl(var(--card))' }}>
              <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-primary" /> Rol toewijzen
              </h3>
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={addRoleUserId}
                  onChange={e => setAddRoleUserId(e.target.value)}
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">Selecteer gebruiker...</option>
                  {profiles.map(p => {
                    const email = getUserEmail(p.id);
                    const label = p.display_name ? `${p.display_name} (${email || p.id.slice(0, 8)})` : email || p.id.slice(0, 12);
                    return <option key={p.id} value={p.id}>{label}</option>;
                  })}
                </select>
                <select
                  value={addRoleValue}
                  onChange={e => setAddRoleValue(e.target.value as any)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="user">Gebruiker</option>
                  <option value="moderator">Moderator</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  onClick={addRole}
                  disabled={addingRole || !addRoleUserId}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-95"
                >
                  {addingRole ? 'Toevoegen...' : 'Toevoegen'}
                </button>
              </div>
            </div>

            {/* Country distribution */}
            {(() => {
              const countryCounts: Record<string, number> = {};
              let unknownCount = 0;
              profiles.forEach(p => {
                if (p.country) countryCounts[p.country] = (countryCounts[p.country] || 0) + 1;
                else unknownCount++;
              });
              const chartData = Object.entries(countryCounts).map(([country, count]) => ({ country, count })).sort((a, b) => b.count - a.count);
              if (unknownCount > 0) chartData.push({ country: '??', count: unknownCount });
              const COLORS = ['hsl(var(--primary))','hsl(var(--accent))','hsl(210 60% 50%)','hsl(150 50% 45%)','hsl(30 70% 50%)','hsl(280 50% 55%)','hsl(0 60% 50%)','hsl(180 50% 45%)','hsl(60 60% 45%)'];
              return chartData.length > 0 ? (
                <div className="space-y-4">
                  {/* World map */}
                  <div className="rounded-xl border border-border/50 p-5" style={{ background: 'hsl(var(--card))' }}>
                    <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2"><Globe className="h-4 w-4 text-primary" /> Wereldkaart</h3>
                    <WorldMapChart
                      countryCounts={countryCounts}
                      selectedCountry={countryFilter !== 'all' && countryFilter !== 'unknown' ? countryFilter : undefined}
                      onCountryClick={(code) => setCountryFilter(countryFilter === code ? 'all' : code)}
                    />
                  </div>
                  {/* Bar chart */}
                  <div className="rounded-xl border border-border/50 p-5" style={{ background: 'hsl(var(--card))' }}>
                    <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> Gebruikers per land</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} layout="vertical" margin={{ left: 40, right: 20, top: 5, bottom: 5 }}>
                          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                          <YAxis type="category" dataKey="country" tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }} width={50} tickFormatter={(v: string) => v === '??' ? 'Onbekend' : v} />
                          <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12, color: 'hsl(var(--foreground))' }} formatter={(value: number) => [`${value} gebruiker${value !== 1 ? 's' : ''}`, 'Aantal']} labelFormatter={(l: string) => l === '??' ? 'Onbekend' : `Land: ${l}`} />
                          <Bar dataKey="count" radius={[0, 6, 6, 0]}>{chartData.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}</Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              ) : null;
            })()}

            <div className="rounded-xl border border-border/50 p-5" style={{ background: 'hsl(var(--card))' }}>
              {(() => {
                const uniqueCountries = [...new Set(profiles.map(p => p.country).filter(Boolean))].sort() as string[];
                const filteredProfiles = countryFilter === 'all' ? profiles : profiles.filter(p => countryFilter === 'unknown' ? !p.country : p.country === countryFilter);
                return (
                  <>
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" /> Alle gebruikers ({filteredProfiles.length}{countryFilter !== 'all' ? ` / ${profiles.length}` : ''})
                      </h3>
                      <div className="flex items-center gap-2">
                        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                        <select
                          value={countryFilter}
                          onChange={e => setCountryFilter(e.target.value)}
                          className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                        >
                          <option value="all">Alle landen</option>
                          {uniqueCountries.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                          <option value="unknown">Onbekend</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                {filteredProfiles.map(profile => {
                  const userRoles = roles.filter(r => r.user_id === profile.id);
                  const email = getUserEmail(profile.id);
                  const authUser = authUsers.find(u => u.id === profile.id);
                  const displayLabel = profile.display_name || email || `${profile.id.slice(0, 12)}...`;
                  const initials = (profile.display_name || email || profile.id).slice(0, 2).toUpperCase();
                  return (
                    <div key={profile.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg px-4 py-3 bg-background/50">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-8 w-8 border border-border/50 shrink-0">
                          {profile.avatar_url ? <AvatarImage src={profile.avatar_url} alt="" /> : null}
                          <AvatarFallback className="text-[10px] font-bold bg-primary/20 text-primary">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate"><UserLink userId={profile.id} /></p>
                          {email && profile.display_name && <p className="text-[11px] text-muted-foreground truncate">{email}</p>}
                          {profile.bio && <p className="text-[11px] text-muted-foreground truncate">{profile.bio}</p>}
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                            {profile.country && (
                              <span className="inline-flex items-center gap-0.5" title={profile.country}>
                                <img
                                  src={`https://flagcdn.com/16x12/${profile.country.toLowerCase()}.png`}
                                  alt={profile.country}
                                  className="h-3 w-4 object-cover rounded-[2px]"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                                <span className="text-[10px]">{profile.country}</span>
                              </span>
                            )}
                            <span>
                              {authUser?.last_sign_in_at ? `Laatst actief: ${new Date(authUser.last_sign_in_at).toLocaleDateString('nl-NL', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` : 'Nog niet ingelogd'}
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {userRoles.length === 0 && (
                          <span className="text-xs text-muted-foreground italic">Geen rollen</span>
                        )}
                          {userRoles.map(r => (
                          <div key={r.id} className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-secondary text-xs font-medium text-foreground">
                            {roleIcon(r.role)}
                            {roleLabel(r.role)}
                            {r.role !== 'owner' && (
                              <button onClick={() => removeRole(r.id)} className="ml-1 text-muted-foreground hover:text-destructive transition-colors">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        ))}
                        {isUserBanned(profile.id) && (
                          <span className="px-2 py-1 rounded-full bg-destructive/20 text-destructive text-xs font-medium">Geblokkeerd</span>
                        )}
                        {/* Ban/Unban & Delete - only show for non-self users */}
                        {profile.id !== session?.user?.id && (
                          <div className="flex items-center gap-1 ml-1">
                            {isUserBanned(profile.id) ? (
                              <button
                                onClick={() => setConfirmAction({ id: profile.id, action: 'unban', type: 'user', name: displayLabel })}
                                className="p-1 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                title="Deblokkeren"
                              >
                                <ShieldOff className="h-3.5 w-3.5" />
                              </button>
                            ) : (
                              <button
                                onClick={() => setConfirmAction({ id: profile.id, action: 'ban', type: 'user', name: displayLabel })}
                                className="p-1 rounded-lg text-muted-foreground hover:text-orange-500 hover:bg-orange-500/10 transition-colors"
                                title="Blokkeren"
                              >
                                <Ban className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => setConfirmAction({ id: profile.id, action: 'delete', type: 'user', name: displayLabel })}
                              className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                              title="Verwijderen"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* Apps tab */}
        {tab === 'apps' && (
          <div className="rounded-xl border border-border/50 p-5" style={{ background: 'hsl(var(--card))' }}>
            <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              <AppWindow className="h-4 w-4 text-accent" /> Alle apps ({apps.length})
            </h3>
            <div className="space-y-2">
              {apps.map(app => (
                <div
                  key={app.id}
                  className="flex items-center justify-between rounded-lg px-4 py-3 bg-background/50 hover:bg-secondary/30 transition-colors"
                >
                  <div className="min-w-0 flex-1 cursor-pointer" onClick={() => navigate(`/editor/${app.id}`)}>
                    <p className="text-sm font-semibold text-foreground truncate">{app.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Eigenaar: <UserLink userId={app.owner_id} /> · {app.is_public ? '🌍 Publiek' : '🔒 Privé'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {new Date(app.updated_at).toLocaleDateString('nl-NL', { month: 'short', day: 'numeric' })}
                    </span>
                    <button
                      onClick={async () => {
                        const { data, error } = await supabase.functions.invoke('admin-delete-resource', {
                          body: { type: 'toggle_public', target_id: app.id },
                        });
                        if (error || data?.error) {
                          toast({ title: 'Fout', description: error?.message || data?.error, variant: 'destructive' });
                        } else {
                          setApps(apps.map(a => a.id === app.id ? { ...a, is_public: data.is_public } : a));
                          await logAction(data.is_public ? 'App publiek gemaakt' : 'App privé gemaakt', 'app', app.id, app.name);
                          toast({ title: data.is_public ? '🌍 App is nu publiek' : '🔒 App is nu privé' });
                        }
                      }}
                      className={`p-1 rounded-lg transition-colors ${app.is_public ? 'text-emerald-500 hover:text-muted-foreground hover:bg-secondary/50' : 'text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10'}`}
                      title={app.is_public ? 'Maak privé' : 'Maak publiek'}
                    >
                      {app.is_public ? <Globe className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      onClick={() => { setCollabAppId(app.id); setCollabEmail(''); }}
                      className="p-1 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                      title="Persoon toevoegen"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setConfirmAction({ id: app.id, action: 'delete', type: 'app', name: app.name })}
                      className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Verwijderen"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {/* Add collaborator inline form */}
              {collabAppId && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 mt-2">
                  <p className="text-xs font-semibold text-foreground mb-2">
                    Persoon toevoegen aan: <span className="text-primary">{apps.find(a => a.id === collabAppId)?.name}</span>
                  </p>
                  <div className="flex gap-2">
                    <input
                      className="flex-1 rounded-lg bg-background border border-border px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                      placeholder="E-mailadres van de gebruiker..."
                      value={collabEmail}
                      onChange={e => setCollabEmail(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addCollaborator()}
                      disabled={collabAdding}
                    />
                    <button
                      onClick={addCollaborator}
                      disabled={collabAdding || !collabEmail.trim()}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
                    >
                      {collabAdding ? '...' : 'Toevoegen'}
                    </button>
                    <button
                      onClick={() => setCollabAppId(null)}
                      className="px-2 py-1.5 text-xs rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    >
                      Annuleer
                    </button>
                  </div>
                </div>
              )}
              {apps.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Geen apps gevonden.</p>}
            </div>
          </div>
        )}

        {/* Orgs tab */}
        {tab === 'orgs' && (
          <div className="rounded-xl border border-border/50 p-5" style={{ background: 'hsl(var(--card))' }}>
            <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-accent" /> Alle bedrijven ({orgs.length})
            </h3>
            <div className="space-y-2">
              {orgs.map(org => {
                const levelNames: Record<number, string> = { 1:'Starter', 2:'Groeier', 3:'Professional', 4:'Enterprise', 5:'Legende', 6:'Titan', 7:'Mythisch', 8:'Onsterfelijk', 9:'Goddelijk', 10:'Oppermacht' };
                const levelIcons: Record<number, string> = { 1:'🏠', 2:'🌱', 3:'⚡', 4:'💎', 5:'👑', 6:'🔱', 7:'🐉', 8:'⭐', 9:'🌟', 10:'🏆' };
                const lvl = org.level ?? 1;
                return (
                  <div key={org.id} className="flex items-center justify-between rounded-lg px-4 py-3 bg-background/50 gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate">{org.name}</p>
                      <p className="text-[11px] text-muted-foreground">Eigenaar: <UserLink userId={org.owner_id} /></p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {levelIcons[lvl] || '🏠'} Level {lvl} — {levelNames[lvl] || 'Onbekend'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <select
                        value={lvl}
                        onChange={async (e) => {
                          const newLevel = parseInt(e.target.value);
                          const { error } = await supabase.from('organizations').update({ level: newLevel } as any).eq('id', org.id);
                          if (error) {
                            toast({ title: 'Fout', description: error.message, variant: 'destructive' });
                          } else {
                            setOrgs(orgs.map(o => o.id === org.id ? { ...o, level: newLevel } : o));
                            toast({ title: `${org.name} → Level ${newLevel} (${levelNames[newLevel]})` });
                          }
                        }}
                        className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                      >
                        {Array.from({ length: 10 }, (_, i) => i + 1).map(l => (
                          <option key={l} value={l}>{levelIcons[l]} Lvl {l} — {levelNames[l]}</option>
                        ))}
                      </select>
                      <button
                        onClick={async () => {
                          if (!confirm(`Level van "${org.name}" resetten naar 1?`)) return;
                          const { error } = await supabase.from('organizations').update({ level: 1 } as any).eq('id', org.id);
                          if (!error) {
                            setOrgs(orgs.map(o => o.id === org.id ? { ...o, level: 1 } : o));
                            toast({ title: `${org.name} gereset naar Level 1` });
                          }
                        }}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                        title="Reset naar Level 1"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setConfirmAction({ id: org.id, action: 'delete', type: 'org', name: org.name })}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Verwijderen"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
              {orgs.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Geen bedrijven gevonden.</p>}
            </div>
          </div>
        )}

        {/* Ads tab */}
        {tab === 'ads' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-primary" /> Advertenties ({ads.length})
              </h3>
              <button
                onClick={() => openAdForm()}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-95"
              >
                <Plus className="h-4 w-4" /> Nieuwe ad
              </button>
            </div>

            <div className="space-y-2">
              {ads.map(ad => (
                <div
                  key={ad.id}
                  className="rounded-xl border border-border/50 overflow-hidden"
                  style={{ background: 'hsl(var(--card))' }}
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-lg"
                      style={{ background: ad.gradient }}
                    >
                      {ad.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground truncate">{ad.title}</p>
                        {!ad.is_active && (
                          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">Inactief</span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">{ad.description}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        {(ad.pages || []).map(p => (
                          <span key={p} className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                            {PAGE_OPTIONS.find(o => o.value === p)?.label || p}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => toggleAdActive(ad)}
                        className={`p-1.5 rounded-lg transition-colors ${ad.is_active ? 'text-primary hover:bg-primary/10' : 'text-muted-foreground hover:bg-secondary/50'}`}
                        title={ad.is_active ? 'Deactiveren' : 'Activeren'}
                      >
                        {ad.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => openAdForm(ad)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                        title="Bewerken"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setConfirmAction({ id: ad.id, action: 'delete', type: 'ad', name: ad.title })}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Verwijderen"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {ads.length === 0 && (
                <div className="rounded-xl border border-border/50 p-8 text-center" style={{ background: 'hsl(var(--card))' }}>
                  <Megaphone className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Nog geen advertenties. Klik op "Nieuwe ad" om er een aan te maken.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Templates tab */}
        {tab === 'templates' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <BookTemplate className="h-4 w-4 text-primary" /> Templates ({adminTemplates.length})
            </h3>
            {adminTemplates.length === 0 ? (
              <p className="text-sm text-muted-foreground">Geen templates gevonden.</p>
            ) : (
              <div className="space-y-2">
                {adminTemplates.map(t => (
                  <div key={t.id} className="rounded-xl border border-border/50 p-4" style={{ background: 'hsl(var(--card))' }}>
                    {editingTemplate === t.id ? (
                      <div className="space-y-3">
                        <div>
                          <label className="text-[11px] text-muted-foreground mb-1 block">Naam</label>
                          <input
                            value={templateEditName}
                            onChange={e => setTemplateEditName(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-border/40 bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-muted-foreground mb-1 block">Categorie</label>
                          <div className="flex flex-wrap gap-1.5">
                            {(adminCategories.length > 0 ? adminCategories.map(c => c.value) : ['algemeen', 'game', 'tool', 'shop', 'educatie']).map(cat => (
                              <button
                                key={cat}
                                onClick={() => setTemplateEditCategory(cat)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                  templateEditCategory === cat
                                    ? 'border-primary/40 bg-primary/10 text-primary'
                                    : 'border-border/40 text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                                }`}
                              >
                                {cat}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-[11px] text-muted-foreground mb-1 block">Beschrijving</label>
                          <textarea
                            value={templateEditDescription}
                            onChange={e => setTemplateEditDescription(e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 rounded-lg border border-border/40 bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-muted-foreground mb-1 block">Zichtbaarheid</label>
                          <div className="flex flex-wrap gap-1.5">
                            {[
                              { value: 'public', label: '🌍 Publiek' },
                              { value: 'friends', label: '👥 Vrienden' },
                              { value: 'org', label: '🏢 Bedrijf' },
                            ].map(vis => (
                              <button
                                key={vis.value}
                                onClick={() => setTemplateEditVisibility(vis.value)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                  templateEditVisibility === vis.value
                                    ? 'border-primary/40 bg-primary/10 text-primary'
                                    : 'border-border/40 text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                                }`}
                              >
                                {vis.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => saveTemplateEdit(t.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
                            <Save className="h-3.5 w-3.5" /> Opslaan
                          </button>
                          <button onClick={() => setEditingTemplate(null)} className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
                            Annuleren
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground truncate">{t.name}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground capitalize">{t.category}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent capitalize">{t.visibility === 'friends' ? '👥 Vrienden' : t.visibility === 'org' ? '🏢 Bedrijf' : '🌍 Publiek'}</span>
                            {!t.is_published && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Concept</span>}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{t.description ? `${t.description.slice(0, 60)}${t.description.length > 60 ? '...' : ''} · ` : ''}{t.downloads} downloads · {new Date(t.created_at).toLocaleDateString('nl')}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => { setEditingTemplate(t.id); setTemplateEditName(t.name); setTemplateEditCategory(t.category); setTemplateEditDescription(t.description || ''); setTemplateEditVisibility(t.visibility || 'public'); }}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                            title="Bewerken"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setConfirmAction({ id: t.id, action: 'delete', type: 'template', name: t.name })}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title="Verwijderen"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Categories tab */}
        {tab === 'categories' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Tags className="h-4 w-4 text-primary" /> Categorieën ({adminCategories.length})
            </h3>
            
            {/* Add new category */}
            <div className="rounded-xl border border-border/50 p-4" style={{ background: 'hsl(var(--card))' }}>
              <h4 className="text-xs font-semibold text-muted-foreground mb-3">Nieuwe categorie</h4>
              <div className="flex flex-wrap gap-2 items-end">
                <div className="flex-1 min-w-[140px]">
                  <label className="text-[10px] text-muted-foreground block mb-1">Value (uniek)</label>
                  <input
                    value={newCatValue}
                    onChange={e => setNewCatValue(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))}
                    placeholder="bijv. sport"
                    className="w-full px-3 py-2 rounded-lg border border-border/40 bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="flex-1 min-w-[140px]">
                  <label className="text-[10px] text-muted-foreground block mb-1">Label</label>
                  <input
                    value={newCatLabel}
                    onChange={e => setNewCatLabel(e.target.value)}
                    placeholder="bijv. Sport"
                    className="w-full px-3 py-2 rounded-lg border border-border/40 bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="w-[140px]">
                  <label className="text-[10px] text-muted-foreground block mb-1">Icoon (lucide)</label>
                  <input
                    value={newCatIcon}
                    onChange={e => setNewCatIcon(e.target.value.toLowerCase())}
                    placeholder="sparkles"
                    className="w-full px-3 py-2 rounded-lg border border-border/40 bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <button
                  onClick={addCategory}
                  disabled={catSaving || !newCatValue.trim() || !newCatLabel.trim()}
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {catSaving ? 'Toevoegen...' : <><Plus className="h-4 w-4 inline mr-1" /> Toevoegen</>}
                </button>
              </div>
            </div>

            {/* Category list */}
            {adminCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground">Geen categorieën gevonden.</p>
            ) : (
              <div className="space-y-2">
                {adminCategories.map(cat => (
                  <div key={cat.id} className="rounded-xl border border-border/50 p-4" style={{ background: 'hsl(var(--card))' }}>
                    {editingCat === cat.id ? (
                      <div className="flex flex-wrap gap-2 items-end">
                        <div className="flex-1 min-w-[140px]">
                          <label className="text-[10px] text-muted-foreground block mb-1">Value (niet wijzigbaar)</label>
                          <input
                            value={cat.value}
                            disabled
                            className="w-full px-3 py-2 rounded-lg border border-border/40 bg-muted text-sm text-muted-foreground"
                          />
                        </div>
                        <div className="flex-1 min-w-[140px]">
                          <label className="text-[10px] text-muted-foreground block mb-1">Label</label>
                          <input
                            value={editCatLabel}
                            onChange={e => setEditCatLabel(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-border/40 bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        </div>
                        <div className="w-[140px]">
                          <label className="text-[10px] text-muted-foreground block mb-1">Icoon</label>
                          <input
                            value={editCatIcon}
                            onChange={e => setEditCatIcon(e.target.value.toLowerCase())}
                            className="w-full px-3 py-2 rounded-lg border border-border/40 bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        </div>
                        <button
                          onClick={() => updateCategory(cat.id)}
                          className="px-3 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                        >
                          <Save className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setEditingCat(null)}
                          className="px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                        >
                          Annuleren
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono px-2 py-1 rounded bg-secondary text-muted-foreground">{cat.value}</span>
                          <span className="text-sm font-semibold text-foreground">{cat.label}</span>
                          <span className="text-xs text-muted-foreground">icoon: {cat.icon}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => { setEditingCat(cat.id); setEditCatLabel(cat.label); setEditCatIcon(cat.icon); }}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                            title="Bewerken"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => deleteCategory(cat.id, cat.label)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title="Verwijderen"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Activity tab */}
        {tab === 'activity' && (
          <div className="rounded-xl border border-border/50 p-5" style={{ background: 'hsl(var(--card))' }}>
            <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Recente activiteiten ({activityLogs.length})
            </h3>
            {activityLogs.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Nog geen activiteiten gelogd.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {activityLogs.map((log: any) => {
                  const adminName = getUserName(log.admin_id);
                  const targetName = log.target_id ? getUserName(log.target_id) : null;
                  const time = new Date(log.created_at);
                  const timeStr = time.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
                  
                  const actionIcons: Record<string, JSX.Element> = {
                    'Rol toegevoegd': <UserPlus className="h-3.5 w-3.5 text-primary" />,
                    'Rol verwijderd': <Trash2 className="h-3.5 w-3.5 text-orange-500" />,
                    'Gebruiker geblokkeerd': <Ban className="h-3.5 w-3.5 text-orange-500" />,
                    'Gebruiker gedeblokkeerd': <ShieldOff className="h-3.5 w-3.5 text-primary" />,
                    'Gebruiker verwijderd': <Trash2 className="h-3.5 w-3.5 text-destructive" />,
                    'Advertentie aangemaakt': <Plus className="h-3.5 w-3.5 text-primary" />,
                    'Advertentie bijgewerkt': <Pencil className="h-3.5 w-3.5 text-primary" />,
                    'Advertentie verwijderd': <Trash2 className="h-3.5 w-3.5 text-destructive" />,
                    'Advertentie geactiveerd': <Eye className="h-3.5 w-3.5 text-primary" />,
                    'Advertentie gedeactiveerd': <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />,
                  };

                  return (
                    <div key={log.id} className="flex items-start gap-3 rounded-lg px-3 py-2.5 bg-background/50 hover:bg-secondary/20 transition-colors">
                      <div className="mt-0.5 p-1.5 rounded-lg bg-secondary/60 shrink-0">
                        {actionIcons[log.action] || <Activity className="h-3.5 w-3.5 text-muted-foreground" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground">
                          <span className="font-semibold">{adminName}</span>
                          {' '}<span className="text-muted-foreground">{log.action.toLowerCase()}</span>
                          {targetName && log.target_type === 'user' && (
                            <>{' '}<span className="font-medium">{targetName}</span></>
                          )}
                          {log.details && (
                            <span className="text-muted-foreground"> · {log.details}</span>
                          )}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{timeStr}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Coins tab */}
        {tab === 'coins' && (
          <div className="rounded-xl border border-border/50 p-5" style={{ background: 'hsl(var(--card))' }}>
            <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              <Coins className="h-4 w-4 text-primary" /> Coins beheren
            </h3>

            {/* Give coins form */}
            <div className="flex flex-wrap items-end gap-3 mb-6 p-4 rounded-lg border border-border/40" style={{ background: 'hsl(var(--background))' }}>
              <div className="flex-1 min-w-[180px]">
                <label className="block text-xs font-medium text-muted-foreground mb-1">Gebruiker</label>
                <select
                  value={coinUserId}
                  onChange={e => setCoinUserId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                >
                  <option value="">Selecteer gebruiker...</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.display_name || authUsers.find(u => u.id === p.id)?.email || p.id.slice(0, 8)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-24">
                <label className="block text-xs font-medium text-muted-foreground mb-1">Actie</label>
                <select
                  value={coinAction}
                  onChange={e => setCoinAction(e.target.value as 'add' | 'set')}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                >
                  <option value="add">Toevoegen</option>
                  <option value="set">Instellen</option>
                </select>
              </div>
              <div className="w-28">
                <label className="block text-xs font-medium text-muted-foreground mb-1">Aantal</label>
                <input
                  type="number"
                  value={coinAmount}
                  onChange={e => setCoinAmount(e.target.value)}
                  placeholder="100"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
              <button
                onClick={adminUpdateCoins}
                disabled={coinSaving || !coinUserId || !coinAmount}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {coinSaving ? '...' : 'Opslaan'}
              </button>
            </div>

            {/* Coins overview */}
            {userCoins.length === 0 ? (
              <p className="text-sm text-muted-foreground">Geen coins data gevonden.</p>
            ) : (
              <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
                {userCoins.map(uc => {
                  const profile = profiles.find(p => p.id === uc.user_id);
                  const email = authUsers.find(u => u.id === uc.user_id)?.email;
                  return (
                    <div key={uc.user_id} className="flex items-center justify-between rounded-lg px-3 py-2.5 bg-background/50 hover:bg-secondary/20 transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        <User className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm text-foreground truncate">{profile?.display_name || email || uc.user_id.slice(0, 8)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-primary">{uc.balance}</span>
                        <Coins className="h-3.5 w-3.5 text-primary/60" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Alliances tab */}
        {tab === 'alliances' && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Handshake className="h-4 w-4 text-primary" /> Allianties ({adminAlliances.length})
            </h3>

            {adminAlliances.length === 0 ? (
              <p className="text-sm text-muted-foreground">Geen allianties gevonden.</p>
            ) : (
              <div className="space-y-4">
                {adminAlliances.map(alliance => {
                  const mems = adminAllianceMembers[alliance.id] || [];
                  const coinBalance = adminAllianceCoins[alliance.id] ?? 0;
                  const chats = adminAllianceChats[alliance.id] || [];
                  const stats = adminAllianceStats[alliance.id] || { apps: 0, views: 0 };
                  const isExpanded = selectedAdminAlliance === alliance.id;

                  return (
                    <div key={alliance.id} className="rounded-xl border border-border/50 overflow-hidden" style={{ background: 'hsl(var(--card))' }}>
                      {/* Alliance header */}
                      <div
                        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-secondary/20 transition-colors"
                        onClick={() => setSelectedAdminAlliance(isExpanded ? null : alliance.id)}
                      >
                        <span className="text-xl">{alliance.icon}</span>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-foreground">{alliance.name}</h4>
                          <p className="text-[10px] text-muted-foreground">
                            Door {getUserName(alliance.created_by)} · {mems.length} bedrijven · {coinBalance} coins · {stats.apps} apps · {stats.views} views
                          </p>
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); setConfirmAction({ id: alliance.id, action: 'delete', type: 'alliance', name: alliance.name }); }}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="border-t border-border/30 p-4 space-y-4">
                          {/* Stats */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="rounded-lg p-3 bg-secondary/20">
                              <p className="text-[10px] text-muted-foreground">Bedrijven</p>
                              <p className="text-lg font-bold text-foreground">{mems.length}</p>
                            </div>
                            <div className="rounded-lg p-3 bg-secondary/20">
                              <p className="text-[10px] text-muted-foreground">Kluis</p>
                              <p className="text-lg font-bold text-foreground">{coinBalance}</p>
                            </div>
                            <div className="rounded-lg p-3 bg-secondary/20">
                              <p className="text-[10px] text-muted-foreground">Apps</p>
                              <p className="text-lg font-bold text-foreground">{stats.apps}</p>
                            </div>
                            <div className="rounded-lg p-3 bg-secondary/20">
                              <p className="text-[10px] text-muted-foreground">Views</p>
                              <p className="text-lg font-bold text-foreground">{stats.views}</p>
                            </div>
                          </div>

                          {/* Members */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="text-xs font-semibold text-muted-foreground">Leden</h5>
                              <div className="flex items-center gap-2">
                                <select
                                  className="rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                                  id={`add-org-${alliance.id}`}
                                  defaultValue=""
                                >
                                  <option value="" disabled>Bedrijf toevoegen...</option>
                                  {orgs.filter(o => !mems.some(m => m.organization_id === o.id)).map(o => (
                                    <option key={o.id} value={o.id}>{o.name}</option>
                                  ))}
                                </select>
                                <button
                                  onClick={async () => {
                                    const select = document.getElementById(`add-org-${alliance.id}`) as HTMLSelectElement;
                                    const orgId = select?.value;
                                    if (!orgId) return;
                                    const { data, error } = await supabase.functions.invoke('admin-delete-resource', {
                                      body: { type: 'alliance_add_member', target_id: alliance.id, org_id: orgId },
                                    });
                                    if (error || data?.error) {
                                      toast({ title: 'Fout', description: error?.message || data?.error, variant: 'destructive' });
                                    } else {
                                      toast({ title: 'Bedrijf toegevoegd!' });
                                      loadAdminAlliances(true);
                                    }
                                  }}
                                  className="px-2 py-1 rounded-lg text-[11px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                            <div className="space-y-1">
                              {mems.map(m => {
                                const orgName = orgs.find(o => o.id === m.organization_id)?.name || m.organization_id.slice(0, 8);
                                return (
                                  <div key={m.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-background/50 text-sm">
                                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="text-foreground flex-1">{orgName}</span>
                                    <span className="text-[10px] text-muted-foreground">{new Date(m.joined_at).toLocaleDateString('nl-NL')}</span>
                                    <button
                                      onClick={async () => {
                                        if (!confirm(`${orgName} verwijderen uit deze alliantie?`)) return;
                                        const { data, error } = await supabase.functions.invoke('admin-delete-resource', {
                                          body: { type: 'alliance_remove_member', target_id: m.id },
                                        });
                                        if (error || data?.error) {
                                          toast({ title: 'Fout', description: error?.message || data?.error, variant: 'destructive' });
                                        } else {
                                          toast({ title: 'Bedrijf verwijderd uit alliantie' });
                                          loadAdminAlliances(true);
                                        }
                                      }}
                                      className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Chat messages */}
                          <div>
                            <h5 className="text-xs font-semibold text-muted-foreground mb-2">
                              <MessageCircle className="h-3 w-3 inline mr-1" />
                              Chat ({chats.length} berichten)
                            </h5>
                            {chats.length === 0 ? (
                              <p className="text-xs text-muted-foreground">Geen berichten.</p>
                            ) : (
                              <div className="max-h-[200px] overflow-y-auto space-y-1.5 rounded-lg border border-border/30 p-3 bg-background/50">
                                {chats.map(msg => (
                                  <div key={msg.id} className="text-xs">
                                    <span className="font-medium text-primary">{getUserName(msg.user_id)}</span>
                                    <span className="text-muted-foreground mx-1">·</span>
                                    <span className="text-muted-foreground">{new Date(msg.created_at).toLocaleString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                    <p className="text-foreground mt-0.5">{msg.content}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'chats' && (
          <div className="space-y-6">
            {/* App chats grouped by app */}
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                <AppWindow className="h-4 w-4 text-primary" /> App Chats ({appChats.length})
              </h3>
              {(() => {
                const grouped: Record<string, any[]> = {};
                appChats.forEach(msg => {
                  if (!grouped[msg.app_id]) grouped[msg.app_id] = [];
                  grouped[msg.app_id].push(msg);
                });
                const appIds = Object.keys(grouped);
                if (appIds.length === 0) return (
                  <div className="rounded-xl border border-border/50 p-8 text-center" style={{ background: 'hsl(var(--card))' }}>
                    <MessageCircle className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Geen app-chatberichten gevonden.</p>
                  </div>
                );
                return appIds.map(appId => {
                  const appName = apps.find(a => a.id === appId)?.name || appId.slice(0, 8);
                  const msgs = grouped[appId].sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                  const replyKey = `app-${appId}`;
                  return (
                    <div key={appId} className="rounded-xl border border-border/50 overflow-hidden mb-3" style={{ background: 'hsl(var(--card))' }}>
                      <div className="px-4 py-2 border-b border-border/30 flex items-center gap-2">
                        <AppWindow className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs font-semibold text-foreground">{appName}</span>
                      </div>
                      <div className="max-h-[300px] overflow-y-auto divide-y divide-border/30">
                        {msgs.map((msg: any) => {
                          const timeStr = new Date(msg.created_at).toLocaleString('nl-NL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
                          return (
                            <div key={msg.id} className="px-4 py-2 flex items-start gap-3">
                              <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                <MessageCircle className="h-3 w-3 text-primary" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-semibold text-foreground">{msg.user_email || 'Onbekend'}</span>
                                  <span className="text-[10px] text-muted-foreground ml-auto">{timeStr}</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5 break-words">{msg.content}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="border-t border-border/30 p-2 flex gap-1.5">
                        <input
                          className="flex-1 rounded-lg bg-background border border-border px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                          placeholder="Typ een bericht als admin..."
                          value={chatReplyInputs[replyKey] || ''}
                          onChange={e => setChatReplyInputs(prev => ({ ...prev, [replyKey]: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAdminChatSend('app', appId, replyKey)}
                          disabled={chatSending === replyKey}
                        />
                        <button
                          onClick={() => handleAdminChatSend('app', appId, replyKey)}
                          disabled={chatSending === replyKey || !(chatReplyInputs[replyKey] || '').trim()}
                          className="rounded-lg p-1.5 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
                        >
                          <Send className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Org chats grouped by org */}
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                <Building2 className="h-4 w-4 text-primary" /> Bedrijf Chats ({orgChats.length})
              </h3>
              {(() => {
                const grouped: Record<string, any[]> = {};
                orgChats.forEach(msg => {
                  if (!grouped[msg.organization_id]) grouped[msg.organization_id] = [];
                  grouped[msg.organization_id].push(msg);
                });
                const orgIds = Object.keys(grouped);
                if (orgIds.length === 0) return (
                  <div className="rounded-xl border border-border/50 p-8 text-center" style={{ background: 'hsl(var(--card))' }}>
                    <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Geen bedrijf-chatberichten gevonden.</p>
                  </div>
                );
                return orgIds.map(orgId => {
                  const orgName = orgs.find(o => o.id === orgId)?.name || orgId.slice(0, 8);
                  const msgs = grouped[orgId].sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                  const replyKey = `org-${orgId}`;
                  return (
                    <div key={orgId} className="rounded-xl border border-border/50 overflow-hidden mb-3" style={{ background: 'hsl(var(--card))' }}>
                      <div className="px-4 py-2 border-b border-border/30 flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs font-semibold text-foreground">{orgName}</span>
                      </div>
                      <div className="max-h-[300px] overflow-y-auto divide-y divide-border/30">
                        {msgs.map((msg: any) => {
                          const profile = profiles.find(p => p.id === msg.user_id);
                          const senderName = profile?.display_name || msg.user_id?.slice(0, 8);
                          const timeStr = new Date(msg.created_at).toLocaleString('nl-NL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
                          return (
                            <div key={msg.id} className="px-4 py-2 flex items-start gap-3">
                              <div className="w-6 h-6 rounded-lg bg-secondary/60 flex items-center justify-center shrink-0 mt-0.5">
                                <Building2 className="h-3 w-3 text-muted-foreground" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-semibold text-foreground">{senderName}</span>
                                  <span className="text-[10px] text-muted-foreground ml-auto">{timeStr}</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5 break-words">{msg.content}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="border-t border-border/30 p-2 flex gap-1.5">
                        <input
                          className="flex-1 rounded-lg bg-background border border-border px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                          placeholder="Typ een bericht als admin..."
                          value={chatReplyInputs[replyKey] || ''}
                          onChange={e => setChatReplyInputs(prev => ({ ...prev, [replyKey]: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAdminChatSend('org', orgId, replyKey)}
                          disabled={chatSending === replyKey}
                        />
                        <button
                          onClick={() => handleAdminChatSend('org', orgId, replyKey)}
                          disabled={chatSending === replyKey || !(chatReplyInputs[replyKey] || '').trim()}
                          className="rounded-lg p-1.5 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
                        >
                          <Send className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

        <div className="grid grid-cols-4 gap-3 mt-6">
          <div className="rounded-xl border border-border/50 p-4 text-center" style={{ background: 'hsl(var(--card))' }}>
            <p className="text-2xl font-bold text-foreground font-mono">{profiles.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Gebruikers</p>
          </div>
          <div className="rounded-xl border border-border/50 p-4 text-center" style={{ background: 'hsl(var(--card))' }}>
            <p className="text-2xl font-bold text-foreground font-mono">{apps.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Apps</p>
          </div>
          <div className="rounded-xl border border-border/50 p-4 text-center" style={{ background: 'hsl(var(--card))' }}>
            <p className="text-2xl font-bold text-foreground font-mono">{orgs.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Bedrijven</p>
          </div>
          <div className="rounded-xl border border-border/50 p-4 text-center" style={{ background: 'hsl(var(--card))' }}>
            <p className="text-2xl font-bold text-foreground font-mono">{ads.filter(a => a.is_active).length}</p>
            <p className="text-xs text-muted-foreground mt-1">Actieve ads</p>
          </div>
        </div>
      </div>

      {/* Ad form dialog */}
      {showAdForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowAdForm(false)}>
          <div className="rounded-2xl border border-border/50 p-5 sm:p-6 w-full max-w-lg shadow-2xl" style={{ background: 'hsl(var(--card))' }} onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              {editingAd ? 'Advertentie bewerken' : 'Nieuwe advertentie'}
            </h3>

            {/* Preview */}
            <div className="rounded-xl border border-border/50 overflow-hidden mb-4" style={{ background: adForm.gradient }}>
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-9 h-9 rounded-lg bg-foreground/10 flex items-center justify-center shrink-0">
                  <span className="text-lg">{adForm.emoji}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate">{adForm.title || 'Titel...'}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{adForm.description || 'Beschrijving...'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="w-20 relative">
                  <label className="text-xs font-medium text-foreground uppercase tracking-wide">Emoji</label>
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-lg text-center focus:outline-none focus:ring-2 focus:ring-primary/50 mt-1 hover:bg-secondary/30 transition-colors"
                  >
                    {adForm.emoji}
                  </button>
                  {showEmojiPicker && (
                    <div className="absolute top-full left-0 mt-1 z-[60] rounded-xl border border-border/50 shadow-2xl w-72" style={{ background: 'hsl(var(--card))' }} onClick={e => e.stopPropagation()}>
                      <div className="p-2 border-b border-border/50">
                        <input
                          type="text"
                          placeholder="Zoek emoji..."
                          value={emojiSearch}
                          onChange={e => setEmojiSearch(e.target.value)}
                          autoFocus
                          className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      </div>
                      <div className="p-2 grid grid-cols-8 gap-1 max-h-[200px] overflow-y-auto">
                        {EMOJI_LIST
                          .filter(e => e.label.toLowerCase().includes(emojiSearch.toLowerCase()))
                          .map(e => (
                            <button
                              key={e.emoji}
                              onClick={() => { setAdForm({ ...adForm, emoji: e.emoji }); setShowEmojiPicker(false); setEmojiSearch(''); }}
                              className={`p-1.5 rounded-lg text-lg hover:bg-secondary/60 transition-colors ${adForm.emoji === e.emoji ? 'bg-primary/20 ring-1 ring-primary' : ''}`}
                              title={e.label}
                            >
                              {e.emoji}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-foreground uppercase tracking-wide">Titel</label>
                  <input
                    type="text"
                    placeholder="Bv. Mijn Coole App"
                    value={adForm.title}
                    onChange={e => setAdForm({ ...adForm, title: e.target.value })}
                    autoFocus
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 mt-1"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground uppercase tracking-wide">Beschrijving</label>
                <input
                  type="text"
                  placeholder="Korte beschrijving van de ad"
                  value={adForm.description}
                  onChange={e => setAdForm({ ...adForm, description: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground uppercase tracking-wide">URL</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={adForm.url}
                  onChange={e => setAdForm({ ...adForm, url: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground uppercase tracking-wide">Pagina's</label>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {PAGE_OPTIONS.map(opt => {
                    const checked = adForm.pages.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setAdForm({
                            ...adForm,
                            pages: checked
                              ? adForm.pages.filter(p => p !== opt.value)
                              : [...adForm.pages, opt.value],
                          });
                        }}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                          checked
                            ? 'bg-primary/10 border-primary text-primary ring-1 ring-primary/30'
                            : 'border-border text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground uppercase tracking-wide">Kleur</label>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {GRADIENT_PRESETS.map(g => (
                    <button
                      key={g.label}
                      onClick={() => setAdForm({ ...adForm, gradient: g.value })}
                      className={`w-8 h-8 rounded-lg border-2 transition-all ${adForm.gradient === g.value ? 'border-primary ring-2 ring-primary/30' : 'border-border/50'}`}
                      style={{ background: g.value }}
                      title={g.label}
                    />
                  ))}
                </div>

                {/* Visual gradient builder */}
                <div className="mt-3 p-3 rounded-lg bg-secondary/30 border border-border/50 space-y-3">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Custom Gradient Builder</p>
                  {(() => {
                    const angleMatch = adForm.gradient.match(/(\d+)deg/);
                    const currentAngle = angleMatch ? parseInt(angleMatch[1]) : 135;
                    const hexColors = adForm.gradient.match(/#[0-9a-fA-F]{6}/g);
                    const hslColors = adForm.gradient.match(/hsl\([^)]+\)/g);

                    const color1Hex = hexColors?.[0] || '#1a2a1a';
                    const color2Hex = hexColors?.[1] || '#1e2736';

                    const updateGradient = (c1: string, c2: string, angle: number) => {
                      setAdForm({ ...adForm, gradient: `linear-gradient(${angle}deg, ${c1}, ${c2})` });
                    };

                    return (
                      <>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 space-y-1">
                            <span className="text-[10px] text-muted-foreground">Kleur 1</span>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={color1Hex}
                                onChange={e => updateGradient(e.target.value, color2Hex, currentAngle)}
                                className="w-8 h-8 rounded-md border border-border/50 cursor-pointer bg-transparent p-0"
                              />
                              <span className="text-[10px] font-mono text-muted-foreground">{color1Hex}</span>
                            </div>
                          </div>
                          <div className="flex-1 space-y-1">
                            <span className="text-[10px] text-muted-foreground">Kleur 2</span>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={color2Hex}
                                onChange={e => updateGradient(color1Hex, e.target.value, currentAngle)}
                                className="w-8 h-8 rounded-md border border-border/50 cursor-pointer bg-transparent p-0"
                              />
                              <span className="text-[10px] font-mono text-muted-foreground">{color2Hex}</span>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground">Hoek</span>
                            <span className="text-[10px] font-mono text-muted-foreground">{currentAngle}°</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="360"
                            value={currentAngle}
                            onChange={e => updateGradient(color1Hex, color2Hex, parseInt(e.target.value))}
                            className="w-full h-2 accent-primary cursor-pointer"
                          />
                        </div>
                        <div
                          className="w-full h-10 rounded-lg border border-border/50"
                          style={{ background: adForm.gradient }}
                        />
                      </>
                    );
                  })()}
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <input
                    value={adForm.gradient}
                    onChange={e => setAdForm({ ...adForm, gradient: e.target.value })}
                    placeholder="Custom gradient CSS..."
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-secondary/50 border border-border/50 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowAdForm(false)} className="px-4 py-2 text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
                Annuleren
              </button>
              <button
                onClick={saveAd}
                disabled={savingAd || !adForm.title.trim()}
                className="px-5 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-95"
              >
                {savingAd ? 'Opslaan...' : editingAd ? 'Bijwerken' : 'Toevoegen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm dialog */}
      {confirmAction && (() => {
        const typeLabels: Record<string, string> = { user: 'Gebruiker', app: 'App', org: 'Bedrijf', ad: 'Advertentie', alliance: 'Alliantie', template: 'Template' };
        const typeLabel = typeLabels[confirmAction.type] || '';
        const isDelete = confirmAction.action === 'delete';
        const isBan = confirmAction.action === 'ban';
        
        const title = isDelete ? `${typeLabel} verwijderen` : isBan ? 'Gebruiker blokkeren' : 'Gebruiker deblokkeren';
        const description = isDelete
          ? `Weet je zeker dat je ${typeLabel.toLowerCase()} "${confirmAction.name}" wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`
          : isBan ? 'Deze gebruiker wordt geblokkeerd en kan niet meer inloggen.'
          : 'Deze gebruiker wordt gedeblokkeerd en kan weer inloggen.';
        const buttonLabel = managingUser ? 'Bezig...' : isDelete ? 'Verwijderen' : isBan ? 'Blokkeren' : 'Deblokkeren';

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setConfirmAction(null)}>
            <div className="rounded-2xl border border-border/50 p-5 sm:p-6 w-full max-w-sm shadow-2xl" style={{ background: 'hsl(var(--card))' }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2.5 rounded-xl ${isDelete ? 'bg-destructive/15' : isBan ? 'bg-orange-500/15' : 'bg-primary/15'}`}>
                  {isDelete ? <Trash2 className="h-5 w-5 text-destructive" /> :
                   isBan ? <Ban className="h-5 w-5 text-orange-500" /> :
                   <ShieldOff className="h-5 w-5 text-primary" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">{title}</h3>
                  <p className="text-xs text-muted-foreground">{confirmAction.name}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-5">{description}</p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setConfirmAction(null)} className="px-4 py-2 text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
                  Annuleren
                </button>
                <button
                  onClick={handleConfirmAction}
                  disabled={managingUser}
                  className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all active:scale-95 disabled:opacity-50 ${
                    isDelete
                      ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                      : isBan
                      ? 'bg-orange-500 text-white hover:bg-orange-600'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  }`}
                >
                  {buttonLabel}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
