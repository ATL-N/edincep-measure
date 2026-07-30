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
  rent: 0.24,              // Fixed monthly shop rent
  designerSalary: 0.18,   // Owner's monthly draw
  tempLabour: 0.13,       // Temporary seamstress wages (varies with workload)
  materials: 0.25,        // Lace, Thread, Beads, Buttons, Zip
  electricity: 0.08,      // ECG bill
  water: 0.05,            // Water bill
  marketing: 0.04,        // Social media ads, flyers
  tools: 0.03,            // Occasional equipment
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
// Helper functions
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

function randomDateInMonth(year, month) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const day = randomInt(1, daysInMonth);
  const hour = randomInt(8, 18);
  const minute = randomInt(0, 59);
  return new Date(year, month - 1, day, hour, minute, 0);
}

/**
 * Distribute a total amount into N random-ish chunks within min/max per chunk.
 */
function distributeAmount(total, minPerItem, maxPerItem) {
  const items = [];
  let remaining = total;

  while (remaining > minPerItem * 0.5) {
    const maxAllowed = Math.min(maxPerItem, remaining);
    if (maxAllowed < minPerItem * 0.5) {
      if (items.length > 0) {
        items[items.length - 1] += remaining;
      } else {
        items.push(remaining);
      }
      remaining = 0;
      break;
    }

    const amount = Math.round(randomBetween(minPerItem, maxAllowed) * 100) / 100;
    items.push(amount);
    remaining -= amount;

    if (remaining < 0) {
      items[items.length - 1] += remaining;
      remaining = 0;
    }
  }

  if (remaining > 0 && items.length > 0) {
    items[items.length - 1] += remaining;
  } else if (remaining > 0) {
    items.push(remaining);
  }

  return items.map(a => Math.round(Math.max(0, a) * 100) / 100);
}

/**
 * Ensure a category exists (create if not). Used for new categories like Water, Designer Salary, etc.
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

export async function POST(req) {
  try {
    const user = await getCurrentUser(req);
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized - Admin only" }, { status: 403 });
    }

    const body = await req.json();
    const { designerId, targets, createClients = true } = body;
    // targets: { "2024": { amount: 41300, startMonth: 7, endMonth: 12, expenseRatio: 0.78 }, ... }

    if (!designerId || !targets) {
      return NextResponse.json(
        { error: "designerId and targets are required" },
        { status: 400 }
      );
    }

    // 1. Verify designer exists
    const designer = await prisma.user.findUnique({
      where: { id: designerId },
    });
    if (!designer || designer.role !== "DESIGNER") {
      return NextResponse.json({ error: "Designer not found" }, { status: 404 });
    }

    // 2. Find or create all needed finance categories
    const revenueCats = {
      "Custom Made": await ensureCategory("Custom Made", "REVENUE", "item"),
      "Ready-to-Wear": await ensureCategory("Ready-to-Wear", "REVENUE", "item"),
      "Alteration": await ensureCategory("Alteration", "REVENUE", "item"),
    };

    const expenseCats = {
      // Materials
      "Lace": await ensureCategory("Lace", "MATERIAL", "yards"),
      "Thread": await ensureCategory("Thread", "MATERIAL", "spool"),
      "Beads": await ensureCategory("Beads", "MATERIAL", "pack"),
      "Buttons": await ensureCategory("Buttons", "MATERIAL", "pcs"),
      "Zip": await ensureCategory("Zip", "MATERIAL", "pcs"),
      // Rent
      "Rent": await ensureCategory("Rent", "RENT", "month"),
      // Bills / Utilities
      "Electricity": await ensureCategory("Electricity", "BILL", "month"),
      "Water": await ensureCategory("Water", "BILL", "month"),
      // Labour / Salaries
      "Designer Salary": await ensureCategory("Designer Salary", "LABOUR", "month"),
      "Temporary Hands": await ensureCategory("Temporary Hands", "LABOUR", "day"),
      // Marketing
      "Social Media Ads": await ensureCategory("Social Media Ads", "MARKETING", "campaign"),
      "Flyers & Printing": await ensureCategory("Flyers & Printing", "MARKETING", "batch"),
      // Tools
      "Needles": await ensureCategory("Needles", "TOOL", "pcs"),
      "Scissors": await ensureCategory("Scissors", "TOOL", "pcs"),
      "Sewing Machine": await ensureCategory("Sewing Machine", "TOOL", "unit"),
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
        // Check if client already has measurements
        const existingCount = await prisma.measurement.count({
          where: { clientId: client.id },
        });

        if (existingCount === 0) {
          // Generate 1-3 measurements per client at different time points
          const numMeasurements = randomInt(1, 3);
          const measurementIds = [];

          for (let mi = 0; mi < numMeasurements; mi++) {
            // Spread measurements across the date range
            const mYear = randomChoice([2024, 2025, 2026]);
            const mMonth = randomInt(1, 12);
            const mDate = randomDateInMonth(mYear, mMonth);

            // Generate realistic body measurements with slight per-client variation
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
                // Snug measurements
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
                // Static measurements (slightly larger)
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
                  ? `Initial measurements for ${client.name}`
                  : `Follow-up measurements for ${client.name} - session ${mi + 1}`,
                orderStatus: randomChoice(["COMPLETED", "DELIVERED"]),
              },
            });

            measurementIds.push(measurement.id);
            measurementsCreated++;
          }

          clientMeasurements[client.id] = measurementIds;
        } else {
          // Use existing measurements
          const existing = await prisma.measurement.findMany({
            where: { clientId: client.id },
            select: { id: true },
          });
          clientMeasurements[client.id] = existing.map((m) => m.id);
        }
      }
    }

    // 5. Generate transactions month by month
    const summary = {
      totalRevenue: 0,
      totalExpenses: 0,
      transactionsCreated: 0,
      jobCostingsCreated: 0,
      clientsCreated: clients.length,
      measurementsCreated,
      monthlyBreakdown: [],
    };

    for (const [yearStr, yearConfig] of Object.entries(targets)) {
      const year = parseInt(yearStr);
      const yearAmount = yearConfig.amount;
      const startMonth = yearConfig.startMonth || 1;
      const endMonth = yearConfig.endMonth || 12;
      const yearExpenseRatio = yearConfig.expenseRatio || 0.55;

      // Calculate weighted distribution for this year's months
      let totalWeight = 0;
      const monthWeights = {};
      for (let m = startMonth; m <= endMonth; m++) {
        const w = SEASONAL_WEIGHTS[m] * (1 + randomBetween(-0.05, 0.05));
        monthWeights[m] = w;
        totalWeight += w;
      }

      // Generate per-month
      for (let month = startMonth; month <= endMonth; month++) {
        const monthRevenue = (yearAmount * monthWeights[month]) / totalWeight;
        const monthExpenseTotal = monthRevenue * yearExpenseRatio * (1 + randomBetween(-0.06, 0.06));

        // In slow months, expenses might even exceed revenue slightly (realistic!)
        // The expense ratio already handles this per-year

        const monthResult = {
          year,
          month,
          revenue: 0,
          expenses: 0,
          revenueCount: 0,
          expenseCount: 0,
        };

        // Determine if this is a "busy" month (affects temp labour)
        const isBusyMonth = SEASONAL_WEIGHTS[month] >= 0.9;
        const isSlowMonth = SEASONAL_WEIGHTS[month] <= 0.4;

        // ── Revenue Transactions ───────────────────────────────────────────
        for (const [catName, split] of Object.entries(REVENUE_SPLITS)) {
          const catTarget = monthRevenue * split;
          const cat = revenueCats[catName];
          const range = REVENUE_RANGES[catName];
          const amounts = distributeAmount(catTarget, range.min, range.max);

          for (const amount of amounts) {
            if (amount <= 0) continue;
            const date = randomDateInMonth(year, month);
            const note = randomChoice(REVENUE_NOTES[catName]);
            const linkedClient = randomChoice(clients);

            const tx = await prisma.transaction.create({
              data: {
                type: "REVENUE",
                categoryId: cat.id,
                designerId: designer.id,
                amount: Math.round(amount * 100) / 100,
                quantity: 1,
                date,
                notes: note,
              },
            });

            // Link ~75% of revenue to a client via JobCosting (with measurement)
            if (Math.random() < 0.75 && linkedClient) {
              // Pick a random measurement for this client if available
              const clientMeasIds = clientMeasurements[linkedClient.id] || [];
              const linkedMeasId = clientMeasIds.length > 0 ? randomChoice(clientMeasIds) : null;

              await prisma.jobCosting.create({
                data: {
                  transactionId: tx.id,
                  clientId: linkedClient.id,
                  measurementId: linkedMeasId,
                  quantityUsed: 0,
                },
              });
              summary.jobCostingsCreated++;
            }

            await prisma.financeCategory.update({
              where: { id: cat.id },
              data: { usageCount: { increment: 1 } },
            });

            monthResult.revenue += amount;
            monthResult.revenueCount++;
            summary.transactionsCreated++;
          }
        }

        // ── Expense: RENT (fixed monthly) ──────────────────────────────────
        {
          const rentAmount = monthExpenseTotal * EXPENSE_SPLITS.rent;
          const rentDate = new Date(year, month - 1, randomInt(1, 3), 9, 0, 0);
          await prisma.transaction.create({
            data: {
              type: "EXPENSE",
              categoryId: expenseCats["Rent"].id,
              designerId: designer.id,
              amount: Math.round(rentAmount * 100) / 100,
              quantity: 1,
              date: rentDate,
              notes: randomChoice(EXPENSE_NOTES["Rent"]),
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

        // ── Expense: DESIGNER SALARY (monthly draw) ────────────────────────
        {
          const salaryAmount = monthExpenseTotal * EXPENSE_SPLITS.designerSalary;
          // Salary is usually taken end of month
          const salaryDate = new Date(year, month - 1, randomInt(25, 28), 16, 0, 0);
          await prisma.transaction.create({
            data: {
              type: "EXPENSE",
              categoryId: expenseCats["Designer Salary"].id,
              designerId: designer.id,
              amount: Math.round(salaryAmount * 100) / 100,
              quantity: 1,
              date: salaryDate,
              notes: randomChoice(EXPENSE_NOTES["Designer Salary"]),
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

        // ── Expense: TEMPORARY HANDS (varies with workload) ────────────────
        {
          // More temp labour in busy months, none in very slow months
          let tempBudget = monthExpenseTotal * EXPENSE_SPLITS.tempLabour;
          if (isSlowMonth) {
            tempBudget *= 0.2; // Barely any temp help in slow months
          } else if (isBusyMonth) {
            tempBudget *= 1.3; // Extra help during busy periods
          }

          if (tempBudget > 30) {
            const tempCat = expenseCats["Temporary Hands"];
            const range = EXPENSE_RANGES["Temporary Hands"];
            const amounts = distributeAmount(tempBudget, range.min, range.max);

            for (const amount of amounts) {
              if (amount <= 0) continue;
              const date = randomDateInMonth(year, month);
              await prisma.transaction.create({
                data: {
                  type: "EXPENSE",
                  categoryId: tempCat.id,
                  designerId: designer.id,
                  amount: Math.round(amount * 100) / 100,
                  quantity: randomInt(1, 5),
                  date,
                  notes: randomChoice(EXPENSE_NOTES["Temporary Hands"]),
                },
              });
              await prisma.financeCategory.update({
                where: { id: tempCat.id },
                data: { usageCount: { increment: 1 } },
              });
              monthResult.expenses += amount;
              monthResult.expenseCount++;
              summary.transactionsCreated++;
            }
          }
        }

        // ── Expense: MATERIALS ─────────────────────────────────────────────
        {
          const materialBudget = monthExpenseTotal * EXPENSE_SPLITS.materials;
          // In slow months, buy fewer materials
          const adjustedBudget = isSlowMonth ? materialBudget * 0.5 : materialBudget;

          const materialCatNames = ["Lace", "Thread", "Beads", "Buttons", "Zip"];
          const materialWeights = [0.35, 0.15, 0.20, 0.10, 0.20];

          for (let i = 0; i < materialCatNames.length; i++) {
            const catName = materialCatNames[i];
            const cat = expenseCats[catName];
            if (!cat) continue;

            const catBudget = adjustedBudget * materialWeights[i];
            if (catBudget < 3) continue;

            const range = EXPENSE_RANGES[catName] || { min: 5, max: 50 };
            const amounts = distributeAmount(catBudget, range.min, range.max);

            for (const amount of amounts) {
              if (amount <= 0) continue;
              const date = randomDateInMonth(year, month);
              const notes = EXPENSE_NOTES[catName] ? randomChoice(EXPENSE_NOTES[catName]) : `${catName} purchase`;
              const qty = Math.max(1, randomInt(1, Math.ceil(amount / range.min)));

              await prisma.transaction.create({
                data: {
                  type: "EXPENSE",
                  categoryId: cat.id,
                  designerId: designer.id,
                  amount: Math.round(amount * 100) / 100,
                  quantity: qty,
                  date,
                  notes,
                },
              });

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

        // ── Expense: ELECTRICITY (monthly) ─────────────────────────────────
        {
          const elecAmount = monthExpenseTotal * EXPENSE_SPLITS.electricity;
          const elecDate = new Date(year, month - 1, randomInt(12, 20), 10, 0, 0);
          await prisma.transaction.create({
            data: {
              type: "EXPENSE",
              categoryId: expenseCats["Electricity"].id,
              designerId: designer.id,
              amount: Math.round(elecAmount * 100) / 100,
              quantity: 1,
              date: elecDate,
              notes: randomChoice(EXPENSE_NOTES["Electricity"]),
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

        // ── Expense: WATER (monthly) ───────────────────────────────────────
        {
          const waterAmount = monthExpenseTotal * EXPENSE_SPLITS.water;
          const waterDate = new Date(year, month - 1, randomInt(10, 18), 11, 0, 0);
          await prisma.transaction.create({
            data: {
              type: "EXPENSE",
              categoryId: expenseCats["Water"].id,
              designerId: designer.id,
              amount: Math.round(waterAmount * 100) / 100,
              quantity: 1,
              date: waterDate,
              notes: randomChoice(EXPENSE_NOTES["Water"]),
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

        // ── Expense: MARKETING (occasional - ~50% chance, more in busy months)
        {
          const marketingChance = isBusyMonth ? 0.7 : (isSlowMonth ? 0.2 : 0.4);
          if (Math.random() < marketingChance) {
            const marketBudget = monthExpenseTotal * EXPENSE_SPLITS.marketing;
            const marketCats = ["Social Media Ads", "Flyers & Printing"];
            const chosenCat = randomChoice(marketCats);
            const cat = expenseCats[chosenCat];

            if (cat && marketBudget > 10) {
              const date = randomDateInMonth(year, month);
              await prisma.transaction.create({
                data: {
                  type: "EXPENSE",
                  categoryId: cat.id,
                  designerId: designer.id,
                  amount: Math.round(marketBudget * 100) / 100,
                  quantity: 1,
                  date,
                  notes: EXPENSE_NOTES[chosenCat] ? randomChoice(EXPENSE_NOTES[chosenCat]) : `${chosenCat}`,
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

        // ── Expense: TOOLS (rare - ~20% chance per month)
        if (Math.random() < 0.20) {
          const toolBudget = monthExpenseTotal * EXPENSE_SPLITS.tools;
          const toolCatNames = ["Needles", "Scissors", "Sewing Machine"];
          const chosenTool = randomChoice(toolCatNames);
          const toolCat = expenseCats[chosenTool];

          if (toolCat && toolBudget > 5) {
            const range = EXPENSE_RANGES[chosenTool] || { min: 10, max: 100 };
            const amount = Math.min(toolBudget, randomBetween(range.min, range.max));
            const date = randomDateInMonth(year, month);

            await prisma.transaction.create({
              data: {
                type: "EXPENSE",
                categoryId: toolCat.id,
                designerId: designer.id,
                amount: Math.round(amount * 100) / 100,
                quantity: 1,
                date,
                notes: EXPENSE_NOTES[chosenTool] ? randomChoice(EXPENSE_NOTES[chosenTool]) : `${chosenTool} purchase`,
              },
            });
            await prisma.financeCategory.update({
              where: { id: toolCat.id },
              data: { usageCount: { increment: 1 } },
            });
            monthResult.expenses += amount;
            monthResult.expenseCount++;
            summary.transactionsCreated++;
          }
        }

        monthResult.revenue = Math.round(monthResult.revenue * 100) / 100;
        monthResult.expenses = Math.round(monthResult.expenses * 100) / 100;
        summary.totalRevenue += monthResult.revenue;
        summary.totalExpenses += monthResult.expenses;
        summary.monthlyBreakdown.push(monthResult);
      }
    }

    summary.totalRevenue = Math.round(summary.totalRevenue * 100) / 100;
    summary.totalExpenses = Math.round(summary.totalExpenses * 100) / 100;
    summary.netProfit = Math.round((summary.totalRevenue - summary.totalExpenses) * 100) / 100;
    summary.overallMargin = Math.round((summary.netProfit / summary.totalRevenue) * 10000) / 100;

    return NextResponse.json({
      success: true,
      message: `Generated ${summary.transactionsCreated} transactions for ${designer.name}`,
      summary,
    }, { status: 201 });

  } catch (error) {
    console.error("Finance Seed POST Error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
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

    // Delete in order: JobCostings → Transactions
    const deletedCostings = await prisma.jobCosting.deleteMany({
      where: {
        transaction: { designerId },
      },
    });

    const deletedTransactions = await prisma.transaction.deleteMany({
      where: { designerId },
    });

    return NextResponse.json({
      success: true,
      message: `Cleared ${deletedTransactions.count} transactions and ${deletedCostings.count} job costings`,
      deletedTransactions: deletedTransactions.count,
      deletedCostings: deletedCostings.count,
    });

  } catch (error) {
    console.error("Finance Seed DELETE Error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
