function getSafeNotificationData(event) {
  if (!event.data) {
    return {};
  }

  try {
    const data = event.data.json();
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

function getSafeTargetUrl(value) {
  if (typeof value !== "string" || !value.trim()) {
    return "/dashboard";
  }

  try {
    const targetUrl = new URL(value.trim(), self.location.origin);

    if (targetUrl.origin !== self.location.origin) {
      return "/dashboard";
    }

    return `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;
  } catch {
    return "/dashboard";
  }
}

self.addEventListener("push", function (event) {
  const data = getSafeNotificationData(event);
  const title =
    typeof data.title === "string" && data.title.trim()
      ? data.title.trim()
      : "Cinema Vagtplan";
  const body = typeof data.body === "string" ? data.body.trim() : "";
  const options = {
    body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: {
      url: getSafeTargetUrl(data.url),
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const targetUrl = getSafeTargetUrl(event.notification.data?.url);

  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then(function (clientList) {
        for (const client of clientList) {
          if ("focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }

        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      }),
  );
});
