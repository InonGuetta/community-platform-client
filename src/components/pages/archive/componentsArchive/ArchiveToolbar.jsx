import { useState } from "react";
import Box from "@mui/material/Box";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ClickAwayListener from "@mui/material/ClickAwayListener";
import { alpha } from "@mui/material/styles";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import { useTranslation } from "react-i18next";
import FilterChip from "../../../features/FilterChip/FilterChip";
import SearchBar from "../../../features/SearchBar/SearchBar";
import { mediaTypeLabels } from "../../../../utilities/constant";
import { ALL_TYPES, isAllTypes, isTypePressed } from "./typeSelection";
import { SORT_OPTIONS, DEFAULT_SORT } from "./sortOptions";
import { HEADER_HEIGHT } from "../../../layout/shellGeometry";
import { useDirection, menuOrigins } from "../../../../i18n/useDirection";

// The archive's toolbar (decision 1, step 4): sticky under the header, on the
// page's own colour, blurred.
//
//   * The type chips — הכל / וידאו / שמע / קריאה — the ONLY place a type is
//     chosen. A multi-select, with the rules in typeSelection.js (D-03): under
//     "הכל" only "הכל" is pressed, and each press says what it means.
//   * The search.
//   * The order, a chip opening a menu. An order never hides a card, so it is
//     not one of the filters and the panel does not hold it.
//   * "סינון", which opens the panel below (29) — dark while it is open, with
//     the number of filters it is holding.
//
// The panel (`panel`) is rendered INSIDE the sticky band, under the toolbar: a
// sibling would open where it sits in the page — off the screen, after a scroll
// (UI_UX_FIXES 1.4). While it is open, Escape and a click outside the band
// call `onDismissFilters`.
const ArchiveToolbar = ({
  selectedTypes = [],
  onToggleType,
  onPressAllTypes,
  onSearch,
  sortOrder = DEFAULT_SORT,
  onSortChange,
  filtersOpen = false,
  onToggleFilters,
  filterCount = 0,
  panel = null,
  onDismissFilters,
}) => {
  const { t } = useTranslation("archive");
  const { end } = useDirection();
  const [sortAnchor, setSortAnchor] = useState(null);
  const current = SORT_OPTIONS.find((o) => o.value === sortOrder) || SORT_OPTIONS[0];

  const chooseSort = (value) => {
    setSortAnchor(null);
    onSortChange?.(value);
  };

  return (
    <ClickAwayListener onClickAway={() => filtersOpen && onDismissFilters?.()}>
      <Box
        onKeyDown={(e) => {
          if (e.key === "Escape" && filtersOpen) onDismissFilters?.();
        }}
        sx={(theme) => ({
          position: "sticky",
          top: HEADER_HEIGHT,
          zIndex: theme.zIndex.appBar - 1,
          // Out to the page container's padding, so the blurred band spans the
          // column rather than stopping short of its edges.
          mx: { xs: -2, md: -3 },
          px: { xs: 2, md: 3 },
          pt: { xs: 1.5, md: 2 },
          bgcolor: alpha(theme.palette.background.default, 0.85),
          // Room under the open panel.
          pb: filtersOpen ? 2 : 0,
          backdropFilter: "saturate(180%) blur(20px)",
        })}
      >
        <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, alignItems: { md: "center" }, justifyContent: "space-between", gap: 1.5 }}>
          <Box
            role="group"
            aria-label={t("filter.type")}
            sx={{ display: "flex", alignItems: "center", gap: 1, overflowX: "auto", mx: { xs: -2, md: 0 }, px: { xs: 2, md: 0 }, py: 0.5 }}
          >
            <FilterChip label={t("filter.all")} selected={isAllTypes(selectedTypes)} onClick={onPressAllTypes} />
            {ALL_TYPES.map((type) => (
              <FilterChip
                key={type}
                label={mediaTypeLabels[type]}
                selected={isTypePressed(selectedTypes, type)}
                onClick={() => onToggleType(type)}
              />
            ))}
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1, md: 1.5 }, minWidth: 0 }}>
            <SearchBar
              onSearch={onSearch}
              placeholder={t("filter.search")}
              sx={{ flex: { xs: 1, md: "0 1 256px" }, minWidth: { xs: 0, sm: 0 } }}
            />
            <FilterChip
              label={current.label}
              aria-label={t("sort.button", { order: current.label })}
              aria-haspopup="menu"
              aria-expanded={Boolean(sortAnchor)}
              endIcon={<ExpandMoreRoundedIcon />}
              onClick={(e) => setSortAnchor(e.currentTarget)}
            />
            <FilterChip
              label={t("filter.toggle")}
              selected={filtersOpen}
              pressed={false}
              count={filterCount}
              aria-expanded={filtersOpen}
              aria-controls="archive-filter-panel"
              onClick={onToggleFilters}
            />
          </Box>
        </Box>
        <Box sx={{ height: "1px", bgcolor: "divider", mt: { xs: 1.5, md: 2 } }} />
        {panel}

        <Menu anchorEl={sortAnchor} open={Boolean(sortAnchor)} onClose={() => setSortAnchor(null)} {...menuOrigins(end)}>
          {SORT_OPTIONS.map((option) => (
            <MenuItem
              key={option.value}
              role="menuitemradio"
              aria-checked={option.value === current.value}
              selected={option.value === current.value}
              onClick={() => chooseSort(option.value)}
            >
              {option.label}
            </MenuItem>
          ))}
        </Menu>
      </Box>
    </ClickAwayListener>
  );
};

export default ArchiveToolbar;
