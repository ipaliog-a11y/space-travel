import { useStarwake } from "./store";

/** Leave flight without a browser reload. Preview cannot F5. */
export function recoverPlay() {
  const st = useStarwake.getState();
  try {
    st.markSave();
  } catch {
    /* keep going */
  }
  st.setEntered(false);
  st.setMenuView("menu");
  st.setMode("docked");
  st.setMapOpen(false);
}
