import React, { useEffect, useState } from 'react';
import { FaPlus } from 'react-icons/fa';
import { FaChevronDown, FaInstagram, FaStrava, FaLink } from 'react-icons/fa';
import { FiMoreVertical } from 'react-icons/fi';

const PLACEHOLDER_MALE = 'data:image/svg+xml;utf8,<svg width="120" height="120" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="60" r="60" fill="%23b3c6ff"/><text x="50%" y="54%" text-anchor="middle" fill="%23555" font-size="48" font-family="Arial" dy=".3em">👦</text></svg>';
const PLACEHOLDER_FEMALE = 'data:image/svg+xml;utf8,<svg width="120" height="120" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="60" r="60" fill="%23ffb3d1"/><text x="50%" y="54%" text-anchor="middle" fill="%23555" font-size="48" font-family="Arial" dy=".3em">👧</text></svg>';
const PLACEHOLDER_NEUTRAL = 'data:image/svg+xml;utf8,<svg width="120" height="120" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="60" r="60" fill="%23ddd"/><text x="50%" y="54%" text-anchor="middle" fill="%23999" font-size="48" font-family="Arial" dy=".3em">👤</text></svg>';

function Runners({ onSelect, top10, eventStarted, raceId }) {
  const [runners, setRunners] = useState([]);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [user, setUser] = useState(null);
  const [claiming, setClaiming] = useState(null);
  const [claimError, setClaimError] = useState("");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editFields, setEditFields] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [editMessage, setEditMessage] = useState("");
  const [expandedRunnerId, setExpandedRunnerId] = useState(null);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [profilePicFile, setProfilePicFile] = useState(null);
  const [profilePicPreview, setProfilePicPreview] = useState(null);
  const [profilePicUploading, setProfilePicUploading] = useState(false);
  const [profilePicError, setProfilePicError] = useState("");

  useEffect(() => {
    fetch('/auth/me', { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(setUser);
  }, []);

  useEffect(() => {
    if (!raceId) return setRunners([]);
    fetch(`/races/${raceId}/runners`, { credentials: 'include' })
      .then(res => res.json())
      .then(setRunners)
      .catch(() => setRunners([]));
  }, [raceId, claiming, editModalOpen]);
    
  const isDisabled = (runnerId) => eventStarted || top10.length >= 10 || top10.includes(runnerId);

  // Check if the user has already claimed a runner
  const userClaimedRunner = runners.find(r => r.claimedByUserId === user?.id);

  const handleClaim = async (runnerId) => {
    setClaiming(runnerId);
    setClaimError("");
    const res = await fetch(`/runners/${runnerId}/claim`, { method: 'POST', credentials: 'include' });
    if (res.ok) {
      setClaiming(null);
      // Refetch runners
      fetch(`/races/${raceId}/runners`, { credentials: 'include' })
        .then(res => res.json())
        .then(setRunners);
    } else {
      const err = await res.json();
      setClaimError(err.error || 'Kunne ikke kreve løper');
      setClaiming(null);
    }
  };

  const openEditModal = (runner) => {
    setEditFields({ ...runner });
    setEditMessage("");
    setEditModalOpen(true);
    setProfilePicFile(null);
    setProfilePicPreview(null);
    setProfilePicUploading(false);
    setProfilePicError("");
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditFields({});
    setEditMessage("");
    setProfilePicFile(null);
    setProfilePicPreview(null);
    setProfilePicUploading(false);
    setProfilePicError("");
  };

  const handleEditChange = (field, value) => {
    setEditFields(f => ({ ...f, [field]: value }));
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    setEditSaving(true);
    setEditMessage("");
    const res = await fetch(`/runners/${editFields.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        firstname: editFields.firstname,
        lastname: editFields.lastname,
        gender: editFields.gender,
        instagram: editFields.instagram,
        strava: editFields.strava,
        duv: editFields.duv,
        utmb: editFields.utmb,
        itra: editFields.itra,
        neda: editFields.neda,
      })
    });
    setEditSaving(false);
    if (res.ok) {
      setEditMessage('Endringer lagret!');
      setTimeout(() => {
        closeEditModal();
      }, 1000);
    } else {
      const err = await res.json();
      setEditMessage(err.error || 'Kunne ikke lagre endringer');
    }
  };

  // Add Escape key and outside click close for modal
  useEffect(() => {
    if (!editModalOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') closeEditModal();
    };
    const handleClick = (e) => {
      if (e.target.classList.contains('modal-backdrop')) closeEditModal();
    };
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClick);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [editModalOpen]);

  const handleExpand = (runnerId) => {
    setExpandedRunnerId(expandedRunnerId === runnerId ? null : runnerId);
  };

  const handleUnclaim = async (runnerId) => {
    setClaiming(runnerId);
    setClaimError("");
    const res = await fetch(`/runners/${runnerId}/unclaim`, { method: 'POST', credentials: 'include' });
    if (res.ok) {
      setClaiming(null);
      setMenuOpenId(null);
      fetch(`/races/${raceId}/runners`, { credentials: 'include' })
        .then(res => res.json())
        .then(setRunners);
    } else {
      const err = await res.json();
      setClaimError(err.error || 'Kunne ikke fjerne krav på løper');
      setClaiming(null);
    }
  };

  // Add Escape key and outside click close for menu
  useEffect(() => {
    if (menuOpenId === null) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setMenuOpenId(null);
    };
    const handleClick = (e) => {
      if (e.target.classList && e.target.classList.contains('runner-menu-backdrop')) setMenuOpenId(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClick);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [menuOpenId]);

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
    const res = await fetch(`/runners/${editFields.id}/profile-picture`, {
      method: 'POST',
      credentials: 'include',
      body: formData
    });
    setProfilePicUploading(false);
    if (res.ok) {
      const data = await res.json();
      setEditFields(f => ({ ...f, profilePicture: data.runner.profilePicture }));
      setProfilePicFile(null);
      setProfilePicPreview(null);
      setProfilePicError("");
    } else {
      const err = await res.json();
      setProfilePicError(err.error || 'Kunne ikke laste opp bilde');
    }
  };

  // Helper to check if runner has metadata (besides name)
  const hasMetadata = (runner) => {
    return (
      runner.gender || runner.distance || runner.category ||
      runner.instagram || runner.strava || runner.duv ||
      runner.utmb || runner.itra || runner.neda
    );
  };

  // Helper to check if runner has social media
  const hasSocialMedia = (runner) => {
    return (
      runner.instagram || runner.strava || runner.duv ||
      runner.utmb || runner.itra
    );
  };

  if (!raceId) return null;

  return (
    <div className="runner-pool">
      <h3>Løpere</h3>
      {claimError && <div style={{ color: 'red', marginBottom: 8 }}>{claimError}</div>}
      <ul className="runner-pool__list">
        {runners.map(runner => {
          const disabled = isDisabled(runner.id);
          const isClaimed = !!runner.claimedByUserId;
          const claimedByYou = user && runner.claimedByUserId === user.id;
          const isExpanded = expandedRunnerId === runner.id;
          const showMenu = menuOpenId === runner.id;
          const imgSrc = runner.profilePicture
            ? `${window.location.origin}/uploads/${runner.profilePicture}`
            : runner.gender && runner.gender.toLowerCase() === 'f'
              ? PLACEHOLDER_FEMALE
              : runner.gender && runner.gender.toLowerCase() === 'm'
                ? PLACEHOLDER_MALE
                : PLACEHOLDER_NEUTRAL;
          const borderColor = hasSocialMedia(runner) ? '2px solid #2ecc40' : '2px solid #ccc';
          return (
            <li key={runner.id} style={{ color: disabled ? '#aaa' : 'inherit', position: 'relative', flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                {hasSocialMedia(runner) ? (
                  <button
                    onClick={() => handleExpand(runner.id)}
                    style={{
                      border: 'none',
                      background: 'none',
                      padding: 0,
                      marginRight: 12,
                      cursor: 'pointer',
                      outline: 'none',
                      borderRadius: '50%',
                      boxShadow: isExpanded ? '0 0 0 2px #2ecc40' : undefined,
                      transition: 'box-shadow 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    aria-label={isExpanded ? 'Skjul detaljer' : 'Vis detaljer'}
                  >
                    <img
                      src={imgSrc}
                      alt="Profilbilde"
                      style={{
                        width: 48,
                        height: 48,
                        objectFit: 'cover',
                        borderRadius: '50%',
                        border: borderColor,
                        background: '#fff',
                        flexShrink: 0,
                        pointerEvents: 'none',
                      }}
                    />
                  </button>
                ) : (
                  <img
                    src={imgSrc}
                    alt="Profilbilde"
                    style={{
                      width: 48,
                      height: 48,
                      objectFit: 'cover',
                      borderRadius: '50%',
                      border: borderColor,
                      marginRight: 12,
                      background: '#fff',
                      flexShrink: 0
                    }}
                  />
                )}
                <span>{runner.firstname} {runner.lastname}</span>
                <button
                  onClick={e => { e.stopPropagation(); onSelect(runner.id); }}
                  style={{ marginLeft: 8 }}
                  disabled={disabled}
                  aria-label="Legg til i topp 10"
                >
                  <FaPlus />
                </button>
                {/* Claim status and edit button */}
                {isClaimed && claimedByYou && (
                  <>
                    <span style={{ marginLeft: 8, color: 'green', fontWeight: 600 }}>(Claimed by you)</span>
                    <button onClick={e => { e.stopPropagation(); openEditModal(runner); }} style={{ marginLeft: 8 }}>Edit</button>
                  </>
                )}
                {isClaimed && !claimedByYou && (
                  <span style={{ marginLeft: 8, color: '#888' }}>(Claimed)</span>
                )}
                {/* Dot dot dot menu */}
                <div style={{ marginLeft: 'auto', position: 'relative' }}>
                  <button
                    onClick={e => { e.stopPropagation(); setMenuOpenId(menuOpenId === runner.id ? null : runner.id); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, padding: 4 }}
                    aria-label="Mer"
                  >
                    <FiMoreVertical />
                  </button>
                  {showMenu && (
                    <>
                      <div className="runner-menu-backdrop" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1000 }} />
                      <div style={{ position: 'absolute', right: 0, top: 32, background: '#fff', border: '1px solid #ccc', borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', zIndex: 1001, minWidth: 160 }}>
                        {!isClaimed && !userClaimedRunner && user && (
                          <button
                            onClick={() => handleClaim(runner.id)}
                            disabled={claiming === runner.id}
                            style={{ width: '100%', padding: 10, background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }}
                          >
                            {claiming === runner.id ? 'Krever...' : 'Claim this runner'}
                          </button>
                        )}
                        {isClaimed && claimedByYou && (
                          <button
                            onClick={() => handleUnclaim(runner.id)}
                            disabled={claiming === runner.id}
                            style={{ width: '100%', padding: 10, background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', color: 'red' }}
                          >
                            {claiming === runner.id ? 'Fjerner...' : 'Unclaim'}
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
              {hasSocialMedia(runner) && isExpanded && (
                <div style={{ background: '#f6f6f6', border: '1px solid #ddd', borderRadius: 6, marginTop: 8, padding: 12, width: '100%' }}>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 15 }}>
                    {runner.instagram && <li><b>Instagram:</b> <a href={runner.instagram.startsWith('http') ? runner.instagram : `https://instagram.com/${runner.instagram.replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer">{runner.instagram}</a></li>}
                    {runner.strava && <li><b>Strava:</b> <a href={runner.strava} target="_blank" rel="noopener noreferrer">{runner.strava}</a></li>}
                    {runner.duv && <li><b>DUV:</b> <a href={runner.duv} target="_blank" rel="noopener noreferrer">{runner.duv}</a></li>}
                    {runner.utmb && <li><b>UTMB:</b> <a href={runner.utmb} target="_blank" rel="noopener noreferrer">{runner.utmb}</a></li>}
                    {runner.itra && <li><b>ITRA:</b> <a href={runner.itra} target="_blank" rel="noopener noreferrer">{runner.itra}</a></li>}
                  </ul>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {/* Edit Modal */}
      {editModalOpen && (
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
            <button onClick={closeEditModal} style={{ position: 'absolute', top: 8, right: 8, fontSize: 20, background: 'none', border: 'none', cursor: 'pointer' }} aria-label="Lukk">&times;</button>
            <h3>Rediger løperprofil</h3>
            <form onSubmit={handleEditSave} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Profile picture section */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ marginBottom: 6, fontWeight: 500 }}>Profilbilde:</div>
                {editFields.profilePicture && !profilePicPreview && (
                  <img src={`/uploads/${editFields.profilePicture}`} alt="Profilbilde" style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: '50%', border: '1px solid #ccc', marginBottom: 8 }} />
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
                <input type="text" value={editFields.firstname || ''} onChange={e => handleEditChange('firstname', e.target.value)} required />
              </label>
              <label>
                Etternavn:
                <input type="text" value={editFields.lastname || ''} onChange={e => handleEditChange('lastname', e.target.value)} required />
              </label>
              <label>
                Kjønn:
                <select value={editFields.gender || ''} onChange={e => handleEditChange('gender', e.target.value)} required>
                  <option value="">Velg kjønn...</option>
                  <option value="f">Kvinne</option>
                  <option value="m">Mann</option>
                </select>
              </label>
              <label>
                Instagram:
                <input type="text" value={editFields.instagram || ''} onChange={e => handleEditChange('instagram', e.target.value)} placeholder="@brukernavn" />
              </label>
              <label>
                Strava:
                <input type="text" value={editFields.strava || ''} onChange={e => handleEditChange('strava', e.target.value)} placeholder="https://www.strava.com/athletes/10448277" />
              </label>
              <label>
                DUV:
                <input type="text" value={editFields.duv || ''} onChange={e => handleEditChange('duv', e.target.value)} placeholder="https://statistik.d-u-v.org/getresultperson.php?runner=439692" />
              </label>
              <label>
                UTMB:
                <input type="text" value={editFields.utmb || ''} onChange={e => handleEditChange('utmb', e.target.value)} placeholder="https://utmb.world/runner/676108.hanskristian.smedsrod" />
              </label>
              <label>
                ITRA:
                <input type="text" value={editFields.itra || ''} onChange={e => handleEditChange('itra', e.target.value)} placeholder="https://itra.run/api/RunnerSpace/GetRunnerSpace?memberString=ll0jIevnXbxYRpfoGttA9A%3D%3D" />
              </label>
              <button type="submit" disabled={editSaving}>{editSaving ? 'Lagrer...' : 'Lagre endringer'}</button>
              {editMessage && <div style={{ color: editMessage.includes('ikke') ? 'red' : 'green' }}>{editMessage}</div>}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Runners;