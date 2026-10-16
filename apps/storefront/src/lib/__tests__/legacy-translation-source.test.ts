import { sourceText } from "@/context/LanguageContext";

it("starts from the text first seen", () => {
  expect(sourceText("Subtotal", undefined, undefined)).toBe("Subtotal");
});

it("keeps the source while the node still shows what was written", () => {
  expect(sourceText("المجموع", "المجموع", "Subtotal")).toBe("Subtotal");
});

it("takes React's new text instead of restoring the old one", () => {
  // The summary first rendered "0 EGP"; once the cart loaded React wrote "100 EGP".
  expect(sourceText("100 EGP", "0 EGP", "0 EGP")).toBe("100 EGP");
});
