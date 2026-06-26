import * as webPush from 'web-push';

export function configureWebPush() {
  const vapidEmail = process.env.VAPID_EMAIL || 'mailto:post@kinogrenaa.dk';
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

  if (vapidPublicKey && vapidPrivateKey) {
    webPush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);

    return true;
  }

  console.warn(
    'Push notifications disabled: VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY is missing',
  );

  return false;
}
