let startTime = null;
let sessionId = null;
let active = true;
let intervalId = null;
let totalTracked = 0;

export function trackTimeOnDomain(domainName) {
  console.log("🟢 Tracking started for:", domainName);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  const token = localStorage.getItem("token");

  if (!token) {
    console.warn("⚠️ No token found in localStorage");
    return () => {};
  }

  startTime = new Date();
  sessionId = `${domainName}-${startTime.getTime()}`; // unique session ID per domain + start time
  let lastActivity = Date.now();

  const updateActivity = () => {
    lastActivity = Date.now();
    console.log("🟡 User active at:", new Date().toLocaleTimeString());
  };

  window.addEventListener('mousemove', updateActivity);
  window.addEventListener('keydown', updateActivity);

  document.addEventListener("visibilitychange", () => {
    active = !document.hidden;
    console.log(`👁️ Tab visibility changed: ${active ? "Visible" : "Hidden"}`);
  });

  intervalId = setInterval(() => {
    const now = Date.now();

    if (active && now - lastActivity < 60000) {
      totalTracked += 30;
      console.log("📤 Sending 30s update for:", domainName);

      fetch(`${API_BASE_URL}/domain/track`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          url: domainName,
          domain: domainName,
          duration: 30 * 1000, // duration in ms
          startTime, // required by schema
          sessionId, // required by schema
          tabId: 1, // dummy tab ID, can improve later
          title: document.title,
          action: "update",
          isActive: true,
          idleTime: 0
        })
      })
        .then(res => res.json())
        .then(data => console.log("✅ Sent tracking data:", data))
        .catch(err => console.error("❌ Error sending time data:", err));
    }
  }, 30000);

  return () => {
    clearInterval(intervalId);
    window.removeEventListener("mousemove", updateActivity);
    window.removeEventListener("keydown", updateActivity);

    const endTime = new Date();
    const timeSpentSec = Math.floor((endTime - startTime) / 1000);
    const remainingTime = timeSpentSec - totalTracked;

    console.log("🔴 Cleanup:", `${timeSpentSec}s spent, ${remainingTime}s left`);

    if (remainingTime > 0) {
      fetch(`${API_BASE_URL}/domain/track`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          url: domainName,
          domain: domainName,
          duration: remainingTime * 1000,
          startTime,
          sessionId,
          tabId: 1,
          title: document.title,
          action: "end",
          isActive: false,
          idleTime: 0
        })
      })
        .then(res => res.json())
        .then(data => console.log("✅ Sent remaining time:", data))
        .catch(err => console.error("❌ Error sending final time:", err));
    }
  };
}
