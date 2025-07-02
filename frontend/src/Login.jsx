import React from 'react';

function Login() {
  const handleLogin = () => {
    window.location.href = '/auth/google';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 100 }}>
      <h1>Ultrafantasti</h1>
      <button onClick={handleLogin} style={{ fontSize: 18, padding: '10px 30px' }}>
        Logg inn med Google
      </button>
    </div>
  );
}

export default Login;