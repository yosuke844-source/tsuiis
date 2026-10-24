import { displayPrice, h, isQuoted, loadState, metalLabel, optionExTax, partLine, quotedLines, withTax, yen } from "./store.js?v=20261025d";

const ORDER_EMAIL = "yaoyorozu@i.softbank.jp";

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
let navOpen = false;
let orderName = "";
let orderPhone = "";
let orderInstagram = "";
let otherName = "";
let otherPrice = "";
let orderStatus = "";
let orderSending = false;

const englishName = {
  すべて: "ALL",
  リング: "RING",
  ネックレス: "NECKLACE",
  ブレス: "BRACELET",
  バンダナ: "BANDANA",
  サンプル: "SAMPLE",
  バングル: "BANGLE",
  コンチョリング: "CONCHO RING",
  ビーズ: "BEADS",
  紐: "CORD",
  金具: "METAL",
};

function coverFor(product) {
  if (product.image) return product.image;
  if (product.category === "ネックレス") return "video/stills/02-style-a.jpg";
  if (product.category === "ブレス") return "video/stills/01-necklace-b.jpg";
  if (product.category === "バンダナ") return "video/stills/04-leather.jpg";
  return "images/Feather Ring.jpg";
}

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

function go(nextMode) {
  mode = nextMode;
  category = "すべて";
  navOpen = false;
  render();
  document.getElementById("item")?.scrollIntoView({ behavior: "smooth" });
}

function render() {
  app.replaceChildren(...[
    h("header", { class: "hz-bar" }, [
      h("button", { class: "hz-logo", type: "button", onclick: () => { mode = "sets"; navOpen = false; window.scrollTo({ top: 0, behavior: "smooth" }); render(); } }, [
        state.logo
          ? h("img", { src: state.logo, alt: "Tsuii's" })
          : "Tsuii's",
      ]),
      h("button", {
        class: "hz-burger",
        type: "button",
        "aria-expanded": String(navOpen),
        "aria-label": navOpen ? "メニューを閉じる" : "メニューを開く",
        onclick: () => { navOpen = !navOpen; render(); },
      }, [h("span"), h("span"), h("span")]),
    ]),
    navOpen ? h("nav", { class: "hz-nav", "aria-label": "メニュー" }, [
      h("button", { type: "button", onclick: () => go("sets") }, "ITEM"),
      h("button", { type: "button", onclick: () => go("custom") }, "ORDER"),
      h("button", { type: "button", onclick: () => { navOpen = false; slipOpen = true; render(); } }, `MEMO${slip.length ? `  ${slip.length}` : ""}`),
    ]) : null,
    h("section", { class: "hz-hero", "aria-label": "Tsuii's" }, [
      h("p", { class: "hz-kicker" }, "SILVER AND GOLD"),
      h("h1", {}, "Tsuii's"),
      h("a", { class: "hz-down", href: "#item" }, [h("span", { "aria-hidden": "true" }), h("span", { class: "hz-sr" }, "ITEM")]),
    ]),
    h("main", { id: "item", class: "hz-main" }, mode === "custom" ? orderMain() : itemMain()),
    openId ? productSheet(state.products.find((product) => product.id === openId)) : null,
    slipOpen ? slipSheet() : null,
  ].filter(Boolean));
}

function itemMain() {
  const groups = new Map();
  for (const product of visibleProducts()) {
    if (!groups.has(product.category)) groups.set(product.category, []);
    groups.get(product.category).push(product);
  }
  let index = 0;
  const blocks = [...groups.entries()].flatMap(([name, products]) => products.map((product) => {
    const flip = index % 2 === 1;
    index += 1;
    const price = displayPrice(state, product);
    return h("article", { class: `hz-split${flip ? " is-flip" : ""}` }, [
      h("div", { class: "hz-photo" }, h("img", { src: coverFor(product), alt: "" })),
      h("div", { class: "hz-copy" }, [
        h("p", { class: "hz-en" }, englishName[name] || name),
        h("h2", {}, product.name),
        h("p", { class: "hz-ja" }, product.note || name),
        ["Q-RNG", "Q-NEC", "Q-BRC"].includes(product.id) ? null : h("p", { class: "hz-price" }, yen(price)),
        h("button", { class: "hz-more", type: "button", onclick: () => openProduct(product.id) }, "READ MORE"),
      ]),
    ]);
  }));

  return [
    h("section", { class: "hz-intro" }, [
      h("h2", {}, "INTRODUCTION"),
      h("p", { class: "hz-ja" }, "はじめに"),
      h("p", {}, "シルバーとゴールドのアクセサリーです。定番の一点を開くと内訳が出ます。パーツで組むと、数量を変えた合計が見られます。"),
      h("p", { class: "hz-en" }, "Show this screen to the staff. It is not a checkout."),
    ]),
    h("section", { class: "hz-intro" }, [
      h("h2", {}, "ITEM"),
      h("p", { class: "hz-ja" }, "定番"),
    ]),
    ...blocks,
    ...lookBlocks(index),
    siteFoot(),
  ];
}

function lookBlocks(start) {
  let index = start;
  return (state.looks || []).filter((look) => look.name !== "サンプル").map((look) => {
    const flip = index % 2 === 1;
    index += 1;
    return h("article", { class: `hz-split${flip ? " is-flip" : ""}` }, [
      h("div", { class: "hz-photo" }, h("img", { src: look.image, alt: look.name })),
      h("div", { class: "hz-copy" }, [
        h("p", { class: "hz-en" }, englishName[look.name] || look.name),
        h("h2", {}, look.name),
        look.note ? h("p", { class: "hz-ja" }, look.note) : null,
      ]),
    ]);
  });
}

function orderMain() {
  return [
    h("section", { class: "hz-intro" }, [
      h("h2", {}, "MADE TO ORDER"),
      h("p", { class: "hz-ja" }, "パーツで組む"),
      h("p", {}, "ほしいパーツの数を変えると、合計が変わります。定番の内訳からも、この画面ではじめられます。"),
    ]),
    ...customSections(),
    otherLine(),
    customBar(),
    siteFoot(),
  ];
}

function siteFoot() {
  return h("footer", { class: "hz-foot" }, [
    h("p", { class: "hz-en" }, "Tsuii's"),
    h("div", { class: "hz-foot-links" }, [
      ...(state.links || []).map((link) => h("a", { href: link.href, target: "_blank", rel: "noreferrer" }, link.label)),
      h("a", { href: "dashboard.html" }, "STAFF"),
    ]),
  ]);
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
        h("button", { class: "ghost", type: "button", onclick: () => addSlip(product) }, "この定番をメモする"),
        (product.lines && product.lines.length)
          ? h("button", { class: "ghost", type: "button", onclick: () => startFromSet(product) }, "この内容からはじめて調整")
          : null,
      ]),
      orderBox(orderFromProduct(product)),
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
    h("section", { class: "hz-order" }, [
      h("h3", {}, [
        h("span", { class: "hz-en" }, englishName[group] || group),
        h("span", { class: "hz-ja" }, group),
      ]),
      ...(state.library || []).filter((part) => part.group === group).map((part) =>
        h("div", { class: "hz-part" }, [
          h("div", {}, [
            h("p", { class: "hz-part-name" }, part.name),
            h("p", { class: "hz-ja" }, `${yen(part.unitYen)} / 1点${part.note ? `  ·  ${part.note}` : ""}`),
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

function otherAmount() {
  const amount = Math.round(Number(String(otherPrice).replace(/,/g, "")) || 0);
  return amount > 0 ? amount : 0;
}

function otherReady() {
  return Boolean(otherName.trim() || otherAmount());
}

function refreshCustomTotal() {
  const bar = document.querySelector(".custom-bar");
  if (!bar) return;
  const fine = bar.querySelector(".fine");
  const strong = bar.querySelector("strong");
  if (fine) fine.textContent = `${customCount()}点`;
  if (strong) strong.textContent = yen(customTotal());
}

function otherLine() {
  return h("section", { class: "hz-order" }, [
    h("h3", {}, [
      h("span", { class: "hz-en" }, "OTHER"),
      h("span", { class: "hz-ja" }, "その他"),
    ]),
    h("div", { class: "hz-other" }, [
      h("input", {
        class: "order-input",
        type: "text",
        placeholder: "名前",
        value: otherName,
        oninput: (event) => { otherName = event.target.value; refreshCustomTotal(); },
      }),
      h("input", {
        class: "order-input",
        type: "text",
        inputmode: "numeric",
        placeholder: "金額",
        value: otherPrice,
        oninput: (event) => { otherPrice = event.target.value; refreshCustomTotal(); },
      }),
    ]),
  ]);
}

function changeQty(id, delta) {
  customQty[id] = Math.max(0, (customQty[id] || 0) + delta);
  render();
}

function customCount() {
  const parts = Object.values(customQty).reduce((sum, qty) => sum + qty, 0);
  return parts + (otherReady() ? 1 : 0);
}

function customTotal() {
  const parts = (state.library || []).reduce((sum, part) => sum + (customQty[part.id] || 0) * part.unitYen, 0);
  return parts + (otherReady() ? otherAmount() : 0);
}

function customBar() {
  const count = customCount();
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

function orderFromProduct(product) {
  const parts = quotedLines(state, product);
  const rows = parts.length
    ? parts.map((part) => `${part.name}　${part.qty} × ${yen(part.unitYen)}　${yen(partLine(part))}`)
    : [product.note || ""];
  return {
    title: product.name,
    text: [product.name, ...rows.filter(Boolean)].join("\n"),
    total: displayPrice(state, product),
  };
}

function orderFromSlip(lines) {
  return {
    title: "ご相談メモ",
    text: lines.map(({ line, names, price }) => `${line.name}　${names.filter(Boolean).join("、")}　${yen(price)}`).join("\n"),
    total: lines.reduce((sum, line) => sum + line.price, 0),
  };
}

function orderField(label, options) {
  return h("label", { class: "order-label" }, [
    label,
    h("input", { class: "order-input", ...options }),
  ]);
}

function orderBox(order) {
  return h("div", { class: "order-box" }, [
    orderField("お名前", {
      type: "text",
      autocomplete: "name",
      value: orderName,
      oninput: (event) => { orderName = event.target.value; },
    }),
    orderField("電話番号", {
      type: "tel",
      autocomplete: "tel",
      placeholder: "Instagramがない方はこちら",
      value: orderPhone,
      oninput: (event) => { orderPhone = event.target.value; },
    }),
    orderField("Instagram（お持ちの方）", {
      type: "text",
      placeholder: "@name",
      value: orderInstagram,
      oninput: (event) => { orderInstagram = event.target.value; },
    }),
    h("button", {
      class: "primary",
      type: "button",
      disabled: orderSending ? "" : null,
      onclick: () => submitOrder(order),
    }, orderSending ? "送信しています…" : "注文する"),
    h("p", { class: "fine" }, orderStatus || "電話番号かInstagramのどちらかで送れます。お会計はこの画面では済みません。"),
  ]);
}

async function submitOrder(order, options = {}) {
  const name = orderName.trim();
  const phone = orderPhone.trim();
  const handle = orderInstagram.trim();
  if (!order.text) {
    orderStatus = "メモが空です。";
    render();
    return;
  }
  if (options.requireContact !== false && !phone && !handle) {
    orderStatus = "電話番号かInstagramを入力してください。";
    render();
    return;
  }
  const email = String(state.orderEmail || ORDER_EMAIL).trim();
  if (!email) {
    orderStatus = "送信先のメールアドレスがまだ入っていません。";
    render();
    return;
  }
  const who = [name, phone, handle].filter(Boolean).join(" ");
  orderSending = true;
  orderStatus = "送信しています…";
  render();
  try {
    const response = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(email)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        name: who || "ご相談メモ",
        お名前: name,
        電話番号: phone,
        Instagram: handle,
        内容: order.text,
        合計: yen(order.total),
        _subject: `Tsuii's 注文 ${order.title}${who ? ` ${who}` : ""}`,
        _captcha: "false",
        _template: "box",
      }),
    });
    const result = await response.json().catch(() => ({}));
    const message = String(result.message || "");
    if (/activat/i.test(message)) {
      orderStatus = `${email} に確認メールを送りました。そのメールを開くと、このあと注文が届きます。`;
      orderSending = false;
      render();
      return;
    }
    if (!response.ok || result.success === false || result.success === "false") {
      throw new Error(message || "送信できませんでした");
    }
    orderStatus = "注文を送りました。";
    orderName = "";
    orderPhone = "";
    orderInstagram = "";
  } catch (error) {
    orderStatus = `送れませんでした。${error.message}`;
  }
  orderSending = false;
  render();
}

function addCustomSlip() {
  const picks = (state.library || []).filter((part) => customQty[part.id] > 0);
  if (!picks.length && !otherReady()) return;
  const details = picks.map((part) => `${part.name} × ${customQty[part.id]}`);
  if (otherReady()) details.push(`${otherName.trim() || "その他"} ${yen(otherAmount())}`);
  slip.push({
    key: `custom-${Date.now()}`,
    name: "カスタム",
    detail: details.join("、"),
    price: customTotal(),
  });
  otherName = "";
  otherPrice = "";
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
    const quoted = quotedLines(state, product).map((part) => `${part.name} × ${part.qty}`);
    const names = isQuoted(product)
      ? (quoted.length ? quoted : [product.note || "定番"])
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
      h("div", { class: "slip-actions" }, [
        h("button", { class: "ghost", type: "button", onclick: () => { slip.length = 0; orderStatus = ""; render(); } }, "メモを空にする"),
        h("button", {
          class: "primary",
          type: "button",
          disabled: orderSending ? "" : null,
          onclick: () => submitOrder(orderFromSlip(lines), { requireContact: false }),
        }, orderSending ? "送信しています…" : "注文する"),
      ]),
      h("p", { class: "fine" }, orderStatus || "注文すると、この内容がメールで届きます。お会計はこの画面では済みません。"),
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
    if (event.key === "tsuiis-draft-v9") {
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
