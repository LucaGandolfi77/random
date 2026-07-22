#ifndef SELECTIONTOOL_H
#define SELECTIONTOOL_H

#include <QObject>
#include <QRect>
#include <QPolygon>
#include <QImage>

class SelectionTool : public QObject
{
    Q_OBJECT

public:
    enum ToolType {
        Rectangular,
        Elliptical,
        Lasso,
        MagicWand,
        Polygonal
    };

    explicit SelectionTool(QObject *parent = nullptr);
    ~SelectionTool();

    // Impostazioni
    void setToolType(ToolType type) { m_type = type; }
    ToolType toolType() const { return m_type; }
    
    void setTolerance(int tolerance) { m_tolerance = tolerance; }
    int tolerance() const { return m_tolerance; }
    
    void setFeather(qreal feather) { m_feather = feather; }
    qreal feather() const { return m_feather; }
    
    // Operazioni
    void startSelection(int x, int y);
    void updateSelection(int x, int y);
    void endSelection();
    
    QRect selectionRect() const { return m_selectionRect; }
    QPolygon selectionPolygon() const { return m_selectionPolygon; }
    bool hasSelection() const { return !m_selectionRect.isNull() || !m_selectionPolygon.isEmpty(); }
    
    void clearSelection();
    
    // Applicazione selezione
    void applyToImage(QImage &image);

signals:
    void selectionChanged();

private:
    ToolType m_type;
    int m_tolerance;
    qreal m_feather;
    
    QRect m_selectionRect;
    QPolygon m_selectionPolygon;
    QPoint m_startPoint;
    
    void updateFeatheredEdges(QImage &image);
};

#endif // SELECTIONTOOL_H