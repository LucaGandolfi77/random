#ifndef MAINWINDOW_H
#define MAINWINDOW_H

#include <QMainWindow>
#include <QMenuBar>
#include <QToolBar>
#include <QStatusBar>
#include <QDockWidget>
#include <QGraphicsView>
#include "Canvas.h"
#include "LayerManager.h"

class QAction;
class QGraphicsScene;

class MainWindow : public QMainWindow
{
    Q_OBJECT

public:
    MainWindow(QWidget *parent = nullptr);
    ~MainWindow();

private slots:
    void openFile();
    void saveFile();
    void saveAs();
    void newDocument();
    void undo();
    void redo();
    void cut();
    void copy();
    void paste();
    void zoomIn();
    void zoomOut();
    void fitToWindow();
    void about();

private:
    void createActions();
    void createMenus();
    void createToolBars();
    void createStatusBar();
    void createLayerDock();
    void updateMenus();

    Canvas *m_canvas;
    LayerManager *m_layerManager;
    QGraphicsView *m_view;
    
    QAction *m_undoAction;
    QAction *m_redoAction;
    QAction *m_openAction;
    QAction *m_saveAction;
    
    double m_zoomFactor;
    QString m_currentFile;
};

#endif // MAINWINDOW_H