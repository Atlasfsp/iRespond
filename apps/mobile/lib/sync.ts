import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { NeedDraft } from './drafts';

const QUEUE_KEY = 'irespond.sync-queue.v1';
const ACTOR_KEY = 'irespond.local-actor-id.v1';

export type QueuedNeed = {
  idempotencyKey: string;
  draft: NeedDraft;
  queuedAt: string;
  attempts: number;
};

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export async function getLocalActorId() {
  const existing = await SecureStore.getItemAsync(ACTOR_KEY);
  if (existing) return existing;
  const created = makeId('mobile');
  await SecureStore.setItemAsync(ACTOR_KEY, created);
  return created;
}

async function loadQueue(): Promise<QueuedNeed[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? (JSON.parse(raw) as QueuedNeed[]) : [];
}

async function saveQueue(items: QueuedNeed[]) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}

export async function queueNeedForSync(draft: NeedDraft) {
  const queue = await loadQueue();
  const item: QueuedNeed = { idempotencyKey: makeId('need'), draft, queuedAt: new Date().toISOString(), attempts: 0 };
  await saveQueue([...queue, item]);
  return item;
}

export type SyncResult = { synced: number; remaining: number; offline: boolean };

export async function flushNeedQueue(): Promise<SyncResult> {
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, '');
  const queue = await loadQueue();
  if (!baseUrl || queue.length === 0) return { synced: 0, remaining: queue.length, offline: !baseUrl };

  const actorId = await getLocalActorId();
  const remaining: QueuedNeed[] = [];
  let synced = 0;

  for (const item of queue) {
    try {
      const response = await fetch(`${baseUrl}/v1/needs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': item.idempotencyKey },
        body: JSON.stringify({
          title: item.draft.title,
          description: item.draft.description,
          category: 'community',
          latitude: item.draft.latitude ?? 0,
          longitude: item.draft.longitude ?? 0,
          reporterId: actorId,
          sdgTags: []
        })
      });
      if (response.ok) synced += 1;
      else remaining.push({ ...item, attempts: item.attempts + 1 });
    } catch {
      remaining.push({ ...item, attempts: item.attempts + 1 });
    }
  }

  await saveQueue(remaining);
  return { synced, remaining: remaining.length, offline: false };
}

export async function pendingNeedCount() {
  return (await loadQueue()).length;
}
