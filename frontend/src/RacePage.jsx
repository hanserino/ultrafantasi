import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Runners from './Runners';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { FaTrophy, FaArrowUp, FaArrowDown, FaTrash } from 'react-icons/fa';
import { styled } from './stitches.config';

const SelectedRunners = styled('div', {
  background: '#fff',
  borderRadius: 8,
  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  padding: 20,
  marginLeft: 24,
  minWidth: 320,
  maxWidth: 400,
});
const Top10List = styled('ol', {
  listStyle: 'decimal',
  padding: 0,
  margin: 0,
});
const Top10Item = styled('li', {
  display: 'flex',
  alignItems: 'center',
  marginBottom: 8,
  background: '#f9f9f9',
  padding: 8,
  borderRadius: 6,
  fontSize: 16,
});
const Top10Img = styled('img', {
  width: 32,
  height: 32,
  objectFit: 'cover',
  borderRadius: '50%',
  marginRight: 8,
  verticalAlign: 'middle',
  background: '#fff',
  border: '1px solid #ccc',
});
const Top10Actions = styled('div', {
  display: 'inline-flex',
  gap: 4,
  marginLeft: 8,
});

const PLACEHOLDER_MALE = 'data:image/svg+xml;utf8,<svg width="120" height="120" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="60" r="60" fill="%23b3c6ff"/><text x="50%" y="54%" text-anchor="middle" fill="%23555" font-size="48" font-family="Arial" dy=".3em">👦</text></svg>';
const PLACEHOLDER_FEMALE = 'data:image/svg+xml;utf8,<svg width="120" height="120" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="60" r="60" fill="%23ffb3d1"/><text x="50%" y="54%" text-anchor="middle" fill="%23555" font-size="48" font-family="Arial" dy=".3em">👧</text></svg>';
const PLACEHOLDER_NEUTRAL = 'data:image/svg+xml;utf8,<svg width="120" height="120" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="60" r="60" fill="%23ddd"/><text x="50%" y="54%" text-anchor="middle" fill="%23999" font-size="48" font-family="Arial" dy=".3em">👤</text></svg>';

function RacePage({ user }) {
  const { raceId } = useParams();
  const navigate = useNavigate();
  const [race, setRace] = useState(null);
  const [top10, setTop10] = useState([]);
  const [runners, setRunners] = useState([]);
  const [now, setNow] = useState(new Date());
  const timerRef = useRef();
  const [raceLeaderboard, setRaceLeaderboard] = useState([]);
  const [officialResult, setOfficialResult] = useState(null);

  useEffect(() => {
    fetch(`/races/${raceId}`)
      .then(res => res.json())
      .then(setRace);
    fetch(`/races/${raceId}/runners`)
      .then(res => res.json())
      .then(setRunners);
    fetch(`/races/${raceId}/selections/me`, { credentials: 'include' })
      .then(res => res.json())
      .then(selections => {
        if (Array.isArray(selections) && selections.length > 0) {
          const sorted = selections
            .filter(sel => sel.runner)
            .sort((a, b) => a.rank - b.rank);
          setTop10(sorted.map(sel => sel.runner.id));
        } else {
          setTop10([]);
        }
      });
    fetch(`/races/${raceId}/leaderboard`).then(res => res.json()).then(setRaceLeaderboard);
    fetch(`/races/${raceId}/official-result`).then(res => res.json()).then(setOfficialResult);
  }, [raceId]);

  useEffect(() => {
    timerRef.current = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const getEventStart = () => {
    if (!race || !race.date) return null;
    return new Date(race.date);
  };

  const eventStarted = (() => {
    const eventStart = getEventStart();
    if (!eventStart) return false;
    return now >= eventStart;
  })();

  const handleSelect = (runnerId) => {
    if (eventStarted) return;
    if (top10.length < 10 && !top10.includes(runnerId)) {
      setTop10([...top10, runnerId]);
    }
  };

  const handleRemove = (runnerId) => {
    if (eventStarted) return;
    setTop10(top10.filter(id => id !== runnerId));
  };

  const handleSubmit = async () => {
    if (eventStarted || !race) return;
    const res = await fetch(`/races/${raceId}/selections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ runnerIds: top10 }),
    });
    if (res.ok) {
      alert('Selection submitted!');
    } else {
      alert('Error submitting selection');
    }
  };

  const getRunnerInfo = (id) => {
    const runner = runners.find(r => r.id === id);
    let imgSrc;
    if (runner && runner.profilePicture) {
      imgSrc = `${window.location.origin}/uploads/${runner.profilePicture}`;
    } else if (runner && runner.gender && runner.gender.toLowerCase() === 'f') {
      imgSrc = PLACEHOLDER_FEMALE;
    } else if (runner && runner.gender && runner.gender.toLowerCase() === 'm') {
      imgSrc = PLACEHOLDER_MALE;
    } else {
      imgSrc = PLACEHOLDER_NEUTRAL;
    }
    const name = runner ? `${runner.firstname} ${runner.lastname}` : id;
    return { name, imgSrc };
  };

  const onDragEnd = (result) => {
    if (eventStarted) return;
    if (!result.destination) return;
    const reordered = Array.from(top10);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);
    setTop10(reordered);
  };

  const moveUp = (idx) => {
    if (eventStarted) return;
    if (idx === 0) return;
    const newTop10 = [...top10];
    [newTop10[idx - 1], newTop10[idx]] = [newTop10[idx], newTop10[idx - 1]];
    setTop10(newTop10);
  };

  const moveDown = (idx) => {
    if (eventStarted) return;
    if (idx === top10.length - 1) return;
    const newTop10 = [...top10];
    [newTop10[idx], newTop10[idx + 1]] = [newTop10[idx + 1], newTop10[idx]];
    setTop10(newTop10);
  };

  const raceIsOver = race && new Date(race.date) < new Date();
  const hasOfficialResult = officialResult && officialResult.top10 && officialResult.top10.length === 10;

  if (!race) return <div>Laster løp...</div>;

  return (
    <div className="race-page-container" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <button onClick={() => navigate('/races')} style={{ marginRight: 16, border: 'none', borderRadius: 4, padding: '6px 16px', cursor: 'pointer' }}>
          &larr; Back to overview
        </button>
        <span style={{ fontSize: 15, color: '#666' }}>
          <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => navigate('/races')}>Race Overview</span>
          {' / '}
          <span style={{ fontWeight: 600 }}>{race.name}</span>
        </span>
      </div>
      <div style={{ display: 'flex', gap: 32 }}>
        <div style={{ flex: 1 }}>
          <h2>{race.name}</h2>
          <div style={{ fontSize: 18, marginBottom: 16, color: eventStarted ? 'red' : 'inherit' }}>
            {(() => {
              const eventStart = getEventStart();
              if (!eventStart) return '';
              const diff = eventStart - now;
              if (diff <= 0) return 'Arrangementet har startet!';
              const hours = Math.floor(diff / 1000 / 60 / 60);
              const minutes = Math.floor((diff / 1000 / 60) % 60);
              const seconds = Math.floor((diff / 1000) % 60);
              return `Tid til start: ${hours}t ${minutes}m ${seconds}s`;
            })()}
          </div>
          <Runners
            runners={runners}
            onSelect={handleSelect}
            top10={top10}
            eventStarted={eventStarted}
            raceId={raceId}
          />
        </div>
        <SelectedRunners>
          <h3>Dine topp 10</h3>
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="top10">
              {(provided) => (
                <Top10List
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                >
                  {top10.length === 0 ? (
                    <li style={{ color: '#aaa', textAlign: 'center' }}>Ingen løpere valgt ennå.</li>
                  ) : (
                    top10.map((id, idx) => (
                      <Draggable key={id} draggableId={String(id)} index={idx}>
                        {(provided) => (
                          <Top10Item
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={provided.draggableProps.style}
                          >
                            <span style={{ marginRight: 8 }}>
                              {idx === 0 && <FaTrophy color="#FFD700" title="1. plass" />}
                              {idx === 1 && <FaTrophy color="#C0C0C0" title="2. plass" />}
                              {idx === 2 && <FaTrophy color="#CD7F32" title="3. plass" />}
                              {idx > 2 && <span>{idx + 1}.</span>}
                            </span>
                            <Top10Img src={getRunnerInfo(id).imgSrc} alt="Profilbilde" />
                            {getRunnerInfo(id).name}
                            <Top10Actions>
                              <button onClick={() => moveUp(idx)} disabled={eventStarted || idx === 0} aria-label="Flytt opp">
                                <FaArrowUp />
                              </button>
                              <button onClick={() => moveDown(idx)} disabled={eventStarted || idx === top10.length - 1} aria-label="Flytt ned">
                                <FaArrowDown />
                              </button>
                              <button onClick={() => handleRemove(id)} style={{ marginLeft: 8 }} aria-label="Fjern" disabled={eventStarted}>
                                <FaTrash />
                              </button>
                            </Top10Actions>
                          </Top10Item>
                        )}
                      </Draggable>
                    ))
                  )}
                  {provided.placeholder}
                </Top10List>
              )}
            </Droppable>
          </DragDropContext>
          <button onClick={handleSubmit} disabled={top10.length !== 10 || eventStarted}>
            Send inn topp 10
          </button>
        </SelectedRunners>
      </div>
      {raceIsOver && hasOfficialResult && (
        <>
          <h3>Offisielt resultat</h3>
          <ol>
            {officialResult.top10.map((runnerId, idx) => {
              const runner = runners.find(r => r.id === runnerId);
              return <li key={runnerId}>{runner ? `${runner.firstname} ${runner.lastname}` : runnerId}</li>;
            })}
          </ol>
          <h3>Deltaker-leaderboard</h3>
          <ol>
            {raceLeaderboard.map((entry, idx) => (
              <li key={entry.user.id}>
                {entry.user.nickname || entry.user.name || entry.user.email} – {entry.points} poeng
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}

export default RacePage; 