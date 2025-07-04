import React, { useEffect, useState, useRef } from 'react';
import './App.css'
import Login from './Login';
import Runners from './Runners';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { FaTrophy, FaArrowUp, FaArrowDown, FaTrash } from 'react-icons/fa';
import Leaderboard from './Leaderboard';
import RaceOverview from './RaceOverview';
import AdminPage from './AdminPage';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { styled } from './stitches.config';
import RacePage from './RacePage';
import LeaderboardPage from './LeaderboardPage';
import { FiEdit2 } from 'react-icons/fi';


const PLACEHOLDER_MALE = 'data:image/svg+xml;utf8,<svg width="120" height="120" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="60" r="60" fill="%23b3c6ff"/><text x="50%" y="54%" text-anchor="middle" fill="%23555" font-size="48" font-family="Arial" dy=".3em">👦</text></svg>';
const PLACEHOLDER_FEMALE = 'data:image/svg+xml;utf8,<svg width="120" height="120" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="60" r="60" fill="%23ffb3d1"/><text x="50%" y="54%" text-anchor="middle" fill="%23555" font-size="48" font-family="Arial" dy=".3em">👧</text></svg>';
const PLACEHOLDER_NEUTRAL = 'data:image/svg+xml;utf8,<svg width="120" height="120" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="60" r="60" fill="%23ddd"/><text x="50%" y="54%" text-anchor="middle" fill="%23999" font-size="48" font-family="Arial" dy=".3em">👤</text></svg>';

// Styled components for top 10 list
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

// Add a styled top navigation bar
const TopNav = styled('nav', {
  width: '100%',
  background: '#fff',
  borderBottom: '1px solid #eee',
  padding: '12px 0',
  marginBottom: 24,
  display: 'flex',
  justifyContent: 'center',
  gap: 32,
  position: 'sticky',
  top: 0,
  zIndex: 100,
});
const NavLink = styled(Link, {
  color: '$secondary',
  textDecoration: 'none',
  fontWeight: 600,
  fontSize: 18,
  padding: '6px 18px',
  borderRadius: 6,
  '&.active': {
    background: '$primary',
    color: '#fff',
  },
  '&:hover': {
    background: '#f6f6f6',
  },
});

const UserInfo = styled('div', {
  display: 'flex',
  alignItems: 'center',
  position: 'absolute',
  right: 24,
  top: 10,
  gap: 10,
  background: 'rgba(255,255,255,0.95)',
  padding: '4px 12px',
  borderRadius: 8,
  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  zIndex: 101,
});
const UserImg = styled('img', {
  width: 36,
  height: 36,
  borderRadius: '50%',
  objectFit: 'cover',
  border: '2px solid #eee',
  background: '#fff',
});

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
  const location = useLocation();
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileEditFields, setProfileEditFields] = useState({});
  const [profilePicFile, setProfilePicFile] = useState(null);
  const [profilePicPreview, setProfilePicPreview] = useState(null);
  const [profilePicUploading, setProfilePicUploading] = useState(false);
  const [profilePicError, setProfilePicError] = useState("");
  const [profileEditSaving, setProfileEditSaving] = useState(false);
  const [profileEditMessage, setProfileEditMessage] = useState("");

  // Find claimed runner for this user
  const claimedRunner = user && runners.find(r => r.claimedByUserId === user.id);

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

  // Open modal with claimed runner's data
  const openProfileModal = () => {
    if (!claimedRunner) return;
    setProfileEditFields({ ...claimedRunner });
    setProfileModalOpen(true);
    setProfilePicFile(null);
    setProfilePicPreview(null);
    setProfilePicUploading(false);
    setProfilePicError("");
    setProfileEditMessage("");
  };
  const closeProfileModal = () => {
    setProfileModalOpen(false);
    setProfileEditFields({});
    setProfilePicFile(null);
    setProfilePicPreview(null);
    setProfilePicUploading(false);
    setProfilePicError("");
    setProfileEditMessage("");
  };
  const handleProfileEditChange = (field, value) => {
    setProfileEditFields(f => ({ ...f, [field]: value }));
  };
  const handleProfileEditSave = async (e) => {
    e.preventDefault();
    setProfileEditSaving(true);
    setProfileEditMessage("");
    const res = await fetch(`/runners/${profileEditFields.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        firstname: profileEditFields.firstname,
        lastname: profileEditFields.lastname,
        gender: profileEditFields.gender,
        instagram: profileEditFields.instagram,
        strava: profileEditFields.strava,
        duv: profileEditFields.duv,
        utmb: profileEditFields.utmb,
        itra: profileEditFields.itra,
        neda: profileEditFields.neda,
      })
    });
    setProfileEditSaving(false);
    if (res.ok) {
      setProfileEditMessage('Endringer lagret!');
      // Refetch runners and user immediately
      fetch('/runners').then(res => res.json()).then(setRunners);
      fetch('/auth/me', { credentials: 'include' }).then(res => res.ok ? res.json() : null).then(setUser);
      setTimeout(() => {
        closeProfileModal();
      }, 1000);
    } else {
      const err = await res.json();
      setProfileEditMessage(err.error || 'Kunne ikke lagre endringer');
    }
  };
  // Profile picture preview logic
  useEffect(() => {
    if (!profilePicFile) {
      setProfilePicPreview(null);
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setProfilePicPreview(reader.result);
    reader.readAsDataURL(profilePicFile);
    return () => reader.abort();
  }, [profilePicFile]);
  const handleProfilePicChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setProfilePicError('Bare bildefiler er tillatt');
      return;
    }
    setProfilePicFile(file);
    setProfilePicError("");
  };
  const handleProfilePicUpload = async (e) => {
    e.preventDefault();
    if (!profilePicFile) return;
    setProfilePicUploading(true);
    setProfilePicError("");
    const formData = new FormData();
    formData.append('profilePicture', profilePicFile);
    const res = await fetch(`/runners/${profileEditFields.id}/profile-picture`, {
      method: 'POST',
      credentials: 'include',
      body: formData
    });
    setProfilePicUploading(false);
    if (res.ok) {
      const data = await res.json();
      setProfileEditFields(f => ({ ...f, profilePicture: data.runner.profilePicture }));
      setProfilePicFile(null);
      setProfilePicPreview(null);
      setProfilePicError("");
      // Refetch user to update profile picture
      fetch('/auth/me', { credentials: 'include' }).then(res => res.ok ? res.json() : null).then(setUser);
    } else {
      const err = await res.json();
      setProfilePicError(err.error || 'Kunne ikke laste opp bilde');
    }
  };

  return (
    <>
      {/* Only show nav if user is logged in and has access */}
      {user && !user.error && user.email === 'eplehans@gmail.com' && (
        <TopNav style={{position:'relative'}}>
          <NavLink to="/races" className={location.pathname.startsWith('/races') ? 'active' : ''}>Race Overview</NavLink>
          <NavLink to="/leaderboard" className={location.pathname.startsWith('/leaderboard') ? 'active' : ''}>Leaderboard</NavLink>
          <UserInfo>
            <span style={{fontWeight:600, fontSize:16}}>{user.nickname || user.name || user.email}</span>
            <UserImg
              src={user.profilePicture ? `${window.location.origin}/uploads/${user.profilePicture}` : PLACEHOLDER_NEUTRAL}
              alt="Profile"
              style={{ cursor: claimedRunner ? 'pointer' : 'default' }}
              onClick={claimedRunner ? openProfileModal : undefined}
              title={claimedRunner ? 'Rediger profil' : ''}
            />
          </UserInfo>
        </TopNav>
      )}
      {/* Profile Edit Modal (same as claimed runner edit) */}
      {profileModalOpen && claimedRunner && (
        <div className="modal-backdrop" style={{
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
          <div style={{ background: '#fff', padding: 32, borderRadius: 8, minWidth: 400, maxWidth: '90vw', position: 'relative' }}>
            <button onClick={closeProfileModal} style={{ position: 'absolute', top: 8, right: 8, fontSize: 20, background: 'none', border: 'none', cursor: 'pointer' }} aria-label="Lukk">&times;</button>
            <h3>Rediger profil</h3>
            <form onSubmit={handleProfileEditSave} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Profile picture section */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ marginBottom: 6, fontWeight: 500 }}>Profilbilde:</div>
                {profileEditFields.profilePicture && !profilePicPreview && (
                  <img src={`/uploads/${profileEditFields.profilePicture}`} alt="Profilbilde" style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: '50%', border: '1px solid #ccc', marginBottom: 8 }} />
                )}
                {profilePicPreview && (
                  <img src={profilePicPreview} alt="Forhåndsvisning" style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: '50%', border: '1px solid #ccc', marginBottom: 8 }} />
                )}
                <input type="file" accept="image/*" onChange={handleProfilePicChange} style={{ marginBottom: 8 }} />
                <button type="button" onClick={handleProfilePicUpload} disabled={!profilePicFile || profilePicUploading} style={{ marginBottom: 4 }}>
                  {profilePicUploading ? 'Laster opp...' : 'Last opp bilde'}
                </button>
                {profilePicError && <div style={{ color: 'red' }}>{profilePicError}</div>}
              </div>
              <label>
                Fornavn:
                <input type="text" value={profileEditFields.firstname || ''} onChange={e => handleProfileEditChange('firstname', e.target.value)} required />
              </label>
              <label>
                Etternavn:
                <input type="text" value={profileEditFields.lastname || ''} onChange={e => handleProfileEditChange('lastname', e.target.value)} required />
              </label>
              <label>
                Kjønn:
                <select value={profileEditFields.gender || ''} onChange={e => handleProfileEditChange('gender', e.target.value)} required>
                  <option value="">Velg kjønn...</option>
                  <option value="f">Kvinne</option>
                  <option value="m">Mann</option>
                </select>
              </label>
              <label>
                Instagram:
                <input type="text" value={profileEditFields.instagram || ''} onChange={e => handleProfileEditChange('instagram', e.target.value)} placeholder="@brukernavn" />
              </label>
              <label>
                Strava:
                <input type="text" value={profileEditFields.strava || ''} onChange={e => handleProfileEditChange('strava', e.target.value)} placeholder="https://www.strava.com/athletes/10448277" />
              </label>
              <label>
                DUV:
                <input type="text" value={profileEditFields.duv || ''} onChange={e => handleProfileEditChange('duv', e.target.value)} placeholder="https://statistik.d-u-v.org/getresultperson.php?runner=439692" />
              </label>
              <label>
                UTMB:
                <input type="text" value={profileEditFields.utmb || ''} onChange={e => handleProfileEditChange('utmb', e.target.value)} placeholder="https://utmb.world/runner/676108.hanskristian.smedsrod" />
              </label>
              <label>
                ITRA:
                <input type="text" value={profileEditFields.itra || ''} onChange={e => handleProfileEditChange('itra', e.target.value)} placeholder="https://itra.run/api/RunnerSpace/GetRunnerSpace?memberString=ll0jIevnXbxYRpfoGttA9A%3D%3D" />
              </label>
              <button type="submit" disabled={profileEditSaving}>{profileEditSaving ? 'Lagrer...' : 'Lagre endringer'}</button>
              {profileEditMessage && <div style={{ color: profileEditMessage.includes('ikke') ? 'red' : 'green' }}>{profileEditMessage}</div>}
            </form>
          </div>
        </div>
      )}
      <Routes>
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/races" element={<RaceOverview />} />
        <Route path="/races/:raceId" element={<RacePage user={user} />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/" element={
          !user || user.error ? <Login /> :
          user.email !== 'eplehans@gmail.com' ? <div>Du har ikke tilgang til denne siden.</div> :
          <Navigate to="/races" replace />
        } />
      </Routes>
    </>
  );
}

export default App