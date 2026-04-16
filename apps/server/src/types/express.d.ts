import { TokenPayload } from "../utils/jwt";

declare global {
  namespace Express {
    interface Request {
      authUser?: TokenPayload;
    }
  }
}
