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
  setActiveTeam: (team: Team) => Promise<void>;
  refreshLeague: () => Promise<void>; // <--- EXPOSING THIS
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
        if (res.ok) {
            const data = await res.json();
            if (data.success && data.teams.length > 0) {
              const sortedTeams = data.teams.sort((a: Team, b: Team) => b.seasonYear - a.seasonYear);
              setTeams(sortedTeams);

              const savedKey = Cookies.get('active_team_key');
              const savedTeam = sortedTeams.find((t: Team) => t.team_key === savedKey);

              if (savedTeam) setActiveTeamState(savedTeam);
              else {
                setActiveTeamState(sortedTeams[0]);
                Cookies.set('active_team_key', sortedTeams[0].team_key);
                Cookies.set('active_league_key', sortedTeams[0].league_key);
              }
            }
        }
      } catch (error) {
        console.error("Failed to fetch user teams:", error);
      }
      setLoading(false);
    }
    fetchTeams();
  }, []);

  const triggerSync = async (leagueKey: string) => {
    try {
      console.log("SYNC STARTED for:", leagueKey);
      await fetch('/api/yahoo/sync-league', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ league_key: leagueKey }),
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
    // We do NOT auto-sync on switch anymore to save speed
  };

  // The function the button will call
  const refreshLeague = async () => {
    if (activeTeam) {
        await triggerSync(activeTeam.league_key);
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