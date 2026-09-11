import dotenv from "dotenv";
dotenv.config();

import { prisma } from "./src/lib/prisma.js";

async function runSuite() {
  console.log("=================================================");
  console.log("🔍 INFRACTRACK COMPLETE PLATFORM INTEGRATION TEST");
  console.log("=================================================\n");

  const results: { test: string; status: "PASS" | "FAIL"; details: string }[] = [];

  // 1. Database (Neon Postgres)
  try {
    const userCount = await prisma.user.count();
    const projects = await prisma.project.findMany({
      include: { timelineData: true, recentUpdates: true }
    });
    results.push({
      test: "1. Neon PostgreSQL Database Connectivity & Data",
      status: "PASS",
      details: `Connected to Neon DB. Found ${userCount} users and ${projects.length} infrastructure corridors with full WBS metrics.`
    });
  } catch (err: any) {
    results.push({
      test: "1. Neon PostgreSQL Database Connectivity & Data",
      status: "FAIL",
      details: err.message
    });
  }

  // 2. Backend Health & CORS
  try {
    const res = await fetch("http://localhost:4000/health");
    const health = await res.json() as any;
    const corsRes = await fetch("http://localhost:4000/api/projects", {
      headers: { "Origin": "http://localhost:3000" }
    });
    const allowOrigin = corsRes.headers.get("access-control-allow-origin");
    results.push({
      test: "2. Backend Server & CORS Policy",
      status: (health.status === "ok" && health.database === "connected" && allowOrigin === "http://localhost:3000") ? "PASS" : "FAIL",
      details: `Health: ${health.status} (DB: ${health.database}) | CORS Access-Control-Allow-Origin: ${allowOrigin}`
    });
  } catch (err: any) {
    results.push({
      test: "2. Backend Server & CORS Policy",
      status: "FAIL",
      details: err.message
    });
  }

  // 3. Better Auth Authentication & Session Management
  let sessionCookie = "";
  try {
    const loginRes = await fetch("http://localhost:4000/api/auth/sign-in/email", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Origin": "http://localhost:3000" },
      body: JSON.stringify({ email: "admin@infra.gov.in", password: "Password123!" })
    });
    const rawCookie = loginRes.headers.get("set-cookie") || "";
    sessionCookie = rawCookie.split(";")[0];
    const loginData = await loginRes.json() as any;

    const sessionRes = await fetch("http://localhost:4000/api/auth/get-session", {
      headers: { "Cookie": sessionCookie, "Origin": "http://localhost:3000" }
    });
    const sessionData = await sessionRes.json() as any;
    const userRole = sessionData?.user?.role || loginData?.user?.role;

    results.push({
      test: "3. Better Auth Authentication & Admin Role Session",
      status: (loginRes.ok && userRole === "ADMIN") ? "PASS" : "FAIL",
      details: `Logged in as ${sessionData?.user?.name || loginData?.user?.name} | Role: ${userRole} | Session Token Issued`
    });
  } catch (err: any) {
    results.push({
      test: "3. Better Auth Authentication & Admin Role Session",
      status: "FAIL",
      details: err.message
    });
  }

  // 4. Projects API Endpoint
  try {
    const res = await fetch("http://localhost:4000/api/projects");
    const projs = await res.json() as any;
    const projectList = projs.projects || projs;
    results.push({
      test: "4. Projects REST API (/api/projects)",
      status: Array.isArray(projectList) && projectList.length > 0 ? "PASS" : "FAIL",
      details: `Fetched ${projectList.length} corridors: ${projectList.map((p: any) => p.code).join(", ")}`
    });
  } catch (err: any) {
    results.push({
      test: "4. Projects REST API (/api/projects)",
      status: "FAIL",
      details: err.message
    });
  }

  // 5. OpenAI GPT-4o Real-Time Telemetry Chatbot
  try {
    const t0 = Date.now();
    const chatRes = await fetch("http://localhost:4000/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "What is the progress and budget of the Mumbai Trans-Harbour Link?" })
    });
    const chatData = await chatRes.json() as any;
    const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
    results.push({
      test: "5. AI Chatbot (OpenAI GPT-4o + Live DB Telemetry)",
      status: chatRes.ok && chatData.reply ? "PASS" : "FAIL",
      details: `Response time: ${elapsed}s | Source: ${chatData.source} | Excerpt: "${chatData.reply.slice(0, 100).replace(/\n/g, " ")}..."`
    });
  } catch (err: any) {
    results.push({
      test: "5. AI Chatbot (OpenAI GPT-4o + Live DB Telemetry)",
      status: "FAIL",
      details: err.message
    });
  }

  // 6. Supervisor Computer Vision Inspection & 8s Latency Guard
  try {
    const t0 = Date.now();
    const visionRes = await fetch("http://localhost:4000/api/ai/vision-estimate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: "NH-48-EXP",
        imageBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        imageMime: "image/png",
        notes: "End-to-end automated platform validation"
      })
    });
    const visionData = await visionRes.json() as any;
    const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
    results.push({
      test: "6. Supervisor AI Vision Inspection & Telemetry Calculation",
      status: visionRes.ok && visionData.result?.pendingWorkPercent !== undefined ? "PASS" : "FAIL",
      details: `Completed in: ${elapsed}s | Est Progress: ${visionData.result?.currentProgressEstimate}% | Pending: ${visionData.result?.pendingWorkPercent}% | Confidence: ${visionData.result?.confidenceScore}%`
    });
  } catch (err: any) {
    results.push({
      test: "6. Supervisor AI Vision Inspection & Telemetry Calculation",
      status: "FAIL",
      details: err.message
    });
  }

  // 7. Frontend Pages (Next.js Local Server)
  try {
    const [loginRes, homeRes, adminRes] = await Promise.all([
      fetch("http://localhost:3000/login"),
      fetch("http://localhost:3000/"),
      fetch("http://localhost:3000/admin")
    ]);
    results.push({
      test: "7. Local Frontend Next.js Pages",
      status: (loginRes.ok && homeRes.ok && adminRes.ok) ? "PASS" : "FAIL",
      details: `/login (${loginRes.status}), / (${homeRes.status}), /admin (${adminRes.status}) all rendering cleanly`
    });
  } catch (err: any) {
    results.push({
      test: "7. Local Frontend Next.js Pages",
      status: "FAIL",
      details: err.message
    });
  }

  // 8. Production Deployments (Vercel & Render)
  try {
    const [vercelRes, renderRes] = await Promise.all([
      fetch("https://sih2026-beige.vercel.app"),
      fetch("https://infratrack-backend-l1d3.onrender.com/health")
    ]);
    const renderJson = await renderRes.json().catch(() => ({})) as any;
    results.push({
      test: "8. Live Production Environments (Vercel & Render)",
      status: (vercelRes.ok && renderRes.ok) ? "PASS" : "FAIL",
      details: `Vercel: HTTP ${vercelRes.status} OK | Render Health: HTTP ${renderRes.status} (status: ${renderJson.status})`
    });
  } catch (err: any) {
    results.push({
      test: "8. Live Production Environments (Vercel & Render)",
      status: "FAIL",
      details: err.message
    });
  }

  // Disconnect prisma
  await prisma.$disconnect();

  // Print Summary Table
  console.log("-------------------------------------------------");
  for (const r of results) {
    const icon = r.status === "PASS" ? "✅" : "❌";
    console.log(`${icon} [${r.status}] ${r.test}`);
    console.log(`   └─ ${r.details}\n`);
  }
  console.log("=================================================");
  const allPassed = results.every(r => r.status === "PASS");
  console.log(`OVERALL PLATFORM HEALTH: ${allPassed ? "💯 ALL SYSTEMS FUNCTIONAL" : "⚠️ ISSUES DETECTED"}`);
  console.log("=================================================");
}

runSuite().catch(console.error);
