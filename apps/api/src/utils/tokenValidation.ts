import jwt from "jsonwebtoken";

export function isTokenExpired(token: string): boolean {
  try {
    // Decode without verification (just to get the payload)
    const decoded = jwt.decode(token) as any;
    if (!decoded || !decoded.exp) {
      return true; // Invalid token
    }

    // exp is in seconds, Date.now() is in milliseconds
    const expiresAt = decoded.exp * 1000;
    return Date.now() > expiresAt;
  } catch {
    return true; // Invalid token format
  }
}

export function getTokenExpiryTime(token: string): Date | null {
  try {
    const decoded = jwt.decode(token) as any;
    if (!decoded || !decoded.exp) {
      return null;
    }
    return new Date(decoded.exp * 1000);
  } catch {
    return null;
  }
}
