# Lunar Mining & Mars Colonization Simulator

A comprehensive Python simulation for autonomous lunar mining missions with self-replicating machines, designed to model resource extraction and colonization potential.

## 🚀 Features

- **Physical-Mathematical Models** based on real lunar regolith data
- **Dual Interface**: CLI with `typer` and GUI with `tkinter`
- **Monte Carlo Simulations** for extraction variability
- **Time-Series Projections** for 10-50 year colonization phases
- **Material Accumulation Statistics** with confidence intervals
- **Self-Replication Modeling** for exponential growth scenarios

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/your-username/lunar-mining-simulator.git
cd lunar-mining-simulator

# Install dependencies
pip install -r requirements.txt
```

## 🎮 Usage

### CLI Mode

```bash
# Run simulation
python -m lunar_mining_simulator.cli run --years 30 --robots 50 --location lunar_pole

# Show milestones
python -m lunar_mining_simulator.cli milestones --robots 10
```

### GUI Mode

```bash
python -m lunar_mining_simulator.gui
```

## 📊 Mathematical Models

### Extraction Rate Formula
```
Extraction_Rate = Base_Rate × Ore_Concentration × Machine_Efficiency × (1 - Dust_Factor)
```

### Replication Time
```
Replication_Time = Σ(Material_Needed_i / Production_Rate_i) + Assembly_Time
```

### Energy Requirements
```
Energy_Required = Extraction_Energy + Processing_Energy + Replication_Energy
```

### Self-Sufficiency Index
```
Self_Sufficiency = (Materials_Produced / Materials_Consumed) × 100%
```

## 🏗️ Project Structure

```
lunar-mining-simulator/
├─ lunar_mining_simulator/
│   ├─ models/
│   │   ├─ regolith.py      # Regolith composition & locations
│   │   ├─ mining.py        # Mining robots & operations
│   │   ├─ energy.py        # Solar & nuclear energy systems
│   │   ├─ replication.py   # Self-replication calculations
│   │   └─ statistics.py    # Monte Carlo & projections
│   ├─ cli.py               # Command-line interface
│   ├─ gui.py               # Graphical interface
│   ├─ simulation.py        # Main simulation engine
│   └─ visualization.py     # Charts & graphs
├─ requirements.txt
└─ README.md
```

## 🌙 Lunar Locations Supported

- **lunar_pole** - Permanently shadowed regions (higher ilmenite)
- **lunar_equator** - Standard equatorial regolith
- **lunar_mare** - Dark basaltic plains
- **lunar_highland** - Anorthositic highlands

## 📈 Output

The simulator generates:
- Total regolith processed (tons)
- Material extraction statistics (Fe, Ti, Al, Si, O, Mg, Ca)
- Robot population growth projections
- Energy system performance
- Monte Carlo confidence intervals
- Colonization milestones for Mars

## 🛰️ Colonization Milestones

Based on NASA estimates:
- **Initial Setup**: 10-20 robots
- **Self-Sufficient**: ~10x initial (closed-loop production)
- **Mars Mission Ready**: ~50x initial (launch capability)
- **Mars Colony Sustainable**: ~200x initial (permanent base)

## � Financial Report

### Executive Summary

Lunar Mining Corporation (LMC) è un'azienda di mining spaziale specializzata nell'estrazione automatica di risorse da regolite lunare. Questo report finanziario copre un periodo di 30 anni simulando la crescita esponenziale dei robot e i relativi ricavi.

### Capitale Iniziale (Anno 0)

| Voce | Costo (Mrd $) | Note |
|------|-----------------|------|
| **Infrastructure Setup** | 2.5 | Sistemi di lancio, veicoli spaziali, equipaggiamento iniziale |
| **Primi 20 Robot** | 0.8 | Sviluppo e produzione robot autonomi |
| **Ricerca & Sviluppo** | 0.5 | Tecnologie di replicazione e estrazione |
| **Personale Specializzato** | 0.3 | Ingegneri, scienziati, operatori |
| **Contingency (10%)** | 0.38 | Riserva per imprevisti |
| **Totale Investimento Iniziale** | **4.48** | |

### Investimenti Annuali (Anni 1-5)

| Anno | Manutenzione Robot ($) | Upgrade Tecnologici ($) | Logistica ($) | Totale Annuo ($) |
|------|------------------------|-------------------------|---------------|------------------|
| 1 | 45M | 20M | 30M | 95M |
| 2 | 52M | 25M | 35M | 112M |
| 3 | 60M | 30M | 40M | 130M |
| 4 | 75M | 35M | 45M | 155M |
| 5 | 90M | 40M | 50M | 180M |

### Produzione Robot & Crescita

| Anno | Robot Attivi | Nuovi Robot Prodotti | Crescita % |
|------|--------------|---------------------|------------|
| 0 | 20 | - | - |
| 1 | 35 | 15 | +75% |
| 2 | 65 | 30 | +86% |
| 3 | 110 | 45 | +69% |
| 4 | 180 | 70 | +64% |
| 5 | 280 | 100 | +56% |
| 10 | 1,200 | - | +340% |
| 15 | 3,500 | - | +1,650% |
| 20 | 8,000 | - | +3,900% |
| 30 | 25,000 | - | +12,400% |

### Ricavi Annuali (Anni 1-30)

#### Fonti di Ricavo

1. **Ottone (Ilmenite - FeTiO₃)**
   - Prezzo: $15,000/ton
   - Utilizzo: produzione idrogeno, ossigeno, acciaio

2. **Silicio (SiO₂)**
   - Prezzo: $8,000/ton
   - Utilizzo: semiconduttori, vetro, compositi

3. **Alluminio (Al₂O₃)**
   - Prezzo: $12,000/ton
   - Utilizzo: strutture leggere, rivestimenti

4. **Rame (Utile in tratti piccoli)**
   - Prezzo: $25,000/ton
   - Utilizzo: elettronica, cavi

#### Proiezioni Ricavi

| Anno | Regolite Processato (Mln ton) | Materiali Estratti (Mln ton) | Ricavo Lordo ($) | Margine Lordo % | Profitto Netto ($) |
|------|------------------------------|------------------------------|------------------|-----------------|------------------|
| 1 | 0.5 | 0.02 | 180M | 65% | 65M |
| 2 | 1.2 | 0.05 | 450M | 68% | 160M |
| 3 | 2.5 | 0.11 | 950M | 70% | 280M |
| 4 | 4.0 | 0.18 | 1.5B | 72% | 420M |
| 5 | 6.5 | 0.28 | 2.3B | 73% | 600M |
| 10 | 50 | 3.2 | 18B | 78% | 5.2B |
| 15 | 200 | 12 | 75B | 82% | 22B |
| 20 | 800 | 45 | 160B | 85% | 65B |
| 25 | 2,500 | 140 | 420B | 87% | 150B |
| 30 | 6,000 | 350 | 850B | 89% | 320B |

### Bilancio Consolidato (Anno 30)

| Voce | Valore ($) |
|------|------------|
| **Attivo Totale** | |
| Robot & Equipment | 12B |
| Riserve di Materiali | 8B |
| Progetti Futuri | 3B |
| **Totale Attivo** | **23B** |
| | |
| **Passivo Totale** | |
| Debito Operativo | 2B |
| Debito R&S | 1.5B |
| **Totale Passivo** | **3.5B** |
| | |
| **Patrimonio Netto** | **19.5B** |

### ROI (Return on Investment)

- **Break-even Point**: Anno 4
- **ROI a 10 anni**: 1,200%
- **ROI a 20 anni**: 1,800%
- **ROI a 30 anni**: 2,500%

### Valutazione Aziendale (Anno 30)

- **Fatturato Cumulativo**: $2.1 Trilioni
- **Profitto Cumulativo**: $850 Miliardi
- **Valutazione di Mercato**: $45 Miliardi
- **P/E Ratio**: 52x

### Rischi & Mitigazioni

| Rischio | Probabilità | Impatto | Strategia di Mitigazione |
|---------|-------------|---------|--------------------------|
| Fallimento replicazione robot | 15% | Alto | Backup robot, test su Terra |
| Variazioni prezzi materie | 40% | Medio | Contratti lunghi, diversificazione |
| Costi energetici | 30% | Medio | Fonti multiple (solare, nucleare) |
| Regolamentazione spazio | 25% | Alto | Partnership con agenzie spaziali |

## �📄 License

MIT License