// Shared "saved" signal. Dispatched by forms after a successful save;
// listened to by <Toaster /> (toast) and <AddSheet /> (closes the sheet).
export const SAVED_EVENT = "fcc:saved";

export function notifySaved(message: string = "Saved"): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SAVED_EVENT, { detail: { message } }));
  }
}
