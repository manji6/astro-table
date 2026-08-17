// ログインダミーシステムの会員データ・セッション管理。
// commerceのcart.tsと同じパターン(localStorage + 素朴なTS関数 + CustomEvent + storageイベントでの
// クロスタブ同期)を踏襲する。commerceには一切依存しない、独立したオプトインモジュール。

export type Member = {
  id: string;
  attributes: Record<string, string>;
  createdAt: string;
  updatedAt: string;
};

type Roster = {
  schemaVersion: 1;
  members: Member[];
};

export type MemberChangeAction = 'create' | 'update' | 'delete' | 'import' | 'sync';

export interface MemberChangeDetail {
  members: Member[];
  action: MemberChangeAction;
  member?: Member;
}

export interface MemberLoginDetail {
  memberId: string;
  member: Member;
}

export interface MemberLogoutDetail {
  previousMemberId: string | null;
}

declare global {
  interface WindowEventMap {
    'member:change': CustomEvent<MemberChangeDetail>;
    'member:login': CustomEvent<MemberLoginDetail>;
    'member:logout': CustomEvent<MemberLogoutDetail>;
  }
}

const STORAGE_PREFIX = 'astro-table:member:';
const ROSTER_KEY = `${STORAGE_PREFIX}roster`;
const SESSION_KEY = `${STORAGE_PREFIX}session`;

function emptyRoster(): Roster {
  return { schemaVersion: 1, members: [] };
}

function readRoster(): Roster {
  const raw = localStorage.getItem(ROSTER_KEY);
  if (!raw) return emptyRoster();
  try {
    const parsed = JSON.parse(raw) as Roster;
    if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.members)) return emptyRoster();
    return parsed;
  } catch {
    return emptyRoster();
  }
}

function writeRoster(roster: Roster): void {
  localStorage.setItem(ROSTER_KEY, JSON.stringify(roster));
}

function emitChange(roster: Roster, action: MemberChangeAction, member?: Member): void {
  window.dispatchEvent(
    new CustomEvent<MemberChangeDetail>('member:change', { detail: { members: roster.members, action, member } }),
  );
}

function emitLogin(member: Member): void {
  window.dispatchEvent(
    new CustomEvent<MemberLoginDetail>('member:login', { detail: { memberId: member.id, member } }),
  );
}

function emitLogout(previousMemberId: string | null): void {
  window.dispatchEvent(new CustomEvent<MemberLogoutDetail>('member:logout', { detail: { previousMemberId } }));
}

export function listMembers(): Member[] {
  return readRoster().members;
}

export function getMember(id: string): Member | undefined {
  return readRoster().members.find((m) => m.id === id);
}

export function saveMember(id: string, attributes: Record<string, string>): Member {
  const trimmedId = id.trim();
  if (!trimmedId) throw new Error('member id must not be empty');

  const roster = readRoster();
  const existing = roster.members.find((m) => m.id === trimmedId);
  const now = new Date().toISOString();

  let member: Member;
  let action: MemberChangeAction;
  if (existing) {
    existing.attributes = attributes;
    existing.updatedAt = now;
    member = existing;
    action = 'update';
  } else {
    member = { id: trimmedId, attributes, createdAt: now, updatedAt: now };
    roster.members.push(member);
    action = 'create';
  }

  writeRoster(roster);
  emitChange(roster, action, member);
  return member;
}

export function deleteMember(id: string): void {
  const roster = readRoster();
  const removed = roster.members.find((m) => m.id === id);
  roster.members = roster.members.filter((m) => m.id !== id);
  writeRoster(roster);
  emitChange(roster, 'delete', removed);

  if (getCurrentMemberId() === id) logout();
}

export function getCurrentMemberId(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

export function getCurrentMember(): Member | null {
  const id = getCurrentMemberId();
  if (!id) return null;
  return getMember(id) ?? null;
}

export function login(id: string): Member | null {
  const member = getMember(id.trim());
  if (!member) return null;

  localStorage.setItem(SESSION_KEY, member.id);
  emitLogin(member);
  return member;
}

export function logout(): void {
  const previousMemberId = getCurrentMemberId();
  localStorage.removeItem(SESSION_KEY);
  emitLogout(previousMemberId);
}

export function exportMembers(): string {
  return JSON.stringify(listMembers(), null, 2);
}

export function importMembers(json: string): Member[] {
  const parsed = JSON.parse(json) as unknown;
  if (!Array.isArray(parsed)) throw new Error('imported member data must be an array');

  const members: Member[] = parsed.map((entry) => {
    const candidate = entry as Partial<Member>;
    if (typeof candidate.id !== 'string' || !candidate.id.trim()) {
      throw new Error('each imported member must have a non-empty id');
    }
    const now = new Date().toISOString();
    return {
      id: candidate.id,
      attributes: candidate.attributes ?? {},
      createdAt: candidate.createdAt ?? now,
      updatedAt: candidate.updatedAt ?? now,
    };
  });

  const roster: Roster = { schemaVersion: 1, members };
  writeRoster(roster);
  emitChange(roster, 'import');
  return members;
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === ROSTER_KEY) {
      emitChange(readRoster(), 'sync');
      return;
    }
    if (event.key === SESSION_KEY) {
      if (event.newValue) {
        const member = getMember(event.newValue);
        if (member) emitLogin(member);
      } else {
        emitLogout(null);
      }
    }
  });
}
