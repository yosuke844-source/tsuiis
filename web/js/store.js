const STORAGE_KEY = "tsuiis-draft-v7";

export function yen(value) {
  const amount = Math.round(Number(value) || 0);
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function metalLabel(metal) {
  if (metal === "gold") return "ゴールド";
  if (metal === "silver") return "シルバー";
  return "";
}

export function rateFor(state, metal) {
  const rates = state.rates || {};
  return Number(metal === "gold" ? rates.gold : rates.silver) || 0;
}

export function isQuoted(product) {
  return Boolean(product && (product.priceYen != null || (product.lines && product.lines.length) || (product.parts && product.parts.length)));
}

export function partLine(part) {
  return (Number(part.qty) || 0) * (Number(part.unitYen) || 0);
}

export function libraryPart(state, id) {
  return (state.library || []).find((part) => part.id === id);
}

export function quotedLines(state, product) {
  if (product.lines) {
    return product.lines.map((line) => {
      const part = libraryPart(state, line.partId) || {};
      return {
        partId: line.partId,
        name: part.name || "",
        qty: Number(line.qty) || 0,
        unitYen: Number(part.unitYen) || 0,
        note: part.note || "",
        group: part.group || "",
      };
    });
  }
  return (product.parts || []).map((part) => ({
    name: part.name,
    qty: Number(part.qty) || 0,
    unitYen: Number(part.unitYen) || 0,
    note: part.note || "",
  }));
}

export function quotedTotal(state, product) {
  if (product.priceYen != null && !(product.lines && product.lines.length)) return Number(product.priceYen) || 0;
  return quotedLines(state, product).reduce((sum, line) => sum + partLine(line), 0);
}

export function displayPrice(state, product, optionIds) {
  if (isQuoted(product)) return quotedTotal(state, product);
  return withTax(state, lineExTax(state, product, optionIds));
}

export function baseExTax(state, product) {
  if (isQuoted(product)) return quotedTotal(state, product);
  return product.weightG * rateFor(state, product.metal) + Number(product.makingYen || 0);
}

export function optionExTax(state, product, option) {
  return Number(option.extraGrams || 0) * rateFor(state, product.metal) + Number(option.extraYen || 0);
}

export function withTax(state, amount) {
  const rate = Number(state.taxRate);
  const tax = Number.isFinite(rate) ? rate : 0.1;
  return Math.round(amount * (1 + tax));
}

export function lineExTax(state, product, optionIds) {
  const selected = new Set(optionIds || []);
  const extras = (product.options || [])
    .filter((option) => selected.has(option.id))
    .reduce((sum, option) => sum + optionExTax(state, product, option), 0);
  return baseExTax(state, product) + extras;
}

export function catalogUrl() {
  const href = window.location.href;
  const directory = href.endsWith("/") ? href : href.replace(/[^/]*$/, "");
  return new URL("../data/catalog.json", directory).href;
}

export async function loadState() {
  const response = await fetch(catalogUrl());
  if (!response.ok) throw new Error("catalog.json を読み込めませんでした");
  const seed = await response.json();
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const state = JSON.parse(saved);
      state.orderEmail = seed.orderEmail || "";
      state.logo = seed.logo || "";
      state.looks = seed.looks || [];
      return state;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  return seed;
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export async function resetState() {
  localStorage.removeItem(STORAGE_KEY);
  return loadState();
}

export function h(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  let valueAfter;
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;
    if (key === "class") node.className = value;
    else if (key === "dataset") Object.assign(node.dataset, value);
    else if (key === "value") valueAfter = value;
    else if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else node.setAttribute(key, value);
  }
  const appendChild = (child) => {
    if (child == null || child === false) return;
    if (Array.isArray(child)) {
      child.forEach(appendChild);
      return;
    }
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  };
  appendChild(children);
  if (valueAfter != null) node.value = valueAfter;
  return node;
}
