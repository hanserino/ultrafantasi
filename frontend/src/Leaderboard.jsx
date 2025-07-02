import React, { useEffect, useState } from 'react';

function Leaderboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/leaderboard', { credentials: 'include' })
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Laster inn leaderboard...</div>;

  return (
    <div>
      <h2>Leaderboard</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ccc' }}>Bruker</th>
            <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ccc' }}>Topp 10</th>
          </tr>
        </thead>
        <tbody>
          {data.map((entry, idx) => (
            <tr key={idx}>
              <td style={{ padding: '8px', borderBottom: '1px solid #eee', fontWeight: 600 }}>{entry.user}</td>
              <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
                <ol style={{ margin: 0, paddingLeft: 20 }}>
                  {entry.selections.map((sel, i) => sel.runner ? (
                    <li key={i}>
                      {sel.runner.firstname} {sel.runner.lastname}
                    </li>
                  ) : null)}
                </ol>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Leaderboard; 