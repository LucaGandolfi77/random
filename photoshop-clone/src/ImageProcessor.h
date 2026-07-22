#ifndef IMAGEPROCESSOR_H
#define IMAGEPROCESSOR_H

#include <QImage>
#include <QColor>
#include <QVector>
#include <functional>

class ImageProcessor
{
public:
    ImageProcessor();
    ~ImageProcessor();

    // Filtri base
    static QImage gaussianBlur(const QImage &image, int radius = 5);
    static QImage sharpen(const QImage &image);
    static QImage edgeDetection(const QImage &image);
    static QImage threshold(const QImage &image, int threshold = 128);
    
    // Correzione colore
    static QImage adjustBrightness(const QImage &image, int factor = 0);
    static QImage adjustContrast(const QImage &image, int factor = 0);
    static QImage adjustSaturation(const QImage &image, int factor = 0);
    static QImage adjustHue(const QImage &image, int factor = 0);
    
    // Conversioni
    static QImage toGrayscale(const QImage &image);
    static QImage toSepia(const QImage &image);
    
    // Effetti
    static QImage addNoise(const QImage &image, int noiseLevel = 10);
    static QImage pixelate(const QImage &image, int blockSize = 10);
    static QImage vignettes(const QImage &image, int intensity = 50);
    
    // Operazioni geometriche
    static QImage rotate(const QImage &image, double degrees);
    static QImage flipHorizontal(const QImage &image);
    static QImage flipVertical(const QImage &image);
    
    // Trasformazioni
    static QImage resize(const QImage &image, int width, int height);
    static QImage crop(const QImage &image, int x, int y, int width, int height);
    
    // Applicazione filtro personalizzato
    static QImage applyKernel(const QImage &image, const QVector<QVector<double>> &kernel);

private:
    static void clampValues(int &value, int min, int max);
};

#endif // IMAGEPROCESSOR_H