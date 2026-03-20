import { NextRequest, NextResponse } from "next/server";
import { clearLeaderboard } from "@/lib/storage";

export const dynamic = "force-dynamic";

function validateAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  return !!authHeader && authHeader.startsWith("Bearer ");
}

export async function DELETE(request: NextRequest) {
  if (!validateAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await clearLeaderboard();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to clear leaderboard:", error);
    return NextResponse.json({ error: "Failed to clear leaderboard" }, { status: 500 });
  }
}
