import { api } from './api';

export const pushSupported = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js');
  } catch {
    return null;
  }
}

export type PushResult = 'subscribed' | 'denied' | 'unsupported' | 'error';

// Ask permission and subscribe this device for reminders. Returns the outcome.
export async function enablePush(): Promise<PushResult> {
  if (!pushSupported()) return 'unsupported';
  try {
    const reg = (await navigator.serviceWorker.ready) || (await registerServiceWorker());
    if (!reg) return 'error';

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return 'denied';

    const { publicKey } = await api.vapidKey();
    const existing = await reg.pushManager.getSubscription();
    const sub =
      existing ||
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      }));

    await api.subscribePush(sub.toJSON());
    return 'subscribed';
  } catch (err) {
    return 'error';
  }
}
