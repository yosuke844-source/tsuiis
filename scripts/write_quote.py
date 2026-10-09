#!/usr/bin/env python3
"""Replace the menu catalog and add a 見積 sheet from Tsui-san's quoted parts.

Amounts are the figures from the previous conversation. Tax was not stated,
so the sheet does not add 10%.
"""

import json
from pathlib import Path

from openpyxl import load_workbook
from openpyxl.comments import Comment
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.workbook.properties import CalcProperties

ROOT = Path(__file__).resolve().parents[1]
CATALOG_PATH = ROOT / "data" / "catalog.json"
XLSX_PATH = ROOT / "Tsuiis-price-list.xlsx"

PRODUCTS = [
    {
        "id": "Q-RNG",
        "name": "フェザーリング",
        "category": "リング",
        "metal": "mixed",
        "quoted": True,
        "note": "シルバーの羽根に、小さなゴールドの星。",
        "parts": [
            ["フェザーリング", 1, 60000, ""],
        ],
        "expected": 60000,
    },
    {
        "id": "Q-NEC",
        "name": "ネックレス",
        "category": "ネックレス",
        "metal": "mixed",
        "quoted": True,
        "note": "星形ビーズ シルバーは70cm分128個。星型ビーズ ゴールドは3個。",
        "parts": [
            ["星形ビーズ シルバー", 128, 3800, "70cm分128個"],
            ["星型ビーズ ゴールド", 3, 60000, ""],
            ["星形ビーズ K18グリーン", 1, 60000, ""],
            ["丸ビーズXL", 2, 3100, ""],
            ["革紐", 1, 1500, ""],
            ["ホイール旧型星金", 1, 25000, ""],
            ["フェザーフック", 1, 15000, ""],
            ["アンティークビーズ血赤", 2, 3000, ""],
            ["7層シェブロンビーズ", 1, 50000, ""],
            ["K18ピンク先金フェザー", 1, 330000, ""],
            ["先端シルバー星付け", 1, 5000, ""],
            ["フェザー取付ホイール", 1, 15000, ""],
            ["シルバーメタル", 1, 5000, ""],
            ["丸ビーズS", 4, 2300, ""],
            ["アンティーク赤丸ビーズ", 1, 5000, ""],
            ["4層シェブロン", 1, 1000, ""],
        ],
        "expected": 1200300,
    },
    {
        "id": "Q-BRC",
        "name": "ブレス",
        "category": "ブレス",
        "metal": "mixed",
        "quoted": True,
        "note": "星ビーズ シルバー 29個。",
        "parts": [
            ["星ビーズ シルバー", 29, 3800, ""],
            ["星ビーズ K18ビーズ", 1, 60000, ""],
            ["丸ビーズL", 2, 2700, ""],
            ["ホイール旧型星金", 1, 25000, ""],
            ["フェザーフック", 1, 15000, ""],
            ["シルバーメタル", 1, 5000, ""],
            ["アンティーク血赤ビーズ", 2, 3000, ""],
            ["革紐", 1, 500, ""],
        ],
        "expected": 227100,
    },
    {
        "id": "Q-BAN",
        "name": "バンダナ コンチョ",
        "category": "バンダナ",
        "metal": "mixed",
        "quoted": True,
        "note": "コンチョ1個。",
        "parts": [
            ["コンチョ", 1, 8500, ""],
        ],
        "expected": 8500,
    },
]

thin = Border(
    left=Side(style="thin", color="D9D0C3"),
    right=Side(style="thin", color="D9D0C3"),
    top=Side(style="thin", color="D9D0C3"),
    bottom=Side(style="thin", color="D9D0C3"),
)
fill_navy = PatternFill("solid", fgColor="1C1916")
fill_yellow = PatternFill("solid", fgColor="FFFF00")
fill_paper = PatternFill("solid", fgColor="F6F1E8")
font_name = "Arial"
font_header = Font(name=font_name, bold=True, color="FFFFFF", size=11)
font_title = Font(name=font_name, bold=True, color="1C1916", size=16)
font_input = Font(name=font_name, size=11, color="0000FF", bold=True)
font_formula = Font(name=font_name, size=11, color="1C1916")
font_label = Font(name=font_name, size=10, color="1C1916")
font_small = Font(name=font_name, size=9, color="5C564E")
center = Alignment(horizontal="center", vertical="center", wrap_text=True)
left_align = Alignment(horizontal="left", vertical="center", wrap_text=True)
YEN = "¥#,##0"


def catalog_products():
    products = []
    for product in PRODUCTS:
        products.append({
            "id": product["id"],
            "name": product["name"],
            "category": product["category"],
            "metal": product["metal"],
            "quoted": True,
            "note": product["note"],
            "parts": [
                {"name": name, "qty": qty, "unitYen": unit, "note": note}
                for name, qty, unit, note in product["parts"]
            ],
        })
    return products


def write_catalog():
    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    catalog["draft"] = True
    catalog["quoteSource"] = "三井さんとの前回の会話。税の記載はないので、金額はそのまま。"
    catalog["products"] = catalog_products()
    CATALOG_PATH.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_sheet(wb):
    if "見積" in wb.sheetnames:
        del wb["見積"]
    ws = wb.create_sheet("見積", 0)
    ws.sheet_properties.tabColor = "9A7340"
    ws.sheet_view.showGridLines = False
    ws.sheet_view.zoomScale = 120
    ws.page_setup.orientation = "landscape"
    ws.page_setup.fitToPage = True
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 1
    ws.page_setup.paperSize = ws.PAPERSIZE_A4
    ws.page_setup.horizontalCentered = True
    ws.page_margins.left = 0.5
    ws.page_margins.right = 0.5
    ws.print_title_rows = "1:4"
    ws.oddHeader.left.text = "Tsuii's  見積"
    ws.freeze_panes = "A5"

    ws.merge_cells("A1:F1")
    ws["A1"] = "Tsuii's 見積（前回の会話）"
    ws["A1"].font = font_title
    ws.merge_cells("A2:F2")
    ws["A2"] = "金額は三井さんから受け取った内訳のままです。税の記載はないので、10%は足していません。黄色の数量と単価を変えると金額が変わります。"
    ws["A2"].font = font_small
    ws["A2"].alignment = left_align
    ws.row_dimensions[2].height = 32

    headers = ["区分", "項目", "数量", "単価 (円)", "金額 (円)", "メモ"]
    for col, header in enumerate(headers, 1):
        cell = ws.cell(4, col, header)
        cell.font = font_header
        cell.fill = fill_navy
        cell.alignment = center
        cell.border = thin
    ws.row_dimensions[4].height = 24

    row = 5
    total_cells = []
    for product in PRODUCTS:
        first = row
        for index, (name, qty, unit, note) in enumerate(product["parts"]):
            label = ws.cell(row, 1, product["name"] if index == 0 else "")
            label.font = font_label
            label.alignment = left_align
            label.border = thin
            item = ws.cell(row, 2, name)
            item.font = font_input
            item.fill = fill_yellow
            item.alignment = left_align
            item.border = thin
            qty_cell = ws.cell(row, 3, qty)
            unit_cell = ws.cell(row, 4, unit)
            for cell, fmt in ((qty_cell, "0"), (unit_cell, YEN)):
                cell.font = font_input
                cell.fill = fill_yellow
                cell.alignment = center
                cell.border = thin
                cell.number_format = fmt
            amount = ws.cell(row, 5, f"=C{row}*D{row}")
            amount.font = font_formula
            amount.alignment = center
            amount.border = thin
            amount.number_format = YEN
            memo = ws.cell(row, 6, note)
            memo.font = font_input
            memo.fill = fill_yellow
            memo.alignment = left_align
            memo.border = thin
            ws.row_dimensions[row].height = 20
            row += 1
        last = row - 1
        ws.cell(row, 1, "").border = thin
        sub = ws.cell(row, 2, f"{product['name']}合計")
        sub.font = Font(name=font_name, bold=True, size=11)
        sub.alignment = left_align
        sub.border = thin
        sub.fill = fill_paper
        for col in (1, 3, 4, 6):
            ws.cell(row, col).fill = fill_paper
            ws.cell(row, col).border = thin
        total = ws.cell(row, 5, f"=SUM(E{first}:E{last})")
        total.font = Font(name=font_name, bold=True, size=11)
        total.alignment = center
        total.border = thin
        total.fill = fill_paper
        total.number_format = YEN
        total_cells.append(f"E{row}")
        ws.row_dimensions[row].height = 22
        row += 2

    grand_row = row
    ws.cell(grand_row, 2, "見積合計").font = Font(name=font_name, bold=True, size=12)
    grand = ws.cell(grand_row, 5, "=" + "+".join(total_cells))
    grand.font = Font(name=font_name, bold=True, size=12)
    grand.number_format = YEN
    grand.alignment = center
    grand.border = thin
    grand.fill = fill_yellow

    ws["C5"].comment = Comment(
        "星形ビーズ シルバーは70cm分の128個です。星型ビーズ ゴールドは1個 ¥60,000、ネックレスに3個。金額は数量×単価です。",
        "Tsuii's draft",
        width=260,
        height=55,
    )
    ws["E5"].comment = Comment(
        "税は会話に書かれていないので足していません。見積合計は各区分の合計を足しています。",
        "Tsuii's draft",
        width=240,
        height=48,
    )

    widths = {"A": 22, "B": 32, "C": 12, "D": 16, "E": 16, "F": 36}
    for col, width in widths.items():
        ws.column_dimensions[col].width = width
    ws.auto_filter.ref = f"A4:F{grand_row - 2}"
    ws.oddFooter.left.text = "Quoted amounts from the previous conversation. Tax not stated."
    ws.oddFooter.right.text = "見積"


def main():
    for product in PRODUCTS:
        total = sum(qty * unit for _, qty, unit, _ in product["parts"])
        if total != product["expected"]:
            raise SystemExit(f"{product['name']} sums to {total}, expected {product['expected']}")
    write_catalog()
    wb = load_workbook(XLSX_PATH)
    wb.calculation = CalcProperties(calcMode="auto", fullCalcOnLoad=True)
    write_sheet(wb)
    wb.save(XLSX_PATH)
    print("catalog and 見積 sheet written")
    print("grand", sum(product["expected"] for product in PRODUCTS))


if __name__ == "__main__":
    main()
