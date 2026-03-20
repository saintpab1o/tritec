import { NextRequest, NextResponse } from "next/server";
import { addEmployee, deleteEmployee, getEmployees } from "@/lib/storage";
import { v4 as uuidv4 } from "uuid";

export const dynamic = "force-dynamic";

const useVercelBlob = !!process.env.BLOB_READ_WRITE_TOKEN;

function validateAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  return !!authHeader && authHeader.startsWith("Bearer ");
}

export async function GET(request: NextRequest) {
  if (!validateAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const employees = await getEmployees();
  return NextResponse.json(employees);
}

export async function POST(request: NextRequest) {
  if (!validateAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    const title = formData.get("title") as string;
    const gender = (formData.get("gender") as string) || "M";
    const headshotFile = formData.get("headshot") as File | null;

    if (!firstName || !lastName || !title) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let headshotPath = "/headshots/placeholder.png";

    if (headshotFile && headshotFile.size > 0) {
      if (useVercelBlob) {
        // Upload to Vercel Blob
        const { put } = await import("@vercel/blob");
        const ext = headshotFile.name.split(".").pop() || "png";
        const blobName = `headshots/${lastName.replace(/[^a-zA-Z0-9]/g, "_")}_${firstName.replace(/[^a-zA-Z0-9]/g, "_")}.${ext}`;
        const blob = await put(blobName, headshotFile, {
          access: "public",
          addRandomSuffix: true,
        });
        headshotPath = blob.url;
      } else {
        // Local dev: write to public/headshots
        const { promises: fs } = await import("fs");
        const path = await import("path");
        const ext = headshotFile.name.split(".").pop() || "png";
        const safeName = `${lastName.replace(/[^a-zA-Z0-9]/g, "_")}__${firstName.replace(/[^a-zA-Z0-9]/g, "_")}__${title.replace(/[^a-zA-Z0-9]/g, "_")}.${ext}`;
        const filePath = path.join(process.cwd(), "public", "headshots", safeName);
        const buffer = Buffer.from(await headshotFile.arrayBuffer());
        await fs.writeFile(filePath, buffer);
        headshotPath = `/headshots/${safeName}`;
      }
    }

    const employee = {
      id: uuidv4(),
      firstName,
      lastName,
      displayName: `${firstName} ${lastName}`,
      title,
      headshot: headshotPath,
      gender: gender as "M" | "F",
    };

    const employees = await addEmployee(employee);
    return NextResponse.json({ employee, total: employees.length });
  } catch (error) {
    console.error("Failed to create employee:", error);
    return NextResponse.json({ error: "Failed to create employee" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!validateAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing employee ID" }, { status: 400 });
    }

    // Optionally delete blob if it's a Vercel Blob URL
    if (useVercelBlob) {
      const allEmployees = await getEmployees();
      const emp = allEmployees.find(e => e.id === id);
      if (emp && emp.headshot.includes("vercel-storage.com")) {
        try {
          const { del } = await import("@vercel/blob");
          await del(emp.headshot);
        } catch {
          // Non-critical, continue with delete
        }
      }
    }

    const employees = await deleteEmployee(id);
    return NextResponse.json({ success: true, total: employees.length });
  } catch (error) {
    console.error("Failed to delete employee:", error);
    return NextResponse.json({ error: "Failed to delete employee" }, { status: 500 });
  }
}
