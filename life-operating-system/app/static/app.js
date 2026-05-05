document.addEventListener('DOMContentLoaded', () => {
    const flashes = document.querySelectorAll('.flash');
    flashes.forEach((flash) => {
        setTimeout(() => {
            flash.style.opacity = '0.25';
        }, 2400);
    });

    const lineCharts = document.querySelectorAll('.js-line-chart');
    lineCharts.forEach((canvas) => {
        const data = parseChartData(canvas.dataset.chart);
        if (!data.length) {
            return;
        }
        drawLineChart(canvas, data);
    });

    const barCharts = document.querySelectorAll('.js-bar-chart');
    barCharts.forEach((canvas) => {
        const data = parseChartData(canvas.dataset.chart);
        if (!data.length) {
            return;
        }
        drawBarChart(canvas, data);
    });
});

function parseChartData(raw) {
    try {
        return JSON.parse(raw || '[]');
    } catch {
        return [];
    }
}

function setupCanvas(canvas) {
    const context = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 400;
    const height = Number(canvas.getAttribute('height') || 180);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    context.scale(dpr, dpr);
    return { context, width, height };
}

function drawLineChart(canvas, data) {
    const { context, width, height } = setupCanvas(canvas);
    const padding = 24;
    const series = data.map((point) => ({
        label: point.date || point.checkin_date || '',
        energy: Number(point.energy ?? point.perceived_energy ?? 0),
        sleep: Number(point.sleep ?? point.sleep_hours ?? 0),
    }));
    const maxY = Math.max(10, ...series.map((point) => Math.max(point.energy, point.sleep)));
    context.clearRect(0, 0, width, height);
    context.strokeStyle = 'rgba(255,255,255,0.12)';
    context.beginPath();
    context.moveTo(padding, height - padding);
    context.lineTo(width - padding, height - padding);
    context.stroke();

    const drawSeries = (key, color) => {
        context.strokeStyle = color;
        context.lineWidth = 2;
        context.beginPath();
        series.forEach((point, index) => {
            const x = padding + (index * ((width - padding * 2) / Math.max(series.length - 1, 1)));
            const y = height - padding - ((point[key] / maxY) * (height - padding * 2));
            if (index === 0) {
                context.moveTo(x, y);
            } else {
                context.lineTo(x, y);
            }
        });
        context.stroke();
    };

    drawSeries('energy', '#7c9cff');
    drawSeries('sleep', '#66d9a5');
}

function drawBarChart(canvas, data) {
    const { context, width, height } = setupCanvas(canvas);
    const padding = 24;
    context.clearRect(0, 0, width, height);

    const sample = data[0] || {};
    const numericKeys = Object.keys(sample).filter((key) => !['label', 'habit', 'status', 'date', 'weekday', 'load'].includes(key) && typeof Number(sample[key]) === 'number' && !Number.isNaN(Number(sample[key])));
    const seriesKeys = numericKeys.length > 1 ? numericKeys : [numericKeys[0] || 'value'];
    const colors = ['#7c9cff', '#66d9a5', '#ffd479', '#ff8a8a'];
    const normalized = data.map((item) => ({
        label: item.habit || item.status || item.date || item.weekday || 'item',
        values: seriesKeys.map((key) => Number(item[key] ?? item.streak ?? item.total ?? item.value ?? item.load_value ?? 0)),
    }));
    const maxValue = Math.max(1, ...normalized.flatMap((item) => item.values));
    const groupWidth = (width - padding * 2) / normalized.length;
    const barWidth = Math.max(10, (groupWidth - 8) / seriesKeys.length);

    normalized.forEach((item, index) => {
        const groupX = padding + index * groupWidth;
        item.values.forEach((value, valueIndex) => {
            const barHeight = (value / maxValue) * (height - padding * 2);
            const x = groupX + valueIndex * barWidth;
            const y = height - padding - barHeight;
            context.fillStyle = colors[valueIndex % colors.length];
            context.fillRect(x, y, barWidth - 4, barHeight);
        });
        context.fillStyle = '#a4acc9';
        context.font = '12px sans-serif';
        context.fillText(item.label.slice(0, 10), groupX, height - 8);
    });
}
