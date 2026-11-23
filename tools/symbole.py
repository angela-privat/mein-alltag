"""Erzeugt die PNG-App-Symbole (gleiches Motiv wie public/icons/icon.svg).

Aufruf:  python tools/symbole.py
"""
from pathlib import Path
from PIL import Image, ImageDraw

ZIEL = Path(__file__).resolve().parent.parent / "public" / "icons"
GRUEN = "#2DBE5C"
CREME = "#FAF6F0"
TERRA = "#C8664B"
S = 4  # Überabtastung für weiche Kanten


def zeichnen(groesse: int, maskierbar: bool) -> Image.Image:
    g = 512 * S
    bild = Image.new("RGBA", (g, g), (0, 0, 0, 0))
    d = ImageDraw.Draw(bild)
    if maskierbar:
        d.rectangle([0, 0, g, g], fill=GRUEN)
        faktor, versatz = 0.8, 51.2
    else:
        d.rounded_rectangle([0, 0, g - 1, g - 1], radius=112 * S, fill=GRUEN)
        faktor, versatz = 1.0, 0.0

    def p(x: float) -> float:
        return (versatz + x * faktor) * S

    def r(x: float) -> float:
        return x * faktor * S

    # Kalenderblatt
    d.rounded_rectangle([p(126), p(140), p(386), p(380)], radius=r(36), fill=CREME)
    d.rounded_rectangle([p(126), p(140), p(386), p(204)], radius=r(32), fill=TERRA)
    d.rectangle([p(126), p(176), p(386), p(204)], fill=TERRA)
    # Ringe
    d.rounded_rectangle([p(180), p(112), p(204), p(172)], radius=r(12), fill=CREME)
    d.rounded_rectangle([p(308), p(112), p(332), p(172)], radius=r(12), fill=CREME)
    # Häkchen
    punkte = [(p(196), p(292)), (p(240), p(334)), (p(320), p(250))]
    breite = int(r(30))
    d.line(punkte, fill=GRUEN, width=breite, joint="curve")
    for x, y in (punkte[0], punkte[2]):
        d.ellipse([x - breite / 2, y - breite / 2, x + breite / 2, y + breite / 2], fill=GRUEN)
    return bild.resize((groesse, groesse), Image.LANCZOS)


if __name__ == "__main__":
    ZIEL.mkdir(parents=True, exist_ok=True)
    zeichnen(192, False).save(ZIEL / "icon-192.png")
    zeichnen(512, False).save(ZIEL / "icon-512.png")
    zeichnen(512, True).save(ZIEL / "icon-maskable-512.png")
    print("Symbole erstellt in", ZIEL)
