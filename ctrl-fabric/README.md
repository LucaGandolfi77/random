# Ctrl+Fabric

An AI-driven fashion company that operates like a software organization. Every garment is engineered with technical specifications, version history, and continuous improvement cycles.

## Vision

Instead of selling "clothes for engineers," we sell **clothing developed like software**. Each piece has a lifecycle, versions, release notes, metrics, tests, and user feedback. The entire company functions as a multi-agent system where each AI is a microservice with a precise role.

## Architecture

```
ctrl-fabric/
├── agents/                          # 22 AI agents
│   ├── ceo_assistant.py             # Daily reports & KPI monitoring
│   ├── creative_director.py           # Brand philosophy & trend analysis
│   ├── fashion_architect.py           # Collection generation
│   ├── textile_engineer.py            # Fabric specifications
│   ├── cad_agent.py                 # Tech packs & CAD files
│   ├── pattern_generator.py           # Automatic pattern creation & 3D simulation
│   ├── documentation_agent.py         # Technical specs, user guides, maintenance manuals
│   ├── quality_assurance.py           # Automated testing & certification
│   ├── sustainability_agent.py        # Carbon footprint & eco-metrics
│   ├── fit_predictor.py             # ML-based size prediction
│   ├── color_ai.py                  # Trend color prediction
│   ├── competitor_spy.py              # Market intelligence
│   ├── inventory_optimizer.py         # Stock prediction & optimization
│   ├── return_predictor.py            # Return prevention analytics
│   ├── material_innovator.py          # Sustainable materials R&D
│   ├── supply_risk.py               # Supply chain risk assessment
│   ├── clv_predictor.py             # Customer lifetime value
│   ├── production_agent.py            # Factory communication
│   ├── supply_chain_agent.py          # Inventory & logistics
│   ├── finance_agent.py               # Cash flow & forecasting
│   ├── legal_agent.py                 # Compliance & IP
│   ├── marketing_strategist.py        # Campaign strategy
│   ├── brand_story_agent.py            # Content creation
│   ├── social_media_team.py           # Multi-agent social management
│   ├── advertising_agent.py           # Ad platform management
│   ├── customer_agent.py              # Customer service
│   └── data_scientist.py              # Analytics & insights
├── products/
│   └── garment.py                   # Technical specification model
├── community/
│   └── engineering_council.py         # Feedback aggregation
├── web/                             # Flask dashboard
│   ├── app.py                         # Main application
│   ├── templates/                     # HTML templates
│   └── static/                        # CSS styling
├── examples/                          # Demo scripts
│   ├── pattern_demo.py
│   ├── docs_demo.py
│   ├── analytics_demo.py
│   ├── qa_sustainability_demo.py
│   └── all_agents_demo.py
└── main.py                            # System orchestrator
```

## Agent Capabilities

### Core Development Agents
| Agent | Function | Key Features |
|-------|----------|--------------|
| **Fashion Architect** | Collection generation | Season planning, style architecture |
| **Textile Engineer** | Fabric specs | Thermal efficiency, stretch, abrasion |
| **CAD Agent** | Tech packs & patterns | DXF export, 3D simulation integration |
| **Pattern Generator** | Automatic patterns | Size grading, avatar simulation |
| **Documentation Agent** | Technical docs | PDF specs, user guides, maintenance |

### Quality & Sustainability Agents
| Agent | Function | Key Features |
|-------|----------|--------------|
| **Quality Assurance** | Testing & certification | Abrasion, stretch, wash tests |
| **Sustainability Agent** | Environmental impact | Carbon footprint, water usage, eco-alternatives |
| **Fit Predictor** | Size prediction ML | Body measurements, return risk |
| **Return Predictor** | Return prevention | Risk factors, savings calculation |

### Market Intelligence Agents
| Agent | Function | Key Features |
|-------|----------|--------------|
| **Color AI** | Trend colors | Seasonal palettes, psychology |
| **Competitor Spy** | Price monitoring | Market position, opportunities |
| **Data Scientist** | Analytics | Trend prediction, segmentation, pricing |
| **CLV Predictor** | Customer value | Lifetime value, retention |

### Operations Agents
| Agent | Function | Key Features |
|-------|----------|--------------|
| **Inventory Optimizer** | Stock management | Demand forecasting, reorder points |
| **Supply Risk** | Risk assessment | Geopolitical, weather, supply risks |
| **Material Innovator** | R&D materials | Mycelium, algae fiber, innovations |
| **Production Agent** | Factory ops | Manufacturing coordination |
| **Supply Chain Agent** | Logistics | Inventory, shipping |

### Business Agents
| Agent | Function | Key Features |
|-------|----------|--------------|
| **CEO Assistant** | Daily reports | KPI monitoring, decisions |
| **Finance Agent** | Financial ops | Cash flow, forecasting |
| **Legal Agent** | Compliance | Certifications, IP |
| **Marketing Strategist** | Campaigns | Strategy, positioning |
| **Brand Story Agent** | Content | Manifesto, storytelling |
| **Social Media Team** | Social | Multi-platform management |
| **Advertising Agent** | Ads | Platform optimization |
| **Customer Agent** | Support | Service, feedback |

## Garment Specification Example

```
TEE-4.2

Weight: 210 gsm
Thermal Efficiency: 7.8/10
Stretch: 12%
Abrasion: 9800 cycles
Wrinkle Recovery: 92%
Expected Lifetime: 430 washes
Sustainability Score: 69.9/100
Quality Score: 8.5/10
```

## Version History

```
Hoodie v1.0 → v1.1 (Improved collar) → v1.2 (New zipper) → v2.0 (Fabric updated)
```

## Installation

```bash
pip install -e .
```

## Usage

### Run Daily Business Cycle
```bash
python -m ctrl_fabric
```

### Run Agent Demos
```bash
python examples/pattern_demo.py          # Pattern generation
python examples/docs_demo.py             # Documentation
python examples/analytics_demo.py        # Analytics
python examples/qa_sustainability_demo.py # QA & Sustainability
python examples/all_agents_demo.py       # All agents
```

### Run Tests
```bash
python tests/test_agents.py
```

### Start Web Dashboard
```bash
cd web && python app.py
# Visit http://localhost:5000
```

## Web Dashboard Features

- **Products**: Garment catalog with version history
- **3D Simulation**: Pattern visualization and avatar fitting
- **Documentation**: Technical specs, user guides, maintenance
- **Quality & Sustainability**: Testing results and eco-metrics
- **Analytics**: Trend prediction, customer segmentation, price optimization

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `/api/garments` | List all garments |
| `/api/garments/<sku>/specs` | Get garment specifications |
| `/api/garments/<sku>/pattern` | Generate pattern & simulation |
| `/api/garments/<sku>/docs` | Generate documentation |
| `/api/garments/<sku>/quality` | Quality test results |
| `/api/garments/<sku>/sustainability` | Sustainability metrics |
| `/api/analytics` | Market analytics |

## Testing

All 18 core agents tested and verified:
```
✓ CEOAssistant: OK
✓ CreativeDirector: OK
✓ FashionArchitect: OK
✓ TextileEngineer: OK
✓ CADAagent: OK
✓ PatternGenerator: OK
✓ DocumentationAgent: OK
✓ QualityAssuranceAgent: OK
✓ SustainabilityAgent: OK
✓ FitPredictorAgent: OK
✓ ColorAI: OK
✓ CompetitorSpy: OK
✓ InventoryOptimizer: OK
✓ ReturnPredictor: OK
✓ MaterialInnovator: OK
✓ SupplyRisk: OK
✓ CLVPredictor: OK
✓ DataScientistAgent: OK
```

## License

MIT License - See LICENSE file for details.