(function () {
  const queue = [];
  let sending = false;

  async function flush() {
    if (sending || !queue.length) return;
    sending = true;

    while (queue.length) {
      const event = queue.shift();
      try {
        await fetch('/api/track', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(event)
        });
      } catch (error) {
        console.warn('Retrying analytics event', error);
        queue.push(event);
        break;
      }
    }

    sending = false;
  }

  function enqueue(event) {
    queue.push({
      ...event,
      timestamp: event.timestamp || Date.now()
    });
    flush();
  }

  window.trackEvent = function (hanhDong, payload = {}) {
    enqueue({ hanhDong, ...payload });
  };

  window.trackProductView = function ({ maSP, maKH, metadata }) {
    enqueue({
      hanhDong: 'product_view',
      maSP,
      maKH,
      metadata
    });
  };

  window.addEventListener('beforeunload', () => {
    if (!queue.length) return;
    const event = queue.pop();
    const blob = new Blob([JSON.stringify(event)], { type: 'application/json' });
    navigator.sendBeacon('/api/track', blob);
  });
})();
