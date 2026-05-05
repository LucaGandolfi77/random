document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.flash').forEach((flash) => {
        setTimeout(() => { flash.style.opacity = '0.35'; }, 2400);
    });

    document.querySelectorAll('.js-line-chart').forEach((canvas) => {
        const data = parseChartData(canvas.dataset.chart);
        if (data.length) {
            drawLineChart(canvas, data);
        }
    });
});

function parseChartData(raw) {
    try { return JSON.parse(raw || '[]'); } catch { return []; }
}

function setupCanvas(canvas) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 400;
    const height = Number(canvas.getAttribute('height') || 220);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    return { ctx, width, height };
}

function drawLineChart(canvas, data) {
    const { ctx, width, height } = setupCanvas(canvas);
    const padding = 24;
    const points = data.map((item) => ({
        xLabel: item.cycle_number || item.date || '',
        cash: Number(item.cash || 0),
        revenue: Number(item.monthly_revenue || 0),
        burn: Number(item.monthly_burn || 0),
        traction: Number(item.traction_score || 0),
        survival: Number(item.survival_probability || 0),
    }));
    const maxY = Math.max(10, ...points.flatMap((point) => [point.cash / 1000, point.revenue / 1000, point.burn / 1000, point.traction, point.survival]));
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();
    const series = [
        { key: 'cash', color: '#7c9cff', transform: (value) => value / 1000 },
        { key: 'revenue', color: '#66d9a5', transform: (value) => value / 1000 },
        { key: 'burn', color: '#ffd479', transform: (value) => value / 1000 },
        { key: 'survival', color: '#ff8a8a', transform: (value) => value },
    ];
    series.forEach((seriesItem) => {
        ctx.strokeStyle = seriesItem.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        points.forEach((point, index) => {
            const x = padding + index * ((width - padding * 2) / Math.max(points.length - 1, 1));
            const value = seriesItem.transform(point[seriesItem.key]);
            const y = height - padding - (value / maxY) * (height - padding * 2);
            if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();
    });
}
