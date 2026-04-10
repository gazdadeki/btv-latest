/* eslint-disable no-undef */
importScripts(
  "https://www.gstatic.com/firebasejs/11.6.0/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging-compat.js",
);

firebase.initializeApp({
  apiKey: "AIzaSyDGn_cbfyQytw68nLYLA7-CgkajiUb6a08",
  authDomain: "baltazartv-2d7c1.firebaseapp.com",
  projectId: "baltazartv-2d7c1",
  storageBucket: "baltazartv-2d7c1.firebasestorage.app",
  messagingSenderId: "810587551958",
  appId: "1:810587551958:web:779ead7e61cec42c03b177",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  if (!title) return;

  self.registration.showNotification(title, {
    body: body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: payload.data,
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url;
  if (url && url.startsWith("https://")) {
    event.waitUntil(clients.openWindow(url));
  }
});
