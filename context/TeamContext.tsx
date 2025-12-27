'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import Cookies from 'js-cookie';

interface Team {
  team_key: string;
  team_name: string;
  league_key: string;
  seasonYear: number;
}

interface TeamContextType {
  activeTeam: Team | null;
  setActiveTeam: (team: Team) => Promise<void>; // Updated to reflect it's now async
  teams: Team[];
  loading: boolean;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeam, setActiveTeamState] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTeams() {
      try {
        const res = await fetch('/api/yahoo/my-teams');
        const data = await res.json();
        if (data.success) {
          setTeams(data.teams);
          
          // Use saved cookie to restore the last viewed team
          const savedKey = Cookies.get('active_team_key');
          const found = data.teams.find((t: Team) => t.team_key === savedKey) || data.teams[0];
          
          if (found) {
            setActiveTeamState(found);
            Cookies.set('active_team_key', found.team_key);
            Cookies.set('active_league_key', found.league_key);
          }
        }
      } catch (error) {
        console.error("Failed to fetch user teams:", error);
      }
      setLoading(false);
    }
    fetchTeams();
  }, []);

  // Updated async function to handle league sync during team switching
  const setActiveTeam = async (team: Team) => {
    // 1. Update UI state and Cookies immediately
    setActiveTeamState(team);
    Cookies.set('active_team_key', team.team_key);
    Cookies.set('active_league_key', team.league_key);

    // 2. Trigger the league-wide roster sync in the background
    // This tells our API to go get every rostered player for this specific league
    try {
      await fetch('/api/yahoo/sync-league', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ league_key: team.league_key }),
      });
    } catch (err) {
      console.error("League sync failed on team switch:", err);
    }

    // 3. Refresh the page to ensure all components use the new league data
    window.location.reload(); 
  };

  return (
    <TeamContext.Provider value={{ activeTeam, setActiveTeam, teams, loading }}>
      {children}
    </TeamContext.Provider>
  );
}

export const useTeam = () => {
  const context = useContext(TeamContext);
  if (!context) throw new Error('useTeam must be used within TeamProvider');
  return context;
};