// app/api/admin/finance-seed/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// ──────────────────────────────────────────────────────────────────────────────
// Constants — Realistic Ghanaian fashion business patterns
// ──────────────────────────────────────────────────────────────────────────────

// Seasonal pattern: Low Jan-Feb → Easter boost Mar-Apr → Slump May-Aug → Build Sep-Dec
const SEASONAL_WEIGHTS = {
  1: 0.35,   // Jan - very slow, post-holiday cash crunch
  2: 0.40,   // Feb - still slow, some Valentine's orders
  3: 0.70,   // Mar - picking up, Easter prep begins
  4: 1.10,   // Apr - Easter peak, church outfits, events
  5: 0.75,   // May - starts ok then drops mid-month
  6: 0.35,   // Jun - drastically low, rainy season
  7: 0.30,   // Jul - still very low, quiet period
  8: 0.50,   // Aug - starts recovering mid-month
  9: 0.80,   // Sep - building up, back-to-work
  10: 1.00,  // Oct - good, event season picks up
  11: 1.30,  // Nov - holiday prep, lots of orders
  12: 1.50,  // Dec - peak season, Christmas/New Year
};

// Revenue split by category
const REVENUE_SPLITS = {
  "Custom Made": 0.55,
  "Ready-to-Wear": 0.30,
  "Alteration": 0.15,
};

// Expense breakdown (percentage of total monthly expenses)
const EXPENSE_SPLITS = {
  rent: 0.24,             // Fixed monthly shop rent
  designerSalary: 0.18,   // Owner's monthly draw
  tempLabour: 0.13,       // Temporary seamstress wages (varies with workload)
  materials: 0.25,        // Lace, Thread, Beads, Buttons, Zip
  electricity: 0.08,      // ECG bill
  water: 0.05,            // Water bill
  marketing: 0.04,        // Social media ads, flyers
  tools: 0.03,            // Occasional equipment
};

const MONTH_NAMES = [
  "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// Weighting of individual material categories within a restock event
const MATERIAL_WEIGHTS = {
  "Lace": 0.35,
  "Thread": 0.15,
  "Beads": 0.20,
  "Buttons": 0.10,
  "Zip": 0.20,
};

// Realistic amount ranges for individual transactions
const REVENUE_RANGES = {
  "Custom Made": { min: 200, max: 900 },
  "Ready-to-Wear": { min: 80, max: 350 },
  "Alteration": { min: 30, max: 180 },
};

const EXPENSE_RANGES = {
  "Lace": { min: 25, max: 120 },
  "Thread": { min: 8, max: 35 },
  "Beads": { min: 15, max: 70 },
  "Buttons": { min: 5, max: 20 },
  "Zip": { min: 5, max: 25 },
  "Rent": { min: 350, max: 550 },
  "Electricity": { min: 60, max: 200 },
  "Water": { min: 30, max: 80 },
  "Designer Salary": { min: 400, max: 800 },
  "Temporary Hands": { min: 80, max: 300 },
  "Labour": { min: 80, max: 300 },
  "Social Media Ads": { min: 20, max: 100 },
  "Flyers & Printing": { min: 15, max: 60 },
  "Needles": { min: 10, max: 40 },
  "Scissors": { min: 30, max: 120 },
  "Sewing Machine": { min: 150, max: 500 },
};

// Ghanaian client data
const GHANAIAN_CLIENTS = [
  {
    name: "Ama Mensah",
    phone: "+233241234567",
    email: "ama.mensah@gmail.com",
    address: "15 Osu Badu Street, Osu, Accra",
    notes: "Regular client, loves traditional Kente designs and modern ankara styles",
  },
  {
    name: "Akosua Boateng",
    phone: "+233551987654",
    email: "akosua.boateng@gmail.com",
    address: "22 Ahodwo Road, Kumasi",
    notes: "Prefers fitted styles, orders frequently for church events",
  },
  {
    name: "Efua Darko",
    phone: "+233201456789",
    email: "efua.darko@gmail.com",
    address: "8 Community 1, Tema",
    notes: "Corporate client, needs professional kaba and slit for work",
  },
  {
    name: "Abena Asante",
    phone: "+233271345678",
    email: "abena.asante@yahoo.com",
    address: "5 Chapel Square, Cape Coast",
    notes: "Wedding client - bridesmaids coordination and ceremony outfits",
  },
  {
    name: "Adwoa Owusu",
    phone: "+233541876543",
    email: "adwoa.owusu@gmail.com",
    address: "31 Market Circle Extension, Takoradi",
    notes: "Fashion-forward, loves bold prints and contemporary designs",
  },
  {
    name: "Yaa Amoah",
    phone: "+233261654321",
    email: "yaa.amoah@gmail.com",
    address: "12 New Juaben Estate, Koforidua",
    notes: "Petite sizing, prefers modest and elegant styles",
  },
  {
    name: "Akua Frimpong",
    phone: "+233231789456",
    email: "akua.frimpong@outlook.com",
    address: "7 Sunyani-Berekum Road, Sunyani",
    notes: "Bulk orders for her boutique, reseller client",
  },
  {
    name: "Afia Agyeman",
    phone: "+233501234890",
    email: "afia.agyeman@gmail.com",
    address: "19 Ho-Kpando Road, Ho",
    notes: "Occasional client, orders for special occasions and festivals",
  },
];

// Realistic transaction notes
const REVENUE_NOTES = {
  "Custom Made": [
    "Kente cloth dress - custom order",
    "Wedding gown fitting and creation",
    "Ankara print outfit - special occasion",
    "Church dress - Sunday collection",
    "Graduation ceremony outfit",
    "Bridesmaid dress - custom fitted",
    "Corporate kaba and slit",
    "Evening gown for gala dinner",
    "Traditional funeral cloth outfit",
    "Naming ceremony outfit",
    "Custom skirt and blouse set",
    "Birthday outfit - client request",
    "Eid celebration outfit",
    "Christmas party dress",
    "Valentine's special outfit",
    "Easter Sunday dress",
    "Independence Day outfit",
    "Engagement ceremony dress",
    "Custom jumpsuit design",
    "Anniversary dinner outfit",
  ],
  "Ready-to-Wear": [
    "Ready-made ankara blouse",
    "Pre-made casual dress",
    "Off-the-rack skirt",
    "Ready-to-wear office blouse",
    "Casual Friday outfit",
    "Weekend casual dress",
    "Market day wear",
    "Pre-made kaftan",
    "Ready-made two-piece set",
    "Off-the-shelf headwrap and dress combo",
  ],
  "Alteration": [
    "Hem adjustment - dress",
    "Waist alteration - skirt",
    "Sleeve modification",
    "Dress length alteration",
    "Take-in waist on trousers",
    "Let out seams on blouse",
    "Zip replacement",
    "Button replacement and resize",
    "Neckline adjustment",
    "Repair torn seam",
  ],
};

const EXPENSE_NOTES = {
  "Lace": ["Ankara lace fabric - 5 yards", "French lace - 3 yards", "Cord lace material", "Guipure lace for wedding dress", "Swiss voile lace"],
  "Thread": ["Polyester thread assortment", "Gold thread for embroidery", "Cotton thread - bulk pack", "Matching thread set"],
  "Beads": ["Glass beads for neck detail", "Pearl beads - assorted sizes", "Wooden beads for decoration", "Crystal beads pack"],
  "Buttons": ["Decorative buttons set", "Basic sewing buttons - bulk", "Gold-tone button set", "Pearl buttons - 12 pack"],
  "Zip": ["Invisible zip - assorted colours", "Metal zip for jackets", "YKK zippers - 10 pack", "Concealed zip set"],
  "Rent": ["Monthly shop rent - Accra", "Workshop space rent", "Monthly rent payment"],
  "Electricity": ["ECG electricity bill", "Monthly ECG prepaid", "Workshop power bill"],
  "Water": ["Ghana Water bill", "Monthly water payment", "Water bill - workshop"],
  "Designer Salary": ["Monthly salary draw", "Owner's monthly draw", "Personal salary - monthly"],
  "Temporary Hands": ["Seamstress wages - 2 weeks", "Extra hands for bulk order", "Temporary help - event rush", "Assistant tailor - weekly", "Apprentice stipend"],
  "Labour": ["Seamstress wages - 2 weeks", "Extra hands for bulk order", "Temporary help - event rush", "Assistant tailor - weekly"],
  "Social Media Ads": ["Instagram promotion", "Facebook boost - dress photos", "TikTok ad campaign"],
  "Flyers & Printing": ["Business flyers - 500 copies", "Price list printing", "Promotional banners"],
  "Needles": ["Hand sewing needles - assorted", "Machine needles - pack of 10", "Beading needles set"],
  "Scissors": ["Fabric scissors - new pair", "Pinking shears", "Thread snippers"],
  "Sewing Machine": ["Machine servicing", "Overlock machine maintenance", "Bobbin and presser foot replacement"],
};

// ──────────────────────────────────────────────────────────────────────────────
// Generic helpers
// ──────────────────────────────────────────────────────────────────────────────

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function randomInt(min, max) {
  return Math.floor(randomBetween(min, max + 1));
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function round2(v) {
  return Math.round(v * 100) / 100;
}

// Ghanaian cedi transactions are almost always whole numbers in real life
// (225, not 225.30) — use this specifically for the `amount` field on
// transactions we write to the DB.
function roundMoney(v) {
  return Math.round(v);
}

function dateOnDay(year, month, day, hourMin = 8, hourMax = 18) {
  const hour = randomInt(hourMin, hourMax);
  const minute = randomInt(0, 59);
  return new Date(year, month - 1, day, hour, minute, 0);
}

function randomDateInMonth(year, month) {
  const daysInMonth = new Date(year, month, 0).getDate();
  return dateOnDay(year, month, randomInt(1, daysInMonth));
}

/**
 * Pick `count` distinct days out of 1..daysInMonth (unordered activity days,
 * e.g. "which days did an order come in this month").
 */
function pickActiveDays(daysInMonth, count) {
  const n = Math.min(count, daysInMonth);
  const days = new Set();
  while (days.size < n) {
    days.add(randomInt(1, daysInMonth));
  }
  return Array.from(days).sort((a, b) => a - b);
}

/**
 * Pick `count` days that are spaced at least `minGap` days apart — used for
 * "restock trip" style events so purchases don't cluster unrealistically.
 */
function pickSpacedDays(daysInMonth, count, minGap = 6) {
  const days = [];
  let attempts = 0;
  while (days.length < count && attempts < 300) {
    attempts++;
    const candidate = randomInt(1, daysInMonth);
    if (days.every((d) => Math.abs(d - candidate) >= minGap)) {
      days.push(candidate);
    }
  }
  return days.sort((a, b) => a - b);
}

/** Weighted pick from an object of {key: weight} */
function weightedChoice(weights) {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (const [key, w] of Object.entries(weights)) {
    r -= w;
    if (r <= 0) return key;
  }
  return Object.keys(weights)[0];
}

/**
 * How many orders land on a given active day. Most days: 1 order.
 * Busier season -> slightly higher chance of 2-3 orders same day.
 */
function ordersOnDay(activityLevel) {
  const r = Math.random();
  if (activityLevel > 0.65) {
    if (r < 0.50) return 1;
    if (r < 0.85) return 2;
    return 3;
  }
  if (r < 0.75) return 1;
  if (r < 0.95) return 2;
  return 3;
}

/**
 * Ensure a category exists (create if not).
 */
async function ensureCategory(name, type, unit = "unit") {
  let cat = await prisma.financeCategory.findFirst({
    where: { name, type, isGlobal: true },
  });
  if (!cat) {
    cat = await prisma.financeCategory.create({
      data: { name, type, unit, isGlobal: true },
    });
  }
  return cat;
}

// ──────────────────────────────────────────────────────────────────────────────
// GET - Fetch designers and their current data status
// ──────────────────────────────────────────────────────────────────────────────

export async function GET(req) {
  try {
    const user = await getCurrentUser(req);
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized - Admin only" }, { status: 403 });
    }

    const designers = await prisma.user.findMany({
      where: { role: "DESIGNER" },
      select: {
        id: true,
        name: true,
        email: true,
        _count: {
          select: { transactions: true },
        },
      },
    });

    return NextResponse.json({
      designers: designers.map((d) => ({
        id: d.id,
        name: d.name,
        email: d.email,
        transactionCount: d._count.transactions,
      })),
    });
  } catch (error) {
    console.error("Finance Seed GET Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// POST - Generate financial data
// ──────────────────────────────────────────────────────────────────────────────

// Generation can take a while (many months × many DB writes) — stream NDJSON
// progress events to the client instead of buffering one giant response.
export const dynamic = "force-dynamic";

export async function POST(req) {
  const user = await getCurrentUser(req);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized - Admin only" }, { status: 403 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { designerId, targets, createClients = true } = body;
  // targets: { "2024": { amount: 41300, startMonth: 7, endMonth: 12, expenseRatio: 0.78 }, ... }

  if (!designerId || !targets) {
    return NextResponse.json(
      { error: "designerId and targets are required" },
      { status: 400 }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Each line pushed to the client is one JSON object followed by "\n".
      // type: "progress" | "done" | "error"
      const send = (payload) => {
        controller.enqueue(encoder.encode(JSON.stringify(payload) + "\n"));
      };

      try {
        // 1. Verify designer exists
        const designer = await prisma.user.findUnique({
          where: { id: designerId },
        });
        if (!designer || designer.role !== "DESIGNER") {
          send({ type: "error", error: "Designer not found" });
          return;
        }

        // Total progress steps = 1 setup step (categories/clients/measurements)
        // + 1 step per month across every year in `targets`.
        const totalMonths = Object.values(targets).reduce((sum, cfg) => {
          const start = cfg.startMonth || 1;
          const end = cfg.endMonth || 12;
          return sum + Math.max(0, end - start + 1);
        }, 0);
        const totalSteps = totalMonths + 1;
        let completedSteps = 0;

        send({ type: "progress", completed: 0, total: totalSteps, label: "Clearing old [SEED] data..." });
        console.log(`Finance Seed [${designer.name}]: (0/${totalSteps}) clearing old [SEED] data`);

        // Auto-clean previous seed data to avoid duplicates (safely targets only [SEED] data)
        await prisma.jobCosting.deleteMany({
          where: { transaction: { designerId: designer.id, notes: { contains: "[SEED]" } } },
        });
        await prisma.transaction.deleteMany({
          where: { designerId: designer.id, notes: { contains: "[SEED]" } },
        });
        await prisma.measurement.deleteMany({
          where: { creatorId: designer.id, notes: { contains: "[SEED]" } },
        });

        // 2. Find or create all needed finance categories
        const revenueCats = {
          "Custom Made": await ensureCategory("Custom Made", "REVENUE", "item"),
          "Ready-to-Wear": await ensureCategory("Ready-to-Wear", "REVENUE", "item"),
          "Alteration": await ensureCategory("Alteration", "REVENUE", "item"),
        };

        const expenseCats = {
          "Lace": await ensureCategory("Lace", "MATERIAL", "yards"),
          "Thread": await ensureCategory("Thread", "MATERIAL", "spool"),
          "Beads": await ensureCategory("Beads", "MATERIAL", "pack"),
          "Buttons": await ensureCategory("Buttons", "MATERIAL", "pcs"),
          "Zip": await ensureCategory("Zip", "MATERIAL", "pcs"),
          "Rent": await ensureCategory("Rent", "RENT", "month"),
          "Electricity": await ensureCategory("Electricity", "BILL", "month"),
          "Water": await ensureCategory("Water", "BILL", "month"),
          "Designer Salary": await ensureCategory("Designer Salary", "LABOUR", "month"),
          "Temporary Hands": await ensureCategory("Temporary Hands", "LABOUR", "day"),
          "Social Media Ads": await ensureCategory("Social Media Ads", "MARKETING", "campaign"),
          "Flyers & Printing": await ensureCategory("Flyers & Printing", "MARKETING", "batch"),
          "Needles": await ensureCategory("Needles", "TOOL", "pcs"),
          "Scissors": await ensureCategory("Scissors", "TOOL", "pcs"),
          "Sewing Machine": await ensureCategory("Sewing Machine", "TOOL", "unit"),
        };

        // Track live stock state in memory during seed generation
        // categoryName -> { categoryId, currentQuantity, unitPriceAverage, lowStockThreshold, lastRestocked }
        const stockTracker = {};
        for (const [name, cat] of Object.entries(expenseCats)) {
          if (cat.type === "MATERIAL" || cat.type === "TOOL") {
            stockTracker[name] = {
              categoryId: cat.id,
              currentQuantity: 0,
              unitPriceAverage: 0,
              lowStockThreshold: cat.type === "MATERIAL" ? 5 : 2,
              lastRestocked: null,
            };
          }
        }

        // Helper to update stock when materials/tools are purchased (EXPENSE)
        const recordStockPurchase = (catName, quantity, totalAmount, date) => {
          const tracker = stockTracker[catName];
          if (!tracker) return;
          const oldQty = tracker.currentQuantity;
          const oldAvg = tracker.unitPriceAverage;
          const newQty = oldQty + quantity;

          let newAvg = oldAvg;
          if (newQty > 0) {
            newAvg = ((oldQty * oldAvg) + totalAmount) / newQty;
          }

          tracker.currentQuantity = round2(newQty);
          tracker.unitPriceAverage = round2(newAvg);
          tracker.lastRestocked = date;
        };

        // Helper to record stock consumption when materials/tools are used for orders (USAGE)
        const recordStockUsage = (catName, quantity) => {
          const tracker = stockTracker[catName];
          if (!tracker) return;
          tracker.currentQuantity = Math.max(0, round2(tracker.currentQuantity - quantity));
        };

        // 3. Create or find Ghanaian clients
        let clients = [];
        if (createClients) {
          for (const clientData of GHANAIAN_CLIENTS) {
            let client = await prisma.client.findFirst({
              where: { phone: clientData.phone },
            });
            if (!client) {
              client = await prisma.client.create({ data: clientData });
            }
            clients.push(client);

            await prisma.clientDesigner.upsert({
              where: {
                clientId_designerId: {
                  clientId: client.id,
                  designerId: designer.id,
                },
              },
              update: {},
              create: {
                clientId: client.id,
                designerId: designer.id,
              },
            });
          }
        } else {
          const assignments = await prisma.clientDesigner.findMany({
            where: { designerId: designer.id },
            include: { client: true },
          });
          clients = assignments.map((a) => a.client);
        }

        // 4. Generate measurements for each client
        const clientMeasurements = {}; // clientId -> [measurementId, ...]
        let measurementsCreated = 0;

        if (createClients) {
          for (const client of clients) {
            const existingCount = await prisma.measurement.count({
              where: { clientId: client.id },
            });

            if (existingCount === 0) {
              const numMeasurements = randomInt(1, 3);
              const measurementIds = [];

              for (let mi = 0; mi < numMeasurements; mi++) {
                const mYear = randomChoice([2024, 2025, 2026]);
                const mMonth = randomInt(1, 12);
                const mDate = randomDateInMonth(mYear, mMonth);

                const bodyBase = {
                  shoulderToChest: randomBetween(6.0, 7.5),
                  shoulderToBust: randomBetween(10.0, 12.0),
                  shoulderToUnderbust: randomBetween(13.5, 15.5),
                  shoulderToWaistFront: randomBetween(16.5, 19.0),
                  shoulderToWaistBack: randomBetween(14.0, 16.0),
                  waistToHip: randomBetween(8.0, 9.5),
                  shoulderToKnee: randomBetween(35.0, 40.0),
                  shoulderToDressLength: randomBetween(37.0, 42.0),
                  shoulderToAnkle: randomBetween(50.0, 56.0),
                  shoulderWidth: randomBetween(15.5, 17.5),
                  bust: randomBetween(36.0, 42.0),
                  underBust: randomBetween(31.0, 36.0),
                  waist: randomBetween(28.0, 36.0),
                  hip: randomBetween(38.0, 46.0),
                  shirtSleeve: randomBetween(7.0, 8.5),
                  elbowLength: randomBetween(12.5, 14.5),
                  longSleeves: randomBetween(20.0, 24.0),
                  aroundArm: randomBetween(12.0, 15.0),
                  elbow: randomBetween(9.5, 11.5),
                  wrist: randomBetween(7.0, 8.5),
                  neck: randomBetween(13.0, 15.0),
                };

                const round1 = (v) => Math.round(v * 10) / 10;

                const measurement = await prisma.measurement.create({
                  data: {
                    clientId: client.id,
                    creatorId: designer.id,
                    createdAt: mDate,
                    updatedAt: mDate,
                    shoulderToChestSnug: round1(bodyBase.shoulderToChest),
                    shoulderToBustSnug: round1(bodyBase.shoulderToBust),
                    shoulderToUnderbustSnug: round1(bodyBase.shoulderToUnderbust),
                    shoulderToWaistFrontSnug: round1(bodyBase.shoulderToWaistFront),
                    shoulderToWaistBackSnug: round1(bodyBase.shoulderToWaistBack),
                    waistToHipSnug: round1(bodyBase.waistToHip),
                    shoulderToKneeSnug: round1(bodyBase.shoulderToKnee),
                    shoulderToDressLengthSnug: round1(bodyBase.shoulderToDressLength),
                    shoulderToAnkleSnug: round1(bodyBase.shoulderToAnkle),
                    shoulderWidthSnug: round1(bodyBase.shoulderWidth),
                    bustSnug: round1(bodyBase.bust),
                    underBustSnug: round1(bodyBase.underBust),
                    waistSnug: round1(bodyBase.waist),
                    hipSnug: round1(bodyBase.hip),
                    shirtSleeveSnug: round1(bodyBase.shirtSleeve),
                    elbowLengthSnug: round1(bodyBase.elbowLength),
                    longSleevesSnug: round1(bodyBase.longSleeves),
                    aroundArmSnug: round1(bodyBase.aroundArm),
                    elbowSnug: round1(bodyBase.elbow),
                    wristSnug: round1(bodyBase.wrist),
                    neckSnug: round1(bodyBase.neck),
                    shoulderToChestStatic: round1(bodyBase.shoulderToChest + 0.2),
                    shoulderToBustStatic: round1(bodyBase.shoulderToBust + 0.2),
                    shoulderToUnderbustStatic: round1(bodyBase.shoulderToUnderbust + 0.2),
                    shoulderToWaistFrontStatic: round1(bodyBase.shoulderToWaistFront + 0.2),
                    shoulderToWaistBackStatic: round1(bodyBase.shoulderToWaistBack + 0.2),
                    waistToHipStatic: round1(bodyBase.waistToHip + 0.2),
                    bustStatic: round1(bodyBase.bust + 0.5),
                    underBustStatic: round1(bodyBase.underBust + 0.5),
                    waistStatic: round1(bodyBase.waist + 0.5),
                    hipStatic: round1(bodyBase.hip + 0.5),
                    aroundArmStatic: round1(bodyBase.aroundArm + 0.5),
                    notes: mi === 0
                      ? `[SEED] Initial measurements for ${client.name}`
                      : `[SEED] Follow-up measurements for ${client.name} - session ${mi + 1}`,
                    orderStatus: randomChoice(["COMPLETED", "DELIVERED"]),
                  },
                });

                measurementIds.push(measurement.id);
                measurementsCreated++;
              }

              clientMeasurements[client.id] = measurementIds;
            } else {
              const existing = await prisma.measurement.findMany({
                where: { clientId: client.id },
                select: { id: true },
              });
              clientMeasurements[client.id] = existing.map((m) => m.id);
            }
          }
        }

        completedSteps++;
        send({
          type: "progress",
          completed: completedSteps,
          total: totalSteps,
          label: `Setup complete — ${clients.length} clients, ${measurementsCreated} measurements`,
        });
        console.log(`Finance Seed [${designer.name}]: (${completedSteps}/${totalSteps}) setup complete — ${clients.length} clients, ${measurementsCreated} measurements`);

        // 5. Generate transactions month by month, using day-level activity patterns
        const summary = {
          totalRevenue: 0,
          totalExpenses: 0,
          transactionsCreated: 0,
          jobCostingsCreated: 0,
          usageTransactionsCreated: 0,
          clientsCreated: clients.length,
          measurementsCreated,
          monthlyBreakdown: [],
          finalStockLevels: {},
        };

        for (const [yearStr, yearConfig] of Object.entries(targets)) {
          const year = parseInt(yearStr);
          const yearAmount = yearConfig.amount;
          const startMonth = yearConfig.startMonth || 1;
          const endMonth = yearConfig.endMonth || 12;
          const yearExpenseRatio = yearConfig.expenseRatio || 0.55;

          let totalWeight = 0;
          const monthWeights = {};
          for (let m = startMonth; m <= endMonth; m++) {
            const w = SEASONAL_WEIGHTS[m] * (1 + randomBetween(-0.05, 0.05));
            monthWeights[m] = w;
            totalWeight += w;
          }

          for (let month = startMonth; month <= endMonth; month++) {
            const daysInMonth = new Date(year, month, 0).getDate();
            const seasonWeight = SEASONAL_WEIGHTS[month];
            const activityLevel = clamp(seasonWeight / 1.5, 0.15, 1);
            const isBusyMonth = seasonWeight >= 0.9;
            const isSlowMonth = seasonWeight <= 0.4;

            const monthRevenue = (yearAmount * monthWeights[month]) / totalWeight;
            const monthExpenseTotal = monthRevenue * yearExpenseRatio * (1 + randomBetween(-0.06, 0.06));

            const monthResult = { year, month, revenue: 0, expenses: 0, revenueCount: 0, expenseCount: 0 };

            // ── EXPENSE: MATERIALS — restock trips (Run BEFORE order processing so stock exists) ──
            {
              const materialBudget = monthExpenseTotal * EXPENSE_SPLITS.materials * (isSlowMonth ? 0.5 : 1);
              const numEvents = isBusyMonth ? randomInt(2, 3) : (isSlowMonth ? randomInt(0, 1) : randomInt(1, 2));

              if (numEvents > 0 && materialBudget > 10) {
                const eventDays = pickSpacedDays(daysInMonth, numEvents, 6);
                const rawEventWeights = eventDays.map((_, i) => (i === 0 ? 1.4 : 1.0));
                const totalEventWeight = rawEventWeights.reduce((a, b) => a + b, 0);
                const materialCatNames = Object.keys(MATERIAL_WEIGHTS);

                for (let ei = 0; ei < eventDays.length; ei++) {
                  const day = eventDays[ei];
                  const eventBudget = materialBudget * (rawEventWeights[ei] / totalEventWeight);
                  const numTypes = randomInt(2, Math.min(4, materialCatNames.length));
                  const shuffled = [...materialCatNames].sort(() => Math.random() - 0.5);
                  const chosenTypes = shuffled.slice(0, numTypes);
                  const chosenWeightTotal = chosenTypes.reduce((s, t) => s + MATERIAL_WEIGHTS[t], 0);

                  for (const catName of chosenTypes) {
                    const cat = expenseCats[catName];
                    const range = EXPENSE_RANGES[catName];
                    const share = eventBudget * (MATERIAL_WEIGHTS[catName] / chosenWeightTotal);
                    const amount = roundMoney(clamp(share, range.min, range.max * 2));
                    if (amount < 3) continue;

                    const date = dateOnDay(year, month, day);
                    const qty = Math.max(1, randomInt(2, Math.ceil(amount / (range.min || 1))));

                    await prisma.transaction.create({
                      data: {
                        type: "EXPENSE",
                        categoryId: cat.id,
                        designerId: designer.id,
                        amount,
                        quantity: qty,
                        date,
                        notes: `[SEED] Restock ${catName} (${qty} ${cat.unit})`,
                      },
                    });

                    recordStockPurchase(catName, qty, amount, date);

                    await prisma.financeCategory.update({
                      where: { id: cat.id },
                      data: { usageCount: { increment: 1 } },
                    });
                    monthResult.expenses += amount;
                    monthResult.expenseCount++;
                    summary.transactionsCreated++;
                  }
                }
              }
            }

            // ── REVENUE & MATERIAL USAGE PER ORDER ──────────────────────────────────────────
            const numActiveDays = Math.max(3, Math.round(daysInMonth * (0.18 + 0.52 * activityLevel)));
            const activeDays = pickActiveDays(daysInMonth, numActiveDays);

            const rawOrders = [];
            for (const day of activeDays) {
              const count = ordersOnDay(activityLevel);
              for (let i = 0; i < count; i++) {
                const catName = weightedChoice(REVENUE_SPLITS);
                const range = REVENUE_RANGES[catName];
                rawOrders.push({ day, catName, amount: randomBetween(range.min, range.max) });
              }
            }

            const rawRevenueTotal = rawOrders.reduce((s, o) => s + o.amount, 0) || 1;
            const revenueScale = clamp(monthRevenue / rawRevenueTotal, 0.6, 1.7);

            for (const order of rawOrders) {
              const finalAmount = roundMoney(order.amount * revenueScale);
              if (finalAmount <= 0) continue;
              const cat = revenueCats[order.catName];
              const date = dateOnDay(year, month, order.day);
              const note = `[SEED] ${randomChoice(REVENUE_NOTES[order.catName])}`;
              const linkedClient = randomChoice(clients);

              const tx = await prisma.transaction.create({
                data: {
                  type: "REVENUE",
                  categoryId: cat.id,
                  designerId: designer.id,
                  amount: finalAmount,
                  quantity: 1,
                  date,
                  notes: note,
                },
              });

              let linkedMeasId = null;
              if (Math.random() < 0.75 && linkedClient) {
                const clientMeasIds = clientMeasurements[linkedClient.id] || [];
                linkedMeasId = clientMeasIds.length > 0 ? randomChoice(clientMeasIds) : null;
              }

              // Determine material usage depending on order type
              let materialType = "Lace";
              let qtyUsed = 2.0;
              if (order.catName === "Custom Made") {
                materialType = randomChoice(["Lace", "Thread", "Beads"]);
                qtyUsed = materialType === "Lace" ? round2(randomBetween(2.5, 4.5)) : (materialType === "Thread" ? 1.0 : round2(randomBetween(1.0, 2.0)));
              } else if (order.catName === "Ready-to-Wear") {
                materialType = randomChoice(["Lace", "Thread", "Zip"]);
                qtyUsed = materialType === "Lace" ? round2(randomBetween(1.5, 3.0)) : 1.0;
              } else {
                materialType = randomChoice(["Thread", "Zip", "Buttons"]);
                qtyUsed = materialType === "Buttons" ? randomInt(2, 6) : 1.0;
              }

              const matCat = expenseCats[materialType];
              if (matCat && linkedClient) {
                // Record JobCosting
                await prisma.jobCosting.create({
                  data: {
                    transactionId: tx.id,
                    clientId: linkedClient.id,
                    measurementId: linkedMeasId,
                    quantityUsed: qtyUsed,
                  },
                });
                summary.jobCostingsCreated++;

                // Record USAGE Transaction
                await prisma.transaction.create({
                  data: {
                    type: "USAGE",
                    categoryId: matCat.id,
                    designerId: designer.id,
                    amount: 0,
                    quantity: qtyUsed,
                    date,
                    notes: `[SEED] Consumed ${qtyUsed} ${matCat.unit} of ${materialType} for ${linkedClient.name}`,
                  },
                });
                summary.usageTransactionsCreated++;
                recordStockUsage(materialType, qtyUsed);
              }

              await prisma.financeCategory.update({
                where: { id: cat.id },
                data: { usageCount: { increment: 1 } },
              });

              monthResult.revenue += finalAmount;
              monthResult.revenueCount++;
              summary.transactionsCreated++;
            }

            // ── EXPENSE: RENT ──
            {
              const rentAmount = roundMoney(monthExpenseTotal * EXPENSE_SPLITS.rent);
              const rentDate = dateOnDay(year, month, randomInt(1, 3), 9, 10);
              await prisma.transaction.create({
                data: {
                  type: "EXPENSE",
                  categoryId: expenseCats["Rent"].id,
                  designerId: designer.id,
                  amount: rentAmount,
                  quantity: 1,
                  date: rentDate,
                  notes: `[SEED] ${randomChoice(EXPENSE_NOTES["Rent"])}`,
                },
              });
              await prisma.financeCategory.update({
                where: { id: expenseCats["Rent"].id },
                data: { usageCount: { increment: 1 } },
              });
              monthResult.expenses += rentAmount;
              monthResult.expenseCount++;
              summary.transactionsCreated++;
            }

            // ── EXPENSE: DESIGNER SALARY ──
            {
              const salaryAmount = roundMoney(monthExpenseTotal * EXPENSE_SPLITS.designerSalary);
              const salaryDate = dateOnDay(year, month, randomInt(25, Math.min(28, daysInMonth)), 15, 17);
              await prisma.transaction.create({
                data: {
                  type: "EXPENSE",
                  categoryId: expenseCats["Designer Salary"].id,
                  designerId: designer.id,
                  amount: salaryAmount,
                  quantity: 1,
                  date: salaryDate,
                  notes: `[SEED] ${randomChoice(EXPENSE_NOTES["Designer Salary"])}`,
                },
              });
              await prisma.financeCategory.update({
                where: { id: expenseCats["Designer Salary"].id },
                data: { usageCount: { increment: 1 } },
              });
              monthResult.expenses += salaryAmount;
              monthResult.expenseCount++;
              summary.transactionsCreated++;
            }

            // ── EXPENSE: TEMPORARY HANDS ──
            {
              let tempBudget = monthExpenseTotal * EXPENSE_SPLITS.tempLabour;
              if (isSlowMonth) tempBudget *= 0.2;
              else if (isBusyMonth) tempBudget *= 1.3;

              if (tempBudget > 30) {
                const numClusters = isBusyMonth ? randomInt(1, 2) : (isSlowMonth ? (Math.random() < 0.3 ? 1 : 0) : 1);
                if (numClusters > 0) {
                  const clusterStarts = pickSpacedDays(daysInMonth, numClusters, 8);
                  const perClusterBudget = tempBudget / Math.max(1, clusterStarts.length);
                  const range = EXPENSE_RANGES["Temporary Hands"];

                  for (const startDay of clusterStarts) {
                    const clusterLen = isBusyMonth ? randomInt(2, 4) : randomInt(1, 2);
                    const daysOfWork = [];
                    for (let d = 0; d < clusterLen && startDay + d <= daysInMonth; d++) {
                      daysOfWork.push(startDay + d);
                    }
                    const perDay = perClusterBudget / daysOfWork.length;

                    for (const day of daysOfWork) {
                      const amount = roundMoney(clamp(perDay * (1 + randomBetween(-0.2, 0.2)), range.min, range.max * 1.5));
                      const date = dateOnDay(year, month, day);
                      await prisma.transaction.create({
                        data: {
                          type: "EXPENSE",
                          categoryId: expenseCats["Temporary Hands"].id,
                          designerId: designer.id,
                          amount,
                          quantity: randomInt(1, 3),
                          date,
                          notes: `[SEED] ${randomChoice(EXPENSE_NOTES["Temporary Hands"])}`,
                        },
                      });
                      await prisma.financeCategory.update({
                        where: { id: expenseCats["Temporary Hands"].id },
                        data: { usageCount: { increment: 1 } },
                      });
                      monthResult.expenses += amount;
                      monthResult.expenseCount++;
                      summary.transactionsCreated++;
                    }
                  }
                }
              }
            }

            // ── EXPENSE: ELECTRICITY ──
            {
              const elecAmount = roundMoney(monthExpenseTotal * EXPENSE_SPLITS.electricity);
              const elecDate = dateOnDay(year, month, randomInt(12, Math.min(20, daysInMonth)), 9, 12);
              await prisma.transaction.create({
                data: {
                  type: "EXPENSE",
                  categoryId: expenseCats["Electricity"].id,
                  designerId: designer.id,
                  amount: elecAmount,
                  quantity: 1,
                  date: elecDate,
                  notes: `[SEED] ${randomChoice(EXPENSE_NOTES["Electricity"])}`,
                },
              });
              await prisma.financeCategory.update({
                where: { id: expenseCats["Electricity"].id },
                data: { usageCount: { increment: 1 } },
              });
              monthResult.expenses += elecAmount;
              monthResult.expenseCount++;
              summary.transactionsCreated++;
            }

            // ── EXPENSE: WATER ──
            {
              const waterAmount = roundMoney(monthExpenseTotal * EXPENSE_SPLITS.water);
              const waterDate = dateOnDay(year, month, randomInt(10, Math.min(18, daysInMonth)), 10, 13);
              await prisma.transaction.create({
                data: {
                  type: "EXPENSE",
                  categoryId: expenseCats["Water"].id,
                  designerId: designer.id,
                  amount: waterAmount,
                  quantity: 1,
                  date: waterDate,
                  notes: `[SEED] ${randomChoice(EXPENSE_NOTES["Water"])}`,
                },
              });
              await prisma.financeCategory.update({
                where: { id: expenseCats["Water"].id },
                data: { usageCount: { increment: 1 } },
              });
              monthResult.expenses += waterAmount;
              monthResult.expenseCount++;
              summary.transactionsCreated++;
            }

            // ── EXPENSE: MARKETING ──
            {
              const marketingChance = isBusyMonth ? 0.7 : (isSlowMonth ? 0.2 : 0.4);
              if (Math.random() < marketingChance) {
                const marketBudget = roundMoney(monthExpenseTotal * EXPENSE_SPLITS.marketing);
                const chosenCat = randomChoice(["Social Media Ads", "Flyers & Printing"]);
                const cat = expenseCats[chosenCat];

                if (cat && marketBudget > 10) {
                  const date = randomDateInMonth(year, month);
                  await prisma.transaction.create({
                    data: {
                      type: "EXPENSE",
                      categoryId: cat.id,
                      designerId: designer.id,
                      amount: marketBudget,
                      quantity: 1,
                      date,
                      notes: `[SEED] ${randomChoice(EXPENSE_NOTES[chosenCat])}`,
                    },
                  });
                  await prisma.financeCategory.update({
                    where: { id: cat.id },
                    data: { usageCount: { increment: 1 } },
                  });
                  monthResult.expenses += marketBudget;
                  monthResult.expenseCount++;
                  summary.transactionsCreated++;
                }
              }
            }

            // ── EXPENSE: TOOLS ──
            if (Math.random() < 0.20) {
              const toolBudget = monthExpenseTotal * EXPENSE_SPLITS.tools;
              const chosenTool = randomChoice(["Needles", "Scissors", "Sewing Machine"]);
              const toolCat = expenseCats[chosenTool];

              if (toolCat && toolBudget > 5) {
                const range = EXPENSE_RANGES[chosenTool];
                const amount = roundMoney(Math.min(toolBudget, randomBetween(range.min, range.max)));
                const date = randomDateInMonth(year, month);
                const qty = 1;

                await prisma.transaction.create({
                  data: {
                    type: "EXPENSE",
                    categoryId: toolCat.id,
                    designerId: designer.id,
                    amount,
                    quantity: qty,
                    date,
                    notes: `[SEED] ${randomChoice(EXPENSE_NOTES[chosenTool])}`,
                  },
                });

                recordStockPurchase(chosenTool, qty, amount, date);

                await prisma.financeCategory.update({
                  where: { id: toolCat.id },
                  data: { usageCount: { increment: 1 } },
                });
                monthResult.expenses += amount;
                monthResult.expenseCount++;
                summary.transactionsCreated++;
              }
            }

            monthResult.revenue = round2(monthResult.revenue);
            monthResult.expenses = round2(monthResult.expenses);
            summary.totalRevenue += monthResult.revenue;
            summary.totalExpenses += monthResult.expenses;
            summary.monthlyBreakdown.push(monthResult);

            completedSteps++;
            const monthLabel = `${MONTH_NAMES[month]} ${year}`;
            send({
              type: "progress",
              completed: completedSteps,
              total: totalSteps,
              label: `${monthLabel} — Rev GHS ${monthResult.revenue.toLocaleString()}, Exp GHS ${monthResult.expenses.toLocaleString()}`,
              year,
              month,
            });
            console.log(
              `Finance Seed [${designer.name}]: (${completedSteps}/${totalSteps}) ${monthLabel} done — ` +
              `revenue ${monthResult.revenue}, expenses ${monthResult.expenses}`
            );
          }
        }

        // 6. Upsert calculated InventoryStock records into Prisma DB
        let stocksUpdatedCount = 0;
        for (const [name, stock] of Object.entries(stockTracker)) {
          if (stock.lastRestocked || stock.currentQuantity > 0) {
            await prisma.inventoryStock.upsert({
              where: { categoryId: stock.categoryId },
              update: {
                currentQuantity: stock.currentQuantity,
                unitPriceAverage: stock.unitPriceAverage,
                lowStockThreshold: stock.lowStockThreshold,
                lastRestocked: stock.lastRestocked || new Date(),
              },
              create: {
                categoryId: stock.categoryId,
                designerId: designer.id,
                currentQuantity: stock.currentQuantity,
                unitPriceAverage: stock.unitPriceAverage,
                lowStockThreshold: stock.lowStockThreshold,
                lastRestocked: stock.lastRestocked || new Date(),
              },
            });
            stocksUpdatedCount++;
            summary.finalStockLevels[name] = {
              qty: stock.currentQuantity,
              avgPrice: stock.unitPriceAverage,
            };
          }
        }
        summary.stocksUpdatedCount = stocksUpdatedCount;

        summary.totalRevenue = round2(summary.totalRevenue);
        summary.totalExpenses = round2(summary.totalExpenses);
        summary.netProfit = round2(summary.totalRevenue - summary.totalExpenses);
        summary.overallMargin = Math.round((summary.netProfit / summary.totalRevenue) * 10000) / 100;

        console.log(
          `Finance Seed [${designer.name}]: complete — ${summary.transactionsCreated} transactions, ` +
          `${summary.usageTransactionsCreated} usage records, ${stocksUpdatedCount} inventory stocks updated.`
        );

        send({
          type: "done",
          message: `Generated ${summary.transactionsCreated} transactions and updated ${stocksUpdatedCount} stock levels for ${designer.name}`,
          summary,
        });
      } catch (error) {
        console.error("Finance Seed POST Error:", error);
        send({ type: "error", error: error.message || "Internal server error" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// DELETE - Clear all financial data for a designer
// ──────────────────────────────────────────────────────────────────────────────

export async function DELETE(req) {
  try {
    const user = await getCurrentUser(req);
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized - Admin only" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const designerId = searchParams.get("designerId");

    if (!designerId) {
      return NextResponse.json({ error: "designerId is required" }, { status: 400 });
    }

    const deletedCostings = await prisma.jobCosting.deleteMany({
      where: {
        transaction: { designerId, notes: { contains: "[SEED]" } },
      },
    });

    const deletedTransactions = await prisma.transaction.deleteMany({
      where: { designerId, notes: { contains: "[SEED]" } },
    });

    const deletedMeasurements = await prisma.measurement.deleteMany({
      where: { creatorId: designerId, notes: { contains: "[SEED]" } },
    });

    return NextResponse.json({
      success: true,
      message: `Cleared ${deletedTransactions.count} transactions, ${deletedCostings.count} job links, and ${deletedMeasurements.count} measurements. Real data preserved.`,
      deletedTransactions: deletedTransactions.count,
      deletedCostings: deletedCostings.count,
      deletedMeasurements: deletedMeasurements.count,
    });

  } catch (error) {
    console.error("Finance Seed DELETE Error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}