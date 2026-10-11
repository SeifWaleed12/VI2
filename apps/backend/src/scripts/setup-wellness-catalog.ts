import type {
  ExecArgs,
  IProductModuleService,
  ITranslationModuleService,
  IStoreModuleService,
} from "@medusajs/framework/types";
import { MedusaError, Modules } from "@medusajs/framework/utils";
import {
  batchTranslationsWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows";
import { planWellnessCategories } from "../lib/wellness-categories";

export default async function setupWellnessCatalog({
  container,
  args,
}: ExecArgs) {
  const product: IProductModuleService = container.resolve(Modules.PRODUCT);
  const translation: ITranslationModuleService = container.resolve(
    Modules.TRANSLATION,
  );
  const store: IStoreModuleService = container.resolve(Modules.STORE);
  const existing = [] as Awaited<
    ReturnType<typeof product.listProductCategories>
  >;
  for (let skip = 0; ; skip += 100) {
    const page = await product.listProductCategories({}, { take: 100, skip });
    existing.push(...page);
    if (page.length < 100) break;
  }
  // Validate the entire plan before the first write. Existing catalog assignments are untouched.
  const plans = planWellnessCategories(existing);
  console.log(
    JSON.stringify(
      {
        mode: args.includes("apply") ? "apply" : "dry-run",
        categories: plans.map((p) => ({
          name: p.name,
          action: p.id ? "reuse" : "create",
          parent: p.parentHandle,
        })),
        unrelated: existing
          .filter((c) => !plans.some((p) => p.id === c.id))
          .map((c) => c.name),
      },
      null,
      2,
    ),
  );
  if (!args.includes("apply")) return;
  const stores = await store.listStores(
    {},
    { relations: ["supported_locales"] },
  );
  if (stores.length !== 1)
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Exactly one store is required",
    );
  const localeCodes = Array.from(
    new Set([
      ...(stores[0].supported_locales || []).map((l) => l.locale_code),
      "en-US",
      "ar-EG",
    ]),
  );
  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: stores[0].id },
      update: {
        supported_locales: localeCodes.map((locale_code) => ({ locale_code })),
      },
    },
  });
  for (const plan of plans) {
    const parentId =
      plans.find((p) => p.handle === plan.parentHandle)?.id ?? null;
    if (!plan.id) {
      const created = await product.createProductCategories({
        name: plan.name,
        handle: plan.handle,
        parent_category_id: parentId,
        rank: plan.rank,
        is_active: true,
        is_internal: false,
      });
      plan.id = created.id;
    } else {
      await product.updateProductCategories(plan.id, {
        name: plan.name,
        rank: plan.rank,
      });
    }
    const found = await translation.listTranslations({
      reference: "product_category",
      reference_id: plan.id,
      locale_code: "ar-EG",
    });
    if (found.length > 1)
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Ambiguous translation: ${plan.name}`,
      );
    await batchTranslationsWorkflow(container).run({
      input: {
        create: found.length
          ? []
          : [
              {
                reference: "product_category",
                reference_id: plan.id,
                locale_code: "ar-EG",
                translations: { name: plan.arabic },
              },
            ],
        update: found.length
          ? [
              {
                id: found[0].id,
                translations: { ...found[0].translations, name: plan.arabic },
              },
            ]
          : [],
        delete: [],
      },
    });
  }
  console.log(
    "Wellness catalog configured; rerun the dry run to confirm reuse.",
  );
}
