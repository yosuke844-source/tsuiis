import {
  baseExTax,
  displayPrice,
  h,
  isQuoted,
  loadState,
  optionExTax,
  partLine,
  quotedLines,
  quotedTotal,
  resetState,
  saveState,
  withTax,
  yen,
} from "./store.js";

let state;
const app = document.querySelector("#app");

function signedYen(value) {
  const amount = Math.round(Number(value) || 0);
  if (amount > 0) return `+${yen(amount)}`;
  return yen(amount);
}

function diffClass(manual, reference) {
  if (manual > reference) return "diff up";
  if (manual < reference) return "diff down";
  return "diff";
}

function render() {
  app.replaceChildren(
    h("div", { class: "dash-wrap" }, [
      h("header", { class: "dash-head" }, [
        h("div", {}, [
          h("p", { class: "kicker" }, "KAORU MITSUI"),
          h("h1", {}, ["Tsuii", h("em", {}, "’s")]),
          h("p", {}, "パーツの単価を変えると、定番もカスタムも同じ単価で計算されます。"),
        ]),
        h("div", { class: "actions" }, [
          h("a", { class: "ghost", href: "index.html" }, "iPadメニュー"),
          h("button", { class: "ghost", type: "button", onclick: onReset }, "サンプルに戻す"),
        ]),
      ]),
      h("section", { class: "formula" }, [
        h("p", {}, "定番 = そのセットの数量 × パーツ単価。カスタムも同じ単価です。"),
        h("p", { class: "fine" }, "単価は前回の見積から取っています。税の記載はないので足していません。"),
      ]),
      h("section", { class: "rate-grid" }, [
        rateCard("silver", "シルバー"),
        rateCard("gold", "ゴールド"),
      ]),
      h("p", { id: "status", class: "status" }, marketCaption()),
      h("div", { class: "actions" }, [
        h("button", { class: "primary", type: "button", onclick: fetchMarket }, "本日の参照価格を取得"),
        h("label", { class: "tax-field" }, [
          "消費税率（0.10 = 10%）",
          h("input", {
            type: "number",
            min: "0",
            max: "1",
            step: "0.01",
            value: state.taxRate,
            onchange: (event) => {
              state.taxRate = Number(event.target.value);
              saveState(state);
              render();
            },
          }),
        ]),
      ]),
      h("h2", {}, "パーツ単価"),
      h("div", { class: "table-wrap" }, [
        h("table", {}, [
          h("thead", {}, h("tr", {}, ["グループ", "パーツ", "1点の金額"].map((label) => h("th", {}, label)))),
          h("tbody", {}, (state.library || []).map((part) => h("tr", {}, [
            h("td", {}, part.group),
            h("td", {}, [
              h("input", {
                "aria-label": "パーツ名",
                value: part.name,
                onchange: (event) => updateLibrary(part.id, { name: event.target.value }),
              }),
              part.note ? h("p", { class: "fine" }, part.note) : null,
            ]),
            h("td", {}, h("input", {
              "aria-label": "単価",
              type: "number",
              min: "0",
              step: "100",
              value: part.unitYen,
              onchange: (event) => updateLibrary(part.id, { unitYen: Number(event.target.value) }),
            })),
          ]))),
        ]),
      ]),
      h("h2", { class: "section-title" }, "定番"),
      h("div", { class: "table-wrap" }, [
        h("table", {}, [
          h("thead", {}, h("tr", {}, ["商品", "内訳", "金額", ""].map((label) => h("th", {}, label)))),
          h("tbody", {}, state.products.map((product) => productRow(product))),
        ]),
      ]),
      h("p", { class: "total" }, ["定番の合計", yen(state.products.reduce((sum, product) => sum + displayPrice(state, product), 0))]),
      h("p", {}, h("button", { class: "ghost", type: "button", onclick: addProduct }, "商品を追加")),
    ]),
  );
}

function marketCaption() {
  const market = state.market || {};
  if (!market.source) return "参照価格はまだありません。";
  const when = market.fetchedAt || `${market.asOf || ""} のスナップショット`;
  const source = String(market.source || "").replace(/。$/, "");
  return `${source}。${when}。USDJPY ${market.usdJpy ?? "—"}（${market.fxDate || "—"}）。ゴールド $${market.goldUsdOz ?? "—"}/oz、シルバー $${market.silverUsdOz ?? "—"}/oz。`;
}

function rateCard(metal, label) {
  const manual = Number(state.rates[metal]) || 0;
  const reference = Number(state.market?.[metal]) || 0;
  const gap = manual - reference;
  const ratio = reference ? gap / reference : 0;
  return h("article", { class: `card ${metal}` }, [
    h("h2", {}, label),
    h("div", { class: "rate-row" }, [
      h("div", {}, [
        h("label", { for: `${metal}-manual` }, "手入力レート（販売に使う ¥/g）"),
        h("input", {
          id: `${metal}-manual`,
          type: "number",
          min: "0",
          step: "1",
          value: manual,
          oninput: (event) => {
            state.rates[metal] = Number(event.target.value);
            saveState(state);
            refreshPrices();
          },
        }),
      ]),
      h("div", {}, [
        h("label", { for: `${metal}-ref` }, "参照価格（比較用 ¥/g）"),
        h("input", {
          id: `${metal}-ref`,
          type: "number",
          min: "0",
          step: "1",
          value: reference,
          oninput: (event) => {
            state.market[metal] = Number(event.target.value);
            saveState(state);
            refreshPrices();
          },
        }),
      ]),
    ]),
    h("div", { class: "compare" }, [
      h("div", {}, ["差額", h("strong", { class: diffClass(manual, reference), dataset: { gap: metal } }, signedYen(gap))]),
      h("div", {}, ["差額率", h("strong", { dataset: { ratio: metal } }, `${(ratio * 100).toFixed(1)}%`)]),
    ]),
  ]);
}

function refreshPrices() {
  for (const product of state.products) {
    const cell = document.querySelector(`[data-price="${product.id}"]`);
    if (cell) cell.textContent = yen(displayPrice(state, product));
    for (const option of product.options || []) {
      const optionCell = document.querySelector(`[data-option-price="${product.id}:${option.id}"]`);
      if (optionCell) optionCell.textContent = `税込 ${yen(withTax(state, optionExTax(state, product, option)))}`;
    }
  }
  for (const metal of ["silver", "gold"]) {
    const manual = Number(state.rates[metal]) || 0;
    const reference = Number(state.market?.[metal]) || 0;
    const gap = document.querySelector(`[data-gap="${metal}"]`);
    const ratio = document.querySelector(`[data-ratio="${metal}"]`);
    if (gap) {
      gap.textContent = signedYen(manual - reference);
      gap.className = diffClass(manual, reference);
    }
    if (ratio) ratio.textContent = reference ? `${(((manual - reference) / reference) * 100).toFixed(1)}%` : "—";
  }
}

function productRow(product) {
  if (isQuoted(product)) return quotedRow(product);
  return h("tr", {}, [
    h("td", {}, [
      h("input", {
        "aria-label": "商品名",
        value: product.name,
        onchange: (event) => updateProduct(product.id, { name: event.target.value }),
      }),
      h("p", { class: "fine" }, `${product.note || ""} オプションは 名前 / 追加g / 固定円。`),
      h("div", {}, (product.options || []).map((option) => optionEditor(product, option))),
      h("button", { class: "text-button", type: "button", onclick: () => addOption(product.id) }, "オプションを追加"),
    ]),
    h("td", {}, h("select", {
      "aria-label": "カテゴリ",
      value: product.category,
      onchange: (event) => updateProduct(product.id, { category: event.target.value }),
    }, ["リング", "バングル", "ネックレス", "ピアス", "ペンダント", "コラボ"].map((category) =>
      h("option", { value: category }, category),
    ))),
    h("td", {}, h("select", {
      "aria-label": "地金",
      value: product.metal,
      onchange: (event) => updateProduct(product.id, { metal: event.target.value }),
    }, [
      h("option", { value: "silver" }, "シルバー"),
      h("option", { value: "gold" }, "ゴールド"),
    ])),
    h("td", {}, h("input", {
      "aria-label": "重量",
      type: "number",
      min: "0",
      step: "0.1",
      value: product.weightG,
      onchange: (event) => updateProduct(product.id, { weightG: Number(event.target.value) }),
    })),
    h("td", {}, h("input", {
      "aria-label": "工賃",
      type: "number",
      min: "0",
      step: "100",
      value: product.makingYen,
      onchange: (event) => updateProduct(product.id, { makingYen: Number(event.target.value) }),
    })),
    h("td", { class: "num", dataset: { price: product.id } }, yen(withTax(state, baseExTax(state, product)))),
    h("td", {}, h("button", { class: "danger", type: "button", onclick: () => removeProduct(product.id) }, "削除")),
  ]);
}

function quotedRow(product) {
  if (product.priceYen != null && !(product.lines && product.lines.length)) {
    return h("tr", {}, [
      h("td", {}, [
        h("input", {
          "aria-label": "商品名",
          value: product.name,
          onchange: (event) => updateProduct(product.id, { name: event.target.value }),
        }),
        h("p", { class: "fine" }, product.note || ""),
      ]),
      h("td", {}, h("input", {
        "aria-label": "金額",
        type: "number",
        min: "0",
        step: "100",
        value: product.priceYen,
        onchange: (event) => updateProduct(product.id, { priceYen: Number(event.target.value) }),
      })),
      h("td", { class: "num", dataset: { price: product.id } }, yen(quotedTotal(state, product))),
      h("td", {}, h("button", { class: "danger", type: "button", onclick: () => removeProduct(product.id) }, "削除")),
    ]);
  }
  return h("tr", {}, [
    h("td", {}, [
      h("input", {
        "aria-label": "商品名",
        value: product.name,
        onchange: (event) => updateProduct(product.id, { name: event.target.value }),
      }),
      h("p", { class: "fine" }, product.note || ""),
    ]),
    h("td", {}, [
      ...quotedLines(state, product).map((part, index) => h("div", { class: "option-edit" }, [
        h("span", {}, part.name),
        h("input", {
          "aria-label": "数量",
          type: "number",
          min: "0",
          step: "1",
          value: part.qty,
          onchange: (event) => updateLineQty(product.id, index, Number(event.target.value)),
        }),
        h("span", { class: "fine" }, `${yen(part.unitYen)} / 1点`),
        h("span", { class: "fine" }, yen(partLine(part))),
      ])),
    ]),
    h("td", { class: "num", dataset: { price: product.id } }, yen(quotedTotal(state, product))),
    h("td", {}, h("button", { class: "danger", type: "button", onclick: () => removeProduct(product.id) }, "削除")),
  ]);
}

function updateLibrary(id, patch) {
  const part = (state.library || []).find((item) => item.id === id);
  Object.assign(part, patch);
  saveState(state);
  render();
}

function updateLineQty(productId, index, qty) {
  const product = state.products.find((item) => item.id === productId);
  product.lines[index].qty = qty;
  saveState(state);
  render();
}

function addPart(productId) {
  const product = state.products.find((item) => item.id === productId);
  product.parts.push({ name: "新しい項目", qty: 1, unitYen: 0, note: "" });
  saveState(state);
  render();
}

function optionEditor(product, option) {
  const price = withTax(state, optionExTax(state, product, option));
  return h("div", { class: "option-edit" }, [
    h("input", {
      "aria-label": "オプション名",
      value: option.name,
      onchange: (event) => updateOption(product.id, option.id, { name: event.target.value }),
    }),
    h("input", {
      "aria-label": "追加グラム",
      type: "number",
      min: "0",
      step: "0.1",
      value: option.extraGrams,
      onchange: (event) => updateOption(product.id, option.id, { extraGrams: Number(event.target.value) }),
    }),
    h("input", {
      "aria-label": "追加固定円",
      type: "number",
      step: "100",
      value: option.extraYen,
      onchange: (event) => updateOption(product.id, option.id, { extraYen: Number(event.target.value) }),
    }),
    h("span", { class: "fine", dataset: { optionPrice: `${product.id}:${option.id}` } }, `税込 ${yen(price)}`),
    h("button", { class: "danger", type: "button", onclick: () => removeOption(product.id, option.id) }, "外す"),
  ]);
}

function updateProduct(id, patch) {
  const product = state.products.find((item) => item.id === id);
  Object.assign(product, patch);
  saveState(state);
  render();
}

function updateOption(productId, optionId, patch) {
  const product = state.products.find((item) => item.id === productId);
  const option = product.options.find((item) => item.id === optionId);
  Object.assign(option, patch);
  saveState(state);
  render();
}

function addOption(productId) {
  const product = state.products.find((item) => item.id === productId);
  product.options.push({
    id: `${productId}-opt-${Date.now()}`,
    name: "新しいオプション",
    extraGrams: 0,
    extraYen: 0,
  });
  saveState(state);
  render();
}

function removeOption(productId, optionId) {
  const product = state.products.find((item) => item.id === productId);
  product.options = product.options.filter((option) => option.id !== optionId);
  saveState(state);
  render();
}

function addProduct() {
  const id = `NEW-${String(state.products.length + 1).padStart(3, "0")}`;
  state.products.push({
    id,
    name: "新しい商品",
    category: "ネックレス",
    metal: "mixed",
    quoted: true,
    note: "",
    parts: [{ name: "新しい項目", qty: 1, unitYen: 0, note: "" }],
  });
  saveState(state);
  render();
}

function removeProduct(id) {
  state.products = state.products.filter((product) => product.id !== id);
  saveState(state);
  render();
}

async function onReset() {
  state = await resetState();
  render();
}

async function fetchMarket() {
  const status = document.querySelector("#status");
  if (status) status.textContent = "参照価格を取得しています…";
  try {
    const response = await fetch("/api/market");
    const type = response.headers.get("content-type") || "";
    if (!response.ok || !type.includes("json")) {
      throw new Error("この住所では日次の参照価格は取れません。メニューの見積金額はそのまま使えます。");
    }
    const quote = await response.json();
    state.market = {
      ...state.market,
      ...quote,
      fetchedAt: new Date().toLocaleString("ja-JP"),
    };
    saveState(state);
    render();
  } catch (error) {
    if (status) status.textContent = `参照価格を取得できませんでした。比較用の数字は手入力できます。${error.message}`;
  }
}

loadState().then((loaded) => {
  state = loaded;
  if (!state.market) state.market = {};
  render();
}).catch((error) => {
  app.textContent = error.message;
});
