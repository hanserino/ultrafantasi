import React, { useEffect, useState, useRef } from 'react';
import './App.css'
import Login from './Login';
import Runners from './Runners';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { FaTrophy, FaArrowUp, FaArrowDown, FaTrash } from 'react-icons/fa';
import Leaderboard from './Leaderboard';
import RaceOverview from './RaceOverview';
import AdminPage from './AdminPage';
import { Routes, Route } from 'react-router-dom';

const PLACEHOLDER_MALE = 'data:image/svg+xml;utf8,<svg width="120" height="120" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="60" r="60" fill="%23b3c6ff"/><text x="50%" y="54%" text-anchor="middle" fill="%23555" font-size="48" font-family="Arial" dy=".3em">👦</text></svg>';
const PLACEHOLDER_FEMALE = 'data:image/svg+xml;utf8,<svg width="120" height="120" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="60" r="60" fill="%23ffb3d1"/><text x="50%" y="54%" text-anchor="middle" fill="%23555" font-size="48" font-family="Arial" dy=".3em">👧</text></svg>';
const PLACEHOLDER_NEUTRAL = 'data:image/svg+xml;utf8,<svg width="120" height="120" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="60" r="60" fill="%23ddd"/><text x="50%" y="54%" text-anchor="middle" fill="%23999" font-size="48" font-family="Arial" dy=".3em">👤</text></svg>';

function App() {
  const [user, setUser] = useState(null);
  const [top10, setTop10] = useState([]);
  const [runners, setRunners] = useState([]);
  const [now, setNow] = useState(new Date());
  const timerRef = useRef();
  const [nickname, setNickname] = useState("");
  const [nicknameSaved, setNicknameSaved] = useState(false);
  const [view, setView] = useState('main'); // 'main' or 'leaderboard'
  const [selectedRace, setSelectedRace] = useState(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const shareListRef = useRef(null);

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
    if (!user || user.error || !selectedRace) return;
    fetch(`/races/${selectedRace.id}/selections/me`, { credentials: 'include' })
      .then(res => res.json())
      .then(selections => {
        if (Array.isArray(selections) && selections.length > 0) {
          const sorted = selections
            .filter(sel => sel.runner)
            .sort((a, b) => a.rank - b.rank);
          setTop10(sorted.map(sel => sel.runner.id));
          console.log('Fetched top10:', sorted.map(sel => sel.runner.id));
        } else {
          setTop10([]);
          console.log('Fetched top10: []');
        }
      });
  }, [user, selectedRace]);

  useEffect(() => {
    fetch('/runners')
      .then(res => res.json())
      .then(setRunners);
  }, []);

  useEffect(() => {
    timerRef.current = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const getEventStart = () => {
    if (!selectedRace || !selectedRace.date) return null;
    // selectedRace.date may be ISO string or Date
    return new Date(selectedRace.date);
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
    if (eventStarted || !selectedRace) return;
    const res = await fetch(`/races/${selectedRace.id}/selections`, {
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

  // Nedtelling visning
  const getCountdown = () => {
    const eventStart = getEventStart();
    if (!eventStart) return '';
    const diff = eventStart - now;
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

  const getShareList = () => {
    const raceLine = `Mine Ultrafantasti-kandidater for ${selectedRace?.name || ''}:`;
    const names = top10.map((id, idx) => {
      const { name } = getRunnerInfo(id);
      return `${idx + 1}. ${name}`;
    });
    return [raceLine, ...names].join('\n');
  };

  useEffect(() => {
    if (shareModalOpen && shareListRef.current) {
      // Select and copy the text
      const el = shareListRef.current;
      if (window.getSelection && document.createRange) {
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }
      try {
        document.execCommand('copy');
        setShareCopied(true);
      } catch {
        setShareCopied(false);
      }
    } else {
      setShareCopied(false);
    }
  }, [shareModalOpen]);

  useEffect(() => {
    if (!shareModalOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setShareModalOpen(false);
    };
    const handleClick = (e) => {
      if (e.target.classList && e.target.classList.contains('share-modal-backdrop')) setShareModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClick);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [shareModalOpen]);

  return (
    <Routes>
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/" element={
        !user || user.error ? <Login /> :
        user.email !== 'eplehans@gmail.com' ? <div>Du har ikke tilgang til denne siden.</div> :
        <div className="app-container">
          <RaceOverview selectedRace={selectedRace} onSelect={setSelectedRace} />
          {selectedRace && (
            <>
              <nav style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
                <button onClick={() => setView('main')} disabled={view === 'main'}>Mitt lag</button>
                <button onClick={() => setView('leaderboard')} disabled={view === 'leaderboard'}>Leaderboard</button>
              </nav>
              {view === 'leaderboard' ? (
                <Leaderboard raceId={selectedRace.id} />
              ) : (
                <>
                  <div style={{ fontSize: 18, marginBottom: 16, color: eventStarted ? 'red' : 'inherit' }}>{getCountdown()}</div>
                  <h2>Velkommen, {user.name || user.email}!</h2>
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
                    <Runners onSelect={handleSelect} top10={top10} eventStarted={eventStarted} raceId={selectedRace.id} />
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
                                        <img src={getRunnerInfo(id).imgSrc} alt="Profilbilde" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: '50%', marginRight: 8, verticalAlign: 'middle', background: '#fff', border: '1px solid #ccc' }} />
                                        {getRunnerInfo(id).name}
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
                      <button onClick={() => setShareModalOpen(true)} style={{ marginLeft: 8 }}>Del</button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
          {shareModalOpen && (
            <div className="share-modal-backdrop" style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}>
              <div style={{ background: '#fff', padding: 32, borderRadius: 8, minWidth: 320, maxWidth: '90vw', position: 'relative', boxShadow: '0 2px 16px rgba(0,0,0,0.15)' }}>
                <button onClick={() => setShareModalOpen(false)} style={{ position: 'absolute', top: 8, right: 8, fontSize: 20, background: 'none', border: 'none', cursor: 'pointer' }} aria-label="Lukk">&times;</button>
                <h3>Del dine topp 10-kandidater</h3>
                <div style={{ marginBottom: 12, color: shareCopied ? 'green' : '#333', fontWeight: 500 }}>
                  {shareCopied ? 'Listen er kopiert til utklippstavlen!' : 'Kopierer...'}
                </div>
                <pre ref={shareListRef} style={{ background: '#f6f6f6', border: '1px solid #ccc', borderRadius: 6, padding: 16, fontSize: 16, fontFamily: 'inherit', outline: '2px solid #2ecc40', userSelect: 'all', margin: 0 }}>{getShareList()}</pre>
              </div>
            </div>
          )}
        </div>
      } />
    </Routes>
  );
}

export default App