#!/usr/bin/env python3
"""Regenera la sección AUTOMÁTICA de memory.md (rama, pendiente de subir, últimos commits, migraciones).

Se ejecuta sola al terminar cada respuesta de Claude Code (hook Stop de .claude/settings.json) y también se puede
lanzar a mano: python3 scripts/actualizar-memory.py
Solo reescribe el fichero si algo ha cambiado. La parte manual de memory.md (fuera de los marcadores) no se toca.
"""
import os, re, subprocess, sys
from datetime import datetime

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FICHERO = os.path.join(RAIZ, "memory.md")
INICIO, FIN = "<!-- AUTO:INICIO -->", "<!-- AUTO:FIN -->"


def git(*args: str) -> str:
    try:
        return subprocess.run(["git", *args], cwd=RAIZ, capture_output=True, text=True, timeout=10).stdout.strip()
    except Exception:
        return ""


def bloque() -> str:
    rama = git("rev-parse", "--abbrev-ref", "HEAD") or "?"
    ahead = git("rev-list", "--count", "origin/main..HEAD") or "?"
    sin_commit = [l for l in git("status", "--short").splitlines()]
    migraciones = sorted(f for f in os.listdir(os.path.join(RAIZ, "supabase", "migrations")) if f.endswith(".sql")) \
        if os.path.isdir(os.path.join(RAIZ, "supabase", "migrations")) else []
    lineas = [
        f"- **Rama:** `{rama}` · commits locales sin subir a origin/main: **{ahead}**",
        f"- **Cambios sin commitear:** {len(sin_commit)}" + (" (" + ", ".join(l[3:] for l in sin_commit[:6]) + ("…" if len(sin_commit) > 6 else "") + ")" if sin_commit else ""),
        f"- **Última migración en el repo:** `{migraciones[-1]}`" if migraciones else "- **Migraciones:** ninguna",
        "",
        "**Últimos commits:**",
    ]
    for l in git("log", "-15", "--pretty=%h|%ad|%s", "--date=short").splitlines():
        h, fecha, asunto = l.split("|", 2)
        lineas.append(f"- `{h}` {fecha} — {asunto[:140]}")
    return "\n".join(lineas)


def main() -> int:
    if not os.path.isfile(FICHERO):
        return 0
    texto = open(FICHERO, encoding="utf-8").read()
    patron = re.compile(re.escape(INICIO) + r"(.*?)" + re.escape(FIN), re.S)
    m = patron.search(texto)
    if not m:
        return 0
    nuevo = bloque()
    # Se compara sin la línea de fecha para no reescribir el fichero si no ha cambiado nada
    actual = re.sub(r"^_Actualizado.*?_\n+", "", m.group(1).strip() + "\n", flags=re.M).strip()
    if actual == nuevo.strip():
        return 0
    sello = f"_Actualizado automáticamente: {datetime.now().strftime('%Y-%m-%d %H:%M')}_"
    reemplazo = f"{INICIO}\n{sello}\n\n{nuevo}\n{FIN}"
    open(FICHERO, "w", encoding="utf-8").write(texto[: m.start()] + reemplazo + texto[m.end():])
    return 0


if __name__ == "__main__":
    sys.exit(main())
