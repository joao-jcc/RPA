#!/usr/bin/env python3
"""Plota gráfico de barras com tempo médio ± desvio padrão por fase das consultas RPA.

Pré-requisitos (instalar uma vez):
    pip install matplotlib numpy

Uso:
    python scripts/plot_metrics.py              # plota e salva metrics_chart.png
    python scripts/plot_metrics.py --list       # lista os runs registrados
    python scripts/plot_metrics.py --clear      # apaga metrics.jsonl
"""
from __future__ import annotations

import argparse
import json
import statistics
import sys
from datetime import datetime
from pathlib import Path

METRICS_FILE = Path(__file__).parent.parent / "metrics.jsonl"
CHART_FILE   = METRICS_FILE.parent / "metrics_chart.png"

# Stages em ordem — cada barra mede o tempo desse stage até o próximo.
# Rótulo = nome do stage tal como aparece nos eventos SSE.
PHASES: list[tuple[str, str, str]] = [
    ("searching",  "found",      "searching"),
    ("found",      "extracting", "found"),
    ("extracting", "opening",    "extracting"),
    ("opening",    "discovered", "opening"),
    ("discovered", "uploading",  "discovered"),
    ("uploading",  "done",       "uploading"),
]

# Cores do tema RoboGov
BG      = "#3A3830"
ACCENT  = "#C8A45A"
TEXT    = "#F0EAD6"
SUBTEXT = "#D9D0BC"


# ---------------------------------------------------------------------------
# I/O
# ---------------------------------------------------------------------------

def load_runs() -> list[dict]:
    if not METRICS_FILE.exists():
        return []
    runs = []
    with METRICS_FILE.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                runs.append(json.loads(line))
    return runs


def phase_seconds(timings: dict[str, str], start: str, end: str) -> float | None:
    if start not in timings or end not in timings:
        return None
    t0 = datetime.fromisoformat(timings[start])
    t1 = datetime.fromisoformat(timings[end])
    delta = (t1 - t0).total_seconds()
    return delta if delta >= 0 else None


# ---------------------------------------------------------------------------
# Plot
# ---------------------------------------------------------------------------

def plot(runs: list[dict]) -> None:
    try:
        import matplotlib.pyplot as plt
        import numpy as np
    except ImportError:
        print("Instale as dependências: pip install matplotlib numpy")
        sys.exit(1)

    # Coleta durações por fase, apenas runs com status=done
    phase_samples: dict[str, list[float]] = {label: [] for *_, label in PHASES}

    for run in runs:
        if run.get("status") != "done":
            continue
        timings = run.get("timings", {})
        for start, end, label in PHASES:
            secs = phase_seconds(timings, start, end)
            if secs is not None:
                phase_samples[label].append(secs)

    # Filtra fases sem dados
    labels  = [label for *_, label in PHASES if phase_samples[label]]
    means   = [statistics.mean(phase_samples[l]) for l in labels]
    stds    = [
        statistics.stdev(phase_samples[l]) if len(phase_samples[l]) > 1 else 0.0
        for l in labels
    ]
    counts  = [len(phase_samples[l]) for l in labels]
    total   = sum(means)

    if not labels:
        print("Nenhum run bem-sucedido encontrado para plotar.")
        return

    # --- figura ---
    fig, ax = plt.subplots(figsize=(13, 6))
    fig.patch.set_facecolor(BG)
    ax.set_facecolor(BG)

    x    = np.arange(len(labels))
    bars = ax.bar(
        x, means,
        yerr=stds,
        capsize=7,
        color=ACCENT,
        ecolor=TEXT,
        error_kw={"linewidth": 1.8, "capthick": 1.8},
        width=0.55,
        zorder=3,
    )

    # Grade horizontal sutil
    ax.yaxis.grid(True, color="#5A5848", linewidth=0.6, zorder=0)
    ax.set_axisbelow(True)

    # Rótulos em cima das barras
    for bar, mean, std, n in zip(bars, means, stds, counts):
        top = bar.get_height() + std
        ax.text(
            bar.get_x() + bar.get_width() / 2,
            top + max(total * 0.01, 0.3),
            f"{mean:.1f}s\n±{std:.1f}s  (n={n})",
            ha="center", va="bottom",
            color=TEXT, fontsize=9, linespacing=1.4,
        )

    # Eixos
    ax.set_xticks(x)
    ax.set_xticklabels(labels, color=SUBTEXT, fontsize=10, linespacing=1.4)
    ax.set_ylabel("Tempo médio (s)", color=SUBTEXT, fontsize=11)
    ax.tick_params(axis="both", colors=SUBTEXT)
    for spine in ax.spines.values():
        spine.set_edgecolor(ACCENT)
        spine.set_linewidth(0.8)

    # Título
    n_done  = sum(1 for r in runs if r.get("status") == "done")
    n_total = len(runs)
    ax.set_title(
        "RoboGov — Tempo médio por stage da consulta",
        color=TEXT, fontsize=14, fontweight="bold", pad=18,
    )
    fig.text(
        0.99, 0.01,
        f"runs concluídos: {n_done}/{n_total}  |  total médio: {total:.0f}s",
        ha="right", color=SUBTEXT, fontsize=8,
    )

    plt.tight_layout()
    plt.savefig(CHART_FILE, dpi=150, bbox_inches="tight", facecolor=BG)
    print(f"Gráfico salvo em: {CHART_FILE}")
    plt.show()


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def cmd_list(runs: list[dict]) -> None:
    if not runs:
        print("Nenhum run registrado.")
        return
    print(f"{'#':<4} {'status':<8} {'termo':<25} {'total (s)':<10} job_id")
    print("-" * 75)
    for i, run in enumerate(runs, 1):
        timings = run.get("timings", {})
        total   = phase_seconds(timings, "searching", "done")
        total_s = f"{total:.1f}" if total is not None else "—"
        print(f"{i:<4} {run['status']:<8} {run['termo']:<25} {total_s:<10} {run['job_id']}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Métricas de tempo RoboGov")
    parser.add_argument("--list",  action="store_true", help="Lista runs registrados")
    parser.add_argument("--clear", action="store_true", help="Apaga metrics.jsonl")
    args = parser.parse_args()

    if args.clear:
        METRICS_FILE.unlink(missing_ok=True)
        print("metrics.jsonl apagado.")
        return

    runs = load_runs()

    if args.list:
        cmd_list(runs)
        return

    if not runs:
        print(f"Nenhuma métrica encontrada em {METRICS_FILE}")
        print("Execute algumas consultas no app e rode o script novamente.")
        return

    plot(runs)


if __name__ == "__main__":
    main()
