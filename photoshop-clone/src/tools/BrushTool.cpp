#include "BrushTool.h"
#include <QPainter>
#include <QDebug>

BrushTool::BrushTool(QObject *parent)
    : QObject(parent), m_color(Qt::black), m_size(10), m_opacity(1.0), m_hardness(1.0)
{
}

BrushTool::~BrushTool()
{
}

void BrushTool::apply(QImage &image, int x, int y)
{
    if (image.isNull())
        return;
    
    QPainter painter(&image);
    painter.setRenderHint(QPainter::Antialiasing, true);
    
    QPen pen(m_color);
    pen.setWidth(m_size * 2);
    pen.setCapStyle(Qt::RoundCap);
    pen.setJoinStyle(Qt::RoundJoin);
    
    painter.setPen(pen);
    painter.setBrush(m_color);
    
    // Disegna cerchio
    painter.drawEllipse(QPointF(x, y), m_size, m_size);
}

void BrushTool::applyWithPressure(QImage &image, int x, int y, qreal pressure)
{
    if (image.isNull())
        return;
    
    // Adatta dimensione e opacità in base alla pressione
    int adjustedSize = static_cast<int>(m_size * (0.5 + 0.5 * pressure));
    qreal adjustedOpacity = m_opacity * pressure;
    
    QPainter painter(&image);
    painter.setRenderHint(QPainter::Antialiasing, true);
    
    QPen pen(m_color);
    pen.setWidth(adjustedSize * 2);
    pen.setCapStyle(Qt::RoundCap);
    pen.setJoinStyle(Qt::RoundJoin);
    
    painter.setPen(pen);
    painter.setBrush(m_color);
    painter.setOpacity(adjustedOpacity);
    
    painter.drawEllipse(QPointF(x, y), adjustedSize, adjustedSize);
}

void BrushTool::drawHardEdge(QImage &image, int x, int y)
{
    // Pennello con bordo duro
    QPainter painter(&image);
    painter.setRenderHint(QPainter::Antialiasing, false);
    
    QBrush brush(m_color);
    QPen pen(m_color, m_size * 2, Qt::SolidLine, Qt::RoundCap, Qt::RoundJoin);
    
    painter.setPen(pen);
    painter.setBrush(brush);
    painter.drawEllipse(QPointF(x, y), m_size, m_size);
}

void BrushTool::drawSoftEdge(QImage &image, int x, int y)
{
    // Pennello con bordo morbido (gradiente)
    QRadialGradient gradient(m_size, m_size, m_size);
    gradient.setColorAt(0.0, m_color);
    gradient.setColorAt(1.0, QColor(m_color.red(), m_color.green(), m_color.blue(), 0));
    
    QPainter painter(&image);
    painter.setRenderHint(QPainter::Antialiasing, true);
    
    QBrush brush(gradient);
    painter.setBrush(brush);
    painter.setPen(Qt::NoPen);
    painter.setOpacity(m_opacity);
    
    painter.drawEllipse(QPointF(x, y), m_size, m_size);
}