import React, { useEffect, useState } from 'react';

function RaceOverview({ selectedRace, onSelect }) {
  const [races, setRaces] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/races')
      .then(res => res.json())
      .then(setRaces)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Laster inn løp...</div>;

  return (
    <div>
      <h2>Velg løp</h2>
      <ul style={{ padding: 0, listStyle: 'none' }}>
        {races.map(race => (
          <li key={race.id} style={{ marginBottom: 12 }}>
            <button
              style={{
                fontWeight: race.id === (selectedRace && selectedRace.id) ? 'bold' : 'normal',
                background: race.id === (selectedRace && selectedRace.id) ? '#222' : '#eee',
                color: race.id === (selectedRace && selectedRace.id) ? '#fff' : '#222',
                border: 'none',
                borderRadius: 4,
                padding: '0.7em 1.2em',
                cursor: 'pointer',
                width: '100%',
                textAlign: 'left',
              }}
              onClick={() => onSelect(race)}
            >
              {race.name} <span style={{ fontWeight: 400, fontSize: '0.9em' }}>({new Date(race.date).toLocaleDateString()})</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default RaceOverview; 