// @vitest-environment jsdom
import { test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import Button from "@mui/material/Button";
import { buildTheme } from "../../../theme/theme";
import SectionCard from "./SectionCard";

test("a section with an h2 title, its actions and its content", () => {
  render(
    <ThemeProvider theme={buildTheme("light")}>
      <SectionCard title="שינוי סיסמה" actions={<Button>שמירה</Button>}>
        <p>תוכן</p>
      </SectionCard>
    </ThemeProvider>
  );
  expect(screen.getByRole("heading", { level: 2, name: "שינוי סיסמה" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "שמירה" })).toBeInTheDocument();
  expect(screen.getByText("תוכן").closest("section")).not.toBeNull();
});

test("without a title it is only the card, and the heading level can be set", () => {
  const { rerender } = render(<SectionCard>תוכן בלבד</SectionCard>);
  expect(screen.queryByRole("heading")).toBeNull();
  rerender(<SectionCard title="פנימי" titleComponent="h3">x</SectionCard>);
  expect(screen.getByRole("heading", { level: 3, name: "פנימי" })).toBeInTheDocument();
});
