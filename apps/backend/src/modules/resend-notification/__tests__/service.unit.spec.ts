import ResendNotificationService from "../service"

const service = new ResendNotificationService({}, { api_key: "re_test", from: "Vi2 <orders@example.com>" })
const email = { to: "sara@example.com", channel: "email", template: "order-received", content: { subject: "Order received", text: "Thanks", html: "<p>Thanks</p>" } }
let fetchMock: jest.SpyInstance
beforeEach(() => { fetchMock = jest.spyOn(global, "fetch") })
afterEach(() => { jest.restoreAllMocks() })

it("posts the email to Resend with the key and the configured sender", async () => {
  fetchMock.mockResolvedValue(Response.json({ id: "email_123" }))
  await expect(service.send(email)).resolves.toEqual({ id: "email_123" })
  const [url, init] = fetchMock.mock.calls[0]
  expect(url).toBe("https://api.resend.com/emails")
  expect(init.headers.Authorization).toBe("Bearer re_test")
  expect(JSON.parse(init.body)).toEqual({ from: "Vi2 <orders@example.com>", to: ["sara@example.com"], subject: "Order received", text: "Thanks", html: "<p>Thanks</p>" })
})

it("reports Resend's refusal without the key", async () => {
  fetchMock.mockResolvedValue(Response.json({ message: "The example.com domain is not verified." }, { status: 403 }))
  const sent = service.send(email)
  await expect(sent).rejects.toThrow("Resend refused the email (403): The example.com domain is not verified.")
  await expect(service.send(email)).rejects.not.toThrow("re_test")
})

it("refuses an email without a subject or body instead of sending a blank one", async () => {
  await expect(service.send({ ...email, content: { subject: "", text: "x" } })).rejects.toThrow("no subject or body")
  await expect(service.send({ ...email, content: null })).rejects.toThrow("no subject or body")
  expect(fetchMock).not.toHaveBeenCalled()
})
