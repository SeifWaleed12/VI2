jest.mock("../../client", () => ({ medusa: { client: { fetch: jest.fn() } } }));
import { medusa } from "../../client";
import { getCategoryTree } from "../categories";
const fetchMock = medusa.client.fetch as jest.Mock;
describe("localized category directory", () => {
  beforeEach(() => fetchMock.mockReset());
  it("retrieves every page and sends the locale on each request", async () => {
    fetchMock
      .mockResolvedValueOnce({
        count: 51,
        product_categories: Array.from({ length: 50 }, (_, i) => ({
          id: `pcat_${i}`,
          name: `Category ${i}`,
          handle: `c-${i}`,
          parent_category_id: null,
          rank: i,
        })),
      })
      .mockResolvedValueOnce({
        count: 51,
        product_categories: [
          {
            id: "last",
            name: "Last",
            handle: "last",
            parent_category_id: null,
            rank: 50,
          },
        ],
      });
    expect(await getCategoryTree("en")).toHaveLength(51);
    expect(fetchMock.mock.calls[1][1]).toMatchObject({
      query: { offset: 50 },
      headers: { "x-medusa-locale": "en-US" },
    });
  });
  it("isolates concurrent locale requests", async () => {
    fetchMock.mockImplementation((_path, options) =>
      Promise.resolve({
        count: 1,
        product_categories: [
          {
            id: "same",
            name: options.headers["x-medusa-locale"],
            handle: "category",
            parent_category_id: null,
          },
        ],
      }),
    );
    const [ar, en] = await Promise.all([
      getCategoryTree("ar"),
      getCategoryTree("en"),
    ]);
    expect(ar[0].name).toBe("ar-EG");
    expect(en[0].name).toBe("en-US");
  });
  it("propagates API failure instead of fabricating categories", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    await expect(getCategoryTree("en")).rejects.toThrow("offline");
  });
});
