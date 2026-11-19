import TextField from "@mui/material/TextField";

// A form field in the Redesign v4 look (component 7): the label above, a
// filled grey body, a ring on focus. The look itself comes from the theme
// (D-28), so every existing TextField already has it; this wrapper is for new
// code, and only settles the one default a form wants — the full width of its
// column. Everything else is TextField's own API, label linkage included.
const AppTextField = ({ fullWidth = true, ...props }) => <TextField fullWidth={fullWidth} {...props} />;

export default AppTextField;
