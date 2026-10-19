import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Footer from "../Footer";
import InformationPage, {
  generateMetadata,
} from "@/app/[locale]/(information)/[information]/page";
import {
  informationPages,
  informationSlugs,
  informationUi,
  isInformationSlug,
} from "@/lib/information-pages";
import { message } from "@/lib/i18n";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, ...props }: { children: never }) =>
    createElement("a", props, children),
}));
jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: object) => createElement("img", props),
}));
jest.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));
jest.mock("../Footer.module.css", () => ({}));
jest.mock(
  "@/app/[locale]/(information)/[information]/Information.module.css",
  () => ({}),
);
const category = {
  id: "pcat_native",
  name: "اسم القسم من المتجر",
  handle: "native-category",
  parent_category_id: null,
  children: [],
};
const input = (locale: string, information: string) => ({
  params: Promise.resolve({ locale, information }),
});
beforeEach(() =>
  jest.replaceProperty(process, "env", {
    ...process.env,
    NODE_ENV: "development",
  }),
);
afterEach(() => jest.restoreAllMocks());

it.each(["en", "ar"] as const)(
  "renders the %s footer without effects or text replacement, using the supplied logo and real category links",
  (locale) => {
    const html = renderToStaticMarkup(
      createElement(Footer, { locale, categories: [category] }),
    );
    expect(html).toContain('src="/brand/vi2-logo-mark-black.png"');
    expect(html).toContain('alt="Vi2"');
    expect(html).toContain(message(locale, "footer.statement"));
    expect(html).toContain(message(locale, "footer.preview"));
    expect(html).toContain('href="/' + locale + '/shop/native-category"');
    expect(html).toContain(category.name);
    for (const slug of informationSlugs)
      expect(html).toContain('href="/' + locale + "/" + slug + '"');
    expect(html).toContain("data-no-translate");
    expect(html).not.toMatch(
      /Instagram|TikTok|Facebook|Authenticity|href="#"|categories/,
    );
  },
);
it("keeps a real shop destination when the category directory is empty", () => {
  const html = renderToStaticMarkup(
    createElement(Footer, { locale: "ar", categories: [] }),
  );
  expect(html).toContain('href="/ar/shop"');
  expect(html).toContain(message("ar", "catalog.all"));
});
it.each(["en", "ar"] as const)(
  "does not expose draft links, placeholders or policy claims in the production %s footer",
  (locale) => {
    jest.replaceProperty(process, "env", {
      ...process.env,
      NODE_ENV: "production",
    });
    const html = renderToStaticMarkup(
      createElement(Footer, { locale, categories: [category] }),
    );
    for (const slug of informationSlugs)
      expect(html).not.toContain('href="/' + locale + "/" + slug + '"');
    expect(html).not.toContain(message(locale, "footer.preview"));
    expect(html).not.toContain(informationUi[locale].missing);
    expect(html).toContain('href="/' + locale + '/shop/native-category"');
  },
);
for (const locale of ["en", "ar"] as const) {
  it.each(informationSlugs)(
    "renders the " +
      locale +
      " %s draft with explicit review status, missing facts and matching contents anchors",
    async (slug) => {
      const page = await InformationPage(input(locale, slug));
      const html = renderToStaticMarkup(page);
      const content = informationPages[locale][slug];
      expect(html).toContain(content.title.replace(/&/g, "&amp;"));
      expect(html).toContain(informationUi[locale].notice);
      expect(html).toContain(informationUi[locale].missing);
      for (const section of content.sections) {
        expect(html).toContain('href="#' + section.id + '"');
        expect(html).toContain('id="' + section.id + '"');
      }
      expect(html).toContain('aria-current="page"');
      expect(html).toContain('href="/' + locale + '/shop"');
      expect(html).not.toContain("mailto:");
      expect(html).not.toContain("tel:");
      expect(await generateMetadata(input(locale, slug))).toMatchObject({
        title: content.title + " | Vi2",
        robots: { index: false, follow: false },
      });
    },
  );
  it.each(informationSlugs)(
    "returns not found for the unapproved " +
      locale +
      " %s page and metadata in production",
    async (slug) => {
      jest.replaceProperty(process, "env", {
        ...process.env,
        NODE_ENV: "production",
        NEXT_PUBLIC_INFORMATION_PREVIEW: "true",
      });
      await expect(InformationPage(input(locale, slug))).rejects.toThrow(
        "NOT_FOUND",
      );
      await expect(generateMetadata(input(locale, slug))).rejects.toThrow(
        "NOT_FOUND",
      );
    },
  );
}
it.each(["categories", "unknown", "__proto__", "constructor", "toString"])(
  "does not turn %s into an information page",
  async (slug) => {
    expect(isInformationSlug(slug)).toBe(false);
    await expect(InformationPage(input("en", slug))).rejects.toThrow(
      "NOT_FOUND",
    );
  },
);
it("rejects an unsupported locale", async () => {
  await expect(InformationPage(input("fr", "about"))).rejects.toThrow(
    "NOT_FOUND",
  );
});

it.each(["en", "ar"] as const)(
  "starts the %s information page heading outline at h1",
  async (locale) => {
    const html = renderToStaticMarkup(
      await InformationPage(input(locale, "returns")),
    );
    expect(html.match(/<h[1-6](?:\s|>)/)?.[0]).toBe("<h1>");
    expect(html).not.toContain(
      "<h2>" + informationUi[locale].navigation + "</h2>",
    );
  },
);
