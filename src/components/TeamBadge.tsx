import { getTeam, teamTextColor } from "@/lib/mockData";

export function TeamBadge({ teamId, size = 32, showName = false }: { teamId: string; size?: number; showName?: boolean }) {
  const team = getTeam(teamId);
  if (!team) return null;
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div
        className="flex items-center justify-center rounded-md font-bold shrink-0 shadow-sm"
        style={{
          width: size,
          height: size,
          backgroundColor: team.color,
          color: teamTextColor(team.color),
          fontSize: size * 0.38,
        }}
      >
        {team.shortName.slice(0, 3)}
      </div>
      {showName && <span className="font-semibold truncate">{team.name}</span>}
    </div>
  );
}
