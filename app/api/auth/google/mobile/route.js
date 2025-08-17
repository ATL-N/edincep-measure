// /api/auth/google/mobile/route.js

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function createLog(data) {
  try {
    await prisma.log.create({ data });
  } catch (error) {
    console.error("Failed to create log:", error);
  }
}

export async function POST(req) {
  try {
    const { idToken } = await req.json();
    if (!idToken) {
      return NextResponse.json({ message: 'ID token is required.' }, { status: 400 });
    }

    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload) {
      return NextResponse.json({ message: 'Invalid ID token.' }, { status: 401 });
    }

    const { email, name, picture: image } = payload;

    let user = await prisma.user.findUnique({
      where: { email },
    });

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || req.socket.remoteAddress;
    const os = req.headers.get('user-agent');

    if (user) {
      // User exists, update their info if necessary
      user = await prisma.user.update({
        where: { email },
        data: { name, image },
      });
      await createLog({
        userId: user.id,
        action: "USER_LOGIN_SUCCESS_MOBILE",
        ipAddress: ip,
        os: os,
      });
    } else {
      // User does not exist, create a new user
      user = await prisma.user.create({
        data: {
          email,
          name,
          image,
          emailVerified: new Date(),
          role: 'CLIENT', // or whatever default role you want to assign
        },
      });
      await createLog({
        userId: user.id,
        action: "USER_SIGNUP_SUCCESS_MOBILE",
        ipAddress: ip,
        os: os,
      });
    }

    const tokenPayload = {
      id: user.id,
      role: user.role,
      status: user.status,
    };

    const token = jwt.sign(tokenPayload, process.env.NEXTAUTH_SECRET, {
      expiresIn: '30d', // Or your desired expiration
    });

    return NextResponse.json({ token });

  } catch (error) {
    console.error('Google mobile auth error:', error);
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || req.socket.remoteAddress;
    const os = req.headers.get('user-agent');
    await createLog({
        action: "GOOGLE_MOBILE_AUTH_FAILED",
        ipAddress: ip,
        os: os,
        details: { error: error.message },
      });
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
