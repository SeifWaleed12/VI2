import { addressErrors, emailChangeErrors, profileErrors } from "../account-validation";

const address = { address_name: "", name: "Sara Ali", phone: "01012345678", governorate: "Giza", area: "Dokki", street: "12 Tahrir St" };

it("accepts a complete Egyptian address; the label is optional", () => {
  expect(addressErrors(address)).toEqual({});
});

it("names every missing address field", () => {
  expect(addressErrors({ address_name: "", name: " ", phone: "", governorate: "", area: "", street: "" })).toEqual({
    name: "nameRequired", phone: "phoneRequired", governorate: "governorateRequired", area: "areaRequired", street: "streetRequired",
  });
});

it.each(["0101234567", "01312345678", "1012345678", "phone", "+2001012345678"])("refuses %s as a mobile number", (phone) => {
  expect(addressErrors({ ...address, phone }).phone).toBe("invalidPhone");
});

it.each(["01012345678", "0122 345 6789", "(010) 1234-5678", "+201512345678", "00201112345678"])("accepts %s as a mobile number", (phone) => {
  expect(addressErrors({ ...address, phone }).phone).toBeUndefined();
});

it("requires a first name; the profile phone may be empty but not wrong", () => {
  expect(profileErrors({ first_name: "", last_name: "" })).toEqual({ first_name: "firstNameRequired" });
  expect(profileErrors({ phone: "" })).toEqual({});
  expect(profileErrors({ phone: "123" })).toEqual({ phone: "invalidPhone" });
});

it("checks the new email and that a password was given", () => {
  expect(emailChangeErrors({ email: "", password: "" })).toEqual({ email: "emailRequired", password: "currentPasswordRequired" });
  expect(emailChangeErrors({ email: "sara@", password: "x" })).toEqual({ email: "emailFormat" });
  expect(emailChangeErrors({ email: "sara@example.com", password: "x" })).toEqual({});
});
