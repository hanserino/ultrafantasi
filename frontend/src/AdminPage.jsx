import React, { useState, useEffect, useRef, memo } from 'react';
import { debounce } from 'lodash';
import { FixedSizeList as List } from 'react-window';
import { useNavigate } from 'react-router-dom';

// Memoized row component for react-window
const RunnerRow = memo(function RunnerRow({ data, index, style }) {
  const { runners, editMeta, onMetaChange } = data;
  const runner = runners[index];
  return (
    <div style={{ ...style, display: 'table', width: '100%' }}>
      <div style={{ display: 'table-row' }}>
        <div style={{ display: 'table-cell', border: '1px solid #ccc', padding: 4 }}>{runner.firstname} {runner.lastname}</div>
        <div style={{ display: 'table-cell', border: '1px solid #ccc', padding: 4 }}>
          <input
            type="text"
            value={editMeta[runner.id]?.instagram !== undefined ? editMeta[runner.id].instagram : runner.instagram}
            onChange={e => onMetaChange(runner.id, 'instagram', e.target.value)}
            style={{ width: 180 }}
            placeholder="Instagram URL"
          />
        </div>
        <div style={{ display: 'table-cell', border: '1px solid #ccc', padding: 4 }}>
          <input
            type="text"
            value={editMeta[runner.id]?.strava !== undefined ? editMeta[runner.id].strava : runner.strava}
            onChange={e => onMetaChange(runner.id, 'strava', e.target.value)}
            style={{ width: 180 }}
            placeholder="Strava URL/ID"
          />
        </div>
        <div style={{ display: 'table-cell', border: '1px solid #ccc', padding: 4 }}>
          <input
            type="text"
            value={editMeta[runner.id]?.duv !== undefined ? editMeta[runner.id].duv : runner.duv}
            onChange={e => onMetaChange(runner.id, 'duv', e.target.value)}
            style={{ width: 180 }}
            placeholder="DUV URL"
          />
        </div>
        <div style={{ display: 'table-cell', border: '1px solid #ccc', padding: 4 }}>
          <input
            type="text"
            value={editMeta[runner.id]?.utmb !== undefined ? editMeta[runner.id].utmb : runner.utmb}
            onChange={e => onMetaChange(runner.id, 'utmb', e.target.value)}
            style={{ width: 180 }}
            placeholder="UTMB URL/ID"
          />
        </div>
        <div style={{ display: 'table-cell', border: '1px solid #ccc', padding: 4 }}>
          <input
            type="text"
            value={editMeta[runner.id]?.itra !== undefined ? editMeta[runner.id].itra : runner.itra}
            onChange={e => onMetaChange(runner.id, 'itra', e.target.value)}
            style={{ width: 180 }}
            placeholder="ITRA URL/ID"
          />
        </div>
        <div style={{ display: 'table-cell', border: '1px solid #ccc', padding: 4 }}>
          <input
            type="text"
            value={editMeta[runner.id]?.neda !== undefined ? editMeta[runner.id].neda : runner.neda}
            onChange={e => onMetaChange(runner.id, 'neda', e.target.value)}
            style={{ width: 180 }}
            placeholder="NEDA URL/ID"
          />
        </div>
      </div>
    </div>
  );
});

function AdminPage() {
  const [user, setUser] = useState(null);
  const [races, setRaces] = useState([]);
  const [selectedRace, setSelectedRace] = useState(null);
  const [raceName, setRaceName] = useState('');
  const [raceDate, setRaceDate] = useState('');
  const [raceStatus, setRaceStatus] = useState('upcoming');
  const [runnersJson, setRunnersJson] = useState('');
  const [resultIds, setResultIds] = useState(Array(10).fill(''));
  const [allRunners, setAllRunners] = useState([]);
  const [message, setMessage] = useState('');
  const [allGlobalRunners, setAllGlobalRunners] = useState([]);
  const [editMeta, setEditMeta] = useState({});
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const [raceEdit, setRaceEdit] = useState(null);
  const [raceEditLoading, setRaceEditLoading] = useState(false);
  const [raceEditMessage, setRaceEditMessage] = useState("");

  const handleMetaChange = useRef((id, field, value) => {
    setEditMeta(meta => ({ ...meta, [id]: { ...meta[id], [field]: value } }));
  }).current;

  useEffect(() => {
    fetch('/auth/me', { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(setUser);
  }, []);

  useEffect(() => {
    if (!user || user.email !== 'eplehans@gmail.com') return;
    fetch('/races')
      .then(res => res.json())
      .then(setRaces);
  }, [user, message]);

  useEffect(() => {
    if (!selectedRace) return setAllRunners([]);
    fetch(`/races/${selectedRace.id}/runners`)
      .then(res => res.json())
      .then(setAllRunners);
  }, [selectedRace]);

  useEffect(() => {
    if (user && user.email === 'eplehans@gmail.com') {
      fetch('/runners')
        .then(res => res.json())
        .then(runners => {
          setAllGlobalRunners(runners);
          setEditMeta({}); // Clear all edit fields on refresh
        });
    }
  }, [user, message]);

  useEffect(() => {
    if (!selectedRace) return setRaceEdit(null);
    setRaceEditLoading(true);
    fetch(`/races/${selectedRace.id}`)
      .then(res => res.json())
      .then(race => setRaceEdit(race))
      .finally(() => setRaceEditLoading(false));
  }, [selectedRace]);

  // Filter runners by search (for selected race)
  const filteredRunners = React.useMemo(() => {
    if (!search.trim()) return allRunners;
    const s = search.trim().toLowerCase();
    return allRunners.filter(r =>
      r.firstname.toLowerCase().includes(s) ||
      r.lastname.toLowerCase().includes(s)
    );
  }, [allRunners, search]);

  const listData = React.useMemo(
    () => ({ runners: filteredRunners, editMeta, onMetaChange: handleMetaChange }),
    [filteredRunners, editMeta, handleMetaChange]
  );

  const handleRaceEditChange = (field, value) => {
    setRaceEdit(r => ({ ...r, [field]: value }));
  };

  const saveRaceEdit = async (e) => {
    e.preventDefault();
    if (!raceEdit) return;
    setRaceEditLoading(true);
    setRaceEditMessage("");
    const res = await fetch(`/races/${raceEdit.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: raceEdit.name,
        date: raceEdit.date,
        status: raceEdit.status
      })
    });
    setRaceEditLoading(false);
    if (res.ok) {
      setRaceEditMessage('Løpsdata lagret!');
      // Refresh races list
      fetch('/races').then(res => res.json()).then(setRaces);
    } else {
      setRaceEditMessage('Kunne ikke lagre løpsdata');
    }
  };

  if (!user) return <div>Laster...</div>;
  if (user.email !== 'eplehans@gmail.com') return <div>Du har ikke tilgang til denne siden.</div>;

  const createRace = async (e) => {
    e.preventDefault();
    setMessage('');
    const res = await fetch('/races', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: raceName, date: raceDate, status: raceStatus }),
    });
    if (res.ok) {
      setMessage('Løp opprettet!');
      setRaceName(''); setRaceDate('');
    } else {
      setMessage('Kunne ikke opprette løp');
    }
  };

  const addRunners = async (e) => {
    e.preventDefault();
    setMessage('');
    if (!selectedRace) return setMessage('Velg et løp først');
    let runners;
    try {
      runners = JSON.parse(runnersJson);
    } catch {
      setMessage('Ugyldig JSON for løpere');
      return;
    }
    const res = await fetch(`/races/${selectedRace.id}/runners`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(runners),
    });
    if (res.ok) {
      setMessage('Løpere lagt til!');
      setRunnersJson('');
    } else {
      setMessage('Kunne ikke legge til løpere');
    }
  };

  const setOfficialResult = async (e) => {
    e.preventDefault();
    setMessage('');
    if (!selectedRace) return setMessage('Velg et løp først');
    if (resultIds.some(id => !id)) return setMessage('Alle 10 plassene må fylles ut');
    const res = await fetch(`/races/${selectedRace.id}/official-result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ top10: resultIds }),
    });
    if (res.ok) {
      setMessage('Resultat lagret!');
    } else {
      setMessage('Kunne ikke lagre resultat');
    }
  };

  // Save all edited runners
  const saveAllMeta = async () => {
    setMessage('');
    const updates = Object.entries(editMeta).filter(([id, fields]) => Object.keys(fields).length > 0);
    if (updates.length === 0) {
      setMessage('Ingen endringer å lagre.');
      return;
    }
    const results = await Promise.all(updates.map(async ([id, fields]) => {
      const runner = allGlobalRunners.find(r => r.id === id);
      const res = await fetch(`/runners/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          instagram: fields.instagram ?? runner.instagram,
          strava: fields.strava ?? runner.strava,
          duv: fields.duv ?? runner.duv,
          utmb: fields.utmb ?? runner.utmb,
          itra: fields.itra ?? runner.itra,
          neda: fields.neda ?? runner.neda,
        }),
      });
      return res.ok;
    }));
    if (results.every(ok => ok)) {
      setMessage('Alle endringer lagret!');
      setEditMeta({});
      fetch('/runners').then(res => res.json()).then(setAllGlobalRunners);
    } else {
      setMessage('Noen endringer kunne ikke lagres');
    }
  };

  return (
    <div style={{ maxWidth: 1600, margin: '0 auto', padding: 16 }}>
      <h2>Admin</h2>
      {message && <div style={{ color: message.includes('ikke') ? 'red' : 'green', marginBottom: 12 }}>{message}</div>}
      <section style={{ marginBottom: 32 }}>
        <h3>Opprett nytt løp</h3>
        <form onSubmit={createRace} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input placeholder="Navn" value={raceName} onChange={e => setRaceName(e.target.value)} required />
          <input type="datetime-local" value={raceDate} onChange={e => setRaceDate(e.target.value)} required />
          <select value={raceStatus} onChange={e => setRaceStatus(e.target.value)}>
            <option value="upcoming">Kommende</option>
            <option value="finished">Ferdig</option>
          </select>
          <button type="submit">Opprett løp</button>
        </form>
      </section>
      <section style={{ marginBottom: 32 }}>
        <h3>Velg løp</h3>
        <select value={selectedRace ? selectedRace.id : ''} onChange={e => setSelectedRace(races.find(r => r.id === e.target.value))}>
          <option value="">Velg løp...</option>
          {races.map(race => (
            <option key={race.id} value={race.id}>{race.name}</option>
          ))}
        </select>
        {selectedRace && raceEdit && (
          <form onSubmit={saveRaceEdit} style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 400 }}>
            <h4>Rediger løpsdata</h4>
            <label>
              Navn:
              <input type="text" value={raceEdit.name} onChange={e => handleRaceEditChange('name', e.target.value)} required />
            </label>
            <label>
              Dato:
              <input type="datetime-local" value={raceEdit.date ? new Date(raceEdit.date).toISOString().slice(0,16) : ''} onChange={e => handleRaceEditChange('date', e.target.value)} required />
            </label>
            <label>
              Status:
              <select value={raceEdit.status} onChange={e => handleRaceEditChange('status', e.target.value)}>
                <option value="upcoming">Kommende</option>
                <option value="finished">Ferdig</option>
              </select>
            </label>
            <button type="submit" disabled={raceEditLoading}>Lagre løpsdata</button>
            {raceEditMessage && <div style={{ color: raceEditMessage.includes('ikke') ? 'red' : 'green' }}>{raceEditMessage}</div>}
          </form>
        )}
      </section>
      <section style={{ marginBottom: 32 }}>
        <h3>Legg til løpere</h3>
        <form onSubmit={addRunners} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <textarea
            placeholder='Lim inn JSON-array med løpere. Eksempel: [{"firstname":"Ola","lastname":"Nordmann","gender":"M","distance":"100km","category":"senior","instagram":"https://instagram.com/ola","strava":"https://strava.com/athletes/ola","duv":"https://statistik.d-u-v.org/getresultperson.php?runner=12345"}]'
            value={runnersJson}
            onChange={e => setRunnersJson(e.target.value)}
            rows={8}
            style={{ fontFamily: 'monospace' }}
          />
          <div style={{ fontSize: 12, color: '#666' }}>
            Felter: firstname, lastname, gender, distance, category, <b>instagram</b> (valgfri), <b>strava</b> (valgfri), <b>duv</b> (valgfri)
          </div>
          <button type="submit">Legg til løpere</button>
        </form>
      </section>
      <section>
        <h3>Sett offisielt resultat</h3>
        <form onSubmit={setOfficialResult} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: 10 }).map((_, i) => (
            <select
              key={i}
              value={resultIds[i]}
              onChange={e => {
                const newIds = [...resultIds];
                newIds[i] = e.target.value;
                setResultIds(newIds);
              }}
              required
            >
              <option value="">Plass {i + 1}</option>
              {allRunners.map(r => (
                <option key={r.id} value={r.id}>{r.firstname} {r.lastname}</option>
              ))}
            </select>
          ))}
          <button type="submit">Lagre resultat</button>
        </form>
      </section>
      <section style={{ marginBottom: 32 }}>
        <h3>Løpere for valgt løp (rediger metadata)</h3>
        <button onClick={() => navigate('/admin/all-runners')} style={{ marginBottom: 16 }}>
          Rediger alle løpere i databasen
        </button>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Søk etter navn..."
          style={{ marginBottom: 12, width: 300, fontSize: 16, padding: 6 }}
        />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', minWidth: 600, width: '100%' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #ccc', padding: 4 }}>Navn</th>
                <th style={{ border: '1px solid #ccc', padding: 4 }}>Instagram</th>
                <th style={{ border: '1px solid #ccc', padding: 4 }}>Strava</th>
                <th style={{ border: '1px solid #ccc', padding: 4 }}>DUV</th>
                <th style={{ border: '1px solid #ccc', padding: 4 }}>UTMB</th>
                <th style={{ border: '1px solid #ccc', padding: 4 }}>ITRA</th>
                <th style={{ border: '1px solid #ccc', padding: 4 }}>NEDA</th>
              </tr>
            </thead>
          </table>
          <List
            height={600}
            itemCount={filteredRunners.length}
            itemSize={48}
            width={1600}
            itemData={listData}
            style={{ border: '1px solid #ccc', borderTop: 'none' }}
          >
            {RunnerRow}
          </List>
        </div>
        <button onClick={saveAllMeta} style={{ marginTop: 16 }}>Lagre alle</button>
      </section>
    </div>
  );
}

export default AdminPage; 