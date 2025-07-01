import { authMiddleware } from "@clerk/nextjs";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ status: "ok" });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("Auth webhook received:", body);
    
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Error in auth webhook:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
} 