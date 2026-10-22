import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './ui/App';
import './ui/styles.css';

const updateIntervalMs = 60 * 60 * 1000;
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return;
    // Installed iOS web apps are rarely reloaded, so look for a new version whenever the app returns to the foreground.
    const check = () => {
      if (document.visibilityState === 'visible' && navigator.onLine)
        void registration.update().catch(() => undefined);
    };
    document.addEventListener('visibilitychange', check);
    setInterval(check, updateIntervalMs);
  },
  onRegisterError(error: unknown) {
    console.error('Offline installation failed:', error);
    const notice = document.createElement('p');
    notice.setAttribute('role', 'alert');
    notice.textContent =
      'Offline-Installation fehlgeschlagen. Bitte beim nächsten Online-Start neu laden.';
    document.body.prepend(notice);
  },
});
createRoot(document.getElementById('root')!).render(<App />);
