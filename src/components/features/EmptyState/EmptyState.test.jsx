// @vitest-environment jsdom
import { test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material/styles";
import MicIcon from "@mui/icons-material/Mic";
import { buildTheme } from "../../../theme/theme";
import EmptyState from "./EmptyState";
import NoDataDialog from "../NoDataDialog/NoDataDialog";

const inTheme = (ui) => render(<ThemeProvider theme={buildTheme("light")}>{ui}</ThemeProvider>);

test("a title, a line of text and a primary action that works", async () => {
  const onClick = vi.fn();
  inTheme(<EmptyState icon={MicIcon} title="אין מפגשים" text="כשיתוזמן מפגש הוא יופיע כאן." action={{ label: "מפגש חדש", onClick }} />);
  expect(screen.getByRole("heading", { level: 2, name: "אין מפגשים" })).toBeInTheDocument();
  expect(screen.getByText("כשיתוזמן מפגש הוא יופיע כאן.")).toBeInTheDocument();
  expect(screen.getByTestId("MicIcon")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "מפגש חדש" }));
  expect(onClick).toHaveBeenCalledTimes(1);
});

test("no text and no action: only the title, over the default icon", () => {
  inTheme(<EmptyState title="ריק" />);
  expect(screen.queryByRole("button")).toBeNull();
  expect(screen.getByTestId("InboxIcon")).toBeInTheDocument();
});

test("NoDataDialog is an EmptyState: its message the title, its CTA only with both props (D-30)", async () => {
  const onAction = vi.fn();
  const { rerender } = inTheme(<NoDataDialog message="אין עדיין קורסים" actionLabel="קורס חדש" onAction={onAction} />);
  expect(screen.getByRole("heading", { name: "אין עדיין קורסים" })).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "קורס חדש" }));
  expect(onAction).toHaveBeenCalled();
  rerender(<NoDataDialog actionLabel="קורס חדש" />);
  expect(screen.queryByRole("button")).toBeNull();
  // Without a message, the shared "nothing to show".
  expect(screen.getByRole("heading")).not.toBeEmptyDOMElement();
});
