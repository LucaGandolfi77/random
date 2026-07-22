#include "SelectionTool.h"
#include <QPainter>
#include <QDebug>
#include <QColor>

SelectionTool::SelectionTool(QObject *parent)
    : QObject(parent), m_type(Rectangular), m_tolerance(10), m_feather(0)
{
}

SelectionTool::~SelectionTool()
{
}

void SelectionTool::startSelection(int x, int y)
{
    m_startPoint = QPoint(x, y);
    
    if (m_type == Rectangular) {
        m_selectionRect = QRect(x, y, 0, 0);
    } else {
        m_selectionPolygon.clear();
        m_selectionPolygon << QPoint(x, y);
    }
    
    emit selectionChanged();
}

void SelectionTool::updateSelection(int x, int y)
{
    if (m_type == Rectangular) {
        m_selectionRect = QRect(m_startPoint, QPoint(x, y)).normalized();
    } else if (m_type == Elliptical) {
        // Ellisse con centro m_startPoint
        int w = qAbs(x - m_startPoint.x());
        int h = qAbs(y - m_startPoint.y());
        m_selectionRect = QRect(m_startPoint.x(), m_startPoint.y(), w * 2, h * 2);
    } else if (m_type == Lasso || m_type == Polygonal) {
        m_selectionPolygon << QPoint(x, y);
    }
    
    emit selectionChanged();
}

void SelectionTool::endSelection()
{
    if (m_type == Lasso || m_type == Polygonal) {
        // Chiudi poligono
        if (!m_selectionPolygon.isEmpty() && m_selectionPolygon.first() != m_selectionPolygon.last()) {
            m_selectionPolygon << m_selectionPolygon.first();
        }
    }
    
    emit selectionChanged();
}

void SelectionTool::clearSelection()
{
    m_selectionRect = QRect();
    m_selectionPolygon.clear();
    emit selectionChanged();
}

void SelectionTool::applyToImage(QImage &image)
{
    if (image.isNull())
        return;
    
    QPainter painter(&image);
    painter.setCompositionMode(QPainter::CompositionMode_Multiply);
    
    if (m_type == Rectangular || m_type == Elliptical) {
        if (m_selectionRect.isNull())
            return;
        
        if (m_type == Rectangular) {
            painter.setPen(QPen(Qt::red, 2, Qt::DashLine));
            painter.drawRect(m_selectionRect);
        } else {
            painter.setPen(QPen(Qt::red, 2, Qt::DashLine));
            painter.drawEllipse(m_selectionRect);
        }
    } else if (!m_selectionPolygon.isEmpty()) {
        painter.setPen(QPen(Qt::red, 2, Qt::DashLine));
        painter.setBrush(Qt::NoBrush);
        painter.drawPolygon(m_selectionPolygon);
    }
}

void SelectionTool::updateFeatheredEdges(QImage &image)
{
    // Implementa sfumatura ai bordi della selezione
    if (m_feather <= 0)
        return;
    
    // TODO: Implementa sfumatura con kernel gaussiano
    Q_UNUSED(image)
}