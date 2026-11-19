import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Link from "@mui/material/Link";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Typography from "@mui/material/Typography";
import SearchIcon from "@mui/icons-material/Search";
import DirectionalIcon from "../DirectionalIcon/DirectionalIcon";
import HomeIcon from "@mui/icons-material/Home";
import { buildTagRelations } from "../../../utilities/tagStates";
import { pathOf } from "./tagOptions";
import { useTranslation } from "react-i18next";

// Choosing where in the tree a new tag goes.
//
// ── Browsing IS choosing ────────────────────────────────────────────────────
//
// The chosen parent is the level being looked at. Clicking a tag opens it and
// makes it the parent; the breadcrumbs go back up; the top level means "a new
// main heading". There is no separate "select" step to forget — whatever the
// breadcrumbs say is what will be sent, and the caller shows it spelled out.
//
// The tree is a few hundred tags up to four levels deep, so browsing alone is
// slow for somebody who knows the name they want. Typing searches every level
// and shows each match with its path — five names occur in two branches, and
// only the path tells them apart. Picking a match jumps straight there.

const MAX_RESULTS = 30;

const TagParentPicker = ({ nodes, value = null, onChange }) => {
  const { t } = useTranslation("tags");
  const relations = useMemo(() => buildTagRelations(nodes), [nodes]);
  const [query, setQuery] = useState("");

  const current = value ?? "root";
  const children = relations.childrenOf(current);
  const trail = value == null ? [] : [...relations.ancestorsOf(value), value];

  const trimmed = query.trim();
  const matches = useMemo(() => {
    if (!trimmed) return [];
    return nodes
      .filter((node) => node.name.includes(trimmed))
      .slice(0, MAX_RESULTS)
      .map((node) => ({ node, path: pathOf(relations, node.parent_id).join(" ← ") }));
  }, [nodes, relations, trimmed]);

  const go = (id) => {
    onChange(id);
    setQuery("");
  };

  return (
    <Box>
      <TextField
        size="small"
        fullWidth
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("parent.search")}
        inputProps={{ "aria-label": t("parent.searchLabel") }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 1 }}
      />

      {!trimmed && (
        <Breadcrumbs separator="←" sx={{ mb: 0.5, fontSize: "0.85rem" }} aria-label={t("parent.trail")}>
          <Link
            component="button"
            type="button"
            underline="hover"
            onClick={() => go(null)}
            sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, fontWeight: value == null ? 700 : 400 }}
          >
            <HomeIcon sx={{ fontSize: 16 }} />
            {t("root")}
          </Link>
          {trail.map((id) => (
            <Link
              key={id}
              component="button"
              type="button"
              underline="hover"
              onClick={() => go(id)}
              sx={{ fontWeight: id === value ? 700 : 400 }}
            >
              {relations.byId.get(id)?.name}
            </Link>
          ))}
        </Breadcrumbs>
      )}

      <Box
        sx={{
          border: 1,
          borderColor: "divider",
          borderRadius: 1,
          maxHeight: 240,
          overflowY: "auto",
        }}
      >
        {trimmed ? (
          matches.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ p: 1.5 }}>
              {t("parent.noMatch")}
            </Typography>
          ) : (
            <List dense disablePadding>
              {matches.map(({ node, path }) => (
                <ListItemButton key={node.id} onClick={() => go(node.id)}>
                  <ListItemText
                    primary={node.name}
                    secondary={path || t("topLevel")}
                    sx={{ textAlign: "start" }}
                  />
                </ListItemButton>
              ))}
            </List>
          )
        ) : children.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 1.5 }}>
            {t("parent.noChildren", { name: relations.byId.get(value)?.name })}
          </Typography>
        ) : (
          <List dense disablePadding>
            {children.map((node) => {
              const below = relations.childrenOf(node.id).length;
              return (
                <ListItemButton key={node.id} onClick={() => go(node.id)}>
                  <ListItemText
                    primary={node.name}
                    secondary={below > 0 ? t("parent.below", { count: below }) : null}
                    sx={{ textAlign: "start" }}
                  />
                  {below > 0 && <DirectionalIcon toward="forward" shape="chevron" fontSize="small" color="action" />}
                </ListItemButton>
              );
            })}
          </List>
        )}
      </Box>
    </Box>
  );
};

export default TagParentPicker;
