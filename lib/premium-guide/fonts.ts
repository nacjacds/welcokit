import { Lora, Poppins } from "next/font/google";

// Premium guide typography (docs/guides-kit README, section 3): Poppins for
// titles and UI, Lora for reading text with italic lead-ins. Exposed as CSS
// variables so the premium guide stays independent of the app's own
// Inter/Playfair setup.
export const poppins = Poppins({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const lora = Lora({
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
  variable: "--font-lora",
  display: "swap",
});
