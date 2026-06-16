"""
Story Engine - Manages branching narratives and dialogue trees
"""
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from enum import Enum
import json


class NodeType(Enum):
    START = "start"
    DIALOGUE = "dialogue"
    CHOICE = "choice"
    EVENT = "event"
    END = "end"


@dataclass
class StoryNode:
    id: str
    type: NodeType
    content: str = ""
    character: str = ""
    choices: List[Dict[str, str]] = field(default_factory=list)
    emotion: str = "neutral"
    next_node: Optional[str] = None


class StoryEngine:
    def __init__(self):
        self.nodes: Dict[str, StoryNode] = {}
        self.current_node_id: Optional[str] = None
        self.history: List[str] = []

    def add_node(self, node: StoryNode):
        self.nodes[node.id] = node

    def load_story(self, filepath: str) -> bool:
        try:
            with open(filepath, 'r') as f:
                data = json.load(f)
            self.nodes.clear()
            for node_data in data.get('nodes', []):
                node = StoryNode(
                    id=node_data['id'],
                    type=NodeType(node_data['type']),
                    content=node_data.get('content', ''),
                    character=node_data.get('character', ''),
                    choices=node_data.get('choices', []),
                    emotion=node_data.get('emotion', 'neutral'),
                    next_node=node_data.get('next_node')
                )
                self.nodes[node.id] = node
            self.current_node_id = data.get('start_node')
            return True
        except Exception as e:
            print(f"Error loading story: {e}")
            return False

    def save_story(self, filepath: str):
        data = {
            'start_node': self.current_node_id,
            'nodes': [
                {
                    'id': n.id,
                    'type': n.type.value,
                    'content': n.content,
                    'character': n.character,
                    'choices': n.choices,
                    'emotion': n.emotion,
                    'next_node': n.next_node
                }
                for n in self.nodes.values()
            ]
        }
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)

    def get_current_node(self) -> Optional[StoryNode]:
        if self.current_node_id:
            return self.nodes.get(self.current_node_id)
        return None

    def advance(self, choice_index: int = 0) -> Optional[StoryNode]:
        current = self.get_current_node()
        if not current:
            return None

        self.history.append(self.current_node_id)

        if current.type == NodeType.CHOICE and choice_index < len(current.choices):
            next_id = current.choices[choice_index].get('next_node')
        else:
            next_id = current.next_node

        if next_id and next_id in self.nodes:
            self.current_node_id = next_id
            return self.nodes[next_id]
        return None

    def reset(self):
        self.history.clear()
        # Find start node
        for node in self.nodes.values():
            if node.type == NodeType.START:
                self.current_node_id = node.id
                return