import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/app/utils/supabase/client'; // <--- CHANGED THIS IMPORT
import { Icons } from './Icons'; 

// Inline Eye Icons for the password toggle
const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
);
const EyeOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7c.84 0 1.68-.06 2.5-.18"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
);

export const LoginModal = ({ onClose }: { onClose: () => void }) => {
  // 1. INITIALIZE THE COOKIE-SMART CLIENT
  const supabase = createClient();

  const [view, setView] = useState<'login' | 'signup' | 'forgot'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  // Handle Mounting
  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      // Refresh the page so the server sees the new cookie immediately
      window.location.reload(); 
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const complexityRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,}$/;
    if (!complexityRegex.test(password)) {
      setError("Password must be 8+ characters and include at least one number and one special character.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      },
    });

    if (error) {
      setError(error.message);
    } else {
      setSuccessMsg("Registration successful! Check your email to confirm your account.");
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`, 
    });

    if (error) {
      setError(error.message);
    } else {
      setSuccessMsg("Password reset link sent to your email.");
    }
    setLoading(false);
  };

  const inputStyle = {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #444',
    background: '#333',
    color: 'white',
    marginTop: '8px',
    outline: 'none'
  };

  if (!mounted) return null;

  const modalContent = (
    <div className="modal-overlay" onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)',
      zIndex: 99999,
      display: 'flex',       
      overflowY: 'auto',     
      padding: '20px'        
    }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{
        background: '#1a1a1a', width: '100%', maxWidth: '400px',
        borderRadius: '16px', padding: '32px', border: '1px solid #333',
        boxShadow: '0 50px 100px -20px rgba(0,0,0,0.7)', 
        position: 'relative',
        margin: 'auto',      
        flexShrink: 0        
      }}>
        
        <button onClick={onClose} style={{
          position: 'absolute', top: 16, right: 16, background: 'none', border: 'none',
          color: '#666', cursor: 'pointer', padding: 4
        }}>
          <Icons.X />
        </button>

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h2 style={{ color: 'white', margin: '0 0 8px 0', fontSize: '24px' }}>
            {view === 'login' ? 'Welcome Back' : view === 'signup' ? 'Create Account' : 'Reset Password'}
          </h2>
        </div>

        {error && <div style={{ background: 'rgba(255,0,0,0.1)', color: '#ff6b6b', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>{error}</div>}
        {successMsg && <div style={{ background: 'rgba(76, 175, 80, 0.1)', color: '#4caf50', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>{successMsg}</div>}

        <form onSubmit={view === 'login' ? handleLogin : view === 'signup' ? handleSignUp : handleForgotPassword}>
          
          {view === 'signup' && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <input type="text" placeholder="First Name" required value={firstName} onChange={e => setFirstName(e.target.value)} style={inputStyle} />
              <input type="text" placeholder="Last Name" required value={lastName} onChange={e => setLastName(e.target.value)} style={inputStyle} />
            </div>
          )}

          <input type="email" placeholder="Email address" required value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />

          {view !== 'forgot' && (
            <div style={{ position: 'relative' }}>
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Password" 
                required 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                style={{ ...inputStyle, paddingRight: '40px' }} 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: '12px', top: '22px', 
                  background: 'none', border: 'none', color: '#888', cursor: 'pointer'
                }}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          )}

          {view === 'signup' && (
             <input type="password" placeholder="Confirm Password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} style={inputStyle} />
          )}

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '12px', marginTop: '24px',
            background: loading ? '#666' : '#4caf50', color: 'white', border: 'none',
            borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '16px', fontWeight: '600'
          }}>
            {loading ? 'Processing...' : (view === 'login' ? 'Sign In' : view === 'signup' ? 'Sign Up' : 'Send Reset Link')}
          </button>
        </form>

        <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '14px', color: '#888' }}>
          {view === 'login' ? (
            <>
              Don't have an account? <span onClick={() => { setView('signup'); setError(null); }} style={{ color: '#4caf50', cursor: 'pointer' }}>Sign up</span>
              <br />
              <span onClick={() => { setView('forgot'); setError(null); }} style={{ color: '#888', cursor: 'pointer', textDecoration: 'underline', marginTop: '8px', display: 'inline-block' }}>Forgot password?</span>
            </>
          ) : view === 'signup' ? (
            <>Already have an account? <span onClick={() => { setView('login'); setError(null); }} style={{ color: '#4caf50', cursor: 'pointer' }}>Sign in</span></>
          ) : (
            <span onClick={() => { setView('login'); setError(null); }} style={{ color: '#4caf50', cursor: 'pointer' }}>Back to Sign in</span>
          )}
        </div>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};