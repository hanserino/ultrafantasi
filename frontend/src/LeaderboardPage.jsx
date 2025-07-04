import React, { useEffect, useState } from 'react';

function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [openUser, setOpenUser] = useState(null);

  useEffect(() => {
    fetch('/leaderboard').then(res => res.json()).then(setLeaderboard);
  }, []);

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 24 }}>
      <h2>Global Leaderboard</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 24 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ccc' }}>Bruker</th>
            <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ccc' }}>Poeng</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((entry) => (
            <React.Fragment key={entry.user.id}>
              <tr
                style={{ cursor: 'pointer', background: openUser === entry.user.id ? '#f6f6f6' : 'white' }}
                onClick={() => setOpenUser(openUser === entry.user.id ? null : entry.user.id)}
              >
                <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{entry.user.nickname || entry.user.name || entry.user.email}</td>
                <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{entry.total}</td>
              </tr>
              {openUser === entry.user.id && (
                <tr>
                  <td colSpan={2} style={{ background: '#fafafa', padding: 12 }}>
                    <b>Event scores:</b>
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

export default LeaderboardPage; 