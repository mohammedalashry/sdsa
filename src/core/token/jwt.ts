import jwt, { SignOptions } from "jsonwebtoken";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

const REFRESH_EXPIRES_IN: string | number = (process.env.REFRESH_TOKEN_TTL ?? 604800) as
  | string
  | number;

export async function signAccessToken(payload: object) {
  return new Promise<string>((resolve, reject) =>
    jwt.sign(
      payload,
      ACCESS_SECRET,
      {
        algorithm: "HS256",
      } as SignOptions,
      (err, t) => (err || !t ? reject(err) : resolve(t)),
    ),
  );
}

export async function signRefreshToken(payload: object) {
  console.log("payload", payload);
  console.log("REFRESH_SECRET", REFRESH_SECRET);
  console.log("REFRESH_EXPIRES_IN", REFRESH_EXPIRES_IN);
  return new Promise<string>((resolve, reject) =>
    jwt.sign(
      payload,
      REFRESH_SECRET,
      {
        algorithm: "HS256",
        expiresIn: 60 * 60 * 24 * 7,
      } as SignOptions,
      (err, t) => (err || !t ? reject(err) : resolve(t)),
    ),
  );
}

export async function verifyAccess<T = any>(token: string) {
  return new Promise<T>((resolve, reject) =>
    jwt.verify(token, ACCESS_SECRET, { algorithms: ["HS256"] }, (e, d) =>
      e ? reject(e) : resolve(d as T),
    ),
  );
}

export async function verifyRefresh<T = any>(token: string) {
  return new Promise<T>((resolve, reject) =>
    jwt.verify(token, REFRESH_SECRET, { algorithms: ["HS256"] }, (e, d) =>
      e ? reject(e) : resolve(d as T),
    ),
  );
}
