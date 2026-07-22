#ifndef CANVAS_H
#define CANVAS_H

#include <QGraphicsItem>
#include <QImage>
#include <QPixmap>
#include <QMouseEvent>
#include <QGraphicsScene>
#include <memory>

class Canvas : public QGraphicsItem
{
public:
    explicit Canvas(QObject *parent = nullptr);
    ~Canvas();

    // Dimensioni bounding rect
    QRectF boundingRect() const override;
    
    // Paint
    void paint(QPainter *painter, const QStyleOptionGraphicsItem *option, QWidget *widget) override;

    // Operazioni immagine
    bool loadImage(const QString &fileName);
    bool saveImage(const QString &fileName);
    void createNew(int width, int height, const QColor &background = Qt::white);
    
    // Accessori
    QImage image() const { return m_image; }
    void setImage(const QImage &image);
    
    // Strumenti
    void setBrushColor(const QColor &color) { m_brushColor = color; update(); }
    void setBrushSize(int size) { m_brushSize = size; update(); }
    void setBrushOpacity(qreal opacity) { m_brushOpacity = opacity; update(); }
    
    // Stato
    bool isModified() const { return m_modified; }
    void setModified(bool modified) { m_modified = modified; }

protected:
    // Eventi mouse
    void mousePressEvent(QGraphicsSceneMouseEvent *event) override;
    void mouseMoveEvent(QGraphicsSceneMouseEvent *event) override;
    void mouseReleaseEvent(QGraphicsSceneMouseEvent *event) override;
    void mouseDoubleClickEvent(QGraphicsSceneMouseEvent *event) override;

private:
    QImage m_image;
    QColor m_brushColor;
    int m_brushSize;
    qreal m_brushOpacity;
    bool m_modified;
    QPointF m_lastPos;
    
    void drawPixel(const QPointF &pos, const QColor &color);
};

#endif // CANVAS_H