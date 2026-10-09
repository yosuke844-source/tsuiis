#!/usr/bin/env python3
"""Build the Tsuii's draft price workbook and the matching catalog seed.

Sample weights, making charges, and option prices are placeholders for
Kaoru Mitsui to replace. Metal reference rates are a snapshot so the
workbook can be compared with the dashboard; they do not auto-update.
"""

import json
from pathlib import Path

from openpyxl import Workbook
from openpyxl.comments import Comment
from openpyxl.formatting.rule import FormulaRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.workbook.properties import CalcProperties
from openpyxl.worksheet.datavalidation import DataValidation

ROOT = Path(__file__).resolve().parents[1]
XLSX_PATH = ROOT / "Tsuiis-price-list.xlsx"
CATALOG_PATH = ROOT / "data" / "catalog.json"

# Snapshot taken 2026-09-29 from Gold-API (USD per troy ounce) and
# Frankfurter (USDJPY, rate date 2026-09-28). 1 troy oz = 31.1034768 g.
TROY_OZ_GRAMS = 31.1034768
USD_JPY = 156.88
FX_DATE = "2026-09-28"
GOLD_USD_OZ = 4130.200195
SILVER_USD_OZ = 60.736
SNAPSHOT_AS_OF = "2026-09-29"
TAX_RATE = 0.10

LINKS = [
    {"label": "Instagram", "href": "https://www.instagram.com/tsuii_s/"},
    {
        "label": "ARCANA × PEGRU",
        "href": "https://goodbase-arcana.co.jp/blogdetail?wgd=cases-27&wgdo=date-DESC,sort-ASC",
    },
    {"label": "Instagram 投稿", "href": "https://www.instagram.com/p/DLxCBecP9kQ/"},
    {
        "label": "Forty Niners",
        "href": "https://www.threads.com/@fortyniners_keepon75/post/DX76vFRD3bG/recommend-itemstyle-%E3%82%B4%E3%83%BC%E3%83%AB%E3%83%87%E3%83%B3%E3%82%A6%E3%82%A3%E3%83%BC%E3%82%AF%E3%82%82%E3%81%8A%E3%81%8A%E3%81%9A%E3%82%81-%E3%81%BE%E3%81%A0%E3%81%BE%E3%81%A0%E5%AF%92%E6%9A%96%E5%B7%AE%E3%81%82%E3%82%8B%E3%81%97%E3%82%AB%E3%83%90%E3%83%BC%E3%82%AA%E3%83%BC%E3%83%AB%E3%82%92%E7%BE%BD%E7%B9%94%E3%82%8A%E3%81%A8%E3%81%97%E3%81%A6%E3%82%AA%E3%82%B9%E3%82%B9%E3%83%A1%E3%81%9D%E3%81%97%E3%81%A6%E3%81%93%E3%81%AE%E3%82%B7%E3%83%BC%E3%82%BA%E3%83%B3%E3%81%AB%E3%81%AA%E3%82%8B%E3%81%A8%E3%82%A2%E3%82%AF%E3%82%BB%E3%82%B5%E3%83%AA/",
    },
]

PRODUCTS = [
    {
        "id": "SV-001",
        "name": "バングル「月輪」",
        "category": "バングル",
        "metal": "silver",
        "weight_g": 28,
        "making_yen": 12000,
        "note": "サンプル。インドジュエリー風の幅広バングル。",
        "options": [
            {"name": "サイズ調整", "extra_grams": 0, "extra_yen": 2500},
            {"name": "内側刻印", "extra_grams": 0, "extra_yen": 1500},
        ],
    },
    {
        "id": "SV-002",
        "name": "リング「孔雀」",
        "category": "リング",
        "metal": "silver",
        "weight_g": 8.5,
        "making_yen": 8000,
        "note": "サンプル。モチーフリング。",
        "options": [
            {"name": "石留め", "extra_grams": 0, "extra_yen": 4000},
        ],
    },
    {
        "id": "SV-003",
        "name": "ピアス「ジュムカ」",
        "category": "ピアス",
        "metal": "silver",
        "weight_g": 6,
        "making_yen": 9000,
        "note": "サンプル。ペア。鐘型のインド風ピアス。",
        "options": [
            {"name": "シリコンキャッチ", "extra_grams": 0, "extra_yen": 800},
        ],
    },
    {
        "id": "SV-004",
        "name": "ネックレス「星屑」",
        "category": "ネックレス",
        "metal": "silver",
        "weight_g": 22,
        "making_yen": 15000,
        "note": "サンプル。小粒モチーフを連ねた一本。",
        "options": [
            {"name": "アジャスター +5cm", "extra_grams": 1.2, "extra_yen": 0},
        ],
    },
    {
        "id": "GD-001",
        "name": "ペンダント「陽だまり」",
        "category": "ペンダント",
        "metal": "gold",
        "weight_g": 3.2,
        "making_yen": 18000,
        "note": "サンプル。トップのみ。チェーンはオプション。",
        "options": [
            {"name": "ゴールドチェーン 45cm", "extra_grams": 2.0, "extra_yen": 4000},
            {"name": "シルバーチェーン 45cm", "extra_grams": 0, "extra_yen": 6000},
        ],
    },
    {
        "id": "GD-002",
        "name": "リング「蓮」",
        "category": "リング",
        "metal": "gold",
        "weight_g": 4.5,
        "making_yen": 22000,
        "note": "サンプル。蓮モチーフのゴールドリング。",
        "options": [
            {"name": "サイズ直し", "extra_grams": 0, "extra_yen": 3000},
        ],
    },
    {
        "id": "CL-001",
        "name": "シルバーパーツ（ARCANA）",
        "category": "コラボ",
        "metal": "silver",
        "weight_g": 5.5,
        "making_yen": 7000,
        "note": "サンプル。ARCANAのバッグ用シルバーパーツ。",
        "options": [
            {"name": "バレル仕上げ", "extra_grams": 0, "extra_yen": 2000},
        ],
    },
    {
        "id": "CL-002",
        "name": "ゴールドチャーム（Forty Niners）",
        "category": "コラボ",
        "metal": "gold",
        "weight_g": 2,
        "making_yen": 10000,
        "note": "サンプル。Forty Ninersとのコラボチャーム。",
        "options": [
            {"name": "刻印", "extra_grams": 0, "extra_yen": 2000},
        ],
    },
]

NAVY = "1C1916"
INK = "1C1916"
WHITE = "FFFFFF"
YELLOW = "FFFF00"
BLUE = "0000FF"
GREEN = "008000"
SILVER = "E7E8EA"
GOLD = "F3E6C8"
thin = Border(
    left=Side(style="thin", color="D9D0C3"),
    right=Side(style="thin", color="D9D0C3"),
    top=Side(style="thin", color="D9D0C3"),
    bottom=Side(style="thin", color="D9D0C3"),
)
fill_navy = PatternFill("solid", fgColor=NAVY)
fill_yellow = PatternFill("solid", fgColor=YELLOW)
fill_silver = PatternFill("solid", fgColor=SILVER)
fill_gold = PatternFill("solid", fgColor=GOLD)

font_name = "Arial"
font_header = Font(name=font_name, bold=True, color=WHITE, size=11)
font_title = Font(name=font_name, bold=True, color=INK, size=16)
font_section = Font(name=font_name, bold=True, color=INK, size=12)
font_label = Font(name=font_name, size=10, color=INK)
font_input = Font(name=font_name, size=11, color=BLUE, bold=True)
font_formula = Font(name=font_name, size=11, color=INK)
font_cross = Font(name=font_name, size=11, color=GREEN)
font_small = Font(name=font_name, size=9, color="5C564E")
font_white = Font(name=font_name, size=10, color=WHITE)

center = Alignment(horizontal="center", vertical="center", wrap_text=True)
left_align = Alignment(horizontal="left", vertical="center", wrap_text=True)
right_align = Alignment(horizontal="right", vertical="center")

YEN = '¥#,##0'
YEN_DIFF = '¥#,##0;-¥#,##0;¥0'
GRAM = "0.0"
PCT = "0.0%"


def yen_per_gram(usd_per_oz: float) -> float:
    return usd_per_oz / TROY_OZ_GRAMS * USD_JPY


def metal_label(metal: str) -> str:
    return "ゴールド" if metal == "gold" else "シルバー"


def style_input(cell, fmt=None):
    cell.font = font_input
    cell.fill = fill_yellow
    cell.alignment = center
    cell.border = thin
    if fmt:
        cell.number_format = fmt


def style_formula(cell, fmt=None, cross=False):
    cell.font = font_cross if cross else font_formula
    cell.alignment = center
    cell.border = thin
    if fmt:
        cell.number_format = fmt


def style_header_row(ws, row, start, end):
    for col in range(start, end + 1):
        cell = ws.cell(row, col)
        cell.font = font_header
        cell.fill = fill_navy
        cell.alignment = center
        cell.border = thin


def set_widths(ws, widths):
    for col, width in widths.items():
        ws.column_dimensions[col].width = width


def build_catalog(silver_ref: int, gold_ref: int, silver_manual: int, gold_manual: int) -> dict:
    return {
        "brand": "Tsuii's",
        "owner": "Kaoru Mitsui",
        "draft": True,
        "taxRate": TAX_RATE,
        "rates": {"silver": silver_manual, "gold": gold_manual},
        "market": {
            "silver": silver_ref,
            "gold": gold_ref,
            "silverExact": round(yen_per_gram(SILVER_USD_OZ), 2),
            "goldExact": round(yen_per_gram(GOLD_USD_OZ), 2),
            "asOf": SNAPSHOT_AS_OF,
            "usdJpy": USD_JPY,
            "fxDate": FX_DATE,
            "goldUsdOz": GOLD_USD_OZ,
            "silverUsdOz": SILVER_USD_OZ,
            "source": "Gold-API USD/troy oz × Frankfurter USDJPY. 円/gは四捨五入。",
            "fetchedAt": None,
        },
        "links": LINKS,
        "products": [
            {
                "id": product["id"],
                "name": product["name"],
                "category": product["category"],
                "metal": product["metal"],
                "weightG": product["weight_g"],
                "makingYen": product["making_yen"],
                "note": product["note"],
                "options": [
                    {
                        "id": f"{product['id']}-{index + 1}",
                        "name": option["name"],
                        "extraGrams": option["extra_grams"],
                        "extraYen": option["extra_yen"],
                    }
                    for index, option in enumerate(product["options"])
                ],
            }
            for product in PRODUCTS
        ],
    }


def build_workbook(silver_ref: int, gold_ref: int, silver_manual: int, gold_manual: int) -> Workbook:
    wb = Workbook()
    wb.calculation = CalcProperties(calcMode="auto", fullCalcOnLoad=True)
    wb.properties.title = "Tsuii's 価格表（下書き）"
    wb.properties.creator = "Tsuii's draft"
    wb.properties.subject = "Sample price list for Kaoru Mitsui"

    write_guide(wb.active)
    write_rates(wb.create_sheet("レート"), silver_ref, gold_ref, silver_manual, gold_manual)
    product_rows = write_products(wb.create_sheet("商品"))
    write_options(wb.create_sheet("オプション"), product_rows)
    return wb


def write_guide(ws):
    ws.title = "使い方"
    ws.sheet_properties.tabColor = "9A7340"
    ws.page_setup.orientation = "landscape"
    ws.page_setup.fitToPage = True
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 1
    ws.sheet_view.showGridLines = False
    ws.oddHeader.left.text = "Tsuii's  下書き"
    ws.print_title_rows = "1:2"
    ws.page_setup.paperSize = ws.PAPERSIZE_A4
    ws.sheet_view.zoomScale = 120

    ws.merge_cells("A1:B1")
    ws["A1"] = "Tsuii's 価格表（下書き）"
    ws["A1"].font = font_title
    ws["A2"] = "Owner"
    ws["B2"] = "Kaoru Mitsui"
    ws["A3"] = "Brand"
    ws["B3"] = "Tsuii's  /  silver and gold, Indian jewelry style"
    for row in (2, 3):
        ws.cell(row, 1).font = font_label
        ws.cell(row, 2).font = Font(name=font_name, size=11, color=INK)

    lines = [
        (5, "何のための表か"),
        (6, "三井さんの商品リストです。黄色のセルだけを書き換えます。販売価格は数式が計算します。"),
        (7, "このブックの数字（重量・工賃・オプション・初期レート）はサンプルです。実商品の数字に置き換えてください。"),
        (9, "価格の式"),
        (10, "税抜価格 = 重量(g) × 手入力レート(¥/g) + 工賃"),
        (11, "税込価格 = ROUND(税抜価格 × (1 + 消費税率), 0)"),
        (12, "オプション税抜 = 追加重量(g) × その商品の地金レート + 追加固定円"),
        (13, "手入力レートを変えると、商品シートとオプションシートの価格が一緒に変わります。"),
        (15, "参照価格"),
        (16, "参照価格は比較用です。販売価格には入りません。ダッシュボードの「本日の参照価格を取得」で日々の相場を見て、必要ならここの黄色セルも更新してください。"),
        (17, f"初期の参照価格は {SNAPSHOT_AS_OF} のスナップショットです。Gold-API の USD/troy oz × Frankfurter の USDJPY（{FX_DATE}: {USD_JPY}）。1 troy oz = {TROY_OZ_GRAMS} g。円/gは四捨五入。"),
        (18, "手入力レートの初期値は、その参照価格を切りのいい数字に切り上げたサンプルです。"),
        (20, "編集してよいセル"),
        (21, "レート: 消費税率、手入力レート、参照価格。商品: 商品名・カテゴリ・地金・重量・工賃・メモ。オプション: 商品ID・名前・追加重量・追加固定円。"),
        (22, "緑の文字は他シート参照、黒い文字は数式、青い文字＋黄色は入力です。"),
        (24, "ダッシュボードと iPad メニュー"),
        (25, "同じサンプルから始まっています。画面側で保存した内容は、この Excel には自動で戻りません。店頭用は iPad メニュー、レート更新用はダッシュボードです。"),
        (27, "まだ仮に置いていること"),
        (28, "税込表示（10%）、チェーンなどオプションの課金、コラボ品の出し方。実価格として使う前に三井さんの確認が必要です。"),
    ]
    for row, text in lines:
        ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=2)
        cell = ws.cell(row, 1, text)
        if row in (5, 9, 15, 20, 24, 27):
            cell.font = font_section
        else:
            cell.font = font_label
        cell.alignment = left_align

    ws.row_dimensions[1].height = 28
    for row in range(2, 29):
        ws.row_dimensions[row].height = 18
    for row in (6, 7, 16, 17, 21, 25, 28):
        ws.row_dimensions[row].height = 36
    set_widths(ws, {"A": 28, "B": 110})
    ws.oddFooter.left.text = "Sample figures. Not a retail price list until Kaoru Mitsui replaces them."
    ws.oddFooter.right.text = "Page &P"
    ws.print_options.horizontalCentered = True
    ws.page_setup.horizontalCentered = True
    ws.sheet_view.view = "pageBreakPreview"
    ws.sheet_view.view = "normal"
    ws.page_margins.left = 0.6
    ws.page_margins.right = 0.6
    ws.page_margins.top = 0.7
    ws.page_margins.bottom = 0.6


def write_rates(ws, silver_ref, gold_ref, silver_manual, gold_manual):
    ws.sheet_properties.tabColor = "C5C7C9"
    ws.sheet_view.showGridLines = False
    ws.page_setup.orientation = "landscape"
    ws.page_setup.fitToPage = True
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 1
    ws.page_setup.paperSize = ws.PAPERSIZE_A4
    ws.page_setup.horizontalCentered = True
    ws.oddHeader.left.text = "Tsuii's  レート"
    ws.print_title_rows = "1:1"

    ws.merge_cells("A1:E1")
    ws["A1"] = "地金レート"
    ws["A1"].font = font_title
    ws["A1"].alignment = left_align

    ws.merge_cells("A2:E2")
    ws["A2"] = "黄色のセルが入力です。販売価格が使うのは「手入力レート」だけです。"
    ws["A2"].font = font_small

    ws["A4"] = "項目"
    ws["B4"] = "値"
    style_header_row(ws, 4, 1, 2)
    ws["A5"] = "消費税率"
    ws["B5"] = TAX_RATE
    style_input(ws["B5"], PCT)
    ws["A5"].font = font_label
    ws["A5"].alignment = left_align
    ws["A5"].border = thin
    ws["C5"] = "税込価格に使います。10% なら 0.10。"
    ws["C5"].font = font_small
    ws["B5"].comment = Comment(
        "入力セルです。日本の標準税率の下書きとして 10% を入れています。",
        "Tsuii's draft",
        width=240,
        height=40,
    )

    headers = ["地金", "手入力レート (¥/g)", "参照価格 (¥/g)", "差額 (¥/g)", "差額率"]
    for col, header in enumerate(headers, 1):
        ws.cell(7, col, header)
    style_header_row(ws, 7, 1, 5)

    rows = [
        (8, "シルバー", silver_manual, silver_ref),
        (9, "ゴールド", gold_manual, gold_ref),
    ]
    for row, name, manual, ref in rows:
        ws.cell(row, 1, name).font = font_label
        ws.cell(row, 1).alignment = center
        ws.cell(row, 1).border = thin
        ws.cell(row, 1).fill = fill_silver if name == "シルバー" else fill_gold
        ws.cell(row, 2, manual)
        ws.cell(row, 3, ref)
        style_input(ws.cell(row, 2), YEN)
        style_input(ws.cell(row, 3), YEN)
        ws.cell(row, 4, f"=B{row}-C{row}")
        ws.cell(row, 5, f'=IF(C{row}=0,"",D{row}/C{row})')
        style_formula(ws.cell(row, 4), YEN_DIFF)
        style_formula(ws.cell(row, 5), PCT)

    ws["B8"].comment = Comment(
        "販売価格に使うシルバーの円/gです。サンプルとして参照価格を切り上げた数字を入れています。三井さんの実レートに置き換えてください。",
        "Tsuii's draft",
        width=260,
        height=55,
    )
    ws["C8"].comment = Comment(
        f"比較用の参照価格です。{SNAPSHOT_AS_OF} 時点、Gold-API シルバー USD/oz {SILVER_USD_OZ} × USDJPY {USD_JPY} ÷ {TROY_OZ_GRAMS}g。販売価格には使いません。",
        "Tsuii's draft",
        width=280,
        height=70,
    )
    ws["B9"].comment = Comment(
        "販売価格に使うゴールドの円/gです。サンプルです。三井さんの実レートに置き換えてください。",
        "Tsuii's draft",
        width=240,
        height=48,
    )
    ws["C9"].comment = Comment(
        f"比較用の参照価格です。{SNAPSHOT_AS_OF} 時点、Gold-API ゴールド USD/oz {GOLD_USD_OZ} × USDJPY {USD_JPY} ÷ {TROY_OZ_GRAMS}g。販売価格には使いません。",
        "Tsuii's draft",
        width=280,
        height=70,
    )

    ws.merge_cells("A11:E11")
    ws["A11"] = (
        f"参照スナップショット {SNAPSHOT_AS_OF}: "
        f"ゴールド ${GOLD_USD_OZ:,.2f}/oz、シルバー ${SILVER_USD_OZ:,.3f}/oz、"
        f"USDJPY {USD_JPY}（Frankfurter {FX_DATE}）。"
        f"換算前はシルバー {yen_per_gram(SILVER_USD_OZ):,.2f} 円/g、"
        f"ゴールド {yen_per_gram(GOLD_USD_OZ):,.2f} 円/g。"
    )
    ws["A11"].font = font_small
    ws["A11"].alignment = left_align
    ws.row_dimensions[11].height = 32

    ws.merge_cells("A12:E12")
    ws["A12"] = "出典: https://api.gold-api.com/price/XAU と /XAG 、 https://api.frankfurter.app/latest?from=USD&to=JPY"
    ws["A12"].font = font_small

    set_widths(ws, {"A": 28, "B": 26, "C": 22, "D": 18, "E": 14, "F": 18})
    ws.row_dimensions[1].height = 26
    ws.row_dimensions[7].height = 30
    ws.auto_filter.ref = "A7:E9"
    ws.freeze_panes = "A8"
    ws.auto_filter.ref = "A7:E9"
    ws.oddFooter.right.text = "入力は黄色  /  販売は手入力レート"
    ws.page_margins.left = 0.6
    ws.page_margins.right = 0.6
    ws.sheet_view.zoomScale = 130

    # Highlight a large gap so a stale manual rate is easy to see.
    ws.conditional_formatting.add(
        "E8:E9",
        FormulaRule(formula=["ABS(E8)>=0.05"], fill=PatternFill("solid", fgColor="F6D6D6")),
    )


def write_products(ws) -> int:
    ws.sheet_properties.tabColor = "9A7340"
    ws.page_setup.orientation = "landscape"
    ws.page_setup.fitToPage = True
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 1
    ws.page_setup.paperSize = ws.PAPERSIZE_A4
    ws.page_setup.horizontalCentered = True
    ws.print_title_rows = "1:3"
    ws.page_setup.paperSize = ws.PAPERSIZE_A4
    ws.oddHeader.left.text = "Tsuii's  商品"
    ws.oddFooter.left.text = "税込 = ROUND(税抜 × (1 + レート!消費税率), 0)"
    ws.oddFooter.right.text = "サンプル"
    ws.page_margins.left = 0.5
    ws.page_margins.right = 0.5
    ws.sheet_view.zoomScale = 110
    ws.auto_filter.ref = "A3:K11"

    ws.merge_cells("A1:K1")
    ws["A1"] = "商品リスト"
    ws["A1"].font = font_title
    ws.merge_cells("A2:K2")
    ws["A2"] = "税抜 = 重量 × 地金レート + 工賃。地金レートは「レート」シートの手入力です。重量・工賃はサンプル。"
    ws["A2"].font = font_small

    headers = [
        "商品ID",
        "商品名",
        "カテゴリ",
        "地金",
        "重量 (g)",
        "工賃 (円)",
        "地金レート (¥/g)",
        "地金代 (円)",
        "税抜価格 (円)",
        "税込価格 (円)",
        "メモ",
    ]
    for col, header in enumerate(headers, 1):
        ws.cell(3, col, header)
    style_header_row(ws, 3, 1, len(headers))
    ws.row_dimensions[3].height = 32
    ws.freeze_panes = "A4"
    ws.auto_filter.ref = "A3:K11"

    metal_dv = DataValidation(type="list", formula1='"シルバー,ゴールド"', allow_blank=False)
    metal_dv.error = "シルバー または ゴールド を選んでください"
    metal_dv.errorTitle = "地金"
    metal_dv.add("D4:D20")
    ws.add_data_validation(metal_dv)

    category_dv = DataValidation(
        type="list",
        formula1='"リング,バングル,ネックレス,ピアス,ペンダント,コラボ"',
        allow_blank=False,
    )
    category_dv.add("C4:C20")
    ws.add_data_validation(category_dv)

    for index, product in enumerate(PRODUCTS):
        row = 4 + index
        values = [
            product["id"],
            product["name"],
            product["category"],
            metal_label(product["metal"]),
            product["weight_g"],
            product["making_yen"],
        ]
        for col, value in enumerate(values, 1):
            cell = ws.cell(row, col, value)
            cell.border = thin
            cell.alignment = center if col in (1, 3, 4, 5, 6) else left_align
            if col in (1, 2, 3, 4, 11):
                cell.font = font_input
                cell.fill = fill_yellow
            else:
                cell.font = font_input
                cell.fill = fill_yellow
        ws.cell(row, 5).number_format = GRAM
        ws.cell(row, 6).number_format = YEN
        ws.cell(row, 5).alignment = center
        ws.cell(row, 6).alignment = center

        ws.cell(row, 7, f'=IF(D{row}="ゴールド",レート!$B$9,レート!$B$8)')
        ws.cell(row, 8, f"=E{row}*G{row}")
        ws.cell(row, 9, f"=H{row}+F{row}")
        ws.cell(row, 10, f"=ROUND(I{row}*(1+レート!$B$5),0)")
        style_formula(ws.cell(row, 7), YEN, cross=True)
        style_formula(ws.cell(row, 8), YEN)
        style_formula(ws.cell(row, 9), YEN)
        style_formula(ws.cell(row, 10), YEN)
        note = ws.cell(row, 11, product["note"])
        note.font = font_input
        note.fill = fill_yellow
        note.alignment = left_align
        note.border = thin

        if product["metal"] == "gold":
            ws.cell(row, 4).fill = fill_gold
        else:
            ws.cell(row, 4).fill = fill_silver
        ws.row_dimensions[row].height = 22

    ws["E4"].comment = Comment(
        "グラム重量の入力です。サンプル値なので、実測に置き換えてください。価格はこの列と工賃と手入力レートから計算されます。",
        "Tsuii's draft",
        width=260,
        height=55,
    )
    ws["F4"].comment = Comment(
        "工賃（作り賃）の入力です。サンプルです。地金代には含まれません。",
        "Tsuii's draft",
        width=220,
        height=40,
    )

    last = 3 + len(PRODUCTS)
    ws.cell(last + 2, 9, "税込合計")
    ws.cell(last + 2, 9).font = font_label
    ws.cell(last + 2, 9).alignment = right_align
    total = ws.cell(last + 2, 10, f"=SUM(J4:J{last})")
    style_formula(total, YEN)
    ws.cell(last + 2, 11, "メニュー全点の税込合計。オプションは含みません。")
    ws.cell(last + 2, 11).font = font_small

    set_widths(
        ws,
        {
            "A": 14,
            "B": 34,
            "C": 14,
            "D": 12,
            "E": 12,
            "F": 14,
            "G": 20,
            "H": 16,
            "I": 16,
            "J": 16,
            "K": 48,
        },
    )
    ws.auto_filter.ref = f"A3:K{last}"
    return last


def write_options(ws, product_last_row: int):
    ws.sheet_properties.tabColor = "8D9094"
    ws.page_setup.orientation = "landscape"
    ws.page_setup.fitToPage = True
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 1
    ws.page_setup.paperSize = ws.PAPERSIZE_A4
    ws.page_setup.horizontalCentered = True
    ws.print_title_rows = "1:3"
    ws.oddHeader.left.text = "Tsuii's  オプション"
    ws.page_margins.left = 0.5
    ws.page_margins.right = 0.5
    ws.sheet_view.zoomScale = 120

    ws.merge_cells("A1:I1")
    ws["A1"] = "オプション（カスタム）"
    ws["A1"].font = font_title
    ws.merge_cells("A2:I2")
    ws["A2"] = "税抜 = 追加重量 × その商品の地金レート + 追加固定円。シルバーチェーンのように地金が違うものは、追加重量を 0 にして固定円で入れてください。"
    ws["A2"].font = font_small
    ws.row_dimensions[2].height = 32

    headers = [
        "商品ID",
        "商品名",
        "オプション名",
        "追加重量 (g)",
        "追加固定 (円)",
        "地金",
        "地金レート (¥/g)",
        "税抜 (円)",
        "税込 (円)",
    ]
    for col, header in enumerate(headers, 1):
        ws.cell(3, col, header)
    style_header_row(ws, 3, 1, len(headers))
    ws.freeze_panes = "A4"
    ws.row_dimensions[3].height = 32

    row = 4
    for product in PRODUCTS:
        for option in product["options"]:
            ws.cell(row, 1, product["id"])
            ws.cell(row, 3, option["name"])
            ws.cell(row, 4, option["extra_grams"])
            ws.cell(row, 5, option["extra_yen"])
            for col in (1, 3, 4, 5):
                cell = ws.cell(row, col)
                cell.font = font_input
                cell.fill = fill_yellow
                cell.border = thin
                cell.alignment = center if col in (1, 4, 5) else left_align
            ws.cell(row, 4).number_format = GRAM
            ws.cell(row, 5).number_format = YEN

            ws.cell(row, 2, f"=IF(A{row}=\"\",\"\",INDEX(商品!$B$4:$B${product_last_row},MATCH(A{row},商品!$A$4:$A${product_last_row},0)))")
            ws.cell(row, 6, f"=IF(A{row}=\"\",\"\",INDEX(商品!$D$4:$D${product_last_row},MATCH(A{row},商品!$A$4:$A${product_last_row},0)))")
            ws.cell(row, 7, f'=IF(F{row}="","",IF(F{row}="ゴールド",レート!$B$9,レート!$B$8))')
            ws.cell(row, 8, f'=IF(A{row}="","",D{row}*G{row}+E{row})')
            ws.cell(row, 9, f'=IF(A{row}="","",ROUND(H{row}*(1+レート!$B$5),0))')
            style_formula(ws.cell(row, 2), cross=True)
            ws.cell(row, 2).alignment = left_align
            style_formula(ws.cell(row, 6), cross=True)
            style_formula(ws.cell(row, 7), YEN, cross=True)
            style_formula(ws.cell(row, 8), YEN)
            style_formula(ws.cell(row, 9), YEN)
            ws.row_dimensions[row].height = 22
            row += 1

    last = row - 1
    ws.auto_filter.ref = f"A3:I{last}"
    ws["D4"].comment = Comment(
        "同じ地金を足すときだけグラムを入れます。地金が違うオプションは 0 にして、追加固定円に金額を入れてください。",
        "Tsuii's draft",
        width=260,
        height=55,
    )

    set_widths(
        ws,
        {
            "A": 14,
            "B": 34,
            "C": 28,
            "D": 16,
            "E": 16,
            "F": 12,
            "G": 20,
            "H": 14,
            "I": 14,
        },
    )
    ws.oddFooter.right.text = "カスタム項目"


def main():
    silver_exact = yen_per_gram(SILVER_USD_OZ)
    gold_exact = yen_per_gram(GOLD_USD_OZ)
    silver_ref = round(silver_exact)
    gold_ref = round(gold_exact)
    silver_manual = int((silver_ref + 9) // 10 * 10)
    gold_manual = int((gold_ref + 499) // 500 * 500)

    CATALOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    catalog = build_catalog(silver_ref, gold_ref, silver_manual, gold_manual)
    if CATALOG_PATH.exists():
        print(f"left existing catalog in place: {CATALOG_PATH}")
    else:
        CATALOG_PATH.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"wrote {CATALOG_PATH}")

    wb = build_workbook(silver_ref, gold_ref, silver_manual, gold_manual)
    wb.save(XLSX_PATH)
    print(f"wrote {XLSX_PATH}")
    print(f"silver ref {silver_ref} manual {silver_manual} exact {silver_exact:.2f}")
    print(f"gold ref {gold_ref} manual {gold_manual} exact {gold_exact:.2f}")


if __name__ == "__main__":
    main()
