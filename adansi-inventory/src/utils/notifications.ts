




export function addNotification(message: string) {
  const existing = JSON.parse(
    localStorage.getItem("notifications") || "[]"
  );

  const newNotification = {
    id: crypto.randomUUID(),
    message,
    time: new Date().toLocaleString(),
    read: false,
  };

  const updated = [newNotification, ...existing];

  localStorage.setItem(
    "notifications",
    JSON.stringify(updated)
  );

  // 🔥 LIVE UPDATE EVENT
  window.dispatchEvent(
    new CustomEvent("notification-added", {
      detail: newNotification,
    })
  );
}
