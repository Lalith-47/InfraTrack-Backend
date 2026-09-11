/**
 * InfraTrack 2026 - Central Knowledge Base Provider
 * Contains technical, operational, corridor, and analytical data for grounding AI responses.
 */

export interface ProjectKnowledge {
  id: string;
  code: string;
  name: string;
  department: string;
  category: string;
  location: string;
  budgetCr: number;
  spentCr: number;
  currentProgressPct: number;
  plannedProgressPct: number;
  variancePct: number;
  status: "ON_TRACK" | "AT_RISK" | "COMPLETED" | "DELAYED";
  contractor: string;
  supervisor: string;
  keyBottlenecks?: string;
  activeSensors: string;
  highlights: string;
}

export const INFRATRACK_KNOWLEDGE_BASE = {
  system: {
    name: "InfraTrack 2026",
    title: "National Digital Twin & SCADA Monitoring Platform",
    initiative: "Smart India Hackathon 2026 (SIH 2026)",
    stakeholder: "Ministry of Statistics and Programme Implementation (MoSPI) & PM Gati Shakti National Master Plan",
    liveUrl: "https://sih2026-beige.vercel.app",
    backendUrl: "https://infratrack-backend-l1d3.onrender.com",
    database: "Neon Serverless PostgreSQL (Branch: ep-proud-waterfall-a1u6lrcz)",
    totalPortfolioAllocationCr: 39193,
    corePillars: [
      "Sub-second IoT telemetry streaming with WebSockets and SCADA sensor hubs",
      "Multimodal Computer Vision using drone and on-site photographs for automated physical verification",
      "Earned Value Management (EVM) for real-time cost ($CV$) and schedule ($SV$) variance tracking",
      "Role-Based Access Control (RBAC) with pre-provisioned government officer whitelists",
      "Conversational AI Copilot with dynamic confidence scoring and multi-lingual voice interaction",
    ],
  },

  roles: {
    ADMIN: {
      label: "ADMIN CONSOLE",
      targetPersona: "Joint Secretary / Project Director",
      capabilities: [
        "Full system administration and systemic overrides",
        "User account provisioning and role reassignment (ADMIN, SUPERVISOR, VIEWER)",
        "Creation and onboarding of new national infrastructure projects",
        "Systemic audit log and security event reviews",
      ],
    },
    SUPERVISOR: {
      label: "DASHBOARD (Field Workspace)",
      targetPersona: "Chief Engineer / Field Superintendent",
      capabilities: [
        "Scoped view of specifically assigned project corridors",
        "Drone and on-site photo upload with computer vision verification",
        "Milestone progress submission and physical delta tracking",
        "Sensor anomaly verification and structural health triage",
      ],
    },
    VIEWER: {
      label: "DASHBOARD (Public Audit)",
      targetPersona: "Public Auditor / Citizen / Project Stakeholder",
      capabilities: [
        "Read-only transparency dashboard across national priority corridors",
        "Interactive 3D Digital Twin inspection using Three.js R3F",
        "Public expenditure audit and progress verification",
      ],
    },
  },

  corridors: [
    {
      id: "proj-hsr-01",
      code: "DV-HSR-01",
      name: "Delhi-Varanasi High-Speed Rail Corridor",
      department: "National High Speed Rail Corporation Limited (NHSRCL)",
      category: "High-Speed Rail / Bullet Train",
      location: "New Delhi to Varanasi, Uttar Pradesh (865 km)",
      budgetCr: 12000,
      spentCr: 2140,
      currentProgressPct: 18.5,
      plannedProgressPct: 22.0,
      variancePct: -3.5,
      status: "AT_RISK",
      contractor: "Afcons - Larsen & Toubro Consortium",
      supervisor: "Er. Vikramaditya Singh",
      keyBottlenecks: "Deep pier foundation piling challenges in Yamuna river floodplains and 132kV power line relocations near Kanpur South.",
      activeSensors: "48 Tiltmeters, 120 Piezometers, 16 Seismographs active along civil packages 1 to 4.",
      highlights: "High-speed rail corridor engineered for 350 km/h design speed. Pre-stressed concrete girders under fabrication at casting yards.",
    },
    {
      id: "proj-nh48-02",
      code: "NH-48-EXP",
      name: "National Highway-48 Smart Expressway Corridor",
      department: "Ministry of Road Transport & Highways (MoRTH) / NHAI",
      category: "Smart Expressway & Heavy Freight Corridor",
      location: "Delhi - Gurugram - Jaipur Section (242 km)",
      budgetCr: 4850,
      spentCr: 3210,
      currentProgressPct: 69.3,
      plannedProgressPct: 72.0,
      variancePct: -2.7,
      status: "ON_TRACK",
      contractor: "L&T Infrastructure Engineering",
      supervisor: "Er. Rajesh Verma",
      keyBottlenecks: "Minor drainage culvert reinforcement delays near Bilaspur junction.",
      activeSensors: "Fiber-optic Weigh-in-Motion (WIM) sensors, dynamic automated crack monitoring cameras, weather sensors.",
      highlights: "Dense Bituminous Macadam (DBM) layer laid on 168 km. Smart tolling antennas and variable message signs (VMS) operational.",
    },
    {
      id: "proj-mthl-03",
      code: "MTHL-PKG-3",
      name: "Mumbai Trans-Harbour Link (MTHL) Package 3",
      department: "Mumbai Metropolitan Region Development Authority (MMRDA)",
      category: "Marine Sea Link & Orthotropic Steel Deck Bridge",
      location: "Sewri (Mumbai) to Chirle (Navi Mumbai) (21.8 km)",
      budgetCr: 17843,
      spentCr: 16500,
      currentProgressPct: 94.0,
      plannedProgressPct: 95.0,
      variancePct: -1.0,
      status: "ON_TRACK",
      contractor: "Daewoo - Tata Projects Joint Venture",
      supervisor: "Dr. Sneha Kulkarni",
      keyBottlenecks: "Final weather-proof expansion joint sealants awaiting monsoon clearance.",
      activeSensors: "Structural health acoustic sensors, strain gauges on orthotropic steel decks, wind anemometers.",
      highlights: "Longest sea bridge in India. Load deflection tests completed successfully. Intelligent traffic management system (ITMS) undergoing dry runs.",
    },
    {
      id: "proj-rewa-04",
      code: "RUMSP-SOLAR",
      name: "Rewa Ultra Mega Solar Grid Complex",
      department: "Madhya Pradesh Urja Vikas Nigam Limited (MPUVNL) / SECI",
      category: "Renewable Clean Energy & Mega Grid Storage",
      location: "Gurh Tehsil, Rewa District, Madhya Pradesh (1,590 hectares)",
      budgetCr: 4500,
      spentCr: 2300,
      currentProgressPct: 52.0,
      plannedProgressPct: 50.0,
      variancePct: +2.0,
      status: "COMPLETED",
      contractor: "Sterling & Wilson Renewable Energy",
      supervisor: "Er. Ananya Sharma",
      keyBottlenecks: "Inverter station 4 cooling subsystem scheduled for maintenance.",
      activeSensors: "Solar pyranometers, inverter string telemetry, drone thermal infrared surveillance.",
      highlights: "750 MW active commercial generation. Supplies 24% of power to Delhi Metro Rail Corporation with zero operational carbon footprint.",
    },
  ] as ProjectKnowledge[],

  confidenceRubric: {
    formula: "Confidence Score = 0.35 * Freshness + 0.35 * SensorIntegrity + 0.30 * BaselineAlignment",
    description: "Every analytical assessment is weighted by real-time telemetry freshness, IoT sensor corroboration, and WBS baseline convergence.",
    benchmarks: [
      { range: "90% - 100%", level: "HIGH FIDELITY", description: "Cross-verified with multi-modal imagery, real-time sensor streams, and official ledger." },
      { range: "75% - 89%", level: "MODERATE / ACCEPTABLE", description: "Statistically sound with minor pending field updates or seasonal variances." },
      { range: "< 75%", level: "REQUIRES FIELD VERIFICATION", description: "Flagged for physical verification by field supervisors." },
    ],
  },
};

/**
 * Returns a full markdown summary of the knowledge base for LLM system prompt injection.
 */
export function getKnowledgeBaseMarkdown(): string {
  const k = INFRATRACK_KNOWLEDGE_BASE;
  return `=== INFRATRACK 2026 OFFICIAL KNOWLEDGE BASE ===
Platform: ${k.system.title} (${k.system.name})
Initiative: ${k.system.initiative} | Stakeholder: ${k.system.stakeholder}
Production Portal: ${k.system.liveUrl} | API: ${k.system.backendUrl}
Database: ${k.system.database}

CORE SYSTEM PILLARS:
${k.system.corePillars.map((p) => `* ${p}`).join("\n")}

ROLES & GOVERNANCE:
* ADMIN: ${k.roles.ADMIN.targetPersona} — Nav label: "${k.roles.ADMIN.label}". Full control over users, roles, and project creations.
* SUPERVISOR: ${k.roles.SUPERVISOR.targetPersona} — Nav label: "${k.roles.SUPERVISOR.label}". Scoped project verification, drone photo uploads, progress delta updates.
* VIEWER: ${k.roles.VIEWER.targetPersona} — Nav label: "${k.roles.VIEWER.label}". Read-only national audits and 3D digital twin explorer.

PRIORITY INFRASTRUCTURE CORRIDORS:
${k.corridors
  .map(
    (c) => `---
Corridor: ${c.name} (${c.code})
- Department: ${c.department} | Category: ${c.category}
- Location: ${c.location}
- Status: ${c.status} | Progress: ${c.currentProgressPct}% (Planned: ${c.plannedProgressPct}%, Variance: ${c.variancePct}%)
- Budget: ₹${c.budgetCr} Cr | Spent: ₹${c.spentCr} Cr
- Supervising Engineer: ${c.supervisor} | Lead Contractor: ${c.contractor}
- Bottlenecks: ${c.keyBottlenecks || "None"}
- Sensors: ${c.activeSensors}
- Highlights: ${c.highlights}`
  )
  .join("\n")}

CONFIDENCE SCORING DIRECTIVE:
When asked to analyze ANY project, delay, risk, structural element, or photo:
1. You MUST calculate and output a "Confidence Score" (e.g. 🎯 Confidence Score: 96.5% [HIGH FIDELITY]).
2. Provide factor breakdowns:
   - Data Freshness (e.g. 98% based on sub-minute PostgreSQL sync)
   - Sensor Telemetry Integrity (e.g. 95% active IoT sensor feeds)
   - Physical Baseline Alignment (e.g. 96% alignment with WBS milestones)
3. State actionable recommendations for project directors or field engineers.
=================================================`;
}
