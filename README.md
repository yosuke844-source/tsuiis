# Tsuii's draft

A draft price list for Kaoru Mitsui: an Excel workbook, an owner dashboard, and an iPad menu.

The 見積 sheet, the menu, and the dashboard use the parts list from the previous conversation with him. Those amounts are quantity × unit price. Tax was not stated, so it is not added. The レート sheet is still there for a later metal-rate comparison.

税抜 = 重量(g) × 手入力レート(¥/g) + 工賃  
税込 = 税抜 × (1 + 消費税率)

## Shop address

The menu stays online when this Mac is off:

https://yosuke844-source.github.io/tsuiis/

That page is public. Anyone with the link can see the quoted prices. Bookmark it on Mr. Mitsui’s iPad, then turn on Guided Access.

A price changed in the dashboard stays on that iPad. It does not change the page other people open, and it does not change the Excel file. The daily metal-rate button still needs this Mac running `python3 serve.py`.

## Open it on this Mac

```bash
cd ~/Projects/tsuiis
python3 serve.py
```

On this Mac:

- Menu: http://127.0.0.1:8765/web/
- Dashboard: http://127.0.0.1:8765/web/dashboard.html
- Excel: `Tsuiis-price-list.xlsx`

On the shop iPad, join the same Wi-Fi and open `http://<this Mac's address>:8765/web/`. Guided Access keeps the iPad on the menu.

The dashboard link sits in small type at the bottom of the menu. Prices saved in the browser stay in that browser. They do not write back into the Excel file. Both start from the same sample.

## Excel

Yellow cells with blue text are inputs. Green text reads another sheet. Black text is a formula.

The manual rate on the レート sheet drives 商品 and オプション. The reference price column does not.

Rebuild the workbook and the seed catalog from the sample list:

```bash
python3 scripts/build_workbook.py
```
