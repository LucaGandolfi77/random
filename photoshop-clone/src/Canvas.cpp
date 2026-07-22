#include "Canvas.h"
#include <QPainter>
#include <QGraphicsSceneMouseEvent>
#include <QColorDialog>
#include <QDebug>
#include <QFile>
#include <QImageReader>
#include <QImageWriter>

Canvas::Canvas(QObject *parent)
    : QGraphicsItem(parent), m_brushColor(Qt::black), m_brushSize(5),
      m_brushOpacity(1.0), m_modified(false)
{
    // Canvas iniziale vuoto
    createNew(800, 600, Qt::white);
}

Canvas::~Canvas()
{
}

QRectF Canvas::boundingRect() const
{
    if (m_image.isNull())
        return QRectF(0, 0, 800, 600);
    return QRectF(0, 0, m_image.width(), m_image.height());
}

void Canvas::paint(QPainter *painter, const QStyleOptionGraphicsItem *option, QWidget *widget)
{
    Q_UNUSED(option)
    Q_UNUSED(widget)
    
    if (!m_image.isNull()) {
        painter->setRenderHint(QPainter::Antialiasing, false);
        painter->drawImage(0, 0, m_image);
    }
}

bool Canvas::loadImage(const QString &fileName)
{
    QImageReader reader(fileName);
    if (!reader.canRead()) {
        qWarning() << "Cannot read image file:" << fileName;
        return false;
    }
    
    QImage newImage = reader.read();
    if (newImage.isNull()) {
        qWarning() << "Failed to load image:" << reader.errorString();
        return false;
    }
    
    m_image = newImage.convertToFormat(QImage::Format_ARGB32_Premultiplied);
    m_modified = false;
    
    prepareGeometryChange();
    update();
    
    return true;
}

bool Canvas::saveImage(const QString &fileName)
{
    if (m_image.isNull())
        return false;
    
    QImageWriter writer(fileName);
    if (!writer.canWrite()) {
        qWarning() << "Cannot write image file:" << fileName;
        return false;
    }
    
    // Ottimizza la compressione
    if (fileName.endsWith(".png", Qt::CaseInsensitive)) {
        writer.setCompression(9);
    } else if (fileName.endsWith(".jpg", Qt::CaseInsensitive) || 
               fileName.endsWith(".jpeg", Qt::CaseInsensitive)) {
        writer.setQuality(95);
    }
    
    if (!writer.write(m_image)) {
        qWarning() << "Failed to save image:" << writer.errorString();
        return false;
    }
    
    m_modified = false;
    return true;
}

void Canvas::createNew(int width, int height, const QColor &background)
{
    m_image = QImage(width, height, QImage::Format_ARGB32_Premultiplied);
    m_image.fill(background.rgba());
    m_modified = false;
    
    prepareGeometryChange();
    update();
}

void Canvas::setImage(const QImage &image)
{
    m_image = image.convertToFormat(QImage::Format_ARGB32_Premultiplied);
    m_modified = false;
    prepareGeometryChange();
    update();
}

void Canvas::mousePressEvent(QGraphicsSceneMouseEvent *event)
{
    if (event->button() == Qt::LeftButton) {
        const QPointF pos = event->scenePos();
        drawPixel(pos, m_brushColor);
        m_lastPos = pos;
        event->accept();
    }
    QGraphicsItem::mousePressEvent(event);
}

void Canvas::mouseMoveEvent(QGraphicsSceneMouseEvent *event)
{
    if (event->buttons() & Qt::LeftButton) {
        const QPointF pos = event->scenePos();
        drawPixel(pos, m_brushColor);
        m_lastPos = pos;
        event->accept();
    }
    QGraphicsItem::mouseMoveEvent(event);
}

void Canvas::mouseReleaseEvent(QGraphicsSceneMouseEvent *event)
{
    if (event->button() == Qt::LeftButton) {
        m_modified = true;
    }
    QGraphicsItem::mouseReleaseEvent(event);
}

void Canvas::mouseDoubleClickEvent(QGraphicsSceneMouseEvent *event)
{
    Q_UNUSED(event)
    // Doppio click - apri dialog colore pennello
    QColor newColor = QColorDialog::getColor(m_brushColor, nullptr, tr("Select Brush Color"));
    if (newColor.isValid()) {
        m_brushColor = newColor;
    }
}

void Canvas::drawPixel(const QPointF &pos, const QColor &color)
{
    if (m_image.isNull())
        return;
    
    const int x = static_cast<int>(pos.x());
    const int y = static_cast<int>(pos.y());
    
    if (x < 0 || x >= m_image.width() || y < 0 || y >= m_image.height())
        return;
    
    // Disegna con dimensione brush
    for (int dy = -m_brushSize; dy <= m_brushSize; ++dy) {
        for (int dx = -m_brushSize; dx <= m_brushSize; ++dx) {
            const int px = x + dx;
            const int py = y + dy;
            
            if (px >= 0 && px < m_image.width() && py >= 0 && py < m_image.height()) {
                // Calcola distanza per effetto pennello circolare
                const qreal dist = qSqrt(dx * dx + dy * dy);
                if (dist <= static_cast<qreal>(m_brushSize)) {
                    // Applica opacità
                    QRgba64 pixel = m_image.pixelColor(px, py).rgba();
                    const qreal alpha = (1.0 - pixel.alphaF()) * m_brushOpacity;
                    const qreal newAlpha = qMin(1.0, alpha + pixel.alphaF());
                    
                    // Interpolazione colore
                    const qreal r = pixel.redF() * (1 - alpha) + color.redF() * alpha;
                    const qreal g = pixel.greenF() * (1 - alpha) + color.greenF() * alpha;
                    const qreal b = pixel.blueF() * (1 - alpha) + color.blueF() * alpha;
                    
                    m_image.setPixelColor(px, py, QColor::fromRgbF(r, g, b, newAlpha));
                }
            }
        }
    }
    
    update();
}