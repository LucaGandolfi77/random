"""Customer Agent - Customer service."""

from typing import Dict, Any, List
from .base import BaseAgent


class CustomerAgent(BaseAgent):
    """Handles customer service and recommendations."""
    
    def __init__(self):
        super().__init__("Customer Agent", "Customer service")
        self.purchase_history = {}
    
    def run(self, customer_id: str, query: str) -> str:
        """Respond to customer query."""
        self.status = "responding"
        
        # Get purchase history
        history = self.purchase_history.get(customer_id, [])
        
        if "size" in query.lower():
            response = "Based on your previous purchases, we recommend size M."
        elif "outfit" in query.lower():
            response = "Try pairing TEE-4.2 with HOODIE-2.0 for a complete look."
        else:
            response = "How can I help you today?"
        
        self.status = "idle"
        return response
    
    def record_purchase(self, customer_id: str, sku: str):
        """Record a customer purchase."""
        if customer_id not in self.purchase_history:
            self.purchase_history[customer_id] = []
        self.purchase_history[customer_id].append(sku)