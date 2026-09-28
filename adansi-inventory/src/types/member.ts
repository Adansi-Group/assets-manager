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
  /**
   * Lets this person in with a password account whose email nobody verified.
   * Only safe while that account exists: it is what stops anyone else
   * registering the address. Set by hand in the console, never by the app.
   */
  passwordSignIn?: boolean;
}
