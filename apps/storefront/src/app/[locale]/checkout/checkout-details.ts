// The checkout details form and its empty state.

export type CheckoutForm = {
  name: string;
  phone: string;
  email: string;
  governorate: string;
  area: string;
  address: string;
  notes: string;
};

export const initialForm: CheckoutForm = {
  name: "",
  phone: "",
  email: "",
  governorate: "",
  area: "",
  address: "",
  notes: "",
};
