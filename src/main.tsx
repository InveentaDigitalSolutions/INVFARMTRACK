import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { BUILD_TARGET } from "./services/tableMap";
import { configureTextBuilder } from "troika-three-text";

// The Power Apps player sets worker-src 'none', so troika's default of
// building text in a blob Worker is blocked and the 3D scene fails to draw.
// Running the text builder on the main thread costs a little jank on first
// render and works inside the player.
configureTextBuilder({ useWorker: false });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Says which store this bundle talks to, so an empty nursery can be told
// apart from a nursery with no records in it.
console.info(`[build] ${BUILD_TARGET}`);
