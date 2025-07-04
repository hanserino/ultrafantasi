import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function RaceOverview() {
  const [races, setRaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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
                fontWeight: 'bold',
                background: '#eee',
                color: '#222',
                border: 'none',
                borderRadius: 4,
                padding: '0.7em 1.2em',
                cursor: 'pointer',
                width: '100%',
                textAlign: 'left',
              }}
              onClick={() => navigate(`/races/${race.id}`)}
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