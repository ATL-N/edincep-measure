import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET(req, { params }) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const transaction = await prisma.transaction.findUnique({
      where: { id: params.id },
      include: {
        category: true,
      },
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    if (transaction.designerId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(transaction);
  } catch (error) {
    console.error("Transaction GET Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { amount, quantity, notes, receiptImageUrl, date } = body;

    const transaction = await prisma.transaction.findUnique({
      where: { id: params.id },
      include: { category: true }
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    if (transaction.designerId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if within 7 days
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    if (transaction.createdAt < oneWeekAgo) {
      return NextResponse.json({ error: "Transactions older than 7 days cannot be edited" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // If quantity changed and it's a MATERIAL/TOOL expense, adjust stock
      if (transaction.type === 'EXPENSE' && (transaction.category.type === 'MATERIAL' || transaction.category.type === 'TOOL')) {
        const qtyDiff = (parseFloat(quantity) || transaction.quantity) - transaction.quantity;
        if (qtyDiff !== 0) {
          await tx.inventoryStock.update({
            where: { categoryId: transaction.categoryId },
            data: {
              currentQuantity: { increment: qtyDiff }
            }
          });
        }
      }

      return await tx.transaction.update({
        where: { id: params.id },
        data: {
          amount: amount ? parseFloat(amount) : undefined,
          quantity: quantity ? parseFloat(quantity) : undefined,
          notes,
          receiptImageUrl,
          date: date ? new Date(date) : undefined,
        },
        include: { category: true }
      });
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Transaction PUT Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const transaction = await prisma.transaction.findUnique({
      where: { id: params.id },
      include: { category: true }
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    if (transaction.designerId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if within 7 days
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    if (transaction.createdAt < oneWeekAgo) {
      return NextResponse.json({ error: "Transactions older than 7 days cannot be deleted" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      // If expense and MATERIAL/TOOL, reverse stock
      if (transaction.type === 'EXPENSE' && (transaction.category.type === 'MATERIAL' || transaction.category.type === 'TOOL')) {
        await tx.inventoryStock.update({
          where: { categoryId: transaction.categoryId },
          data: {
            currentQuantity: { decrement: transaction.quantity }
          }
        });
      }

      await tx.transaction.delete({
        where: { id: params.id }
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Transaction DELETE Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
