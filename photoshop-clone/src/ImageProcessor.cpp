#include "ImageProcessor.h"
#include <QColor>
#include <QMatrix>
#include <QtMath>
#include <QRandomGenerator>
#include <QDebug>

ImageProcessor::ImageProcessor()
{
}

ImageProcessor::~ImageProcessor()
{
}

QImage ImageProcessor::gaussianBlur(const QImage &image, int radius)
{
    if (image.isNull() || radius < 1)
        return image;
    
    QImage result = image.convertToFormat(QImage::Format_ARGB32);
    const int width = result.width();
    const int height = result.height();
    
    // Crea kernel gaussiano
    const int size = radius * 2 + 1;
    QVector<double> kernel(size * size);
    
    double sigma = radius / 3.0;
    double sum = 0.0;
    
    for (int y = -radius; y <= radius; ++y) {
        for (int x = -radius; x <= radius; ++x) {
            double value = (1.0 / (2 * M_PI * sigma * sigma)) *
                          qExp(-(x * x + y * y) / (2 * sigma * sigma));
            kernel[(y + radius) * size + (x + radius)] = value;
            sum += value;
        }
    }
    
    // Normalizza
    for (int i = 0; i < kernel.size(); ++i) {
        kernel[i] /= sum;
    }
    
    // Applica blur
    QImage temp = result;
    for (int y = 0; y < height; ++y) {
        for (int x = 0; x < width; ++x) {
            double r = 0, g = 0, b = 0, a = 0;
            
            for (int ky = -radius; ky <= radius; ++ky) {
                for (int kx = -radius; kx <= radius; ++kx) {
                    int px = x + kx;
                    int py = y + ky;
                    
                    if (px >= 0 && px < width && py >= 0 && py < height) {
                        QColor color = temp.pixelColor(px, py);
                        double weight = kernel[(ky + radius) * size + (kx + radius)];
                        
                        r += color.redF() * weight;
                        g += color.greenF() * weight;
                        b += color.blueF() * weight;
                        a += color.alphaF() * weight;
                    }
                }
            }
            
            result.setPixelColor(x, y, QColor::fromRgbF(r, g, b, a));
        }
    }
    
    return result;
}

QImage ImageProcessor::sharpen(const QImage &image)
{
    if (image.isNull())
        return image;
    
    QVector<QVector<double>> kernel = {
        {0, -1, 0},
        {-1, 5, -1},
        {0, -1, 0}
    };
    
    return applyKernel(image, kernel);
}

QImage ImageProcessor::edgeDetection(const QImage &image)
{
    if (image.isNull())
        return image;
    
    QVector<QVector<double>> kernel = {
        {-1, -1, -1},
        {-1, 8, -1},
        {-1, -1, -1}
    };
    
    return applyKernel(image, kernel);
}

QImage ImageProcessor::threshold(const QImage &image, int threshold)
{
    if (image.isNull())
        return image;
    
    QImage result = image.convertToFormat(QImage::Format_RGB32);
    const int width = result.width();
    const int height = result.height();
    
    for (int y = 0; y < height; ++y) {
        for (int x = 0; x < width; ++x) {
            QColor color = result.pixelColor(x, y);
            int gray = qGray(color.rgb());
            
            if (gray >= threshold) {
                result.setPixelColor(x, y, QColor(255, 255, 255));
            } else {
                result.setPixelColor(x, y, QColor(0, 0, 0));
            }
        }
    }
    
    return result;
}

QImage ImageProcessor::adjustBrightness(const QImage &image, int factor)
{
    if (image.isNull())
        return image;
    
    QImage result = image.convertToFormat(QImage::Format_ARGB32);
    const int width = result.width();
    const int height = result.height();
    
    for (int y = 0; y < height; ++y) {
        for (int x = 0; x < width; ++x) {
            QColor color = result.pixelColor(x, y);
            
            int r = qBound(0, color.red() + factor, 255);
            int g = qBound(0, color.green() + factor, 255);
            int b = qBound(0, color.blue() + factor, 255);
            
            result.setPixelColor(x, y, QColor(r, g, b, color.alpha()));
        }
    }
    
    return result;
}

QImage ImageProcessor::adjustContrast(const QImage &image, int factor)
{
    if (image.isNull())
        return image;
    
    QImage result = image.convertToFormat(QImage::Format_ARGB32);
    const int width = result.width();
    const int height = result.height();
    
    double contrast = 1.0 + (factor / 100.0);
    
    for (int y = 0; y < height; ++y) {
        for (int x = 0; x < width; ++x) {
            QColor color = result.pixelColor(x, y);
            
            int r = qBound(0, static_cast<int>((color.red() - 128) * contrast + 128), 255);
            int g = qBound(0, static_cast<int>((color.green() - 128) * contrast + 128), 255);
            int b = qBound(0, static_cast<int>((color.blue() - 128) * contrast + 128), 255);
            
            result.setPixelColor(x, y, QColor(r, g, b, color.alpha()));
        }
    }
    
    return result;
}

QImage ImageProcessor::adjustSaturation(const QImage &image, int factor)
{
    if (image.isNull())
        return image;
    
    QImage result = image.convertToFormat(QImage::Format_ARGB32);
    const int width = result.width();
    const int height = result.height();
    
    for (int y = 0; y < height; ++y) {
        for (int x = 0; x < width; ++x) {
            QColor color = result.pixelColor(x, y);
            
            // Converti in HSB
            QColor hsb = color.toHsv();
            int saturation = hsb.saturation();
            saturation = qBound(0, saturation + factor, 255);
            hsb.setSaturation(saturation);
            
            result.setPixelColor(x, y, hsb.toRgb());
        }
    }
    
    return result;
}

QImage ImageProcessor::adjustHue(const QImage &image, int factor)
{
    if (image.isNull())
        return image;
    
    QImage result = image.convertToFormat(QImage::Format_ARGB32);
    const int width = result.width();
    const int height = result.height();
    
    for (int y = 0; y < height; ++y) {
        for (int x = 0; x < width; ++x) {
            QColor color = result.pixelColor(x, y);
            
            // Converti in HSB
            QColor hsb = color.toHsv();
            int hue = hsb.hue();
            hue = qBound(0, hue + factor, 360);
            hsb.setHue(hue);
            
            result.setPixelColor(x, y, hsb.toRgb());
        }
    }
    
    return result;
}

QImage ImageProcessor::toGrayscale(const QImage &image)
{
    if (image.isNull())
        return image;
    
    QImage result = image.convertToFormat(QImage::Format_RGB32);
    const int width = result.width();
    const int height = result.height();
    
    for (int y = 0; y < height; ++y) {
        for (int x = 0; x < width; ++x) {
            QColor color = result.pixelColor(x, y);
            int gray = qGray(color.rgb());
            result.setPixelColor(x, y, QColor(gray, gray, gray));
        }
    }
    
    return result;
}

QImage ImageProcessor::toSepia(const QImage &image)
{
    if (image.isNull())
        return image;
    
    QImage result = image.convertToFormat(QImage::Format_ARGB32);
    const int width = result.width();
    const int height = result.height();
    
    for (int y = 0; y < height; ++y) {
        for (int x = 0; x < width; ++x) {
            QColor color = result.pixelColor(x, y);
            
            int r = color.red();
            int g = color.green();
            int b = color.blue();
            
            int newR = qBound(0, static_cast<int>(0.393 * r + 0.769 * g + 0.114 * b), 255);
            int newG = qBound(0, static_cast<int>(0.349 * r + 0.686 * g + 0.168 * b), 255);
            int newB = qBound(0, static_cast<int>(0.272 * r + 0.534 * g + 0.131 * b), 255);
            
            result.setPixelColor(x, y, QColor(newR, newG, newB, color.alpha()));
        }
    }
    
    return result;
}

QImage ImageProcessor::addNoise(const QImage &image, int noiseLevel)
{
    if (image.isNull())
        return image;
    
    QImage result = image.convertToFormat(QImage::Format_ARGB32);
    const int width = result.width();
    const int height = result.height();
    
    for (int y = 0; y < height; ++y) {
        for (int x = 0; x < width; ++x) {
            QColor color = result.pixelColor(x, y);
            
            int noise = QRandomGenerator::global()->bounded(-noiseLevel, noiseLevel + 1);
            
            int r = qBound(0, color.red() + noise, 255);
            int g = qBound(0, color.green() + noise, 255);
            int b = qBound(0, color.blue() + noise, 255);
            
            result.setPixelColor(x, y, QColor(r, g, b, color.alpha()));
        }
    }
    
    return result;
}

QImage ImageProcessor::pixelate(const QImage &image, int blockSize)
{
    if (image.isNull() || blockSize < 1)
        return image;
    
    QImage result = image.convertToFormat(QImage::Format_ARGB32);
    const int width = result.width();
    const int height = result.height();
    
    for (int y = 0; y < height; y += blockSize) {
        for (int x = 0; x < width; x += blockSize) {
            QColor avgColor = result.pixelColor(x, y);
            int count = 0;
            
            // Calcola colore medio nel blocco
            for (int dy = 0; dy < blockSize && y + dy < height; ++dy) {
                for (int dx = 0; dx < blockSize && x + dx < width; ++dx) {
                    avgColor = QColor(
                        avgColor.red() + result.pixelColor(x + dx, y + dy).red(),
                        avgColor.green() + result.pixelColor(x + dx, y + dy).green(),
                        avgColor.blue() + result.pixelColor(x + dx, y + dy).blue()
                    );
                    count++;
                }
            }
            
            avgColor = QColor(
                avgColor.red() / count,
                avgColor.green() / count,
                avgColor.blue() / count
            );
            
            // Riempimento blocco
            for (int dy = 0; dy < blockSize && y + dy < height; ++dy) {
                for (int dx = 0; dx < blockSize && x + dx < width; ++dx) {
                    result.setPixelColor(x + dx, y + dy, avgColor);
                }
            }
        }
    }
    
    return result;
}

QImage ImageProcessor::rotate(const QImage &image, double degrees)
{
    if (image.isNull())
        return image;
    
    QMatrix matrix;
    matrix.rotate(degrees);
    
    return image.transformed(matrix);
}

QImage ImageProcessor::flipHorizontal(const QImage &image)
{
    if (image.isNull())
        return image;
    
    QImage result = image.mirrored(true, false);
    return result;
}

QImage ImageProcessor::flipVertical(const QImage &image)
{
    if (image.isNull())
        return image;
    
    QImage result = image.mirrored(false, true);
    return result;
}

QImage ImageProcessor::resize(const QImage &image, int width, int height)
{
    if (image.isNull())
        return image;
    
    QImage result(width, height, QImage::Format_ARGB32);
    QPainter painter(&result);
    painter.setRenderHint(QPainter::SmoothPixmapTransform);
    painter.drawImage(0, 0, image.scaled(width, height, Qt::IgnoreAspectRatio, Qt::SmoothTransformation));
    
    return result;
}

QImage ImageProcessor::crop(const QImage &image, int x, int y, int width, int height)
{
    if (image.isNull())
        return image;
    
    return image.copy(x, y, width, height);
}

QImage ImageProcessor::applyKernel(const QImage &image, const QVector<QVector<double>> &kernel)
{
    if (image.isNull() || kernel.isEmpty())
        return image;
    
    QImage result = image.convertToFormat(QImage::Format_ARGB32);
    const int width = result.width();
    const int height = result.height();
    const int kSize = kernel.size();
    const int halfK = kSize / 2;
    
    QImage temp = result;
    
    for (int y = halfK; y < height - halfK; ++y) {
        for (int x = halfK; x < width - halfK; ++x) {
            double r = 0, g = 0, b = 0, a = 0;
            
            for (int ky = 0; ky < kSize; ++ky) {
                for (int kx = 0; kx < kSize; ++kx) {
                    QColor color = temp.pixelColor(x + kx - halfK, y + ky - halfK);
                    double weight = kernel[ky][kx];
                    
                    r += color.redF() * weight;
                    g += color.greenF() * weight;
                    b += color.blueF() * weight;
                    a += color.alphaF() * weight;
                }
            }
            
            result.setPixelColor(x, y, QColor::fromRgbF(r, g, b, a));
        }
    }
    
    return result;
}