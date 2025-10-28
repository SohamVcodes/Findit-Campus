// public/client.js
(() => {
  // Basic client-side auth (keeps previous localStorage approach)
  const email = localStorage.getItem('userEmail');
  const role = localStorage.getItem('role');

  // Expose for pages
  window.appAuth = { email, role };

  // Preload a socket connection for notifications
  const socket = io();
  window.socket = socket;

  socket.on('notification', (n) => {
    showToast(n.title, n.msg, n.item);
    // optionally also refresh the feeds if the item is approved on server later
  });

  function showToast(title, msg, item) {
    let toast = document.createElement('div');
    toast.className = 'live-toast';
    toast.innerHTML = `<strong>${escapeHtml(title)}</strong><div>${escapeHtml(msg)}</div>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('visible'), 10);
    setTimeout(() => toast.classList.remove('visible'), 7000);
    setTimeout(() => toast.remove(), 7600);
    // click to open item (if present)
    if (item) {
      toast.addEventListener('click', () => {
        window.location.href = '/index.html';
      });
    }
  }

  // safe escape
  function escapeHtml(s) {
    if (!s) return '';
    return s.replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  window.showToast = showToast;

})();
