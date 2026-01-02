'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { createClient } from '@/app/utils/supabase/client';

interface Team {
  team_key: string;
  team_name: string;
  league_key: string;
  seasonYear: number;
  provider: 'YAHOO' | 'ESPN';
}

interface TeamContextType {
  activeTeam: Team | null;
  setActiveTeam: (team: Team) => Promise<void>;
  refreshLeague: () => Promise<void>;
  teams: Team[];
  loading: boolean;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeam, setActiveTeamState] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchTeams() {
      setLoading(true);
      let allTeams: Team[] = [];

      try {
        // 1. Fetch Yahoo Teams (Existing API)
        const yahooRes = await fetch('/api/yahoo/my-teams');
        if (yahooRes.ok) {
            const data = await yahooRes.json();
            if (data.success && data.teams) {
                // Tag them as Yahoo
                const yahooTeams = data.teams.map((t: any) => ({ ...t, provider: 'YAHOO' }));
                allTeams = [...allTeams, ...yahooTeams];
            }
        }

        // 2. Fetch ESPN Teams (New DB Table)
        const { data: espnData } = await supabase
            .from('leagues')
            .select('*')
            .eq('provider', 'ESPN');
            
        if (espnData) {
            const espnTeams = espnData.map((l: any) => ({
                team_key: l.team_key,
                team_name: l.team_name,
                league_key: l.league_key,
                seasonYear: 2025, // Default to current
               provider: 'ESPN' as const  // <--- ADD "as const" HERE
            }));
            allTeams = [...allTeams, ...espnTeams];
        }

        // 3. Sort & Set Active
        if (allTeams.length > 0) {
            const sortedTeams = allTeams.sort((a, b) => b.seasonYear - a.seasonYear);
            setTeams(sortedTeams);

            const savedKey = Cookies.get('active_team_key');
            const savedTeam = sortedTeams.find((t) => t.team_key === savedKey);

            if (savedTeam) {
                setActiveTeamState(savedTeam);
                // Also restore provider so we know how to fetch roster later
                if (typeof window !== 'undefined') localStorage.setItem('active_league_provider', savedTeam.provider);
            } else {
                const first = sortedTeams[0];
                setActiveTeamState(first);
                Cookies.set('active_team_key', first.team_key);
                Cookies.set('active_league_key', first.league_key);
                if (typeof window !== 'undefined') localStorage.setItem('active_league_provider', first.provider);
            }
        }
      } catch (error) {
        console.error("Failed to fetch user teams:", error);
      }
      setLoading(false);
    }
    fetchTeams();
  }, []);

  const triggerSync = async (team: Team) => {
    try {
      console.log(`SYNC STARTED for: ${team.league_key} (${team.provider})`);
      
      // We route to different endpoints based on provider
      const endpoint = team.provider === 'ESPN' 
        ? '/api/sync/espn-refresh' // We'll need a simple refresh endpoint for ESPN later
        : '/api/yahoo/sync-league';

      // For ESPN, we might just re-run the full sync if we stored the keys
      if (team.provider === 'ESPN') {
          // For now, simple alert as we haven't built the 'refresh' endpoint yet
          alert("ESPN Auto-Sync happens on load. To force, re-enter keys in the modal.");
          return; 
      }

      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ league_key: team.league_key }),
      });
      window.location.reload();
    } catch (err) {
      console.error("League sync failed:", err);
    }
  };

  const setActiveTeam = async (team: Team) => {
    setActiveTeamState(team);
    Cookies.set('active_team_key', team.team_key);
    Cookies.set('active_league_key', team.league_key);
    
    // Critical: Save provider so page.tsx knows which mode to use
    if (typeof window !== 'undefined') {
        localStorage.setItem('active_league_provider', team.provider);
    }
    
    // We reload to force page.tsx to pick up the new provider/keys cleanly
    window.location.reload(); 
  };

  const refreshLeague = async () => {
    if (activeTeam) {
        await triggerSync(activeTeam);
    } else {
        alert("No active team found to sync.");
    }
  };

  return (
    <TeamContext.Provider value={{ activeTeam, setActiveTeam, refreshLeague, teams, loading }}>
      {children}
    </TeamContext.Provider>
  );
}

export const useTeam = () => {
  const context = useContext(TeamContext);
  if (!context) throw new Error('useTeam must be used within TeamProvider');
  return context;
};