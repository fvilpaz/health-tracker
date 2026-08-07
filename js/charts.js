let weightChart = null;

function renderWeightChart(entries) {
  const ctx = document.getElementById('weightChart');
  if (!ctx) return;

  const labels = entries.map(e => e.date);
  const data = entries.map(e => e.weight);

  if (weightChart) weightChart.destroy();

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const gridColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
  const textColor = isDark ? '#94a3b8' : '#64748b';

  weightChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Peso (kg)',
        data,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.1)',
        borderWidth: 2.5,
        pointBackgroundColor: '#3b82f6',
        pointRadius: 5,
        pointHoverRadius: 7,
        fill: true,
        tension: 0.35
      }, {
        label: 'Objetivo',
        data: entries.map(() => 90),
        borderColor: '#22c55e',
        borderWidth: 1.5,
        borderDash: [6, 4],
        pointRadius: 0,
        fill: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y} kg`
          }
        }
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: textColor, font: { size: 11 }, maxTicksLimit: 6 }
        },
        y: {
          grid: { color: gridColor },
          ticks: { color: textColor, font: { size: 11 }, callback: v => v + ' kg' },
          suggestedMin: 80,
          suggestedMax: 110
        }
      }
    }
  });
}
