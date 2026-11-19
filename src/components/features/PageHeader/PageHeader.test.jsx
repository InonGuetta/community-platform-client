// @vitest-environment jsdom
import { test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import Button from "@mui/material/Button";
import { buildTheme } from "../../../theme/theme";
import PageHeader from "./PageHeader";

test("the page's one h1, with its kicker, subtitle and actions", () => {
  render(
    <ThemeProvider theme={buildTheme("light")}>
      <PageHeader kicker="12 פריטים" title="המשך צפייה" subtitle="המשך מהמקום שבו עצרתם." actions={<Button>פעולה</Button>} />
    </ThemeProvider>
  );
  expect(screen.getByRole("heading", { level: 1, name: "המשך צפייה" })).toBeInTheDocument();
  expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  expect(screen.getByText("12 פריטים")).toBeInTheDocument();
  expect(screen.getByText("המשך מהמקום שבו עצרתם.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "פעולה" })).toBeInTheDocument();
});

test("the optional parts are left out when not given", () => {
  const { container } = render(<PageHeader title="מפגשים" />);
  expect(container.querySelectorAll("p")).toHaveLength(0);
  expect(screen.queryByRole("button")).toBeNull();
});
