import crypto from "crypto";
import { Role } from "@prisma/client";
import prismaService from "@/db/prismadb/prisma.service";

export const hashToken = (t: string) =>
  crypto.createHash("sha256").update(t).digest("hex");

export async function createRefreshToken(opts: {
  user_id: number;
  role: Role;
  raw_token: string;
  expires_at: Date;
  ip?: string;
  user_agent?: string;
  rotated_from_id?: string | null;
}) {
  return prismaService.refreshToken.create({
    data: {
      user_id: opts.user_id,
      role: opts.role,
      token_hash: hashToken(opts.raw_token),
      expires_at: opts.expires_at,
      ip: opts.ip,
      user_agent: opts.user_agent,
      rotated_from_id: opts.rotated_from_id ?? null,
    },
  });
}

export async function findByRawToken(raw_token: string) {
  return prismaService.refreshToken.findUnique({
    where: { token_hash: hashToken(raw_token) },
  });
}

export async function revokeByRawToken(raw_token: string) {
  return prismaService.refreshToken.update({
    where: { token_hash: hashToken(raw_token) },
    data: { revoked: true, revoked_at: new Date() },
  });
}

export async function revokeAllForUser(user_id: number) {
  return prismaService.refreshToken.updateMany({
    where: { user_id, revoked: false },
    data: { revoked: true, revoked_at: new Date() },
  });
}
