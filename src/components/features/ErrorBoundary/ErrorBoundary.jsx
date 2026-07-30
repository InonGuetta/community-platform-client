import { Component } from "react";

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
    background: "#f5f7f9",
    color: "#1a4a66",
  },
  card: {
    maxWidth: "520px",
    width: "100%",
    background: "#ffffff",
    borderRadius: "12px",
    padding: "32px",
    textAlign: "center",
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
  },
  title: { margin: "0 0 12px", fontSize: "1.5rem", fontWeight: 800 },
  text: { margin: "0 0 24px", fontSize: "0.95rem", lineHeight: 1.6, color: "#4a6b7d" },
  actions: { display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" },
  button: {
    padding: "10px 24px",
    borderRadius: "8px",
    border: "none",
    background: "#1597bb",
    color: "#ffffff",
    fontSize: "0.9rem",
    fontWeight: 700,
    cursor: "pointer",
  },
  secondaryButton: {
    padding: "10px 24px",
    borderRadius: "8px",
    border: "1px solid #1597bb",
    background: "transparent",
    color: "#1597bb",
    fontSize: "0.9rem",
    fontWeight: 700,
    cursor: "pointer",
  },
  details: {
    marginTop: "24px",
    padding: "12px",
    background: "#fbeaea",
    borderRadius: "8px",
    textAlign: "left",
    direction: "ltr",
    fontFamily: "monospace",
    fontSize: "0.75rem",
    color: "#8b2f2f",
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
    // must report, and it is where a real error-reporting service would hook in.
    console.error("[ErrorBoundary] unhandled render error:", error, errorInfo?.componentStack);
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
      <div dir="rtl" style={styles.page}>
        <div style={styles.card}>
          <h1 style={styles.title}>משהו השתבש</h1>
          <p style={styles.text}>
            אירעה שגיאה בלתי צפויה בטעינת הדף. רענון הדף בדרך כלל פותר את הבעיה.
          </p>
          <div style={styles.actions}>
            <button type="button" style={styles.button} onClick={this.handleReload}>
              רענון הדף
            </button>
            <button type="button" style={styles.secondaryButton} onClick={this.handleGoHome}>
              חזרה לארכיון
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
