import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Feature flag for i18n initialization
const I18N_ENABLED = import.meta.env.VITE_I18N_ENABLED === 'true';

// Conditionally initialize i18n
if (I18N_ENABLED) {
  import("./lib/i18n").catch(console.error);
}

createRoot(document.getElementById("root")!).render(<App />);
