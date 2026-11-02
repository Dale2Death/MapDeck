import type { StyleId } from "../core/types";
import { constellation } from "./constellation";
import { gameboard } from "./gameboard";
import { journey } from "./journey";
import { spider } from "./spider";
import type { StyleDef } from "./util";
import { zoom } from "./zoom";

/**
 * All presentation styles. To add one, write a StyleDef (a layout function
 * that places slide cards, draws decor and lists camera steps) and add it here.
 */
export const STYLES: StyleDef[] = [journey, zoom, spider, constellation, gameboard];

export function getStyle(id: StyleId): StyleDef {
  return STYLES.find((s) => s.id === id) ?? journey;
}

export type { StyleDef, Layout, Step, Rect, CardPlace } from "./util";
