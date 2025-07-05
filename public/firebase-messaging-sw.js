// Firebase Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDNeSH1py2mpGp9_8CQZHyRW27Gd8ujV8s",
  authDomain: "pinkpoongpiano.firebaseapp.com",
  projectId: "pinkpoongpiano",
  storageBucket: "pinkpoongpiano.firebasestorage.app",
  messagingSenderId: "986795675541",
  appId: "1:986795675541:web:4d4f72a1b5a9515d34309c",
  measurementId: "G-DE7KF4BMCQ"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title || 'Pink Poong Piano';
  const notificationOptions = {
    body: payload.notification.body || 'New notification',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'pink-poong-piano',
    requireInteraction: false,
    silent: false
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click received.');

  event.notification.close();

  // Focus or open the app
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // If app is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // If app is not open, open it
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
}); 