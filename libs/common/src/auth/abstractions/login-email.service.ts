import { Observable } from "rxjs";

export abstract class LoginEmailService {
  /**
   * An observable that monitors the storedEmail
   */
  storedEmail$: Observable<string>;
  /**
   * Gets the current email being used in the login process.
   * @returns A string of the email.
   */
  getEmail: () => string;
  /**
   * Sets the current email being used in the login process.
   * @param email The email to be set.
   */
  setEmail: (email: string) => void;
  /**
   * Gets whether or not the email should be stored on disk.
   * @returns A boolean stating whether or not the email should be stored on disk.
   */
  getRememberEmail: () => boolean;
  /**
   * Sets whether or not the email should be stored on disk.
   */
  setRememberEmail: (value: boolean) => void;
  /**
   * Sets the email to store on disk.
   * @returns A promise that resolves when the email has been set.
   */
  setStoredEmail: (value: string) => Promise<void>;
  /**
   * Sets the email and rememberEmail properties to null.
   */
  clearValues: () => void;
  /**
   * - If rememberEmail is true, sets the storedEmail to the current email.
   * - If rememberEmail is false, sets the storedEmail to null.
   * - Then sets the email and rememberEmail properties to null.
   * @returns A promise that resolves once the email settings are saved.
   */
  saveEmailSettings: () => Promise<void>;
}
