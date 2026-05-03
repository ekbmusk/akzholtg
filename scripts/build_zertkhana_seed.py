"""Convert the Zertkhanalyk_Zhumystar/ markdown lab projects into Lesson seed
entries and copy their cover PNGs into backend/uploads/lesson-images/.

Run from the project root:
    python3 scripts/build_zertkhana_seed.py

The script is idempotent: existing lessons in backend/seeds/lessons.json are
preserved and lab entries are deduped by title_kk.
"""
from __future__ import annotations

import json
import re
import shutil
from pathlib import Path
from typing import Optional

ROOT = Path(__file__).resolve().parent.parent
LABS_DIR = ROOT / "Zertkhanalyk_Zhumystar"
SEED_PATH = ROOT / "backend" / "seeds" / "lessons.json"
# Lab covers ship inside the repo so the Docker image carries them; backend
# copies them into UPLOAD_DIR/lesson-images on first boot.
LAB_IMAGE_DIR = ROOT / "backend" / "seeds" / "lab-images"


GRADE_TO_AGE = {
    7: ("12-13", "easy"),
    8: ("13-14", "easy"),
    9: ("14-15", "medium"),
    10: ("15-16", "medium"),
    11: ("16-17", "hard"),
}


# Hand-written previews shown on the student-facing landing screen before
# the wizard starts. Each text follows the format "what you'll do, what
# you'll measure / build, what you'll learn", written in second-person
# Kazakh. Keys match the source folder names under Zertkhanalyk_Zhumystar/.
LAB_OVERVIEWS: dict[str, str] = {
    "01_Shanghy_nemese_konki": (
        "Бұл сабақта сен ауыр кірпішті әр түрлі қырымен ұнға қойып, із "
        "тереңдігі арқылы қысым мен тірек ауданының арасындағы байланысты "
        "тікелей өзің өлшейсің. PhET симуляторында p = F/S заңдылығын "
        "графикалық тексеріп, неліктен шаңғы киген адам қарға батпайтынын "
        "физикалық тілмен түсіндіретін боласың."
    ),
    "02_Electr_energiyasy_alemine_sayakhat": (
        "Бұл сабақта сен қарапайым тізбек құрап, кернеу мен ток күшінің "
        "өзара байланысын вольтметр-амперметр көмегімен өлшейсің. 5–6 нүкте "
        "бойынша I–U графигін салып, Ом заңының (I = U/R) сызықтық сипатын "
        "өз қолыңмен дәлелдейтін боласың."
    ),
    "03_Qaraitan_ainek_aleminde": (
        "Бұл сабақта сен жазық айнаға лазер немесе шамшырақ түсіріп, түсу "
        "және шағылу бұрыштарын транспортирмен өлшейсің. 30°, 45° және 60° "
        "бұрыштарда тәжірибе жасап, шағылу заңының — түсу бұрышы шағылу "
        "бұрышына тең — тұрақтылығын кестеде көрсететін боласың."
    ),
    "04_Optikalyq_aspaptar": (
        "Бұл сабақта сен жинағыш және шашыратқыш линзаларды біріктіріп, өз "
        "қолыңмен қарапайым перископ, кубиндік камера немесе телескоп моделін "
        "құрастырасың. Әр құрылғының оптикалық сұлбасын сызып, тұрмыста қай "
        "құралдарда қандай линзалар қолданылатынын талдайсың."
    ),
    "05_Plastikalyq_qubyrdy_qalai_eritu": (
        "Бұл сабақта сен әр түрлі пластиктің (PET, PE, PVC) кесіндісін ыстық "
        "суда қыздырып, олардың балқу температурасын термометрмен өлшейсің. "
        "Алынған деректерді кестеге салып, неге қайта өңдеу зауыттарында "
        "температура реттегіші ең маңызды параметр екенін түсіндіретін боласың."
    ),
    "06_Zhylydy_saqtaimyz": (
        "Бұл сабақта сен ыстық суы бар екі ыдысты әр түрлі материалдармен "
        "(минвата, пенопласт, мата, ауа қабаты) орап, олардың салқындау "
        "жылдамдығын 5 минут сайын өлшейсің. T мен t тәуелділігін графикке "
        "салып, ең тиімді жылу оқшаулағышты тауып, оны үй құрылысында қалай "
        "пайдалану керектігін талдайсың."
    ),
    "07_Tepe_tendikte": (
        "Бұл сабақта сен иінтіректің екі жағына әр түрлі салмақтар іліп, "
        "тепе-теңдік сақталу үшін иық пен күштің көбейтіндісі тең болуы "
        "керек екенін (F₁·L₁ = F₂·L₂) тікелей тексересің. 5–6 түрлі "
        "комбинацияны өлшеп, иінтірек заңын кестеде дәлелдейтін боласың."
    ),
    "08_Kokzhiekke_kozqaras": (
        "Бұл сабақта сен ыдыстағы судың тұздылығын өзгертіп, лазер сәулесінің "
        "сыну бұрышын өлшеу арқылы атмосферадағы жарықтың қалай иілетінін "
        "модельдейсің. Снелл заңын тексеріп, неге Күн көкжиектен төмен тұрса "
        "да аспанда көрініп тұрғанын физика тілінде түсіндіретін боласың."
    ),
    "09_EM_induktsiya_aseri": (
        "Бұл сабақта сен үш апта бойы үй ішіндегі құрылғылардың (Wi-Fi роутер, "
        "ұялы телефон, микротолқынды пеш) электромагниттік өрісін смартфон "
        "магнитометрімен өлшеп, күнделік жүргізесің. Қашықтыққа тәуелділікті "
        "(1/r²) графикке салып, ЭМ сәулеленудің денсаулыққа әсерін ғылыми "
        "тілмен талдайтын боласың."
    ),
    "10_Terbelister_aleminde": (
        "Бұл сабақта сен әр түрлі ұзындықтағы маятниктердің 10 толық "
        "тербелісінің уақытын секундомермен өлшеп, T = 2π√(L/g) формуласын "
        "тексересің. T² мен L арасындағы сызықтық тәуелдікті графикке салып, "
        "өз нәтижелерің бойынша еркін түсу үдеуінің мәнін (g) есептейтін "
        "боласың."
    ),
    "11_Oz_qolynyzben_qozgaltqysh": (
        "Бұл сабақта сен мыс орамы, тұрақты магнит және АА батареядан "
        "қарапайым электр қозғалтқыштың жұмыс істейтін моделін өз қолыңмен "
        "жинайсың. Айнымалы күштің қалай пайда болатынын Ампер заңы арқылы "
        "түсіндіріп, тұрмыстағы моторлардың (қол шаңсорғыш, дрон) принципіне "
        "үңілесің."
    ),
    "12_Adam_tynysy": (
        "Бұл сабақта сен ауа шарын тыныстап үрлеп, оның диаметрін өлшеп, "
        "өкпеңнен бір тыныста қанша ауа шығатынын (V = ⁴⁄₃·π·r³) есептейсің. "
        "Тыныс жиілігі мен максималды сыйымдылықты 3 рет өлшеп, спортшы мен "
        "қарапайым адамның өкпе көрсеткіштерін салыстыратын боласың."
    ),
    "13_Kozimizdi_soqyr_shamdardan": (
        "Бұл сабақта сен екі поляроидты әртүрлі бұрыштарға (0°, 30°, 45°, "
        "60°, 90°) бұрып, олардан өткен жарықтың интенсивтілігін өлшейсің. "
        "Малюс заңын (I = I₀·cos²α) графикпен тексеріп, неге автомобиль "
        "айналарына поляризациялық светофильтрлер қойылатынын түсіндіретін "
        "боласың."
    ),
    "14_Graftar_teoriyasy": (
        "Бұл сабақта сен мектеп ауласын немесе өз көшеңді граф ретінде "
        "сызып, әр көшені тек бір рет аралап өту мүмкіндігін Эйлер шарты "
        "арқылы тексересің. Кенигсбергтің 7 көпірі есебінде неліктен "
        "шешімі жоқ болғанын математикалық тілде түсіндіріп, IT-та "
        "графтардың қалай қолданылатыны туралы тапсырма жасайсың."
    ),
    "15_Saqtalu_zandary_zymyran": (
        "Бұл сабақта сен пластик бөтелкеден су зымыранын құрастырып, оны "
        "5 рет ұшырып, көтерілу биіктігін өлшейсің. m₁v₁ = m₂v₂ "
        "импульсінің сақталу заңын зымыран мен ағатын су арасында тікелей "
        "дәлелдеп, неге шынайы зымырандар осы принципке негізделгенін "
        "түсіндіретін боласың."
    ),
    "16_Uimdegi_electr_energiyasy": (
        "Бұл сабақта сен бір апта бойы үйдегі тұрмыстық техниканың "
        "(тоңазытқыш, теледидар, шәйнек, шам) қуатын анықтап, олардың "
        "тәулікте қанша уақыт жұмыс жасайтынын күнделікке жазасың. "
        "E = ΣP·t формуласы бойынша айлық тұтынуды есептеп, тариф бойынша "
        "нақты ақшалай құнын шығарасың."
    ),
    "17_Adamnyn_tuststerdi_qabyldauy": (
        "Бұл сабақта сен үш түсті LED (қызыл, жасыл, көк) жарқыратып, "
        "олардың жарықтарын ақ параққа біріктіріп, аддитивті түс араласу "
        "заңдылығын өз көзіңмен бақылайсың. Қызыл+жасыл = сары, барлық "
        "үшеуі = ақ екенін дәлелдеп, телевизор экраны мен принтердің "
        "(CMYK) жұмыс принциптерінің айырмашылығын талдайсың."
    ),
    "18_Lazerlik_arfa": (
        "Бұл сабақта сен лазер сәулесі мен фоторезисторды Arduino "
        "платасына қосып, қол сәулені үзген сәтте әр түрлі тон шығаратын "
        "«лазерлік арфа» аспабын құрастырасың. Жарық сигналының электр "
        "сигналға, одан дыбыс сигналына түрлендіру тізбегін бағдарламалап, "
        "шынайы әуен ойнайтын құрал жасайтын боласың."
    ),
}


SECTION_ALIASES = {
    "Жоба паспорты": "passport",
    "Мақсаты": "objective",
    "Зерттеу гипотезасы": "hypothesis",
    "Зерттеу сұрақтары": "questions",
    "Қалыптасатын зерттеу дағдылары": "skills",
    "Қажетті жабдықтар": "equipment",
    "Алдын ала қажет білім": "prereq",
    "Жобаның кезеңдері": "stages",
    "Күтілетін нәтиже": "outcome",
    "Бағалау критерийлері": "rubric",
    "Пәнаралық байланыс": "interdisciplinary",
    "Рефлексия сұрақтары (сабақ соңында)": "reflection",
    "Үй тапсырмасы / жобаның жалғасы": "homework",
    "Мұғалімге практикалық кеңес": "tip",
    "Цифрлық қолдау": "digital",
    "⚠️ Қауіпсіздік ережелері": "safety",
}


def _slugify(name: str) -> str:
    """Normalise the folder name (e.g. '01_Shanghy_nemese_konki' →
    'zertkhana_01_shanghy_nemese_konki')."""
    return f"zertkhana_{name.lower()}"


def _parse_passport(table_md: str) -> dict[str, str]:
    """Extract `| **Key** | Value |` rows from the markdown table."""
    out: dict[str, str] = {}
    for line in table_md.splitlines():
        m = re.match(r"\|\s*\*\*(.+?)\*\*\s*\|\s*(.+?)\s*\|", line)
        if m:
            out[m.group(1).strip()] = m.group(2).strip()
    return out


def _strip_md(text: str) -> str:
    """Remove markdown-only ornamentation (block-quote markers, list-leading
    '> ', bold) so the text reads cleanly inside a TextBlock."""
    text = re.sub(r"^\s*>\s?", "", text, flags=re.MULTILINE)
    text = text.replace("**", "")
    # Trailing horizontal-rule used by the source MDs as a section separator.
    text = re.sub(r"\n+-{3,}\s*$", "", text)
    return text.strip()


def _strip_leading_emoji(text: str) -> str:
    """The Kazakh source files prefix tip/safety bodies with the same icon
    we render via the FactBlock's `icon` field, so drop it to avoid doubling."""
    return re.sub(r"^[\U0001F300-\U0001FAFF⚠️\U0001F4A1]+\s*", "", text)


def _split_sections(body: str) -> dict[str, str]:
    """Split the markdown body into a {heading → content} dict.

    The lab files use a flat `## Heading` structure with no nesting, so we
    can safely split on `\n## `.
    """
    parts = re.split(r"\n## ", "\n" + body)
    sections: dict[str, str] = {}
    for chunk in parts[1:]:  # parts[0] is whatever precedes the first '## '
        head, _, content = chunk.partition("\n")
        sections[head.strip()] = content.strip()
    return sections


def _section(sections: dict[str, str], key_alias: str) -> Optional[str]:
    for kk_heading, alias in SECTION_ALIASES.items():
        if alias == key_alias and kk_heading in sections:
            return sections[kk_heading]
    return None


def _grade_from_passport(passport: dict[str, str]) -> int:
    raw = passport.get("Сыныбы", "")
    m = re.search(r"(\d+)", raw)
    return int(m.group(1)) if m else 9


def _subject_code(passport: dict[str, str]) -> str:
    bolim = passport.get("Бөлім", "").lower()
    if "пәнаралық" in bolim:
        return "interdisciplinary"
    if "молекулалық" in bolim or "термо" in bolim or "энерги" in bolim:
        return "physics"
    return "physics"


def _tags(passport: dict[str, str], grade: int) -> list[str]:
    bolim = passport.get("Бөлім", "").lower()
    tags = ["lab", "project", f"grade-{grade}"]
    keyword_tags = {
        "электр": "electricity",
        "оптик": "optics",
        "жарық": "optics",
        "механик": "mechanics",
        "қысым": "mechanics",
        "термо": "thermodynamics",
        "молекула": "thermodynamics",
        "магнит": "electromagnetism",
        "тербеліс": "waves",
        "толқын": "waves",
        "пәнаралық": "interdisciplinary",
        "сақталу": "conservation",
    }
    for needle, tag in keyword_tags.items():
        if needle in bolim and tag not in tags:
            tags.append(tag)
    return tags


def _format_passport_block(passport: dict[str, str]) -> str:
    lines = ["Жоба паспорты"]
    for key in ("Сыныбы", "Бөлім", "Уақыты", "Жоба түрі"):
        if key in passport:
            lines.append(f"{key} — {passport[key]}")
    return "\n".join([lines[0], "", *lines[1:]])


def _format_section(heading: str, body: str) -> str:
    return f"{heading}\n\n{_strip_md(body)}"


def _intro_from_stages(stages_md: Optional[str]) -> Optional[str]:
    """The first numbered step is always 'Мотивация. <hook>'; reuse the hook
    text as the lesson intro."""
    if not stages_md:
        return None
    m = re.search(r"1\.\s*Мотивация\.\s*(.+?)(?:\n\d+\.|\Z)", stages_md, flags=re.DOTALL)
    if not m:
        return None
    return _strip_md(m.group(1)).strip()


def _build_blocks(sections: dict[str, str], passport: dict[str, str]) -> list[dict]:
    blocks: list[dict] = []

    def add_text(heading_kk: str, body_md: Optional[str]) -> None:
        if body_md:
            blocks.append(
                {"type": "text", "payload": {"text_kk": _format_section(heading_kk, body_md)}}
            )

    blocks.append(
        {"type": "text", "payload": {"text_kk": _format_passport_block(passport)}}
    )

    hypothesis = _section(sections, "hypothesis")
    if hypothesis:
        blocks.append(
            {
                "type": "quote",
                "payload": {
                    "text_kk": _strip_md(hypothesis),
                    "author_kk": "Зерттеу гипотезасы",
                },
            }
        )

    add_text("Зерттеу сұрақтары", _section(sections, "questions"))
    add_text("Қалыптасатын зерттеу дағдылары", _section(sections, "skills"))
    add_text("Қажетті жабдықтар", _section(sections, "equipment"))
    add_text("Алдын ала қажет білім", _section(sections, "prereq"))
    add_text("Жобаның кезеңдері", _section(sections, "stages"))
    add_text("Күтілетін нәтиже", _section(sections, "outcome"))
    add_text("Бағалау критерийлері", _section(sections, "rubric"))
    add_text("Пәнаралық байланыс", _section(sections, "interdisciplinary"))
    add_text("Рефлексия сұрақтары", _section(sections, "reflection"))
    add_text("Үй тапсырмасы", _section(sections, "homework"))

    tip = _section(sections, "tip")
    if tip:
        blocks.append(
            {
                "type": "fact",
                "payload": {
                    "text_kk": _strip_leading_emoji(_strip_md(tip)),
                    "icon": "💡",
                },
            }
        )

    add_text("Цифрлық қолдау", _section(sections, "digital"))

    safety = _section(sections, "safety")
    if safety:
        blocks.append(
            {
                "type": "fact",
                "payload": {
                    "text_kk": _strip_leading_emoji(_strip_md(safety)),
                    "icon": "⚠️",
                },
            }
        )

    return blocks


def _parse_one(folder: Path) -> dict:
    md_path = next(folder.glob("[0-9]*.md"))
    raw = md_path.read_text(encoding="utf-8")

    title_match = re.search(r"^#\s*\d+\.\s*[«\"](.+?)[»\"]", raw, flags=re.MULTILINE)
    if not title_match:
        title_match = re.search(r"^#\s*\d+\.\s*(.+)$", raw, flags=re.MULTILINE)
    title = title_match.group(1).strip() if title_match else folder.name

    raw_no_image = re.sub(r"!\[.*?\]\(.*?\)", "", raw)
    body = raw_no_image.split("\n", 1)[1] if "\n" in raw_no_image else ""

    sections = _split_sections(body)

    passport_md = sections.get("Жоба паспорты", "")
    passport = _parse_passport(passport_md)

    grade = _grade_from_passport(passport)
    age_range, difficulty = GRADE_TO_AGE.get(grade, ("14-17", "medium"))

    objective = _section(sections, "objective")
    outcome = _section(sections, "outcome")
    intro = _intro_from_stages(_section(sections, "stages"))

    cover_filename = f"{_slugify(folder.name)}.png"
    cover_url = f"/api/uploads/lesson-images/{cover_filename}"

    return {
        "title_kk": title,
        "subject_code": _subject_code(passport),
        "difficulty": difficulty,
        "age_range": age_range,
        "tags": _tags(passport, grade),
        "estimated_minutes": 45,
        "is_published": True,
        "is_featured": False,
        "objective_kk": _strip_md(objective) if objective else None,
        "summary_kk": _strip_md(outcome) if outcome else None,
        "intro_kk": intro,
        "overview_kk": LAB_OVERVIEWS.get(folder.name),
        "cover_image_url": cover_url,
        "references": [],
        "blocks": _build_blocks(sections, passport),
        "videos": [],
    }


def _copy_covers() -> int:
    LAB_IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    copied = 0
    for folder in sorted(LABS_DIR.glob("[0-9][0-9]_*")):
        png = next(folder.glob("*.png"), None)
        if not png:
            continue
        target = LAB_IMAGE_DIR / f"{_slugify(folder.name)}.png"
        if target.exists():
            continue
        shutil.copy2(png, target)
        copied += 1
    return copied


def main() -> None:
    copied = _copy_covers()

    seeds: list[dict] = (
        json.loads(SEED_PATH.read_text(encoding="utf-8")) if SEED_PATH.exists() else []
    )
    # Drop any lab-flagged entries so re-runs pick up parser improvements.
    seeds = [e for e in seeds if "lab" not in (e.get("tags") or [])]
    existing_titles = {entry["title_kk"] for entry in seeds}

    appended = 0
    for folder in sorted(LABS_DIR.glob("[0-9][0-9]_*")):
        entry = _parse_one(folder)
        if entry["title_kk"] in existing_titles:
            continue
        seeds.append(entry)
        existing_titles.add(entry["title_kk"])
        appended += 1

    SEED_PATH.write_text(
        json.dumps(seeds, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    print(f"covers copied: {copied}")
    print(f"lessons appended: {appended}")
    print(f"total seed entries: {len(seeds)}")


if __name__ == "__main__":
    main()
