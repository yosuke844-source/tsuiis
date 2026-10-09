import { displayPrice, h, isQuoted, loadState, metalLabel, optionExTax, partLine, quotedLines, withTax, yen } from "./store.js";

function categories() {
  const names = [];
  for (const product of state.products) {
    if (!names.includes(product.category)) names.push(product.category);
  }
  return ["すべて", ...names];
}
const slip = [];
const customQty = {};
let state;
let mode = "sets";
let category = "すべて";
let openId = null;
let slipOpen = false;

const app = document.querySelector("#app");

function motif(metal) {
  const stroke = metal === "gold" ? "#8d6a32" : "#5e6368";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 64 64");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", stroke);
  svg.setAttribute("stroke-width", "1.4");
  svg.innerHTML = `
    <circle cx="32" cy="32" r="18"/>
    <path d="M32 14c6 8 6 12 0 18c-6-6-6-10 0-18z"/>
    <path d="M32 50c-6-8-6-12 0-18c6 6 6 10 0 18z"/>
    <path d="M14 32c8-6 12-6 18 0c-6 6-10 6-18 0z"/>
    <path d="M50 32c-8 6-12 6-18 0c6-6 10-6 18 0z"/>
    <circle cx="32" cy="32" r="3"/>
  `;
  return svg;
}

function visibleProducts() {
  return state.products.filter((product) => category === "すべて" || product.category === category);
}

function render() {
  const groups = new Map();
  for (const product of visibleProducts()) {
    if (!groups.has(product.category)) groups.set(product.category, []);
    groups.get(product.category).push(product);
  }

  const sections = [...groups.entries()].map(([name, products]) =>
    h("section", { class: "section" }, [
      h("h3", {}, name),
      ...products.map((product) => {
        const price = displayPrice(state, product);
        const meta = isQuoted(product)
          ? product.note
          : `${metalLabel(product.metal)}  ${product.weightG}g  ·  ${product.note}`;
        return h("button", { class: "dish", onclick: () => openProduct(product.id) }, [
          productMark(product),
          h("span", {}, [
            h("p", { class: "dish-name" }, product.name),
            h("p", { class: "dish-meta" }, meta),
          ]),
          h("span", { class: "dish-price" }, [yen(price), h("small", {}, isQuoted(product) ? "見積" : "税込・オプション別")]),
        ]);
      }),
    ]),
  );

  app.replaceChildren(
    h("div", { class: "menu-shell" }, [
      h("aside", { class: "menu-side" }, [
        h("div", {}, [
          h("p", { class: "wordmark" }, ["Tsuii", h("span", {}, "’s")]),
          h("p", { class: "eyebrow" }, "MENU"),
          h("span", { class: "draft-pill" }, "下書き"),
        ]),
        h("div", { class: "mode-switch" }, [
          h("button", { type: "button", "aria-pressed": String(mode === "sets"), onclick: () => { mode = "sets"; category = "すべて"; render(); } }, "定番を見る"),
          h("button", { type: "button", "aria-pressed": String(mode === "custom"), onclick: () => { mode = "custom"; category = "すべて"; render(); } }, "パーツで組む"),
        ]),
        mode === "sets" ? h("nav", { class: "cat-list", "aria-label": "カテゴリ" }, categories().map((item) =>
          h("button", {
            type: "button",
            "aria-pressed": String(category === item),
            onclick: () => { category = item; render(); },
          }, item),
        )) : null,
        h("div", { class: "side-note" }, [
          "定番はそのまま見られます。パーツで組むと、1点ずつの金額で組み合わせを変えられます。",
          h("div", { class: "links" }, (state.links || []).map((link) =>
            h("a", { href: link.href, target: "_blank", rel: "noreferrer" }, link.label),
          )),
          h("p", {}, h("a", { href: "dashboard.html" }, "スタッフ用ダッシュボード")),
        ]),
      ]),
      h("main", { class: "menu-main" }, [
        h("header", { class: "menu-top" }, [
          h("div", {}, [
            h("h2", {}, mode === "custom" ? "パーツで組む" : "定番"),
            h("p", {}, mode === "custom"
              ? "ほしいパーツの数を変えると、合計が変わります。定番の内容からはじめることもできます。"
              : "写真がある商品は写真です。まだない商品は図案です。開くと金額が出ます。"),
          ]),
          h("button", { class: "slip-launcher", type: "button", onclick: () => { slipOpen = true; render(); } }, `ご相談メモ ${slip.length}`),
        ]),
        mode === "custom" ? customSections() : (sections.length ? sections : h("p", { class: "empty" }, "このカテゴリの商品はまだありません。")),
        mode === "custom" ? customBar() : null,
      ]),
    ]),
    openId ? productSheet(state.products.find((product) => product.id === openId)) : null,
    slipOpen ? slipSheet() : null,
  );
}

function productMark(product) {
  if (product.image) {
    return h("span", { class: "mark photo", "aria-hidden": "true" }, [
      h("img", { src: product.image, alt: "" }),
    ]);
  }
  return h("span", { class: `mark ${product.metal === "gold" ? "gold" : "silver"}`, "aria-hidden": "true" }, motif(product.metal));
}

function openProduct(id) {
  openId = id;
  productSheet.selected = [];
  render();
}

function quotedSheet(product) {
  const total = displayPrice(state, product);
  return h("div", { class: "sheet", onclick: (event) => { if (event.target === event.currentTarget) closeSheet(); } }, [
    h("div", { class: "panel", role: "dialog", "aria-modal": "true", "aria-label": product.name }, [
      h("div", { class: "panel-head" }, [
        h("p", { class: "eyebrow" }, "見積の内訳"),
        h("button", { class: "close", type: "button", onclick: closeSheet }, "閉じる"),
      ]),
      product.image ? h("img", { class: "product-photo", src: product.image, alt: product.name }) : null,
      h("h2", {}, product.name),
      h("p", { class: "fine" }, product.note),
      h("div", {}, quotedLines(state, product).map((part) =>
        h("div", { class: "option-row" }, [
          h("div", {}, [
            h("strong", {}, part.name),
            h("p", { class: "fine" }, part.note || `${part.qty} × ${yen(part.unitYen)}`),
          ]),
          h("div", { class: "num" }, yen(partLine(part))),
        ]),
      )),
      h("div", { class: "total" }, [h("span", {}, "見積"), h("span", {}, yen(total))]),
      h("div", { class: "actions" }, [
        h("button", { class: "primary", type: "button", onclick: () => addSlip(product) }, "この定番をメモする"),
        (product.lines && product.lines.length)
          ? h("button", { class: "ghost", type: "button", onclick: () => startFromSet(product) }, "この内容からはじめて調整")
          : null,
      ]),
      h("p", { class: "fine" }, "注文や会計ではありません。この画面をスタッフに見せてください。"),
    ]),
  ]);
}

function productSheet(product) {
  if (!product) return null;
  if (isQuoted(product)) return quotedSheet(product);
  const selected = new Set(productSheet.selected || []);
  const total = displayPrice(state, product, [...selected]);
  return h("div", { class: "sheet", onclick: (event) => { if (event.target === event.currentTarget) closeSheet(); } }, [
    h("div", { class: "panel", role: "dialog", "aria-modal": "true", "aria-label": product.name }, [
      h("div", { class: "panel-head" }, [
        h("p", { class: "eyebrow" }, metalLabel(product.metal)),
        h("button", { class: "close", type: "button", onclick: closeSheet }, "閉じる"),
      ]),
      h("h2", {}, product.name),
      h("p", { class: "fine" }, `${product.note} 重量 ${product.weightG}g。基本価格 ${yen(displayPrice(state, product))}（税込）。`),
      h("div", {}, (product.options || []).map((option) => {
        const pressed = selected.has(option.id);
        return h("div", { class: "option-row" }, [
          h("div", {}, [
            h("strong", {}, option.name),
            h("p", { class: "fine" }, `+ ${yen(withTax(state, optionExTax(state, product, option)))}（税込）`),
          ]),
          h("button", {
            type: "button",
            "aria-pressed": String(pressed),
            onclick: () => toggleOption(option.id),
          }, pressed ? "追加済み" : "追加"),
        ]);
      })),
      (product.options || []).length ? null : h("p", { class: "fine" }, "この商品にオプションはまだありません。"),
      h("div", { class: "total" }, [h("span", {}, "税込"), h("span", {}, yen(total))]),
      h("div", { class: "actions" }, [
        h("button", { class: "primary", type: "button", onclick: () => addSlip(product) }, "ご相談メモに入れる"),
      ]),
      h("p", { class: "fine" }, "注文や会計ではありません。この画面をスタッフに見せてください。"),
    ]),
  ]);
}
productSheet.selected = [];

function toggleOption(id) {
  const selected = new Set(productSheet.selected);
  if (selected.has(id)) selected.delete(id);
  else selected.add(id);
  productSheet.selected = [...selected];
  render();
}

function closeSheet() {
  openId = null;
  productSheet.selected = [];
  render();
}

function customGroups() {
  const names = [];
  for (const part of state.library || []) {
    if (!names.includes(part.group)) names.push(part.group);
  }
  return names;
}

function customSections() {
  return customGroups().map((group) =>
    h("section", { class: "section" }, [
      h("h3", {}, group),
      ...(state.library || []).filter((part) => part.group === group).map((part) =>
        h("div", { class: "dish" }, [
          h("span", { class: "mark silver", "aria-hidden": "true" }, motif(part.group === "金具" ? "gold" : "silver")),
          h("span", {}, [
            h("p", { class: "dish-name" }, part.name),
            h("p", { class: "dish-meta" }, `${yen(part.unitYen)} / 1点${part.note ? `  ·  ${part.note}` : ""}`),
          ]),
          h("span", { class: "stepper" }, [
            h("button", { type: "button", onclick: () => changeQty(part.id, -1), "aria-label": `${part.name}を減らす` }, "−"),
            h("span", {}, String(customQty[part.id] || 0)),
            h("button", { type: "button", onclick: () => changeQty(part.id, 1), "aria-label": `${part.name}を増やす` }, "+"),
          ]),
        ]),
      ),
    ]),
  );
}

function changeQty(id, delta) {
  customQty[id] = Math.max(0, (customQty[id] || 0) + delta);
  render();
}

function customTotal() {
  return (state.library || []).reduce((sum, part) => sum + (customQty[part.id] || 0) * part.unitYen, 0);
}

function customBar() {
  const count = Object.values(customQty).reduce((sum, qty) => sum + qty, 0);
  return h("div", { class: "custom-bar" }, [
    h("div", {}, [h("p", { class: "fine" }, `${count}点`), h("strong", {}, yen(customTotal()))]),
    h("button", { type: "button", onclick: addCustomSlip }, "この組み合わせをメモ"),
  ]);
}

function startFromSet(product) {
  for (const key of Object.keys(customQty)) delete customQty[key];
  for (const line of product.lines || []) customQty[line.partId] = line.qty;
  mode = "custom";
  openId = null;
  render();
}

function addCustomSlip() {
  const picks = (state.library || []).filter((part) => customQty[part.id] > 0);
  if (!picks.length) return;
  slip.push({
    key: `custom-${Date.now()}`,
    name: "カスタム",
    detail: picks.map((part) => `${part.name} × ${customQty[part.id]}`).join("、"),
    price: customTotal(),
  });
  slipOpen = true;
  render();
}

function addSlip(product) {
  slip.push({
    key: `${product.id}-${Date.now()}`,
    productId: product.id,
    name: product.name,
    optionIds: [...productSheet.selected],
  });
  closeSheet();
  slipOpen = true;
  render();
}

function slipSheet() {
  const lines = slip.map((line) => {
    if (!line.productId) return { line, names: line.detail ? [line.detail] : [], price: line.price };
    const product = state.products.find((item) => item.id === line.productId);
    if (!product) return null;
    const names = isQuoted(product)
      ? ["定番"]
      : (product.options || []).filter((option) => line.optionIds.includes(option.id)).map((option) => option.name);
    const price = displayPrice(state, product, line.optionIds);
    return { line, names, price };
  }).filter(Boolean);
  const total = lines.reduce((sum, line) => sum + line.price, 0);

  return h("div", { class: "slip", onclick: (event) => { if (event.target === event.currentTarget) { slipOpen = false; render(); } } }, [
    h("div", { class: "panel", role: "dialog", "aria-modal": "true", "aria-label": "ご相談メモ" }, [
      h("div", { class: "panel-head" }, [
        h("h2", {}, "ご相談メモ"),
        h("button", { class: "close", type: "button", onclick: () => { slipOpen = false; render(); } }, "閉じる"),
      ]),
      lines.length ? lines.map(({ line, names, price }) =>
        h("div", { class: "slip-line" }, [
          h("div", {}, [
            h("strong", {}, line.name),
            h("p", { class: "fine" }, names.length ? names.join("、") : "オプションなし"),
          ]),
          h("div", {}, [
            h("div", { class: "num" }, yen(price)),
            h("button", { class: "danger", type: "button", onclick: () => removeSlip(line.key) }, "削除"),
          ]),
        ]),
      ) : h("p", { class: "empty" }, "まだ何も入っていません。"),
      h("div", { class: "total" }, [h("span", {}, "合計"), h("span", {}, yen(total))]),
      h("button", { class: "ghost", type: "button", onclick: () => { slip.length = 0; render(); } }, "メモを空にする"),
      h("p", { class: "fine" }, "iPad をスタッフに渡すための控えです。決済はしません。"),
    ]),
  ]);
}

function removeSlip(key) {
  const index = slip.findIndex((line) => line.key === key);
  if (index >= 0) slip.splice(index, 1);
  render();
}

loadState().then((loaded) => {
  state = loaded;
  window.addEventListener("storage", async (event) => {
    if (event.key === "tsuiis-draft-v6") {
      state = await loadState();
      render();
    }
  });
  window.addEventListener("focus", async () => {
    state = await loadState();
    render();
  });
  render();
}).catch((error) => {
  app.textContent = error.message;
});
