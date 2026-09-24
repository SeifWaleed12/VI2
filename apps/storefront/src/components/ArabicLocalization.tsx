"use client";

import { useEffect } from "react";
import { translateArabicUi } from "@/lib/arabicLocalization";

const originalText = new WeakMap<Text, string>();
const lastTranslatedText = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();
const originalElementText = new WeakMap<Element, string>();
const translatedAttributes = ["aria-label", "placeholder", "title"];

function translateTextNode(node: Text) {
  const current = node.nodeValue ?? "";
  const previousTranslation = lastTranslatedText.get(node);
  let original = originalText.get(node);

  if (
    original === undefined ||
    (previousTranslation !== undefined &&
      current !== previousTranslation &&
      current !== original)
  ) {
    original = current;
    originalText.set(node, original);
  }

  const translated = translateArabicUi(original);
  lastTranslatedText.set(node, translated);
  if (translated !== original && current !== translated) node.nodeValue = translated;
}

function translateElement(element: Element) {
  if (element.closest("[data-preserve-language]")) return;
  const explicitArabic = element.getAttribute("data-arabic-text");
  if (explicitArabic) {
    if (!originalElementText.has(element)) originalElementText.set(element, element.textContent ?? "");
    if (element.textContent !== explicitArabic) element.textContent = explicitArabic;
  }
  for (const name of translatedAttributes) {
    const value = element.getAttribute(name);
    if (!value) continue;
    let stored = originalAttributes.get(element);
    if (!stored) {
      stored = new Map<string, string>();
      originalAttributes.set(element, stored);
    }
    const original = stored.get(name) ?? value;
    if (!stored.has(name)) stored.set(name, original);
    const translated = translateArabicUi(original);
    if (translated !== original && value !== translated) element.setAttribute(name, translated);
  }
}

function walkAndTranslate(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) {
    if (!root.parentElement?.closest("[data-preserve-language]")) translateTextNode(root as Text);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  const element = root as Element;
  translateElement(element);
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    if (current.nodeType === Node.TEXT_NODE) {
      if (!current.parentElement?.closest("[data-preserve-language]")) translateTextNode(current as Text);
    } else translateElement(current as Element);
    current = walker.nextNode();
  }
}

export default function ArabicLocalization() {
  useEffect(() => {
    let observer: MutationObserver | undefined;
    let applying = false;
    const applyLocale = (nodes?: Node[]) => {
      if (applying) return;
      applying = true;
      if (document.documentElement.dir === "rtl") {
        if (nodes?.length) {
          nodes.forEach(walkAndTranslate);
        } else {
          walkAndTranslate(document.body);
        }
      }
      applying = false;
    };
    // A parent client component can mount before streamed route segments finish
    // hydrating. Mutating their text immediately would make React compare the
    // Arabic DOM with the English server tree. Keep the early RTL direction
    // from layout.tsx, then localize once hydration has had a chance to settle.
    const startTimer = setTimeout(() => {
      applyLocale();
      observer = new MutationObserver((mutations) => {
        if (mutations.some((mutation) => mutation.type === "attributes" && mutation.attributeName === "dir")) {
          applyLocale();
          return;
        }
        if (document.documentElement.dir !== "rtl") return;
        const added: Node[] = [];
        for (const mutation of mutations) {
          if (mutation.type === "childList") added.push(...mutation.addedNodes);
        }
        if (added.length) applyLocale(added);
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["dir"], childList: true, subtree: true });
    }, 250);
    return () => {
      if (startTimer) clearTimeout(startTimer);
      observer?.disconnect();
    };
  }, []);
  return null;
}
