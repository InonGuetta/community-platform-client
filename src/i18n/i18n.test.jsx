// @vitest-environment jsdom
import { test, expect, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { useTranslation } from "react-i18next";
import i18n, { changeLanguage, initialLanguage, startLanguage, NAMESPACES } from "./i18n";
import { useLanguage } from "./useLanguage";

beforeEach(() => localStorage.clear());

test("Hebrew is loaded from the start, and common is one of its namespaces", () => {
  expect(i18n.language).toBe("he");
  expect(NAMESPACES).toContain("common");
  expect(i18n.t("appName")).toBe("פלטפורמת הקהילה");
});

test("switching language sets <html lang dir> and remembers the choice", async () => {
  await changeLanguage("en");
  expect(document.documentElement.lang).toBe("en");
  expect(document.documentElement.dir).toBe("ltr");
  expect(localStorage.getItem("language")).toBe("en");

  await changeLanguage("yi");
  expect(document.documentElement.dir).toBe("rtl");
});

test("the tab's title follows the language", async () => {
  i18n.addResourceBundle("en", "common", { appName: "Community Platform" }, true, true);
  await changeLanguage("en");
  expect(document.title).toBe("Community Platform");
  await changeLanguage("he");
  expect(document.title).toBe("פלטפורמת הקהילה");
  i18n.removeResourceBundle("en", "common");
});

test("a key a language does not have yet falls back to Hebrew", async () => {
  await changeLanguage("fr");
  expect(i18n.t("appName")).toBe("פלטפורמת הקהילה");
});

test("an unknown language is ignored, not half-applied", async () => {
  await changeLanguage("de");
  expect(i18n.language).toBe("he");
  expect(localStorage.getItem("language")).toBeNull();
});

test("the remembered choice is the first language; then the browser's; then Hebrew", () => {
  localStorage.setItem("language", "es");
  expect(initialLanguage()).toBe("es");

  localStorage.setItem("language", "klingon");
  const languages = Object.getOwnPropertyDescriptor(Navigator.prototype, "languages");
  Object.defineProperty(navigator, "languages", { value: ["fr-FR"], configurable: true });
  try {
    expect(initialLanguage()).toBe("fr");
    Object.defineProperty(navigator, "languages", { value: ["de"], configurable: true });
    expect(initialLanguage()).toBe("he");
  } finally {
    delete navigator.languages;
    if (languages) Object.defineProperty(Navigator.prototype, "languages", languages);
  }
});

test("a guessed language at start-up is applied but not remembered", async () => {
  Object.defineProperty(navigator, "languages", { value: ["en-GB"], configurable: true });
  try {
    await startLanguage();
    expect(i18n.language).toBe("en");
    expect(localStorage.getItem("language")).toBeNull();
  } finally {
    delete navigator.languages;
  }
});

test("a component re-renders in the new language and direction", async () => {
  const Probe = () => {
    const { t } = useTranslation();
    const { language, direction } = useLanguage();
    return <p>{`${language} ${direction} ${t("appName")}`}</p>;
  };
  render(<Probe />);
  expect(screen.getByText("he rtl פלטפורמת הקהילה")).toBeInTheDocument();
  await act(() => changeLanguage("es"));
  expect(screen.getByText("es ltr פלטפורמת הקהילה")).toBeInTheDocument();
});
