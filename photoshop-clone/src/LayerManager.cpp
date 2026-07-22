#include "LayerManager.h"
#include <QDebug>

LayerManager::LayerManager(QObject *parent)
    : QObject(parent), m_currentLayer(-1)
{
    addLayer(tr("Background"));
}

LayerManager::~LayerManager()
{
}

void LayerManager::addLayer(const QString &name)
{
    Layer layer(name.isEmpty() ? tr("Layer %1").arg(m_layers.size() + 1) : name);
    m_layers.append(layer);
    
    if (m_currentLayer < 0) {
        m_currentLayer = 0;
    }
    
    saveState();
    emit layersChanged();
    emit currentLayerChanged(m_currentLayer);
}

void LayerManager::removeLayer(int index)
{
    if (index < 0 || index >= m_layers.size())
        return;
    
    m_layers.removeAt(index);
    
    if (m_currentLayer >= m_layers.size()) {
        m_currentLayer = m_layers.size() - 1;
    } else if (m_currentLayer < 0 && !m_layers.isEmpty()) {
        m_currentLayer = 0;
    }
    
    saveState();
    emit layersChanged();
    emit currentLayerChanged(m_currentLayer);
}

void LayerManager::moveLayer(int from, int to)
{
    if (from < 0 || from >= m_layers.size() || to < 0 || to >= m_layers.size())
        return;
    
    Layer layer = m_layers.takeAt(from);
    m_layers.insert(to, layer);
    
    if (m_currentLayer == from) {
        m_currentLayer = to;
    } else if (m_currentLayer > from && m_currentLayer <= to) {
        m_currentLayer--;
    } else if (m_currentLayer < from && m_currentLayer >= to) {
        m_currentLayer++;
    }
    
    saveState();
    emit layersChanged();
    emit currentLayerChanged(m_currentLayer);
}

void LayerManager::duplicateLayer(int index)
{
    if (index < 0 || index >= m_layers.size())
        return;
    
    Layer newLayer = m_layers.at(index);
    newLayer.setName(tr("%1 copy").arg(newLayer.name()));
    m_layers.insert(m_currentLayer + 1, newLayer);
    
    m_currentLayer++;
    
    saveState();
    emit layersChanged();
    emit currentLayerChanged(m_currentLayer);
}

Layer* LayerManager::layer(int index)
{
    if (index < 0 || index >= m_layers.size())
        return nullptr;
    return &m_layers[index];
}

const Layer* LayerManager::layer(int index) const
{
    if (index < 0 || index >= m_layers.size())
        return nullptr;
    return &m_layers[index];
}

void LayerManager::setCurrentLayer(int index)
{
    if (index < 0 || index >= m_layers.size())
        return;
    
    m_currentLayer = index;
    emit currentLayerChanged(m_currentLayer);
}

void LayerManager::undo()
{
    if (m_undoStack.isEmpty())
        return;
    
    QVector<Layer> currentState = m_layers;
    m_redoStack.push(currentState);
    
    m_layers = m_undoStack.pop();
    m_currentLayer = 0;
    if (!m_layers.isEmpty())
        m_currentLayer = qBound(0, m_currentLayer, m_layers.size() - 1);
    
    emit layersChanged();
    emit currentLayerChanged(m_currentLayer);
}

void LayerManager::redo()
{
    if (m_redoStack.isEmpty())
        return;
    
    QVector<Layer> currentState = m_layers;
    m_undoStack.push(currentState);
    
    m_layers = m_redoStack.pop();
    m_currentLayer = 0;
    if (!m_layers.isEmpty())
        m_currentLayer = qBound(0, m_currentLayer, m_layers.size() - 1);
    
    emit layersChanged();
    emit currentLayerChanged(m_currentLayer);
}

void LayerManager::mergeDown()
{
    if (m_currentLayer <= 0 || m_layers.size() < 2)
        return;
    
    Layer *current = &m_layers[m_currentLayer];
    Layer *below = &m_layers[m_currentLayer - 1];
    
    // Crea immagine fusa
    QImage merged = below->image();
    if (merged.isNull())
        merged = QImage(800, 600, QImage::Format_ARGB32_Premultiplied);
    
    QPainter painter(&merged);
    painter.setOpacity(current->opacity());
    painter.drawImage(0, 0, current->image());
    painter.end();
    
    below->setImage(merged);
    below->setName(current->name());
    
    removeLayer(m_currentLayer);
}

void LayerManager::flatten()
{
    if (m_layers.isEmpty())
        return;
    
    QImage flattened;
    if (!m_layers.first().image().isNull()) {
        flattened = m_layers.first().image();
    } else {
        flattened = QImage(800, 600, QImage::Format_ARGB32_Premultiplied);
        flattened.fill(Qt::white);
    }
    
    for (int i = 1; i < m_layers.size(); ++i) {
        if (!m_layers[i].isVisible())
            continue;
        
        QPainter painter(&flattened);
        painter.setOpacity(m_layers[i].opacity());
        painter.drawImage(0, 0, m_layers[i].image());
        painter.end();
    }
    
    m_layers.clear();
    addLayer(tr("Flattened"));
    m_layers.first().setImage(flattened);
    m_currentLayer = 0;
    
    // Pulisci stack undo/redo
    while (!m_undoStack.isEmpty()) m_undoStack.pop();
    while (!m_redoStack.isEmpty()) m_redoStack.pop();
    
    emit layersChanged();
    emit currentLayerChanged(m_currentLayer);
}

void LayerManager::clear()
{
    m_layers.clear();
    m_undoStack.clear();
    m_redoStack.clear();
    m_currentLayer = -1;
    
    emit layersChanged();
    emit currentLayerChanged(m_currentLayer);
}

void LayerManager::saveState()
{
    m_undoStack.push(m_layers);
    
    // Limita la dimensione dello stack
    if (m_undoStack.size() > 50) {
        m_undoStack.removeFirst();
    }
    
    // Pulisci redo quando si fa una nuova azione
    m_redoStack.clear();
}

void LayerManager::restoreState(const QVector<Layer> &layers)
{
    m_layers = layers;
    emit layersChanged();
}