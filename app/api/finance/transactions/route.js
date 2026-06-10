// app/api/finance/transactions/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET(req) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const transactions = await prisma.transaction.findMany({
      where: { 
        designerId: user.id,
        type: { not: 'USAGE' }
      },
      include: {
        category: true,
        jobCostings: {
          include: {
            client: {
              select: { id: true, name: true }
            }
          }
        }
      },
      orderBy: { date: 'desc' },
      skip,
      take: limit,
    });

    const total = await prisma.transaction.count({ 
      where: { 
        designerId: user.id,
        type: { not: 'USAGE' }
      } 
    });

    return NextResponse.json({
      transactions,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Transactions GET Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    console.log("[DIAGNOSTIC] Transaction POST body:", JSON.stringify(body, null, 2));

    const { 
        id, // Optional client-provided ID
        type, categoryId, amount, quantity, 
        notes, receiptImageUrl, clientId, measurementId, date,
        jobCostings // Array of { clientId, measurementId, quantityUsed }
    } = body;

    // Validate Category exists
    const category = await prisma.financeCategory.findFirst({
      where: {
        id: categoryId,
        OR: [
          { isGlobal: true },
          { designerId: user.id }
        ]
      }
    });

    if (!category) {
      console.error(`[DIAGNOSTIC] Category NOT FOUND for ID: ${categoryId}. Designer: ${user.id}`);
      return NextResponse.json({ error: `Category ${categoryId} not found on server. Please sync categories first.` }, { status: 404 });
    }

    // Transactional create to ensure data integrity
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the transaction
      const transaction = await tx.transaction.create({
        data: {
          id: id || undefined, // Use provided ID or let Prisma generate a CUID
          type,
          categoryId,
          designerId: user.id,
          amount: parseFloat(amount),
          quantity: parseFloat(quantity || 1),
          notes,
          receiptImageUrl,
          date: date ? new Date(date) : new Date(),
        }
      });

      // 2. Create job costings if provided
      if (jobCostings && Array.isArray(jobCostings) && jobCostings.length > 0) {
        await tx.jobCosting.createMany({
          data: jobCostings.map(jc => ({
            transactionId: transaction.id,
            clientId: jc.clientId,
            measurementId: jc.measurementId,
            quantityUsed: parseFloat(jc.quantityUsed || 0),
          }))
        });
      }

      // 3. Update usage count for the category
      await tx.financeCategory.update({
        where: { id: categoryId },
        data: { usageCount: { increment: 1 } }
      });

      // 4. Update Inventory if it's a MATERIAL or TOOL expense/usage
      if ((type === 'EXPENSE' || type === 'USAGE') && (category.type === 'MATERIAL' || category.type === 'TOOL')) {
        const stock = await tx.inventoryStock.findUnique({
          where: { categoryId }
        });

        const isUsage = type === 'USAGE';

        if (stock) {
          // Update existing stock
          // If usage, subtract quantity. If expense (purchase), add quantity.
          const newTotalQuantity = isUsage 
            ? Math.max(0, stock.currentQuantity - transaction.quantity)
            : stock.currentQuantity + transaction.quantity;

          let newAverage = stock.unitPriceAverage;
          if (!isUsage && newTotalQuantity > 0) {
            // Recalculate moving average only for purchases
            const totalOldValue = stock.currentQuantity * stock.unitPriceAverage;
            const totalNewValue = transaction.amount;
            newAverage = (totalOldValue + totalNewValue) / newTotalQuantity;
          }

          await tx.inventoryStock.update({
            where: { id: stock.id },
            data: {
              currentQuantity: newTotalQuantity,
              unitPriceAverage: newAverage,
              lastRestocked: isUsage ? undefined : transaction.date
            }
          });
        } else if (!isUsage) {
          // Create new stock entry (only for purchases)
          await tx.inventoryStock.create({
            data: {
              categoryId,
              designerId: user.id,
              currentQuantity: transaction.quantity,
              unitPriceAverage: transaction.amount / transaction.quantity,
              lastRestocked: transaction.date
            }
          });
        }
      }

      return { ...transaction, category }; // Return category manually to ensure it's present
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Transactions POST Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
