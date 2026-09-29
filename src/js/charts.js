let weightChart = null;
let medidasChart = null;

// Cintura y barriga en la misma gráfica (las dos en cm). Si un día falta una, la línea salta ese punto.
function renderMedidasChart() {
  const ctx = document.getElementById('medidasChart');
  if (!ctx) return;
  const filas = medidasPorFecha(Storage.get('waists', []), Storage.get('bellies', []));
  ctx.closest('.chart-wrap')?.classList.toggle('vacia', !filas.length);
  if (medidasChart) { medidasChart.destroy(); medidasChart = null; }
  if (!filas.length) return;

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const gridColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
  const textColor = isDark ? '#94a3b8' : '#64748b';
  const valores = filas.flatMap(f => [f.waist, f.belly]).filter(v => v != null);
  // eslint-disable-next-line security/detect-object-injection -- «campo» solo es 'waist' o 'belly', del propio código
  const linea = (label, color, campo) => ({ label, data: filas.map(f => f[campo]), borderColor: color, backgroundColor: color,
    borderWidth: 2.5, pointRadius: 5, pointHoverRadius: 7, tension: 0.35, spanGaps: true, fill: false });

  medidasChart = new Chart(ctx, {
    type: 'line',
    data: { labels: filas.map(f => f.date), datasets: [linea('Cintura', '#f97316', 'waist'), linea('Barriga', '#a855f7', 'belly')] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, labels: { color: textColor, boxWidth: 12, font: { size: 11 } } },
        tooltip: { callbacks: { label: c => `${c.dataset.label}: ${c.parsed.y} cm` } }
      },
      scales: {
        x: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 11 }, maxTicksLimit: 6 } },
        y: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 11 }, callback: v => v + ' cm' },
          suggestedMin: Math.floor(Math.min(...valores) - 3), suggestedMax: Math.ceil(Math.max(...valores) + 3) }
      }
    }
  });
}

function renderWeightChart(entries) {
  const ctx = document.getElementById('weightChart');
  if (!ctx) return;
  // Sin pesos: un aviso en lugar de un lienzo vacío (y sin calcular una escala con Infinity)
  ctx.closest('.chart-wrap')?.classList.toggle('vacia', !entries.length);
  if (!entries.length) { if (weightChart) { weightChart.destroy(); weightChart = null; } return; }

  const labels = entries.map(e => e.date);
  const data = entries.map(e => e.weight);
  // Objetivo y escala a partir de TUS datos (antes: línea fija en 90 kg y eje fijo de 80 a 110)
  const objetivo = objetivoPeso();   // la línea del objetivo, solo si tiene sentido (ver dashboard.js)
  const valores = objetivo ? [...data, objetivo] : data;

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
        data: objetivo ? entries.map(() => objetivo) : [],
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
          suggestedMin: Math.floor(Math.min(...valores) - 3),
          suggestedMax: Math.ceil(Math.max(...valores) + 3)
        }
      }
    }
  });
}
