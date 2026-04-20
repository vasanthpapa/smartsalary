import React, { useState } from 'react';
import { useWorkforce } from '../context/workforceShared';

const Login = () => {
  const { login } = useWorkforce();
  const [username, setUsername] = useState('smartadmin@org');
  const [password, setPassword] = useState('');
  const [errorText, setErrorText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorText('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setErrorText(err.response?.data?.error || 'Login failed. Try again.');
      setLoading(false);
      const toast = document.getElementById('toast');
      if (toast) {
        toast.textContent = errorText || 'Invalid credentials. Please try again.';
        toast.className = 'toast show error';
        setTimeout(() => toast.className = 'toast', 3000);
      }
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      width: '100vw',
      position: 'relative',
      zIndex: 10
    }}>
      <div className="card" style={{ maxWidth: '400px', width: '90%', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ color: 'var(--primary)', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>WorkForce Pro</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Sign in to Admin Dashboard</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="input-group">
            <label>Username</label>
            <input 
              type="text" 
              placeholder="Enter username" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label>Password</label>
            <input 
              type="password" 
              placeholder="Enter password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {errorText && <div style={{ color: 'var(--danger)', fontSize: '0.85rem', textAlign: 'center' }}>{errorText}</div>}

          <button type="submit" className="primary-btn" disabled={loading} style={{ marginTop: '0.5rem' }}>
            {loading ? 'Authenticating...' : 'Login'}
          </button>
        </form>

        <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          <p>Login securely.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
