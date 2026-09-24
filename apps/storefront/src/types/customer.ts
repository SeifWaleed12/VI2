export type Customer = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  hasAccount?: boolean;
};

export type RegisterCredentials = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
};

export type LoginCredentials = {
  email: string;
  password: string;
};
