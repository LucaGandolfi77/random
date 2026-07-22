#include <QApplication>
#include <QTranslator>
#include <QLocale>
#include "MainWindow.h"

int main(int argc, char *argv[])
{
    QApplication app(argc, argv);
    
    // Imposta il nome dell'applicazione
    QApplication::setApplicationName("Photoshop Clone");
    QApplication::setApplicationVersion("1.0.0");
    QApplication::setOrganizationName("OpenSource");
    
    // Supporto lingua
    QTranslator translator;
    const QStringList uiLanguages = QLocale::system().uiLanguages();
    for (const QString &locale : uiLanguages) {
        const QString baseName = "photoshopclone_" + QLocale(locale).name();
        if (translator.load(":/translations/" + baseName)) {
            app.installTranslator(&translator);
            break;
        }
    }
    
    // Crea e mostra la finestra principale
    MainWindow window;
    window.show();
    
    return app.exec();
}