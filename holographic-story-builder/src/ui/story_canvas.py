"""
Story Canvas - Visual node editor for story creation
"""
from PyQt6.QtWidgets import QWidget, QGraphicsView, QGraphicsScene, QGraphicsItem
from PyQt6.QtCore import Qt, QPointF
from PyQt6.QtGui import QPen, QBrush, QColor


class StoryNodeItem(QGraphicsItem):
    def __init__(self, node_id: str, title: str, x: float = 0, y: float = 0):
        super().__init__()
        self.node_id = node_id
        self.title = title
        self.setPos(x, y)
        self.setFlag(QGraphicsItem.GraphicsItemFlag.ItemMovable)
        self.setFlag(QGraphicsItem.GraphicsItemFlag.ItemSelectable)

    def boundingRect(self):
        return self.__bounding_rect__

    @property
    def __bounding_rect__(self):
        from PyQt6.QtCore import QRectF
        return QRectF(0, 0, 150, 80)

    def paint(self, painter, option, widget):
        pen = QPen(QColor(100, 200, 255))
        brush = QBrush(QColor(30, 30, 50, 200))
        painter.setPen(pen)
        painter.setBrush(brush)
        painter.drawRoundedRect(0, 0, 150, 80, 10, 10)
        painter.drawText(10, 20, self.title)


class StoryCanvas(QGraphicsView):
    def __init__(self):
        super().__init__()
        self.scene = QGraphicsScene()
        self.setScene(self.scene)
        self.nodes = {}
        self.setStyleSheet("background-color: #1a1a2e;")

    def add_node(self, node_id: str, title: str, x: float = 0, y: float = 0):
        node_item = StoryNodeItem(node_id, title, x, y)
        self.scene.addItem(node_item)
        self.nodes[node_id] = node_item
        return node_item

    def clear_canvas(self):
        self.scene.clear()
        self.nodes.clear()