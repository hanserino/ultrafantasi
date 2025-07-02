import React, { useEffect, useState } from 'react';
import { FaPlus } from 'react-icons/fa';

function Runners({ onSelect, top10, eventStarted }) {
  const [runners, setRunners] = useState([]);

  useEffect(() => {
    fetch('/runners', { credentials: 'include' })
      .then(res => res.json())
      .then(setRunners)
      .catch(() => setRunners([]));
  }, []);

  const isDisabled = (runnerId) => eventStarted || top10.length >= 10 || top10.includes(runnerId);

  return (
    <div className="runner-pool">
      <h3>Løpere</h3>
      
      <ul className="runner-pool__list">
        {runners.map(runner => {
          const disabled = isDisabled(runner.id);
          return (
            <li key={runner.id} style={{ color: disabled ? '#aaa' : 'inherit' }}>
              <span>{runner.firstname} {runner.lastname}</span>
              <button
                onClick={() => onSelect(runner.id)}
                style={{ marginLeft: 8 }}
                disabled={disabled}
                aria-label="Legg til i topp 10"
              >
                <FaPlus />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default Runners;