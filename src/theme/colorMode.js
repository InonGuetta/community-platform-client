import { createContext } from "react";

// Lets any component read the current color mode and flip it (the navbar toggle).
// Default is a no-op so a component rendered outside the provider still works.
export const ColorModeContext = createContext({ mode: "light", toggle: () => {} });
