import { Component } from "react";
import { captureError } from "../../../utilities/monitoring";
import i18n from "../../../i18n/i18n";
import { directionOf } from "../../../i18n/languages";
import { COLORS, WHITE, RADIUS } from "../../../theme/tokens";

const C = COLORS.light;

// React has no hook equivalent for error boundaries — this has to stay a class.
//
// Deliberately dependency-free (no MUI, no theme, no store): it wraps the whole
// tree *including* ThemeProvider and Provider, so the fallback has to render
// even when the failure came from the providers above it.
//
// Scope: this catches errors thrown during render, in lifecycle methods, and in
// constructors below it. Errors inside event handlers, timers and async
// callbacks are NOT caught by React and keep surfacing the way they do today.

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Arial, sans-serif",
    background: C.bg,
    color: C.ink,
  },
  card: {
    maxWidth: "520px",
    width: "100%",
    background: C.paper,
    borderRadius: `${RADIUS.card}px`,
    padding: "32px",
    textAlign: "center",
    boxShadow: "0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04)",
  },
  title: { margin: "0 0 12px", fontSize: "1.5rem", fontWeight: 800 },
  text: { margin: "0 0 24px", fontSize: "0.95rem", lineHeight: 1.6, color: C.mute },
  actions: { display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" },
  button: {
    padding: "10px 24px",
    borderRadius: "8px",
    border: "none",
    background: C.accent,
    color: WHITE,
    fontSize: "0.9rem",
    fontWeight: 700,
    cursor: "pointer",
  },
  secondaryButton: {
    padding: "10px 24px",
    borderRadius: "8px",
    border: `1px solid ${C.accent}`,
    background: "transparent",
    color: C.accent,
    fontSize: "0.9rem",
    fontWeight: 700,
    cursor: "pointer",
  },
  details: {
    marginTop: "24px",
    padding: "12px",
    background: C.error.bg,
    borderRadius: "8px",
    textAlign: "start",
    direction: "ltr",
    fontFamily: "monospace",
    fontSize: "0.75rem",
    color: C.error.fg,
    whiteSpace: "pre-wrap",
    overflowX: "auto",
  },
};

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
    this.handleReload = this.handleReload.bind(this);
    this.handleGoHome = this.handleGoHome.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    // Kept as console.error on purpose: this is the one place in the client that
    // must report, whatever the log level.
    console.error("[ErrorBoundary] unhandled render error:", error, errorInfo?.componentStack);
    // And reported outside (PRD NFR-1) — a no-op in a build without a DSN.
    // The component stack names components, never data.
    captureError(error, { tags: { kind: "render-crash" }, extra: { componentStack: errorInfo?.componentStack ?? null } });
  }

  handleReload() {
    window.location.reload();
  }

  // A full navigation, not a router push: the router tree is part of what just
  // crashed, so we reload into a known-good route instead of re-rendering it.
  handleGoHome() {
    window.location.assign("/archive");
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div dir={directionOf(i18n.language)} style={styles.page}>
        <div style={styles.card}>
          <h1 style={styles.title}>{i18n.t("errorBoundary.title")}</h1>
          <p style={styles.text}>
            {i18n.t("errorBoundary.body")}
          </p>
          <div style={styles.actions}>
            <button type="button" style={styles.button} onClick={this.handleReload}>
              {i18n.t("errorBoundary.reload")}
            </button>
            <button type="button" style={styles.secondaryButton} onClick={this.handleGoHome}>
              {i18n.t("errorBoundary.toArchive")}
            </button>
          </div>
          {import.meta.env.DEV && (
            <pre style={styles.details}>{error.stack || String(error)}</pre>
          )}
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
