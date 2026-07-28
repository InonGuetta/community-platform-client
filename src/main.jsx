import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { store } from "./store/store";
import ErrorBoundary from "./components/features/ErrorBoundary/ErrorBoundary";
import App from "./App";

// ErrorBoundary sits outermost — above the providers — so a crash anywhere in
// the tree (including in the theme or the router) shows a recovery screen
// instead of an empty white page.
ReactDOM.createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </ErrorBoundary>
);
