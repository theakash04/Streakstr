import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { initRouter } from "./router";

async function mount() {
  const router = await initRouter();

  const rootElement = document.getElementById("app")!;
  rootElement.innerHTML = "";
  const root = ReactDOM.createRoot(rootElement);
  root.render(<RouterProvider router={router} />);
}

mount();
