import { useEffect, useState } from 'react';
import { localDate } from '../domain/dates';
import { useTracker } from '../app/useTracker';
import { StorageErrorContext } from '../app/feedback';
import { Dashboard } from './pages/Dashboard';
import { ProfilePage } from './pages/ProfilePage';
import { ActivityPage } from './pages/ActivityPage';
import { WeightPage } from './pages/WeightPage';

type Page = 'day' | 'activity' | 'weight' | 'profile';
export function App() {
  const tracker = useTracker();
  const [page, setPage] = useState<Page>('day');
  const [today, setToday] = useState(() => localDate(new Date()));
  const [date, setDate] = useState(today);
  useEffect(() => {
    const tick = setInterval(() => setToday(localDate(new Date())), 10000);
    return () => clearInterval(tick);
  }, []);
  return (
    <StorageErrorContext value={tracker.error}>
      <header className="brand">
        <a href="#main">
          Track<span>Yourself</span>
        </a>
        <small>Lokal. Privat. Für dich.</small>
      </header>
      <main id="main">
        {tracker.error && (
          <div className="error" role="alert">
            {tracker.error}
            <button onClick={() => window.location.reload()}>Neu laden</button>
          </div>
        )}
        {!tracker.data ? (
          <p role="status">Lokale Daten werden geladen …</p>
        ) : (
          <>
            {page === 'day' && (
              <Dashboard
                {...tracker}
                data={tracker.data}
                today={today}
                date={date}
                setDate={setDate}
                navigate={setPage}
              />
            )}
            {page === 'activity' && (
              <ActivityPage {...tracker} data={tracker.data} />
            )}
            {page === 'weight' && (
              <WeightPage {...tracker} data={tracker.data} />
            )}
            {page === 'profile' && (
              <ProfilePage {...tracker} data={tracker.data} />
            )}
          </>
        )}
      </main>
      <nav className="bottom-nav" aria-label="Hauptnavigation">
        {(
          [
            ['day', 'Tag'],
            ['activity', 'Aktivität'],
            ['weight', 'Gewicht'],
            ['profile', 'Profil/Einstellungen'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            aria-current={page === value ? 'page' : undefined}
            onClick={() => setPage(value)}
          >
            {label}
          </button>
        ))}
      </nav>
    </StorageErrorContext>
  );
}
