export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = typeof window !== 'undefined'
    ? window.atob(base64)
    : Buffer.from(base64, 'base64').toString('binary');
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export function isPushSupported() {
  if (typeof window === 'undefined') return false;
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function getPermissionStatus() {
  if (typeof window === 'undefined') return 'default';
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

// userType: 'warga' | 'pengurus'
export async function subscribeToPush(userId, userType = 'warga') {
  if (!isPushSupported()) throw new Error('Browser tidak mendukung notifikasi');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Izin notifikasi ditolak');

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });

  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      user_type: userType,
      subscription: subscription.toJSON(),
      user_agent: navigator.userAgent,
    }),
  });

  if (!res.ok) throw new Error('Gagal menyimpan subscription');
  return subscription;
}

export async function unsubscribeFromPush(userId, userType = 'warga') {
  if (!isPushSupported()) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  await fetch('/api/push/unsubscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      user_type: userType,
      endpoint: subscription.endpoint,
    }),
  }).catch(() => {});

  await subscription.unsubscribe();
}

export async function isSubscribed() {
  if (!isPushSupported()) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
}
