import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import { useDirection } from "../../../i18n/useDirection";

// An arrow named by what it MEANS — back or forward — rather than by the way
// it points, which depends on the language: "back" points right in Hebrew,
// where a line is read from the right, and left in English.
//
//   <DirectionalIcon toward="back" />                      a back button
//   <DirectionalIcon toward="forward" shape="chevron" />   a row that opens deeper
//
// The icon itself is chosen, rather than one mirrored with scaleX(-1), so
// what is drawn is exactly the glyph the icon set has for that side.

const SHAPES = {
  arrow: [ArrowBackIcon, ArrowForwardIcon],
  chevron: [ChevronLeftIcon, ChevronRightIcon],
  keyboardArrow: [KeyboardArrowLeftIcon, KeyboardArrowRightIcon],
};

const DirectionalIcon = ({ toward, shape = "arrow", ...props }) => {
  const { rtl } = useDirection();
  const [PointsLeft, PointsRight] = SHAPES[shape];
  // Forward is the way a line runs: leftward in rtl, rightward in ltr.
  const Icon = (toward === "forward") === rtl ? PointsLeft : PointsRight;
  return <Icon data-toward={toward} {...props} />;
};

export default DirectionalIcon;
