import prismaService from "@/db/prismadb/prisma.service";
import { Role } from "@prisma/client";
import { add } from "date-fns";
import { signAccessToken, signRefreshToken, verifyRefresh } from "./jwt";
import {
  createRefreshToken,
  findByRawToken,
  revokeByRawToken,
  revokeAllForUser,
} from "./refresh.store";

export async function issueTokens(
  user: { id: number; email: string; role: Role },
  meta?: { ip?: string; userAgent?: string },
) {
  const access = await signAccessToken({
    sub: String(user.id),
    email: user.email,
    role: user.role,
  });

  const refresh = await signRefreshToken({ sub: String(user.id), role: user.role });

  const expiresAt = parseHumanTTL(process.env.REFRESH_TOKEN_TTL ?? "7d");

  await createRefreshToken({
    user_id: user.id,
    role: user.role,
    raw_token: refresh,
    expires_at: expiresAt,
    ip: meta?.ip,
    user_agent: meta?.userAgent,
  });

  return { access, refresh };
}

export async function rotateRefresh(
  oldRefresh: string,
  meta?: { ip?: string; userAgent?: string },
) {
  const payload = await verifyRefresh<{ sub: string; role: Role }>(oldRefresh);
  const userId = Number(payload.sub);

  const stored = await findByRawToken(oldRefresh);
  if (!stored || stored.revoked || stored.expires_at < new Date()) {
    throw new Error("Refresh token invalid");
  }

  const user = await prismaService.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true },
  });
  if (!user) throw new Error("User not found");

  const access = await signAccessToken({
    sub: String(user.id),
    email: user.email,
    role: user.role,
  });
  const refresh = await signRefreshToken({ sub: String(user.id), role: user.role });

  await revokeByRawToken(oldRefresh);

  await createRefreshToken({
    user_id: user.id,
    role: user.role,
    raw_token: refresh,
    expires_at: parseHumanTTL(process.env.REFRESH_TOKEN_TTL ?? "7d"),
    ip: meta?.ip,
    user_agent: meta?.userAgent,
    rotated_from_id: stored.id,
  });

  return { access, refresh };
}

export async function logoutAll(userId: number) {
  await revokeAllForUser(userId);
}

/** parse "7d" | "12h" | "15m" into a Date */
function parseHumanTTL(ttl: string): Date {
  const m = ttl.match(/^(\d+)([dhm])$/i);
  if (!m) return add(new Date(), { days: 7 });
  const n = Number(m[1]);
  const u = m[2].toLowerCase();
  if (u === "d") return add(new Date(), { days: n });
  if (u === "h") return add(new Date(), { hours: n });
  return add(new Date(), { minutes: n });
}
