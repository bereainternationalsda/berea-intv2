// Plain types shared by server actions and client forms. Kept out of the
// "use server" actions file because that file may only export async functions.

// `at` changes on every response, so forms can reset their file input (which
// React clears after each action) in step with it.
export type FormState =
  | { status: "idle" }
  | {
      status: "error";
      message: string;
      fieldErrors?: Record<string, string>;
      at: number;
    }
  | { status: "success"; message: string; at: number };

export const idleState: FormState = { status: "idle" };

export type AdminCard = {
  slug: string;
  title: string;
  description?: string;
  icon?: string;
  imageUrl?: string;
  order: number;
  sectionSlug?: string;
};
