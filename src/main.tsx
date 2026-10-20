import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './ui/App';
import './ui/styles.css';

registerSW({
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
