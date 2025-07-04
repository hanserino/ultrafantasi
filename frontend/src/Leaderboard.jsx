import React, { useEffect, useState } from 'react';

function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openUser, setOpenUser] = useState(null);

  useEffect(() => {
    fetch('/leaderboard').then(res => res.json()).then(setLeaderboard);
  }, []);

  if (loading) return <div>Laster inn leaderboard...</div>;

  return (
    <div>
      <h2>Leaderboard</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ccc' }}>Bruker</th>
            <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ccc' }}>Poeng</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((entry, idx) => (
            <React.Fragment key={entry.user.id}>
              <tr onClick={() => setOpenUser(openUser === entry.user.id ? null : entry.user.id)}>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', fontWeight: 600 }}>{entry.user.nickname || entry.user.name || entry.user.email}</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{entry.total}</td>
              </tr>
              {openUser === entry.user.id && (
                <tr>
                  <td colSpan={2} style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      {Object.values(entry.raceScores).map(({ race, points }) => (
                        <li key={race.id}>{race.name}: {points} poeng</li>
                      ))}
                    </ul>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Leaderboard; 