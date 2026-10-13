import type { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import setupWellnessCatalog from "../setup-wellness-catalog";

jest.mock("@medusajs/medusa/core-flows", () => ({
  batchTranslationsWorkflow: jest.fn(),
  updateStoresWorkflow: jest.fn(),
}));

describe("wellness setup target reporting", () => {
  let log: jest.SpyInstance;
  const listProductCategories = jest.fn().mockResolvedValue([]);
  const listStores = jest.fn().mockResolvedValue([]);
  function input(databaseUrl: string, args: string[] = []): ExecArgs {
    return {
      args,
      container: {
        resolve: (key: string) => {
          if (key === ContainerRegistrationKeys.CONFIG_MODULE)
            return { projectConfig: { databaseUrl } };
          if (key === Modules.PRODUCT) return { listProductCategories };
          if (key === Modules.STORE) return { listStores };
          return {};
        },
      },
    } as unknown as ExecArgs;
  }
  beforeEach(() => {
    jest.clearAllMocks();
    log = jest.spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => log.mockRestore());
  it("reports the configured host/name without credentials or connection options", async () => {
    await setupWellnessCatalog(
      input(
        "postgres://private-user:private-password@db.internal:6543/vi2_stage?sslmode=require",
      ),
    );
    expect(JSON.parse(log.mock.calls[0][0])).toEqual({
      database: { host: "db.internal", port: "6543", name: "vi2_stage" },
    });
    expect(JSON.stringify(log.mock.calls)).not.toMatch(
      /private-user|private-password|sslmode/,
    );
  });
  it("reports the target before apply reaches any write", async () => {
    await expect(
      setupWellnessCatalog(
        input("postgresql://db.internal/vi2_prod", ["apply"]),
      ),
    ).rejects.toThrow("Exactly one store");
    expect(JSON.parse(log.mock.calls[0][0]).database).toEqual({
      host: "db.internal",
      port: "5432",
      name: "vi2_prod",
    });
    expect(log.mock.invocationCallOrder[0]).toBeLessThan(
      listStores.mock.invocationCallOrder[0],
    );
  });
  it.each([
    "",
    "not-a-url",
    "https://db.internal/vi2",
    "postgres://db.internal",
  ])(
    "refuses unsafe or missing target %s before querying the catalog",
    async (url) => {
      await expect(setupWellnessCatalog(input(url, ["apply"]))).rejects.toThrow(
        "valid PostgreSQL database URL",
      );
      expect(listProductCategories).not.toHaveBeenCalled();
      expect(log).not.toHaveBeenCalled();
    },
  );
});
