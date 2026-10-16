jest.mock("../../client", () => ({ medusa: { store: { region: { list: jest.fn() } } } }));
const egypt = { id: "reg_eg", name: "Egypt", currency_code: "egp", countries: [{ iso_2: "eg" }] };

// Each test needs a fresh module: the region answer is kept in module state.
async function load() {
  jest.resetModules();
  const { resolveRegionId } = await import("../regions");
  const { medusa } = await import("../../client");
  return { resolveRegionId, list: jest.mocked(medusa.store.region.list) };
}

it("asks Medusa for the regions once while concurrent callers share the answer", async () => {
  const { resolveRegionId, list } = await load();
  list.mockResolvedValue({ regions: [egypt] } as never);
  expect(await Promise.all([resolveRegionId(), resolveRegionId(), resolveRegionId()])).toEqual(["reg_eg", "reg_eg", "reg_eg"]);
  await resolveRegionId();
  expect(list).toHaveBeenCalledTimes(1);
});

it("does not keep an empty answer, so a later call asks again", async () => {
  const { resolveRegionId, list } = await load();
  list.mockRejectedValueOnce(new Error("offline")).mockResolvedValue({ regions: [egypt] } as never);
  await expect(resolveRegionId()).rejects.toThrow("Egyptian EGP region");
  expect(await resolveRegionId()).toBe("reg_eg");
  expect(list).toHaveBeenCalledTimes(2);
});
