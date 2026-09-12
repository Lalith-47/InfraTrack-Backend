import { prisma } from "../src/lib/prisma.js";
import { auth } from "../src/lib/auth.js";

async function main() {
  console.log("🌱 Starting PostgreSQL database seed for SIH 2026...");

  // 1. Seed Users for each role
  const defaultPassword = process.env.SEED_DEFAULT_PASSWORD || "Password123!";
  const seedUsers = [
    {
      email: process.env.SEED_ADMIN_EMAIL || "admin@infra.gov.in",
      password: process.env.SEED_ADMIN_PASSWORD || defaultPassword,
      name: "Dr. A. K. Sharma (Ministry Director)",
      role: "ADMIN" as const,
    },
    {
      email: process.env.SEED_SUPERVISOR_EMAIL || "supervisor@infra.gov.in",
      password: process.env.SEED_SUPERVISOR_PASSWORD || defaultPassword,
      name: "Er. Rajesh Verma (Chief Engineer)",
      role: "SUPERVISOR" as const,
    },
    {
      email: process.env.SEED_VIEWER_EMAIL || "viewer@infra.gov.in",
      password: process.env.SEED_VIEWER_PASSWORD || defaultPassword,
      name: "Smt. Sunita Rao (Audit Officer)",
      role: "VIEWER" as const,
    },
  ];

  const createdUserMap = new Map<string, string>();

  for (const u of seedUsers) {
    let existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (!existing) {
      try {
        const res = await auth.api.signUpEmail({
          body: {
            email: u.email,
            password: u.password,
            name: u.name,
          },
        });
        if (res && res.user) {
          existing = await prisma.user.update({
            where: { id: res.user.id },
            data: { role: u.role },
          });
          console.log(`✅ Created ${u.role} user: ${u.email}`);
        }
      } catch (err) {
        console.warn(`Could not create user via auth.api: ${err}`);
      }
    } else {
      existing = await prisma.user.update({
        where: { id: existing.id },
        data: { role: u.role, name: u.name },
      });
      console.log(`ℹ️ Updated role for ${u.email} -> ${u.role}`);
    }

    if (existing) {
      createdUserMap.set(u.role, existing.id);
    }
  }

  const supervisorId = createdUserMap.get("SUPERVISOR") || undefined;
  const adminId = createdUserMap.get("ADMIN") || undefined;

  // 2. Seed National Infrastructure Projects with Real Timelines and Multimodal Updates
  const projectsData = [
    {
      code: "NH-48-EXP",
      wbsCode: "WBS-1.2.04-HWY",
      name: "National Highway-48 Smart Corridor Expansion",
      department: "Ministry of Road Transport & Highways",
      category: "Transportation",
      location: "Maharashtra - Gujarat Border",
      description: "Upgradation of existing 4-lane section to 8-lane smart highway with automated tolling, sensor-based pavement monitoring, and green corridor tree belts.",
      baselineStartDate: new Date("2024-03-01"),
      baselineEndDate: new Date("2026-11-30"),
      currentProgress: 68.0,
      plannedProgress: 72.0,
      status: "ON_TRACK" as const,
      budget: "₹4,850 Cr",
      spent: "₹3,210 Cr",
      supervisor: "Er. Rajesh Verma (Chief Engineer)",
      contractor: "L&T Infrastructure Engineering",
      userId: supervisorId,
      timelinePoints: [
        { date: "Mar 24", plannedProgress: 5, actualProgress: 5, milestone: "Land Acquisition & Site Survey" },
        { date: "Jun 24", plannedProgress: 18, actualProgress: 16 },
        { date: "Sep 24", plannedProgress: 32, actualProgress: 30, milestone: "Subgrade & Earthworks Complete" },
        { date: "Dec 24", plannedProgress: 46, actualProgress: 44 },
        { date: "Mar 25", plannedProgress: 58, actualProgress: 56, milestone: "Pavement Layer Phase 1" },
        { date: "Jun 25", plannedProgress: 65, actualProgress: 63 },
        { date: "Sep 25", plannedProgress: 72, actualProgress: 68, milestone: "Interchange Viaduct Construction" },
        { date: "Dec 25", plannedProgress: 82, actualProgress: 76 },
        { date: "Mar 26", plannedProgress: 90, actualProgress: 86 },
        { date: "Jun 26", plannedProgress: 96, actualProgress: 93 },
        { date: "Nov 26", plannedProgress: 100, actualProgress: 100, milestone: "Commercial Operations" },
      ],
      recentUpdates: [
        {
          author: "Er. Rajesh Verma",
          role: "Chief Project Engineer",
          channel: "VOICE" as const,
          notes: "Voice memo transcribed: Segment 4A asphalt layering completed ahead of rain alert. 1.2km paved today. Quality inspection passed for core density.",
          progressDelta: 0.8,
          tags: ["#AsphaltLayer", "#InspectionPassed", "#WeatherSafe"],
        },
        {
          author: "S. Kulkarni",
          role: "Site Surveyor",
          channel: "EXCEL" as const,
          notes: "Imported weekly structural ledger: Girder launcher installed on Ch. 44+200 bridge span. Verified 34 precast segments placed.",
          progressDelta: 1.5,
          tags: ["#BridgeSpans", "#GirderPlacement", "#WBSImport"],
        },
        {
          author: "A. Gupta",
          role: "Safety & Compliance Lead",
          channel: "TEXT" as const,
          notes: "Routine quality audit completed on concrete curing cubes for culvert 12/4. Compressive strength meets M40 specifications.",
          progressDelta: 0.2,
          tags: ["#QualityAudit", "#LabReportVerified"],
        },
      ],
    },
    {
      code: "DV-HSR-01",
      wbsCode: "WBS-DV-101",
      name: "Delhi-Varanasi High-Speed Rail Corridor",
      department: "National High Speed Rail Corporation (NHSRCL)",
      category: "Railways",
      location: "Delhi - Agra - Varanasi",
      description: "865 km high-speed electrified rail corridor linking northern cities with high-speed bullet train viaducts and smart stations.",
      baselineStartDate: new Date("2026-03-01"),
      baselineEndDate: new Date("2029-12-31"),
      currentProgress: 18.5,
      plannedProgress: 22.0,
      status: "AT_RISK" as const,
      budget: "₹12,000 Cr",
      spent: "₹2,140 Cr",
      supervisor: "Er. Rajesh Verma (Chief Engineer)",
      contractor: "IRCON International",
      userId: supervisorId,
      timelinePoints: [
        { date: "Mar 26", plannedProgress: 5, actualProgress: 5, milestone: "Alignment Finalization" },
        { date: "Jun 26", plannedProgress: 12, actualProgress: 10 },
        { date: "Sep 26", plannedProgress: 22, actualProgress: 18.5, milestone: "Pylon Foundation Piling" },
        { date: "Dec 26", plannedProgress: 35, actualProgress: 30 },
        { date: "Mar 27", plannedProgress: 50, actualProgress: 45 },
      ],
      recentUpdates: [
        {
          author: "Er. Rajesh Verma",
          role: "Chief Engineer",
          channel: "VOICE" as const,
          notes: "Field audio log: Pier foundation piling completed on Section B-2 over Yamuna tributary. Geological scan approved.",
          progressDelta: 1.2,
          tags: ["#Piling", "#GeotechApproval"],
        },
        {
          author: "K. Mohan",
          role: "WBS Manager",
          channel: "TEXT" as const,
          notes: "Right of way clearance achieved for 42 km stretch near Kanpur. Utility line relocation underway.",
          progressDelta: 0.5,
          tags: ["#RightOfWay", "#UtilityShift"],
        },
      ],
    },
    {
      code: "MTHL-PKG-3",
      wbsCode: "WBS-2.1.09-BRG",
      name: "Mumbai Trans-Harbour Link Package 3",
      department: "Mumbai Metropolitan Region Development Authority",
      category: "Bridges & Sea Links",
      location: "Sewri - Nhava Sheva, Maharashtra",
      description: "21.8 km six-lane sea bridge with intelligent toll management, noise barriers for flamingo sanctuary, and seismic sensor networks.",
      baselineStartDate: new Date("2023-01-10"),
      baselineEndDate: new Date("2026-06-30"),
      currentProgress: 94.0,
      plannedProgress: 95.0,
      status: "ON_TRACK" as const,
      budget: "₹17,843 Cr",
      spent: "₹16,500 Cr",
      supervisor: "Dr. A. K. Sharma (Ministry Director)",
      contractor: "Tata Projects - Daewoo JV",
      userId: adminId,
      timelinePoints: [
        { date: "Jan 23", plannedProgress: 10, actualProgress: 10 },
        { date: "Jan 24", plannedProgress: 45, actualProgress: 42 },
        { date: "Jan 25", plannedProgress: 75, actualProgress: 74 },
        { date: "Jan 26", plannedProgress: 95, actualProgress: 94, milestone: "Load Testing Complete" },
      ],
      recentUpdates: [
        {
          author: "Dr. A. K. Sharma",
          role: "Ministry Director",
          channel: "TEXT" as const,
          notes: "Static and dynamic load testing on orthotropic steel deck (OSD) spans completed successfully.",
          progressDelta: 0.6,
          tags: ["#LoadTesting", "#SafetyCertified"],
        },
      ],
    },
    {
      code: "RUMSP-SOLAR",
      wbsCode: "WBS-4.3.01-PWR",
      name: "Rewa Ultra Mega Solar Grid Complex",
      department: "Ministry of New and Renewable Energy",
      category: "Energy & Grid",
      location: "Rewa District, Madhya Pradesh",
      description: "750 MW grid-connected utility-scale solar photovoltaic power plant supplying power to Delhi Metro and state distribution companies.",
      baselineStartDate: new Date("2025-01-01"),
      baselineEndDate: new Date("2027-03-31"),
      currentProgress: 52.0,
      plannedProgress: 50.0,
      status: "COMPLETED" as const,
      budget: "₹4,500 Cr",
      spent: "₹2,300 Cr",
      supervisor: "Er. Rajesh Verma (Chief Engineer)",
      contractor: "Sterling and Wilson Solar",
      userId: supervisorId,
      timelinePoints: [
        { date: "Jan 25", plannedProgress: 15, actualProgress: 15 },
        { date: "Jun 25", plannedProgress: 35, actualProgress: 38 },
        { date: "Dec 25", plannedProgress: 50, actualProgress: 52, milestone: "Inverter Station Synchronization" },
      ],
      recentUpdates: [
        {
          author: "V. Swaminathan",
          role: "Grid Synchronization Lead",
          channel: "EXCEL" as const,
          notes: "Imported telemetry report: Substation transformer energization test successful. Grid sync at 220kV.",
          progressDelta: 2.5,
          tags: ["#GridSync", "#220kVTransformer"],
        },
      ],
    },
  ];

  for (const p of projectsData) {
    const { timelinePoints, recentUpdates, ...projectFields } = p;

    const upserted = await prisma.project.upsert({
      where: { code: p.code },
      update: {
        ...projectFields,
      },
      create: {
        ...projectFields,
      },
    });

    console.log(`📌 Upserted Project: ${upserted.name} (${upserted.code})`);

    // Clean and re-seed timeline points
    await prisma.timelinePoint.deleteMany({ where: { projectId: upserted.id } });
    if (timelinePoints && timelinePoints.length > 0) {
      await prisma.timelinePoint.createMany({
        data: timelinePoints.map((tp) => ({
          projectId: upserted.id,
          date: tp.date,
          plannedProgress: tp.plannedProgress,
          actualProgress: tp.actualProgress,
          milestone: tp.milestone,
        })),
      });
    }

    // Clean and re-seed recent updates
    await prisma.activityUpdate.deleteMany({ where: { projectId: upserted.id } });
    if (recentUpdates && recentUpdates.length > 0) {
      await prisma.activityUpdate.createMany({
        data: recentUpdates.map((ru) => ({
          projectId: upserted.id,
          author: ru.author,
          role: ru.role,
          channel: ru.channel,
          notes: ru.notes,
          progressDelta: ru.progressDelta,
          tags: ru.tags,
        })),
      });
    }
  }

  console.log("🎉 Database seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
