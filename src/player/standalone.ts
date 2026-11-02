// Entry point for exported HTML files: reads the embedded presentation and plays it.
import type { Presentation } from "../core/types";
import { Player } from "./player";

const data = document.getElementById("mapdeck-data")?.textContent;
if (data) {
  const pres = JSON.parse(data) as Presentation;
  document.title = pres.deck.title;
  const host = document.getElementById("mapdeck") ?? document.body;
  new Player(host, pres, { keyboard: true, controls: true, minimap: true });
}
