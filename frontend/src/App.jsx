import React, { useEffect, useState, useRef } from 'react';
import './App.css'
import Login from './Login';
import Runners from './Runners';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { FaTrophy, FaArrowUp, FaArrowDown, FaTrash } from 'react-icons/fa';
import Leaderboard from './Leaderboard';

const EVENT_START = new Date('2025-07-03T10:00:00Z'); // Sett starttidspunkt for arrangementet her

function App() {
  const [user, setUser] = useState(null);
  const [top10, setTop10] = useState([]);
  const [runners, setRunners] = useState([]);
  const [now, setNow] = useState(new Date());
  const timerRef = useRef();
  const [nickname, setNickname] = useState("");
  const [nicknameSaved, setNicknameSaved] = useState(false);
  const [view, setView] = useState('main'); // 'main' or 'leaderboard'

  useEffect(() => {
    fetch('/auth/me', { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        setUser(data);
        if (data && data.nickname) setNickname(data.nickname);
      })
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    fetch('/runners')
      .then(res => res.json())
      .then(setRunners);
  }, []);

  useEffect(() => {
    timerRef.current = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const eventStarted = now >= EVENT_START;

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
    if (eventStarted) return;
    const res = await fetch('/selections', {
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

  const getRunnerName = (id) => {
    const runner = runners.find(r => r.id === id);
    return runner ? `${runner.firstname} ${runner.lastname}` : id;
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

  // Nedtelling visning
  const getCountdown = () => {
    const diff = EVENT_START - now;
    if (diff <= 0) return 'Arrangementet har startet!';
    const hours = Math.floor(diff / 1000 / 60 / 60);
    const minutes = Math.floor((diff / 1000 / 60) % 60);
    const seconds = Math.floor((diff / 1000) % 60);
    return `Tid til start: ${hours}t ${minutes}m ${seconds}s`;
  };

  const handleNicknameChange = (e) => {
    setNickname(e.target.value);
    setNicknameSaved(false);
  };

  const handleNicknameSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch('/me/nickname', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ nickname }),
    });
    if (res.ok) {
      setNicknameSaved(true);
    } else {
      setNicknameSaved(false);
      alert('Kunne ikke lagre kallenavn');
    }
  };

  if (!user || user.error) {
    return <Login />;
  }

  return (
    <div>
      <nav style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <button onClick={() => setView('main')} disabled={view === 'main'}>Mitt lag</button>
        <button onClick={() => setView('leaderboard')} disabled={view === 'leaderboard'}>Leaderboard</button>
      </nav>
      {view === 'leaderboard' ? (
        <Leaderboard />
      ) : (
        <>
          <div style={{ fontSize: 18, marginBottom: 16, color: eventStarted ? 'red' : 'inherit' }}>{getCountdown()}</div>
          <p>{user.name || user.email}</p>
          
          <form onSubmit={handleNicknameSubmit} style={{ marginBottom: 16 }}>
            <label htmlFor="nickname">Kallenavn: </label>
            <input
              id="nickname"
              type="text"
              value={nickname}
              onChange={handleNicknameChange}
              minLength={2}
              maxLength={32}
              style={{ marginRight: 8 }}
            />
            <button type="submit">Lagre</button>
            {nicknameSaved && <span style={{ color: 'green', marginLeft: 8 }}>Lagret!</span>}
          </form>
          <div className="runner-wrapper">
            <Runners onSelect={handleSelect} top10={top10} eventStarted={eventStarted} />
            <div className="selected-runners">
              <h3>Dine topp 10</h3>
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="top10">
                  {(provided) => (
                    <ol
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      style={{ listStyle: 'decimal', padding: 0 }}
                    >
                      {top10.length === 0 ? (
                        <li style={{ color: '#aaa', textAlign: 'center' }}>Ingen løpere valgt ennå.</li>
                      ) : (
                        top10.map((id, idx) => (
                          <Draggable key={id} draggableId={String(id)} index={idx}>
                            {(provided) => (
                              <li
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                style={{
                                  ...provided.draggableProps.style,
                                  marginBottom: 8,
                                  background: '#f9f9f9',
                                  padding: 8
                                }}
                              >
                                <span style={{ marginRight: 8 }}>
                                  {idx === 0 && <FaTrophy color="#FFD700" title="1. plass" />}
                                  {idx === 1 && <FaTrophy color="#C0C0C0" title="2. plass" />}
                                  {idx === 2 && <FaTrophy color="#CD7F32" title="3. plass" />}
                                  {idx > 2 && <span>{idx + 1}.</span>}
                                </span>
                                {getRunnerName(id)}
                                <div style={{ display: 'inline-flex', gap: 4, marginLeft: 8 }}>
                                  <button onClick={() => moveUp(idx)} disabled={eventStarted || idx === 0} aria-label="Flytt opp">
                                    <FaArrowUp />
                                  </button>
                                  <button onClick={() => moveDown(idx)} disabled={eventStarted || idx === top10.length - 1} aria-label="Flytt ned">
                                    <FaArrowDown />
                                  </button>
                                  <button onClick={() => handleRemove(id)} style={{ marginLeft: 8 }} aria-label="Fjern" disabled={eventStarted}>
                                    <FaTrash />
                                  </button>
                                </div>
                              </li>
                            )}
                          </Draggable>
                        ))
                      )}
                      {provided.placeholder}
                    </ol>
                  )}
                </Droppable>
              </DragDropContext>
              <button onClick={handleSubmit} disabled={top10.length !== 10 || eventStarted}>
                Send inn topp 10
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App