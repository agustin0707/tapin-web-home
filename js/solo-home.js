/* ═══════════════════════════════════════════════════════════════════════
   BUILD "SOLO HOME"  ·  (este archivo NO existe en el proyecto principal)

   Desactiva los enlaces que llevan a subpáginas que todavía NO están
   publicadas. Los links se siguen viendo igual, pero:
     · no navegan (se les quita el href),
     · muestran cursor "no permitido" y un leve atenuado al pasar el mouse.

   Se aplica solo a estas páginas (no tocadas): Comedor, Centro de Padres,
   Gestión de Proveedores, Talleres y Ligas, Empresa.

   Lo que SIGUE funcionando: el home y sus anclas (#contacto, #colegios,
   #productos, #objeciones), el formulario, el portal "Ingresar"
   (colegios.tapin.cl), las redes (LinkedIn/Instagram/WhatsApp), el mail y
   la página de Privacidad.

   PARA REACTIVAR LAS SUBPÁGINAS cuando se publiquen: borrá este archivo y
   su etiqueta <script src="js/solo-home.js"> en index.html y privacidad.html.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var NOT_READY = [
    'comedor-escolar.html',
    'centro-de-padres.html',
    'gestion-de-proveedores.html',
    'ligas-y-talleres.html',
    'empresa.html'
  ];

  // "Look desactivado": cursor no permitido + leve atenuado en hover, y se
  // anulan los efectos hover (movimientos/sombras) propios de cada botón.
  var style = document.createElement('style');
  style.textContent =
    'a.link-soon{cursor:not-allowed !important;}' +
    'a.link-soon:hover{opacity:.55 !important;transform:none !important;box-shadow:none !important;}' +
    'a.link-soon:hover *{transform:none !important;}';
  (document.head || document.documentElement).appendChild(style);

  function disableSoonLinks() {
    var links = document.querySelectorAll('a[href]');
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      var href = a.getAttribute('href') || '';
      var hit = false;
      for (var j = 0; j < NOT_READY.length; j++) {
        if (href.indexOf(NOT_READY[j]) !== -1) { hit = true; break; }
      }
      if (!hit) continue;

      a.classList.add('link-soon');
      a.setAttribute('aria-disabled', 'true');
      a.setAttribute('data-href-soon', href); // guardamos el destino original
      a.removeAttribute('href');              // ya no navega (ni con teclado)
      a.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', disableSoonLinks);
  } else {
    disableSoonLinks();
  }
})();
