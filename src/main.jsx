// First, before anything renders: the browser may announce that the app can be
// installed (PRD MOB-1) before React has mounted anything to hear it.
import "./utilities/installPrompt";
import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { store } from "./store/store";
import ErrorBoundary from "./components/features/ErrorBoundary/ErrorBoundary";
import App from "./App";
import { registerServiceWorker } from "./utilities/serviceWorker";

// ErrorBoundary sits outermost — above the providers — so a crash anywhere in
// the tree (including in the theme or the router) shows a recovery screen
// instead of an empty white page.
// Keeps the app itself on the device so it opens with no network (PRD MOB-2).
registerServiceWorker();

ReactDOM.createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </ErrorBoundary>
);
