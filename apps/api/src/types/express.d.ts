import type { User, Profile } from "types";

declare global {
  namespace Express {
    interface Request {
      user?: User;
      profile?: Profile;
      rawBody?: Buffer;
    }
  }
}

export {};
