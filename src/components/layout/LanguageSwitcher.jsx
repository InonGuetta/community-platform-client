import { useState } from "react";
import { useTranslation } from "react-i18next";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import TextField from "@mui/material/TextField";
import LanguageIcon from "@mui/icons-material/Language";
import { useLanguage } from "../../i18n/useLanguage";
import { useDirection, menuOrigins } from "../../i18n/useDirection";
import { useChooseLanguage } from "./useAccountLanguage";

// Where a person picks the interface's language: the bar, the drawer, the
// sign-in pages and the profile. One component, three shapes, so the list and
// what choosing does cannot differ between them.
//
// Every language is shown in ITSELF, with its own lang and dir, so someone who
// cannot read the current interface still finds their own.
//
//   variant="icon"  — a globe that opens the list (the bar, the sign-in pages)
//   variant="list"  — a row in a List that opens it (the drawer)
//   variant="field" — a select with a label (the profile)

const LanguageMenu = ({ anchor, onClose }) => {
  const { language, languages } = useLanguage();
  const { start } = useDirection();
  const choose = useChooseLanguage();
  return (
    <Menu
      anchorEl={anchor}
      open={Boolean(anchor)}
      onClose={onClose}
      {...menuOrigins(start)}
    >
      {languages.map(({ code, name, dir }) => (
        <MenuItem
          key={code}
          lang={code}
          dir={dir}
          selected={code === language}
          onClick={() => {
            onClose();
            void choose(code);
          }}
        >
          {name}
        </MenuItem>
      ))}
    </Menu>
  );
};

const IconTrigger = ({ color }) => {
  const { t } = useTranslation();
  const [anchor, setAnchor] = useState(null);
  return (
    <>
      <Tooltip title={t("language.change")}>
        <IconButton
          onClick={(e) => setAnchor(e.currentTarget)}
          aria-label={t("language.change")}
          aria-haspopup="menu"
          sx={{ color }}
        >
          <LanguageIcon />
        </IconButton>
      </Tooltip>
      <LanguageMenu anchor={anchor} onClose={() => setAnchor(null)} />
    </>
  );
};

const ListTrigger = () => {
  const { t } = useTranslation();
  const { language, languages } = useLanguage();
  const [anchor, setAnchor] = useState(null);
  const current = languages.find((l) => l.code === language);
  return (
    <ListItem disablePadding>
      <ListItemButton onClick={(e) => setAnchor(e.currentTarget)} aria-haspopup="menu">
        <ListItemIcon sx={{ minWidth: 36, color: "primary.main" }}>
          <LanguageIcon />
        </ListItemIcon>
        <ListItemText
          primary={t("language.label")}
          secondary={current?.name}
          primaryTypographyProps={{ fontWeight: 700, color: "primary.main" }}
          secondaryTypographyProps={{ lang: current?.code, dir: current?.dir }}
        />
      </ListItemButton>
      <LanguageMenu anchor={anchor} onClose={() => setAnchor(null)} />
    </ListItem>
  );
};

const FieldTrigger = () => {
  const { t } = useTranslation();
  const { language, languages } = useLanguage();
  const choose = useChooseLanguage();
  return (
    <TextField
      select
      fullWidth
      label={t("language.label")}
      value={language}
      onChange={(e) => void choose(e.target.value)}
    >
      {languages.map(({ code, name, dir }) => (
        <MenuItem key={code} value={code} lang={code} dir={dir}>
          {name}
        </MenuItem>
      ))}
    </TextField>
  );
};

const LanguageSwitcher = ({ variant = "icon", color = "primary.main" }) => {
  if (variant === "list") return <ListTrigger />;
  if (variant === "field") return <FieldTrigger />;
  return <IconTrigger color={color} />;
};

export default LanguageSwitcher;
