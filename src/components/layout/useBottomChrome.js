import { useSelector } from "react-redux";
import { selectNowPlayingItem } from "../../store/selectors/nowPlayingSelectors";
import { bottomChromeFor } from "./shellGeometry";

// The foot of the screen as it is now — with the bottom player open or not
// (D-145). See bottomChromeFor.
export const useBottomChrome = () => bottomChromeFor(useSelector(selectNowPlayingItem)?.media_type ?? null);
