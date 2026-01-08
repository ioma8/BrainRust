import { render } from "preact";
import { App } from "./app/presentation/App";
import "./index.css";

const root = document.getElementById("app");

if (root) {
  render(<App />, root);
}
