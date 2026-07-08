"""Ctrl+Fabric - AI-driven fashion company."""

from .products.garment import Garment, Version, TEE_4_2, HOODIE_V2
from .agents.ceo_assistant import CEOAssistant
from .agents.creative_director import CreativeDirector
from .agents.fashion_architect import FashionArchitect
from .agents.textile_engineer import TextileEngineer
from .agents.cad_agent import CADAagent
from .agents.production_agent import ProductionAgent
from .agents.supply_chain_agent import SupplyChainAgent
from .agents.finance_agent import FinanceAgent
from .agents.legal_agent import LegalAgent
from .agents.marketing_strategist import MarketingStrategist
from .agents.brand_story_agent import BrandStoryAgent
from .agents.social_media_team import SocialMediaTeam
from .agents.advertising_agent import AdvertisingAgent
from .agents.customer_agent import CustomerAgent
from .agents.data_scientist import DataScientistAgent

__version__ = "1.0.0"
__all__ = [
    "Garment", "Version",
    "CEOAssistant", "CreativeDirector", "FashionArchitect", "TextileEngineer",
    "CADAagent", "ProductionAgent", "SupplyChainAgent", "FinanceAgent",
    "LegalAgent", "MarketingStrategist", "BrandStoryAgent", "SocialMediaTeam",
    "AdvertisingAgent", "CustomerAgent", "DataScientistAgent",
]