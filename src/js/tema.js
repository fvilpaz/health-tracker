// Se carga en <head>, antes de pintar nada: pone el tema guardado para que la app no se vea un instante en
// claro antes de pasar a oscuro. (La CSP no deja escribir este código dentro del HTML, por eso va en su archivo.)
try {
  document.documentElement.setAttribute('data-theme', JSON.parse(localStorage.getItem('ht_theme')) || 'dark');
} catch { document.documentElement.setAttribute('data-theme', 'dark'); }
