import { NextRequest, NextResponse } from "next/server";
import { getLeaderboard, addLeaderboardEntry } from "@/lib/storage";
import { v4 as uuidv4 } from "uuid";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const leaderboard = await getLeaderboard();
    return NextResponse.json(leaderboard, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "CDN-Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Failed to get leaderboard:", error);
    return NextResponse.json({ error: "Failed to load leaderboard" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { playerName, score, totalQuestions } = body;

    if (!playerName || score === undefined || !totalQuestions) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const entry = {
      id: uuidv4(),
      playerName,
      score,
      totalQuestions,
      percentage: Math.round((score / totalQuestions) * 100),
      date: new Date().toISOString(),
    };

    const leaderboard = await addLeaderboardEntry(entry);
    return NextResponse.json({ entry, leaderboard });
  } catch (error) {
    console.error("Failed to add leaderboard entry:", error);
    return NextResponse.json({ error: "Failed to save score" }, { status: 500 });
  }
}
