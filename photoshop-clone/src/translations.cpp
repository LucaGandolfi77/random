#include "MainWindow.h"
#include <QTranslator>
#include <QLocale>
#include <QDebug>

// File di traduzione per l'applicazione
// Genera i file .qm con: lrelease translations/photoshopclone.pro

static QTranslator *translator = nullptr;

bool loadTranslation(const QString &language)
{
    if (!translator) {
        translator = new QTranslator();
    }
    
    QString translationFile = QString(":/translations/photoshopclone_%1.qm").arg(language);
    
    if (translator->load(translationFile)) {
        QApplication::installTranslator(translator);
        return true;
    }
    
    return false;
}

QString getSystemLanguage()
{
    QLocale locale = QLocale::system();
    return locale.name();
}