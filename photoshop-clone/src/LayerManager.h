#ifndef LAYERMANAGER_H
#define LAYERMANAGER_H

#include <QObject>
#include <QImage>
#include <QStack>
#include <QVector>
#include <QPair>

class Layer
{
public:
    Layer() : m_visible(true), m_opacity(1.0) {}
    Layer(const QString &name) : m_name(name), m_visible(true), m_opacity(1.0) {}
    
    void setImage(const QImage &image) { m_image = image; }
    QImage image() const { return m_image; }
    
    void setName(const QString &name) { m_name = name; }
    QString name() const { return m_name; }
    
    void setVisible(bool visible) { m_visible = visible; }
    bool isVisible() const { return m_visible; }
    
    void setOpacity(qreal opacity) { m_opacity = opacity; }
    qreal opacity() const { return m_opacity; }
    
    bool isEmpty() const { return m_image.isNull(); }

private:
    QString m_name;
    QImage m_image;
    bool m_visible;
    qreal m_opacity;
};

class LayerManager : public QObject
{
    Q_OBJECT

public:
    explicit LayerManager(QObject *parent = nullptr);
    ~LayerManager();

    // Gestione strati
    void addLayer(const QString &name = QString());
    void removeLayer(int index);
    void moveLayer(int from, int to);
    void duplicateLayer(int index);
    
    // Accessori
    int layerCount() const { return m_layers.size(); }
    Layer* layer(int index);
    const Layer* layer(int index) const;
    int currentLayer() const { return m_currentLayer; }
    void setCurrentLayer(int index);
    
    // Undo/Redo
    bool canUndo() const { return !m_undoStack.isEmpty(); }
    bool canRedo() const { return !m_redoStack.isEmpty(); }
    void undo();
    void redo();
    
    // Operazioni
    void mergeDown();
    void flatten();
    void clear();

signals:
    void layersChanged();
    void currentLayerChanged(int index);

private:
    QVector<Layer> m_layers;
    QStack<QVector<Layer>> m_undoStack;
    QStack<QVector<Layer>> m_redoStack;
    int m_currentLayer;
    
    void saveState();
    void restoreState(const QVector<Layer> &layers);
};

#endif // LAYERMANAGER_H