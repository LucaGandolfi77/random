#include "MainWindow.h"
#include <QAction>
#include <QMenu>
#include <QMenuBar>
#include <QToolBar>
#include <QStatusBar>
#include <QFileDialog>
#include <QMessageBox>
#include <QGraphicsScene>
#include <QGraphicsView>
#include <QGraphicsPixmapItem>
#include <QInputDialog>
#include <QIcon>
#include <QStyle>
#include <QTranslator>
#include <QApplication>
#include <QDockWidget>
#include <QVBoxLayout>
#include <QLabel>
#include <QScrollArea>
#include <QGraphicsRectItem>
#include <QGraphicsEllipseItem>
#include <QColorDialog>
#include <QPen>
#include <QPainter>
#include <QImage>
#include <QMouseEvent>
#include <QKeyEvent>
#include <QRandomGenerator>
#include <QDebug>

MainWindow::MainWindow(QWidget *parent)
    : QMainWindow(parent), m_canvas(new Canvas(this)), m_layerManager(new LayerManager(this)),
      m_view(new QGraphicsView(this)), m_zoomFactor(1.0)
{
    // Imposta titolo finestra
    setWindowTitle(tr("Photoshop Clone - Untitled"));
    resize(1200, 800);
    
    // Crea widget centrale
    QWidget *centralWidget = new QWidget(this);
    QVBoxLayout *layout = new QVBoxLayout(centralWidget);
    layout->addWidget(m_view);
    setCentralWidget(centralWidget);
    
    // Configura scena grafica
    QGraphicsScene *scene = new QGraphicsScene(this);
    m_view->setScene(scene);
    m_view->setRenderHint(QPainter::Antialiasing);
    m_view->setDragMode(QGraphicsView::RubberBandDrag);
    
    // Aggiungi canvas alla scena
    scene->addItem(m_canvas);
    
    // Crea azioni e menu
    createActions();
    createMenus();
    createToolBars();
    createStatusBar();
    createLayerDock();
    
    // Stato iniziale
    updateMenus();
}

MainWindow::~MainWindow()
{
}

void MainWindow::createActions()
{
    // Azioni file
    m_openAction = new QAction(QIcon::fromTheme("document-open"), tr("&Open..."), this);
    m_openAction->setShortcuts(QKeySequence::Open);
    m_openAction->setStatusTip(tr("Open an existing file"));
    connect(m_openAction, &QAction::triggered, this, &MainWindow::openFile);

    QAction *saveAction = new QAction(QIcon::fromTheme("document-save"), tr("&Save"), this);
    saveAction->setShortcuts(QKeySequence::Save);
    saveAction->setStatusTip(tr("Save the document"));
    connect(saveAction, &QAction::triggered, this, &MainWindow::saveFile);

    QAction *saveAsAction = new QAction(QIcon::fromTheme("document-save-as"), tr("Save &As..."), this);
    saveAsAction->setShortcuts(QKeySequence::SaveAs);
    saveAsAction->setStatusTip(tr("Save the document with a new name"));
    connect(saveAsAction, &QAction::triggered, this, &MainWindow::saveAs);

    QAction *newAction = new QAction(QIcon::fromTheme("document-new"), tr("&New"), this);
    newAction->setShortcuts(QKeySequence::New);
    newAction->setStatusTip(tr("Create a new document"));
    connect(newAction, &QAction::triggered, this, &MainWindow::newDocument);

    // Azioni edit
    m_undoAction = new QAction(QIcon::fromTheme("edit-undo"), tr("&Undo"), this);
    m_undoAction->setShortcuts(QKeySequence::Undo);
    m_undoAction->setStatusTip(tr("Undo the last operation"));
    m_undoAction->setEnabled(false);
    connect(m_undoAction, &QAction::triggered, this, &MainWindow::undo);

    m_redoAction = new QAction(QIcon::fromTheme("edit-redo"), tr("&Redo"), this);
    m_redoAction->setShortcuts(QKeySequence::Redo);
    m_redoAction->setStatusTip(tr("Redo the last operation"));
    m_redoAction->setEnabled(false);
    connect(m_redoAction, &QAction::triggered, this, &MainWindow::redo);

    QAction *cutAction = new QAction(QIcon::fromTheme("edit-cut"), tr("Cu&t"), this);
    cutAction->setShortcuts(QKeySequence::Cut);
    cutAction->setStatusTip(tr("Cut the current selection"));
    connect(cutAction, &QAction::triggered, this, &MainWindow::cut);

    QAction *copyAction = new QAction(QIcon::fromTheme("edit-copy"), tr("&Copy"), this);
    copyAction->setShortcuts(QKeySequence::Copy);
    copyAction->setStatusTip(tr("Copy the current selection"));
    connect(copyAction, &QAction::triggered, this, &MainWindow::copy);

    QAction *pasteAction = new QAction(QIcon::fromTheme("edit-paste"), tr("&Paste"), this);
    pasteAction->setShortcuts(QKeySequence::Paste);
    pasteAction->setStatusTip(tr("Paste the clipboard contents"));
    connect(pasteAction, &QAction::triggered, this, &MainWindow::paste);

    // Azioni zoom
    QAction *zoomInAction = new QAction(QIcon::fromTheme("zoom-in"), tr("Zoom &In"), this);
    zoomInAction->setShortcuts(QKeySequence::ZoomIn);
    zoomInAction->setStatusTip(tr("Increase the zoom level"));
    connect(zoomInAction, &QAction::triggered, this, &MainWindow::zoomIn);

    QAction *zoomOutAction = new QAction(QIcon::fromTheme("zoom-out"), tr("Zoom &Out"), this);
    zoomOutAction->setShortcuts(QKeySequence::ZoomOut);
    zoomOutAction->setStatusTip(tr("Decrease the zoom level"));
    connect(zoomOutAction, &QAction::triggered, this, &MainWindow::zoomOut);

    QAction *fitAction = new QAction(tr("&Fit to Window"), this);
    fitAction->setStatusTip(tr("Fit the image to the window"));
    connect(fitAction, &QAction::triggered, this, &MainWindow::fitToWindow);

    // Azione about
    QAction *aboutAction = new QAction(tr("&About"), this);
    aboutAction->setStatusTip(tr("Show the application's About box"));
    connect(aboutAction, &QAction::triggered, this, &MainWindow::about);
}

void MainWindow::createMenus()
{
    // Menu File
    QMenu *fileMenu = menuBar()->addMenu(QIcon::fromTheme("document-new"), tr("&File"));
    fileMenu->addAction(new QAction(QIcon::fromTheme("document-new"), tr("&New"), this));
    fileMenu->addAction(m_openAction);
    fileMenu->addAction(m_saveAction);
    fileMenu->addAction(new QAction(QIcon::fromTheme("document-save-as"), tr("Save &As..."), this));
    fileMenu->addSeparator();
    fileMenu->addAction(new QAction(tr("E&xit"), this));

    // Menu Edit
    QMenu *editMenu = menuBar()->addMenu(QIcon::fromTheme("edit"), tr("&Edit"));
    editMenu->addAction(m_undoAction);
    editMenu->addAction(m_redoAction);
    editMenu->addSeparator();
    editMenu->addAction(new QAction(QIcon::fromTheme("edit-cut"), tr("Cu&t"), this));
    editMenu->addAction(new QAction(QIcon::fromTheme("edit-copy"), tr("&Copy"), this));
    editMenu->addAction(new QAction(QIcon::fromTheme("edit-paste"), tr("&Paste"), this));

    // Menu View
    QMenu *viewMenu = menuBar()->addMenu(tr("&View"));
    viewMenu->addAction(new QAction(tr("Zoom &In"), this));
    viewMenu->addAction(new QAction(tr("Zoom &Out"), this));
    viewMenu->addAction(new QAction(tr("&Fit to Window"), this));

    // Menu Help
    QMenu *helpMenu = menuBar()->addMenu(tr("&Help"));
    helpMenu->addAction(new QAction(tr("&About"), this));
}

void MainWindow::createToolBars()
{
    // Toolbar principale
    QToolBar *mainToolbar = addToolBar(tr("Main"));
    mainToolbar->setMovable(true);
    
    mainToolbar->addAction(new QAction(QIcon::fromTheme("document-new"), tr("New"), this));
    mainToolbar->addAction(m_openAction);
    mainToolbar->addAction(m_saveAction);
    mainToolbar->addSeparator();
    mainToolbar->addAction(m_undoAction);
    mainToolbar->addAction(m_redoAction);
    mainToolbar->addSeparator();
    mainToolbar->addAction(new QAction(QIcon::fromTheme("edit-cut"), tr("Cut"), this));
    mainToolbar->addAction(new QAction(QIcon::fromTheme("edit-copy"), tr("Copy"), this));
    mainToolbar->addAction(new QAction(QIcon::fromTheme("edit-paste"), tr("Paste"), this));
}

void MainWindow::createStatusBar()
{
    statusBar()->showMessage(tr("Ready"));
}

void MainWindow::createLayerDock()
{
    QDockWidget *dock = new QDockWidget(tr("Layers"), this);
    dock->setAllowedAreas(Qt::LeftDockWidgetArea | Qt::RightDockWidgetArea);
    
    QWidget *layerWidget = new QWidget(this);
    QVBoxLayout *layout = new QVBoxLayout(layerWidget);
    
    QLabel *label = new QLabel(tr("Layer 1"), this);
    layout->addWidget(label);
    
    dock->setWidget(layerWidget);
    addDockWidget(Qt::LeftDockWidgetArea, dock);
}

void MainWindow::updateMenus()
{
    // Aggiorna stato azioni
    m_undoAction->setEnabled(m_layerManager->canUndo());
    m_redoAction->setEnabled(m_layerManager->canRedo());
}

void MainWindow::openFile()
{
    QString fileName = QFileDialog::getOpenFileName(this, tr("Open File"),
        "", tr("Images (*.png *.jpg *.jpeg *.bmp *.tif);;All Files (*)"));
    if (!fileName.isEmpty()) {
        if (m_canvas->loadImage(fileName)) {
            m_currentFile = fileName;
            setWindowTitle(tr("Photoshop Clone - %1").arg(fileName));
        }
    }
}

void MainWindow::saveFile()
{
    if (m_currentFile.isEmpty()) {
        saveAs();
    } else {
        m_canvas->saveImage(m_currentFile);
    }
}

void MainWindow::saveAs()
{
    QString fileName = QFileDialog::getSaveFileName(this, tr("Save File"),
        "", tr("PNG Files (*.png);;JPEG Files (*.jpg *.jpeg);;BMP Files (*.bmp);;All Files (*)"));
    if (!fileName.isEmpty()) {
        if (m_canvas->saveImage(fileName)) {
            m_currentFile = fileName;
            setWindowTitle(tr("Photoshop Clone - %1").arg(fileName));
        }
    }
}

void MainWindow::newDocument()
{
    bool ok;
    int width = QInputDialog::getInt(this, tr("New Document"), tr("Width:"), 800, 1, 10000, 1, &ok);
    if (!ok) return;
    
    int height = QInputDialog::getInt(this, tr("New Document"), tr("Height:"), 600, 1, 10000, 1, &ok);
    if (!ok) return;
    
    QColor bgColor = QColorDialog::getColor(Qt::white, this, tr("Background Color"));
    if (!bgColor.isValid()) return;
    
    m_canvas->createNew(width, height, bgColor);
    m_currentFile.clear();
    setWindowTitle(tr("Photoshop Clone - Untitled"));
}

void MainWindow::undo()
{
    m_layerManager->undo();
    updateMenus();
}

void MainWindow::redo()
{
    m_layerManager->redo();
    updateMenus();
}

void MainWindow::cut()
{
    // Implementazione taglio
    statusBar()->showMessage(tr("Cut"), 2000);
}

void MainWindow::copy()
{
    // Implementazione copia
    statusBar()->showMessage(tr("Copy"), 2000);
}

void MainWindow::paste()
{
    // Implementazione incolla
    statusBar()->showMessage(tr("Paste"), 2000);
}

void MainWindow::zoomIn()
{
    m_zoomFactor *= 1.25;
    m_view->scale(1.25, 1.25);
    statusBar()->showMessage(tr("Zoom: %1%").arg(int(m_zoomFactor * 100)), 2000);
}

void MainWindow::zoomOut()
{
    m_zoomFactor /= 1.25;
    m_view->scale(0.8, 0.8);
    statusBar()->showMessage(tr("Zoom: %1%").arg(int(m_zoomFactor * 100)), 2000);
}

void MainWindow::fitToWindow()
{
    if (m_canvas && m_view) {
        QRect rect = m_view->viewport()->rect();
        m_view->fitInView(m_canvas->sceneRect(), Qt::KeepAspectRatio);
        m_zoomFactor = 1.0;
        statusBar()->showMessage(tr("Fit to Window"), 2000);
    }
}

void MainWindow::about()
{
    QMessageBox::about(this, tr("About Photoshop Clone"),
        tr("<b>Photoshop Clone</b> v1.0.0<br>"
           "A free, open-source image editor.<br><br>"
           "Built with Qt6 and OpenCV.<br>"
           "Copyright © 2024 OpenSource"));
}