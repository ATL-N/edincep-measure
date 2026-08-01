// PUT    /api/designs/[id]  — create or update a design (last write wins by updatedAt)
// DELETE /api/designs/[id]  — soft delete (other devices remove it on their next sync)
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma.js";
import { requireStaff, canAccessClient } from "@/lib/authz";

const MAX_CONFIG_CHARS = 20_000;

export async function PUT(request, { params }) {
  const { user, error } = await requireStaff(request);
  if (error) return error;
  const { id } = await params;
  if (typeof id !== "string" || id.length > 64) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const name = String(body?.name ?? "").trim().slice(0, 120) || "Untitled design";
  const config = body?.config;
  if (!config || typeof config !== "object" || JSON.stringify(config).length > MAX_CONFIG_CHARS) {
    return NextResponse.json({ error: "Invalid design options" }, { status: 400 });
  }
  const clientId = typeof body?.clientId === "string" ? body.clientId : null;
  const measurementId = typeof body?.measurementId === "string" ? body.measurementId : null;
  const updatedAt = body?.updatedAt ? new Date(body.updatedAt) : new Date();
  const createdAt = body?.createdAt ? new Date(body.createdAt) : updatedAt;
  if (Number.isNaN(updatedAt.getTime()) || Number.isNaN(createdAt.getTime())) {
    return NextResponse.json({ error: "Invalid dates" }, { status: 400 });
  }

  // A design may only point at the designer's own clients/measurements.
  // (Ids not on the server yet are allowed: they sync shortly after.)
  if (clientId && (await prisma.client.findUnique({ where: { id: clientId }, select: { id: true } }))) {
    if (!(await canAccessClient(user, clientId))) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }
  }
  if (measurementId) {
    const m = await prisma.measurement.findUnique({ where: { id: measurementId }, select: { creatorId: true } });
    if (m && m.creatorId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Measurement not found" }, { status: 404 });
    }
  }

  const existing = await prisma.design.findUnique({ where: { id } });
  if (existing && existing.designerId !== user.id) {
    return NextResponse.json({ error: "Design not found" }, { status: 404 });
  }
  if (existing && existing.updatedAt > updatedAt) {
    return NextResponse.json({ design: existing, kept: "server" }); // newer edit already here
  }
  const data = { name, config, clientId, measurementId, updatedAt, deletedAt: null };
  const design = existing
    ? await prisma.design.update({ where: { id }, data })
    : await prisma.design.create({ data: { id, designerId: user.id, createdAt, ...data } });
  return NextResponse.json({ design });
}

export async function DELETE(request, { params }) {
  const { user, error } = await requireStaff(request);
  if (error) return error;
  const { id } = await params;
  const existing = await prisma.design.findUnique({ where: { id } });
  if (!existing || existing.designerId !== user.id) {
    return NextResponse.json({ ok: true }); // already gone
  }
  await prisma.design.update({ where: { id }, data: { deletedAt: new Date(), updatedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
