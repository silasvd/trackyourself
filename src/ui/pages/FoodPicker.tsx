import { useState } from 'react';
import type { Dataset, Food } from '../../domain/types';
import { Modal } from '../components/Form';
import { EntryForm } from '../components/EntryForm';
import { FoodEditor } from './FoodEditor';

export function FoodPicker({
  data,
  date,
  save,
  busy,
  onClose,
}: {
  data: Dataset;
  date: string;
  save: (next: Dataset) => Promise<boolean>;
  busy: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<Food | null>(null);
  const [editing, setEditing] = useState<Food | 'new' | null>(null);
  const foods = data.foods
    .filter((food) =>
      food.name.toLocaleLowerCase('de').includes(query.toLocaleLowerCase('de')),
    )
    .filter(
      (food) =>
        filter === 'all' ||
        (filter === 'favorites' && food.isFavorite) ||
        (filter === 'recent' && food.lastUsedAt !== null) ||
        (filter === 'custom' && food.source === 'custom') ||
        (filter === 'base' && food.source === 'base'),
    )
    .sort((a, b) =>
      filter === 'recent'
        ? (b.lastUsedAt ?? '').localeCompare(a.lastUsedAt ?? '')
        : Number(b.isFavorite) - Number(a.isFavorite) ||
          a.name.localeCompare(b.name, 'de'),
    );
  return (
    <>
      <Modal title="Lebensmittel hinzufügen" onClose={onClose}>
        {selected ? (
          <>
            <button onClick={() => setSelected(null)}>
              Zurück zur Auswahl
            </button>
            <EntryForm
              food={selected}
              data={data}
              date={date}
              save={save}
              busy={busy}
              onClose={onClose}
            />
          </>
        ) : (
          <>
            <label>
              Lebensmittel suchen
              <input
                data-autofocus
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Name eingeben …"
              />
            </label>
            <label>
              Auswahl
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              >
                <option value="all">Alle Lebensmittel</option>
                <option value="favorites">Favoriten</option>
                <option value="recent">Zuletzt verwendet</option>
                <option value="base">Basisliste</option>
                <option value="custom">Eigene Lebensmittel</option>
              </select>
            </label>
            <button onClick={() => setEditing('new')}>
              Eigenes Lebensmittel anlegen
            </button>
            {!foods.length && <p>Keine Lebensmittel gefunden.</p>}
            <ul className="food-list">
              {foods.map((food) => (
                <li key={food.id}>
                  <button
                    className="food-select"
                    aria-label={`${food.name} auswählen`}
                    onClick={() => setSelected(food)}
                  >
                    <strong>{food.name}</strong>
                    <small>
                      {food.category ?? 'Eigene Lebensmittel'}
                      {food.dataQuality === 'incomplete'
                        ? ' · Nährwerte unvollständig'
                        : ''}
                    </small>
                  </button>
                  <button
                    className="favorite"
                    aria-label={`${food.name}: Favorit`}
                    aria-pressed={food.isFavorite}
                    disabled={busy}
                    onClick={() =>
                      void save({
                        ...data,
                        foods: data.foods.map((value) =>
                          value.id === food.id
                            ? {
                                ...value,
                                isFavorite: !value.isFavorite,
                                updatedAt: new Date().toISOString(),
                              }
                            : value,
                        ),
                      })
                    }
                  >
                    {food.isFavorite ? '★' : '☆'}
                  </button>
                  <button
                    aria-label={`${food.name}: bearbeiten`}
                    onClick={() => setEditing(food)}
                  >
                    Bearbeiten
                  </button>
                  {food.source === 'custom' && (
                    <button
                      aria-label={`${food.name}: löschen`}
                      disabled={busy}
                      onClick={() =>
                        void save({
                          ...data,
                          foods: data.foods.filter(
                            (value) => value.id !== food.id,
                          ),
                          portions: data.portions.filter(
                            (value) => value.foodId !== food.id,
                          ),
                        })
                      }
                    >
                      Löschen
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </Modal>
      {editing && (
        <FoodEditor
          food={editing === 'new' ? undefined : editing}
          data={data}
          save={save}
          busy={busy}
          onClose={() => setEditing(null)}
          onSaved={(food) => {
            if (editing === 'new') setSelected(food);
            setEditing(null);
          }}
        />
      )}
    </>
  );
}
