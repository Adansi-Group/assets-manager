import type { UserRole } from "./users";

/** One person allowed into Assets Station. Stored at members/{email}. */
export interface Member {
  /** Lower-cased and trimmed; equals the document id. */
  email: string;
  name: string;
  role: UserRole;
  department?: string;
  createdAt: string;
  /** Email of the admin who added them. */
  addedBy?: string;
}
