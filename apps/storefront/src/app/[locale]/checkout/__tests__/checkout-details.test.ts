import { isValidEgyptPhone } from "../checkout-details";

it("accepts Egyptian mobile numbers in local and international form", () => {
  for (const phone of ["01012345678", "0122 345 6789", "+201512345678", "00201012345678", "(010) 1234-5678"]) {
    expect(isValidEgyptPhone(phone)).toBe(true);
  }
  for (const phone of ["0101234567", "01312345678", "+2001012345678", "", "phone"]) {
    expect(isValidEgyptPhone(phone)).toBe(false);
  }
});
