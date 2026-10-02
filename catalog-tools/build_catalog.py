# -*- coding: utf-8 -*-
"""
APEXWOLT B2B — импортёр каталога из Excel «Матрица цен».
Читает все листы-бренды ПО ИМЕНАМ колонок (структуры разные), сливает товары
в единый каталог по категориям (бренд = бейдж), раскладывает категории по ~11
направлениям.

Режимы:
  python build_catalog.py            # DRY-RUN: только отчёт, ничего не пишет
  python build_catalog.py --report   # то же + пишет подробный отчёт в report.txt
  python build_catalog.py --write     # (позже) генерирует catalog.data.js с бэкапом

Себестоимость НИКОГДА не публикуется. Цена партнёра / средняя МП — опциональны,
пока не заполнены в Excel, показываются как «после авторизации» / «нет данных».
"""
import openpyxl, re, sys, io, os, json, html

ROOT = os.path.dirname(os.path.abspath(__file__))
DIST = os.path.normpath(os.path.join(ROOT, "..", "dist"))
# Источник: рабочий Excel клиента (шаблон с добавленными колонками).
SRC = os.path.join(ROOT, "Матрица цен (шаблон для сайта).xlsx")
# Папка, куда фото-конвейер кладёт обработанные вырезки товаров (per-product).
PRODUCT_PHOTO_DIR = os.path.join(DIST, "assets", "catalog")

# ---- нормализация заголовков -> каноническое поле -------------------------
HEADER_MAP = {
    "группа товаров": "group",
    "наименование": "name",
    "бренд": "brand",
    "ед.изм.": "unit",
    "артикул": "code",
    "себестоимость": "cost",         # ВНУТРЕННЕЕ, не публикуется
    "мрц": "price",
    "ррц": "price",
    "фото": "photo",
    "описание": "desc",
    "технические характеристики": "specs",
    "комплектация": "kit",
    "штрихкод": "barcode",
    "наличие товара": "stock_text",
    "цена партнёра": "partner",
    "цена партнера": "partner",
    "средняя цена на мп": "mp",
    "срок поставки, дней": "lead_days",
}

def norm(s):
    return re.sub(r"\s+", " ", str(s or "").strip().lower())

# ---- группа -> направление -------------------------------------------------
# ТОЧНАЯ таблица по известным группам (надёжнее фаззи-поиска). Ключи нормализованы.
_EXPLICIT = {
    # Аккумуляторный инструмент
    "Дрели-шуруповерты аккумуляторные": "Аккумуляторный инструмент",
    "Винтоверты аккумуляторные": "Аккумуляторный инструмент",
    "Гайковерты аккумуляторные": "Аккумуляторный инструмент",
    "Перфораторы аккумуляторные": "Аккумуляторный инструмент",
    "Углошлифовальные машины аккумуляторные": "Аккумуляторный инструмент",
    "Пилы сабельные аккумуляторные": "Аккумуляторный инструмент",
    "Лобзики аккумуляторные": "Аккумуляторный инструмент",
    "Реноваторы аккумуляторные": "Аккумуляторный инструмент",
    "Гвоздезабиватели аккумуляторные": "Аккумуляторный инструмент",
    "Пылесосы аккумуляторные": "Аккумуляторный инструмент",
    "Шуруповерты многофункциональные аккумуляторные": "Аккумуляторный инструмент",
    "Краскопульты аккумуляторные": "Аккумуляторный инструмент",
    "Реноваторы (многофункциональный инструмент)": "Аккумуляторный инструмент",
    # Сетевой электроинструмент
    "Углошлифовальные машины сетевые": "Сетевой электроинструмент",
    "Перфораторы сетевые": "Сетевой электроинструмент",
    "Отбойные молотки": "Сетевой электроинструмент",
    "Пилы дисковые сетевые": "Сетевой электроинструмент",
    "Лобзики сетевые": "Сетевой электроинструмент",
    "Фрезеры": "Сетевой электроинструмент",
    "Фрезеры кромочные": "Сетевой электроинструмент",
    "Граверы": "Сетевой электроинструмент",
    "Шлифовальные машины эксцентриковые": "Сетевой электроинструмент",
    "Шлифовальные машины ленточные": "Сетевой электроинструмент",
    "Шлифовальные машины для стен": "Сетевой электроинструмент",
    "Фены строительные": "Сетевой электроинструмент",
    "Дрели электрические": "Сетевой электроинструмент",
    "Рубанки электрические": "Сетевой электроинструмент",
    "Клеевые пистолеты": "Сетевой электроинструмент",
    # Строительное оборудование
    "Миксеры строительные": "Строительное оборудование",
    "Вибраторы глубинные": "Строительное оборудование",
    "Пылесосы строительные": "Строительное оборудование",
    # Тепловое оборудование
    "Тепловые пушки керамические": "Тепловое оборудование",
    "Тепловентиляторы": "Тепловое оборудование",
    "Конвекторы электрические": "Тепловое оборудование",
    # Садовая и уборочная техника
    "Снегоуборщики аккумуляторные": "Садовая и уборочная техника",
    "Воздуходувки аккумуляторные": "Садовая и уборочная техника",
    "Воздуходувки-пылесосы аккумуляторные": "Садовая и уборочная техника",
    "Пилы цепные аккумуляторные": "Садовая и уборочная техника",
    "Секаторы аккумуляторные": "Садовая и уборочная техника",
    # Сварочное / генераторы
    "Сварочные аппараты": "Сварочное оборудование",
    "Генераторы бензиновые": "Электрогенераторы",
    # Измерительный
    "Лазерные уровни": "Измерительный инструмент",
    "Уровни строительные": "Измерительный инструмент",
    "Рулетки измерительные": "Измерительный инструмент",
    # АКБ и ЗУ
    "Аккумуляторы": "АКБ и зарядные устройства",
    "Зарядные устройства": "АКБ и зарядные устройства",
    # Оснастка и расходники
    "Сверла по металлу": "Оснастка и расходники",
    "Сверла по дереву": "Оснастка и расходники",
    "Сверла перьевые по дереву": "Оснастка и расходники",
    "Сверла шнековые по дереву": "Оснастка и расходники",
    "Сверла по бетону и камню": "Оснастка и расходники",
    "Сверла по стеклу и керамике": "Оснастка и расходники",
    "Буры SDS-plus": "Оснастка и расходники",
    "Зубила SDS-plus": "Оснастка и расходники",
    "Диски пильные по дереву": "Оснастка и расходники",
    "Диски алмазные отрезные": "Оснастка и расходники",
    "Круги отрезные по металлу": "Оснастка и расходники",
    "Щетки для УШМ": "Оснастка и расходники",
    "Шлифовальная бумага": "Оснастка и расходники",
    "Биты для шуруповертов": "Оснастка и расходники",
    "Насадки торцевые для шуруповертов": "Оснастка и расходники",
    # Ручной инструмент
    "Ключи трубные": "Ручной инструмент",
    "Молотки": "Ручной инструмент",
    "Топоры": "Ручной инструмент",
    # Крепёж
    "Гвозди строительные": "Крепёж",
    "Саморезы гипсокартон-дерево": "Крепёж",
    "Саморезы гипсокартон-металл": "Крепёж",
    "Саморезы кровельные": "Крепёж",
    "Саморезы с прессшайбой": "Крепёж",
}
_EXPLICIT_NORM = {norm(k): v for k, v in _EXPLICIT.items()}

# Фаззи-резерв для НОВЫХ, ещё не встречавшихся групп (чтобы импорт не падал).
def _fallback(g):
    if g.startswith("аккумулятор") or g.startswith("зарядн"): return "АКБ и зарядные устройства"
    if any(s in g for s in ["саморез", "гвозди", "дюбель", "анкер"]): return "Крепёж"
    if any(s in g for s in ["ключ", "молот", "топор", "ножовк", "струбцин"]): return "Ручной инструмент"
    if any(s in g for s in ["сверл", "бур ", "буры", "зубил", "диск", "круг", "щетк", "щётк",
                            "бумаг", "бит", "насадк", "абразив", "коронк"]): return "Оснастка и расходники"
    if any(s in g for s in ["лазерн", "уровн", "рулетк", "нивелир", "дальномер"]): return "Измерительный инструмент"
    if "генератор" in g: return "Электрогенераторы"
    if "свароч" in g: return "Сварочное оборудование"
    if any(s in g for s in ["тепловентил", "конвектор", "пушк"]): return "Тепловое оборудование"
    if any(s in g for s in ["снегоуборщ", "воздуходувк", "секатор", "цепны", "газонокос", "триммер", "садов"]):
        return "Садовая и уборочная техника"
    if any(s in g for s in ["миксер", "вибратор"]): return "Строительное оборудование"
    if "аккумулятор" in g: return "Аккумуляторный инструмент"
    if any(s in g for s in ["сетев", "фрезер", "гравер", "шлифоваль", "рубанк", "дрел"]):
        return "Сетевой электроинструмент"
    return "Прочее"

def direction_for(group):
    g = norm(group)
    return _EXPLICIT_NORM.get(g) or _fallback(g)

# порядок направлений на сайте
DIRECTION_ORDER = [
    "Аккумуляторный инструмент", "Сетевой электроинструмент", "Строительное оборудование",
    "Тепловое оборудование", "Садовая и уборочная техника", "Сварочное оборудование",
    "Электрогенераторы", "Измерительный инструмент", "АКБ и зарядные устройства",
    "Оснастка и расходники", "Ручной инструмент", "Крепёж", "Прочее",
]

_TRANSLIT = dict(zip(
    "абвгдежзийклмнопрстуфхцчшщъыьэюяё",
    ["a","b","v","g","d","e","zh","z","i","y","k","l","m","n","o","p",
     "r","s","t","u","f","h","c","ch","sh","sch","","y","","e","yu","ya","e"]))

def slugify(s):
    out = []
    for ch in norm(s):
        if ch in _TRANSLIT: out.append(_TRANSLIT[ch])
        elif ch.isalnum(): out.append(ch)
        elif ch in " -/": out.append("-")
    slug = re.sub(r"-+", "-", "".join(out)).strip("-")
    return slug or "cat"

# ---- чтение книги ----------------------------------------------------------
def read_products(path):
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    products = []
    issues = []
    for ws in wb.worksheets:
        hdr = {}
        for c in range(1, ws.max_column + 1):
            key = HEADER_MAP.get(norm(ws.cell(row=1, column=c).value))
            if key and key not in hdr:
                hdr[key] = c
        if "name" not in hdr or "group" not in hdr:
            continue
        for r in ws.iter_rows(min_row=2, values_only=False):
            vals = {k: (r[hdr[k]-1].value if hdr[k]-1 < len(r) else None) for k in hdr}
            nonempty = [v for v in vals.values() if v not in (None, "")]
            if len(nonempty) <= 1:      # строка-разделитель направления
                continue
            if not vals.get("name") or not vals.get("group"):
                continue
            p = {k: (str(v).strip() if isinstance(v, str) else v) for k, v in vals.items()}
            p["sheet"] = ws.title
            p["brand"] = p.get("brand") or ws.title
            p["direction"] = direction_for(p["group"])
            p["category"] = p["group"]
            p["category_key"] = slugify(p["group"])
            products.append(p)
            if not p.get("price"):
                issues.append(f"{ws.title}/{p.get('code') or p.get('name')}: нет цены (МРЦ/РРЦ)")
    return products, issues

# ---- отчёт -----------------------------------------------------------------
def report(products, issues):
    o = io.StringIO()
    o.write("APEXWOLT B2B — РАСКЛАДКА КАТАЛОГА (dry-run, живой сайт не тронут)\n")
    o.write("=" * 66 + "\n")
    o.write(f"ВСЕГО ТОВАРОВ: {len(products)}\n")
    by_brand = {}
    for p in products:
        by_brand[p["brand"]] = by_brand.get(p["brand"], 0) + 1
    o.write("По брендам: " + ", ".join(f"{b}={n}" for b, n in sorted(by_brand.items())) + "\n")
    with_photo = sum(1 for p in products if p.get("photo"))
    with_partner = sum(1 for p in products if p.get("partner"))
    with_mp = sum(1 for p in products if p.get("mp"))
    o.write(f"С ссылкой на фото: {with_photo}/{len(products)}  |  "
            f"с ценой партнёра: {with_partner}  |  со средней МП: {with_mp}\n\n")

    # дерево направление -> категория (бренды: счётчики)
    dirs = {}
    for p in products:
        d = p["direction"]; c = p["category"]
        dirs.setdefault(d, {}).setdefault(c, {"total": 0, "brands": {}, "photo": 0, "key": p["category_key"]})
        node = dirs[d][c]
        node["total"] += 1
        node["brands"][p["brand"]] = node["brands"].get(p["brand"], 0) + 1
        if p.get("photo"): node["photo"] += 1

    for d in DIRECTION_ORDER:
        if d not in dirs: continue
        cats = dirs[d]
        dtotal = sum(c["total"] for c in cats.values())
        o.write(f"### {d}  —  {dtotal} тов., {len(cats)} категорий\n")
        for cname, node in sorted(cats.items(), key=lambda x: -x[1]["total"]):
            brands = ", ".join(f"{b}:{n}" for b, n in sorted(node["brands"].items()))
            photo = "фото нет" if node["photo"] == 0 else f"фото {node['photo']}/{node['total']}"
            o.write(f"    • {cname}  [{node['total']}]  ({brands})  {photo}\n")
        o.write("\n")

    if issues:
        o.write(f"ПРЕДУПРЕЖДЕНИЯ ({len(issues)}):\n")
        for i in issues[:40]:
            o.write("  ! " + i + "\n")
    return o.getvalue()

# ---- генерация данных для сайта -------------------------------------------
PLACEHOLDER_IMG = "assets/apexwolt-logo-black.png"  # заглушка-логотип для категорий без фото

# Готовые вырезки, которые уже были на сайте — возвращаем на их категории.
CATEGORY_IMAGE = {
    "dreli-shurupoverty-akkumulyatornye": "assets/catalog-drill-cutout.png",
    "gaykoverty-akkumulyatornye": "assets/category-impact-wrench-cutout-v2.png",
    "perforatory-akkumulyatornye": "assets/category-rotary-hammer-cutout-v2.png",
    "ugloshlifovalnye-mashiny-akkumulyatornye": "assets/catalog-grinder-cutout.png",
    "lobziki-akkumulyatornye": "assets/catalog-jigsaw-cutout.png",
    "ugloshlifovalnye-mashiny-setevye": "assets/catalog-grinder-cutout.png",
    "perforatory-setevye": "assets/category-rotary-hammer-cutout-v2.png",
    "lobziki-setevye": "assets/catalog-jigsaw-cutout.png",
    "feny-stroitelnye": "assets/category-heat-gun-cutout-v2.png",
    "akkumulyatory": "assets/category-battery-cutout-v2.png",
}
# Представительная картинка направления для карточек главной.
DIRECTION_IMAGE = {
    "Аккумуляторный инструмент": "assets/catalog-drill-cutout.png",
    "Сетевой электроинструмент": "assets/catalog-grinder-cutout.png",
    "АКБ и зарядные устройства": "assets/category-battery-cutout-v2.png",
}

def image_for_category(ckey):
    return CATEGORY_IMAGE.get(ckey, PLACEHOLDER_IMG)

def image_for_direction(direction):
    return DIRECTION_IMAGE.get(direction, PLACEHOLDER_IMG)

DIRECTION_DESC = {
    "Аккумуляторный инструмент": "Шуруповёрты, гайковёрты, перфораторы, УШМ, пилы и другой мобильный инструмент на аккумуляторной платформе.",
    "Сетевой электроинструмент": "Производительный сетевой инструмент для продолжительной работы: УШМ, перфораторы, пилы, фрезеры, шлифмашины.",
    "Строительное оборудование": "Миксеры, глубинные вибраторы и строительные пылесосы для площадки и отделочных работ.",
    "Тепловое оборудование": "Тепловые пушки, тепловентиляторы и конвекторы для обогрева помещений и объектов.",
    "Садовая и уборочная техника": "Аккумуляторные снегоуборщики, воздуходувки, цепные пилы и секаторы для уборки территории.",
    "Сварочное оборудование": "Сварочные аппараты MMA и MIG/MAG для мастерской, производства и работ на объекте.",
    "Электрогенераторы": "Бензиновые генераторы как автономный источник питания для объектов и выездных работ.",
    "Измерительный инструмент": "Лазерные уровни, строительные уровни и рулетки для точной разметки и контроля.",
    "АКБ и зарядные устройства": "Аккумуляторы и зарядные устройства единой платформы инструмента.",
    "Оснастка и расходники": "Свёрла, буры, диски, биты, круги и абразивы для работы с любым материалом.",
    "Ручной инструмент": "Ключи, молотки, топоры и другой ручной инструмент для монтажа и обслуживания.",
    "Крепёж": "Гвозди и саморезы для строительных, отделочных и кровельных работ.",
    "Прочее": "Дополнительные позиции каталога.",
}

def to_num(v):
    if v in (None, ""): return None
    try:
        f = float(v)
        return int(f) if f == int(f) else round(f, 2)
    except (ValueError, TypeError):
        return None

def parse_specs(v):
    if not v: return []
    return [s.strip() for s in str(v).replace("\r", "\n").split("\n") if s.strip()]

def stock_lead(p):
    st = norm(p.get("stock_text"))
    lead_days = to_num(p.get("lead_days"))
    if st.startswith("в наличии"):
        return 1, 0
    # «в пути» / прочее — нет на складе; срок = число дней, если задано, иначе None (уточняется)
    return 0, (int(lead_days) if isinstance(lead_days, (int, float)) else None)

def jss(s):
    """JS-строка в одинарных кавычках."""
    return "'" + str(s).replace("\\", "\\\\").replace("'", "\\'").replace("\n", " ") + "'"

def generate(products):
    # группировка: direction -> {key, title, categories{catkey->{title, variants[]}}}
    sections = {}
    categories = {}
    seen_ids = set()
    for p in products:
        d = p["direction"]
        dkey = slugify(d)
        ckey = p["category_key"]
        brand = p.get("brand") or ""
        code = p.get("code") or ""
        base_id = slugify(f"{brand}-{code}") or ckey
        pid = base_id; n = 2
        while pid in seen_ids:
            pid = f"{base_id}-{n}"; n += 1
        seen_ids.add(pid)
        stock, lead = stock_lead(p)
        # per-product фото (вырезка), если конвейер уже положил файл assets/catalog/{id}.png
        prod_img = ""
        if os.path.exists(os.path.join(PRODUCT_PHOTO_DIR, pid + ".png")):
            prod_img = f"assets/catalog/{pid}.png"
        variant = [
            pid, code, p.get("name") or "", stock, lead, to_num(p.get("price")),
            parse_specs(p.get("specs")), brand, to_num(p.get("partner")), to_num(p.get("mp")),
            (p.get("desc") or "").strip(), prod_img,
        ]
        categories.setdefault(ckey, {"title": p["category"], "image": image_for_category(ckey), "variants": []})
        categories[ckey]["variants"].append(variant)
        sec = sections.setdefault(dkey, {"title": d, "description": DIRECTION_DESC.get(d, ""), "categories": []})
        if ckey not in sec["categories"]:
            sec["categories"].append(ckey)

    # сериализация в JS (порядок направлений — как DIRECTION_ORDER)
    out = io.StringIO()
    out.write("/* AUTO-GENERATED build_catalog.py — НЕ редактировать вручную. */\n")
    out.write("const categoryData = {\n")
    # категории в порядке появления по направлениям
    ordered_ckeys = []
    for d in DIRECTION_ORDER:
        dkey = slugify(d)
        if dkey in sections:
            for ck in sections[dkey]["categories"]:
                if ck not in ordered_ckeys: ordered_ckeys.append(ck)
    for ck in ordered_ckeys:
        c = categories[ck]
        out.write(f"  {jss(ck)}: {{\n")
        out.write(f"    title: {jss(c['title'])},\n")
        out.write(f"    image: {jss(c['image'])},\n")
        out.write("    variants: [\n")
        for v in c["variants"]:
            specs = "[" + ", ".join(jss(s) for s in v[6]) + "]"
            price = "null" if v[5] is None else repr(v[5])
            lead = "null" if v[4] is None else str(v[4])
            partner = "null" if v[8] is None else repr(v[8])
            mp = "null" if v[9] is None else repr(v[9])
            out.write(f"      [{jss(v[0])}, {jss(v[1])}, {jss(v[2])}, {v[3]}, {lead}, {price}, {specs}, {jss(v[7])}, {partner}, {mp}, {jss(v[10])}, {jss(v[11])}],\n")
        out.write("    ]\n  },\n")
    out.write("};\n\n")
    out.write("const sectionData = {\n")
    for d in DIRECTION_ORDER:
        dkey = slugify(d)
        if dkey not in sections: continue
        s = sections[dkey]
        cats = ", ".join(jss(ck) for ck in s["categories"])
        out.write(f"  {jss(dkey)}: {{\n    title: {jss(s['title'])},\n    description: {jss(s['description'])},\n    categories: [{cats}]\n  }},\n")
    out.write("};\n")
    return out.getvalue()

def ru_plural(n, one, few, many):
    n = abs(int(n)); d = n % 10; dd = n % 100
    if d == 1 and dd != 11: return one
    if 2 <= d <= 4 and not 12 <= dd <= 14: return few
    return many

def generate_home_cards(products):
    """Разметка 12 карточек-направлений для главной (data-category-grid).
    Структура совпадает со старой: has-flyout + cc-flyout для направлений с >1 категорией,
    простая <a> для одиночных. Ключи/счётчики — из тех же данных, что и каталог."""
    secs = {}
    for p in products:
        dkey = slugify(p["direction"]); ckey = p["category_key"]
        s = secs.setdefault(dkey, {"title": p["direction"], "cats": {}, "order": []})
        c = s["cats"].setdefault(ckey, {"title": p["category"], "count": 0})
        c["count"] += 1
        if ckey not in s["order"]: s["order"].append(ckey)
    e = html.escape
    cards = []
    num = 0
    for d in DIRECTION_ORDER:
        dkey = slugify(d)
        if dkey not in secs: continue
        num += 1
        s = secs[dkey]
        nn = f"{num:02d}"
        npos = sum(c["count"] for c in s["cats"].values())
        ncat = len(s["order"])
        keywords = " ".join(s["cats"][ck]["title"].lower() for ck in s["order"])
        visual = image_for_direction(d)
        if ncat > 1:
            subs = [f'<a class="cc-sub cc-sub-all" href="catalog?section={dkey}"><span class="cc-sub-label">Все позиции направления</span><span class="cc-sub-count">{npos}</span></a>']
            for ck in s["order"]:
                c = s["cats"][ck]
                subs.append(f'<a class="cc-sub" href="catalog?category={ck}"><span class="cc-sub-label">{e(c["title"])}</span><span class="cc-sub-count">{c["count"]}</span></a>')
            meta = f'{ncat} {ru_plural(ncat,"категория","категории","категорий")} · {npos} {ru_plural(npos,"позиция","позиции","позиций")}'
            card = (
                f'<div class="category-card has-flyout" data-section="{dkey}">'
                f'<span class="category-number">{nn}</span>'
                f"<span class=\"category-visual\" style=\"background-image:url('{visual}')\"></span>"
                f'<span class="category-name">{e(s["title"])}</span>'
                f'<span class="category-meta">{meta}</span>'
                f'<span class="sr-only">{e(keywords)}</span>'
                f'<button class="category-arrow cc-toggle" type="button" aria-expanded="false" aria-label="Показать категории направления «{e(s["title"])}»">→</button>'
                f'<a class="cc-coverlink" href="catalog?section={dkey}" aria-label="{e(s["title"])} — открыть направление"></a>'
                f'<div class="cc-flyout" role="group" aria-label="{e(s["title"])} — категории">' + "".join(subs) + '</div>'
                f'</div>'
            )
        else:
            meta = f'{npos} {ru_plural(npos,"позиция","позиции","позиций")}'
            card = (
                f'<a class="category-card" href="catalog?section={dkey}">'
                f'<span class="category-number">{nn}</span>'
                f"<span class=\"category-visual\" style=\"background-image:url('{visual}')\"></span>"
                f'<span class="category-name">{e(s["title"])}</span>'
                f'<span class="category-meta">{meta}</span>'
                f'<span class="sr-only">{e(keywords)}</span>'
                f'<span class="category-arrow">→</span>'
                f'</a>'
            )
        cards.append("        " + card)
    return "\n".join(cards)

if __name__ == "__main__":
    if not os.path.exists(SRC):
        print("НЕ НАЙДЕН файл:", SRC); sys.exit(1)
    products, issues = read_products(SRC)
    txt = report(products, issues)
    open(os.path.join(ROOT, "report.txt"), "w", encoding="utf-8").write(txt)
    print(f"Товаров: {len(products)}, предупреждений(нет цены): {len(issues)}")
    if "--write" in sys.argv:
        data_js = generate(products)
        out = os.path.join(ROOT, "catalog.data.js")
        open(out, "w", encoding="utf-8").write(data_js)
        print("Сгенерировано:", out, f"({len(data_js)} символов)")
        cards = generate_home_cards(products)
        out2 = os.path.join(ROOT, "home-cards.html")
        open(out2, "w", encoding="utf-8").write(cards + "\n")
        print("Сгенерировано:", out2, f"({cards.count(chr(10))+1} строк-карточек)")
    else:
        print("Отчёт: report.txt  (для генерации данных добавь флаг --write)")
