"""Engineering Council - Community feedback aggregation."""

from typing import Dict, Any, List
from ..agents.base import BaseAgent


class EngineeringCouncil(BaseAgent):
    """Aggregates feedback from engineering community."""
    
    def __init__(self):
        super().__init__("Engineering Council", "Community feedback")
        self.votes = {}
        self.members = 100
    
    def run(self) -> Dict[str, Any]:
        """Aggregate monthly feedback."""
        self.status = "aggregating"
        
        # Simulate aggregated feedback
        feedback = {
            "new_zipper": 78,
            "new_pocket": 65,
            "new_fabric": 92
        }
        
        roadmap = self._generate_roadmap(feedback)
        
        self.status = "idle"
        return {
            "total_votes": sum(feedback.values()),
            "top_suggestion": max(feedback, key=feedback.get),
            "roadmap": roadmap
        }
    
    def _generate_roadmap(self, feedback: Dict[str, int]) -> List[str]:
        """Generate product roadmap from feedback."""
        sorted_items = sorted(feedback.items(), key=lambda x: x[1], reverse=True)
        return [f"{item} (score: {score})" for item, score in sorted_items[:3]]
    
    def add_vote(self, feature: str, member_id: str):
        """Add a vote for a feature."""
        if feature not in self.votes:
            self.votes[feature] = set()
        self.votes[feature].add(member_id)