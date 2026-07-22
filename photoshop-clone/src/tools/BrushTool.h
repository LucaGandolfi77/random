#ifndef BRUSHTOOL_H
#define BRUSHTOOL_H

#include <QObject>
#include <QColor>
#include <QImage>

class BrushTool : public QObject
{
    Q_OBJECT

public:
    explicit BrushTool(QObject *parent = nullptr);
    ~BrushTool();

    // Impostazioni
    void setColor(const QColor &color) { m_color = color; }
    QColor color() const { return m_color; }
    
    void setSize(int size) { m_size = size; }
    int size() const { return m_size; }
    
    void setOpacity(qreal opacity) { m_opacity = opacity; }
    qreal opacity() const { return m_opacity; }
    
    void setHardness(qreal hardness) { m_hardness = hardness; }
    qreal hardness() const { return m_hardness; }
    
    // Operazioni
    void apply(QImage &image, int x, int y);
    void applyWithPressure(QImage &image, int x, int y, qreal pressure);

signals:
    void colorChanged(const QColor &color);
    void sizeChanged(int size);
    void opacityChanged(qreal opacity);

private:
    QColor m_color;
    int m_size;
    qreal m_opacity;
    qreal m_hardness;
    
    void drawHardEdge(QImage &image, int x, int y);
    void drawSoftEdge(QImage &image, int x, int y);
};

#endif // BRUSHTOOL_H