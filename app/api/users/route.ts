export const runtime = "nodejs";           // avoid edge unless you mean it
export const preferredRegion = ["syd1"]; 

import { NextResponse } from "next/server";

import { prisma } from "@/app/lib/prisma";
import { UUID } from "crypto";
import { log } from "console";
import { updateSourceFile } from "typescript";

export async function GET() {
  const startedAt = Date.now();
  try {
    if (!process.env.NEON_CONNECTION_STRING && !process.env.DATABASE_URL) {
      console.error("[db] missing connection string env (NEON_CONNECTION_STRING or DATABASE_URL)");
      return NextResponse.json(
        { ok: false, db: "missing_env" },
        { status: 500 },
      );
    }

    // This forces a real round-trip to the DB by hitting a known Prisma model/table.
    const users = await prisma?.users?.findMany();
    
    return NextResponse.json({
      ok: true,
      db: "ok",
      ms: Date.now() - startedAt,
      users,
    });
  } catch (err) {
    console.error("[db] connection FAILED", err);
    return NextResponse.json(
      { ok: false, db: "error" },
      { status: 500 },
    );
  }
}


export async function PATCH(request: Request) {
  const data: { id: number, name: string, email: string } = await request.json();
  const user = await prisma.users.findUnique({
    where: { id: data.id },
  });

  if (!user) {
    return NextResponse.json(
      { ok: false, error: 'User not found' },
      { status: 404 }
    );
  }

  await prisma.users.update({
    where: { id: data.id },
    data: {
      name: data.name,
      email: data.email,
    },
  });
 
  const updatedUser = await prisma.users.findUnique({
    where: { id: data.id },
  });
  return NextResponse.json({ ok: true, data: 'YES', user: updatedUser });
}


