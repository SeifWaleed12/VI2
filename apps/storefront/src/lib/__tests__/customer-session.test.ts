import { getCustomer, logoutCustomer } from "../medusa/services/customer";

afterEach(() => { jest.restoreAllMocks(); });

test("an expired session clears customer state but a backend outage remains an error", async () => {
  const fetchMock = jest.spyOn(global, "fetch");
  fetchMock.mockResolvedValueOnce(Response.json({}, { status: 401 }));
  await expect(getCustomer()).resolves.toBeNull();
  fetchMock.mockResolvedValueOnce(Response.json({}, { status: 503 }));
  await expect(getCustomer()).rejects.toThrow("Account service temporarily unavailable.");
});

test.each(["network", "http"])("logout reports %s failures rather than pretending success", async (kind) => {
  const fetchMock = jest.spyOn(global, "fetch");
  if (kind === "network") fetchMock.mockRejectedValue(new Error("private network failure"));
  else fetchMock.mockResolvedValue(Response.json({}, { status: 403 }));
  await expect(logoutCustomer()).rejects.toThrow("Unable to sign out. Please try again.");
});

test("logout succeeds after the server clears the cookie", async () => {
  jest.spyOn(global, "fetch").mockResolvedValue(Response.json({ ok: true }));
  await expect(logoutCustomer()).resolves.toBeUndefined();
});

test("logout announces the sign-out so the cart is cleared for the next person", async () => {
  const fakeWindow = Object.assign(new EventTarget(), { localStorage: { removeItem: jest.fn() } });
  const signedOut = jest.fn();
  fakeWindow.addEventListener("vi2-signed-out", signedOut);
  Object.defineProperty(global, "window", { value: fakeWindow, configurable: true });
  try {
    jest.spyOn(global, "fetch").mockResolvedValue(Response.json({ ok: true }));
    await logoutCustomer();
    expect(signedOut).toHaveBeenCalledTimes(1);
  } finally {
    delete (global as { window?: unknown }).window;
  }
});
