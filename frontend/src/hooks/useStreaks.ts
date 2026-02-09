import { useQuery } from "@tanstack/react-query";

export type StreakItem = {
  id: string;
  type: "solo" | "duo";
  name: string;
  user1Pubkey: string;
  user2Pubkey?: string;
  inviterPubKey?: string;
  inviteStatus: "none" | "pending" | "accepted" | "declined";
  inviteSentAt?: string;
  inviteAcceptedAt?: string;
  inviteDeclinedAt?: string;
  status: "pending" | "active" | "broken";
  currentCount: number;
  highestCount: number;
  lastActivityAt?: string;
  startedAt: string;
  endedAt?: string;
  createdAt: string;
  updatedAt: string;
};

async function fetchStreaks(): Promise<StreakItem[]> {
  const res = await fetch("/api/streaks");
  if (!res.ok) throw new Error("Failed to load streaks");
  return res.json();
}

export function useStreaksQuery() {
  return useQuery({
    queryKey: ["streaks"],
    queryFn: fetchStreaks,
  });
}
