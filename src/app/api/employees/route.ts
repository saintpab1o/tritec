import { NextResponse } from "next/server";
import { getEmployees } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const employees = await getEmployees();
    return NextResponse.json(employees);
  } catch (error) {
    console.error("Failed to get employees:", error);
    return NextResponse.json({ error: "Failed to load employees" }, { status: 500 });
  }
}
