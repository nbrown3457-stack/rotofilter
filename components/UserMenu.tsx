import { useEffect, useState } from 'react';
// 1. CHANGE THIS IMPORT to the new Cookie-Smart client
import { createClient } from '@/app/utils/supabase/client'; 
import { LoginModal } from './LoginModal'; 
import { User } from '@supabase/supabase-js';

export const UserMenu = () => {
  // 2. INITIALIZE THE CLIENT
  const supabase = createClient();

  const [user, setUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    // 3. Get initial user (Now checks Cookies!)
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    getUser();

    // 4. Listen for Login/Logout events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) setIsDropdownOpen(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsDropdownOpen(false);
    window.location.reload(); // Refresh to clear any cached data
  };

  const getInitials = () => {
    if (!user) return '';
    const { first_name, last_name } = user.user_metadata || {};
    if (first_name && last_name) {
      return `${first_name[0]}${last_name[0]}`.toUpperCase();
    }
    return user.email ? user.email.substring(0, 2).toUpperCase() : '??';
  };

  return (
    <>
      {!user ? (
        <button 
          onClick={() => setIsModalOpen(true)}
          style={{ 
            padding: '6px 12px',
            background: '#4caf50', 
            color: 'white', 
            border: 'none', 
            borderRadius: '8px', 
            cursor: 'pointer', 
            fontWeight: '600',
            fontSize: '12px'
          }}
        >
          Sign In
        </button>
      ) : (
        <div style={{ position: 'relative' }}>
          <div 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#333', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px solid #4caf50', fontWeight: 'bold', userSelect: 'none' }}
          >
            {getInitials()}
          </div>
          {isDropdownOpen && (
            <div style={{ position: 'absolute', top: '50px', right: 0, background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', width: '200px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', zIndex: 100, overflow: 'hidden' }}>
              <div style={{ padding: '12px', borderBottom: '1px solid #333', fontSize: '12px', color: '#888' }}>
                Signed in as: <br />
                <span style={{ color: 'white' }}>{user.email}</span>
              </div>
              <button 
                onClick={handleLogout}
                style={{ width: '100%', padding: '12px', textAlign: 'left', background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: '14px' }}
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      )}
      {isModalOpen && <LoginModal onClose={() => setIsModalOpen(false)} />}
    </>
  );
};