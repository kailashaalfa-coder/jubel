/* JUBEL navigation - robust mobile menu + nested submenu toggles */
(() => {
  'use strict';
  function init() {
    document.querySelectorAll('.navbar').forEach((navbar) => {
      const menu = navbar.querySelector('#menu');
      const toggle = navbar.querySelector('.nav-toggle');
      if (!menu || !toggle || toggle.dataset.jubelReady === '1') return;
      toggle.dataset.jubelReady = '1';
      const mq = window.matchMedia('(max-width: 650px)');
      const setMenu = (open) => {
        menu.classList.toggle('active', open);
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'Tutup menu' : 'Buka menu');
        toggle.innerHTML = open ? '&#10005;' : '&#9776;';
      };
      const closeSubmenu = (item) => {
        item.classList.remove('open');
        const btn = item.querySelector(':scope > .sub-toggle');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      };
      const closeAllSubmenus = () => navbar.querySelectorAll('.has-sub.open').forEach(closeSubmenu);
      setMenu(false);
      toggle.addEventListener('click', (event) => {
        event.preventDefault(); event.stopPropagation();
        const open = toggle.getAttribute('aria-expanded') !== 'true';
        setMenu(open);
        if (!open) closeAllSubmenus();
      });
      navbar.querySelectorAll('.sub-toggle').forEach((btn) => {
        btn.setAttribute('aria-expanded', 'false');
        btn.addEventListener('click', (event) => {
          event.preventDefault(); event.stopPropagation();
          const item = btn.closest('.has-sub'); if (!item) return;
          const open = !item.classList.contains('open');
          const siblings = item.parentElement?.querySelectorAll(':scope > .has-sub.open') || [];
          siblings.forEach((sibling) => { if (sibling !== item) closeSubmenu(sibling); });
          item.classList.toggle('open', open);
          btn.setAttribute('aria-expanded', String(open));
        });
      });
      menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
        if (mq.matches) { setMenu(false); closeAllSubmenus(); }
      }));
      document.addEventListener('click', (event) => {
        if (mq.matches && !navbar.contains(event.target)) { setMenu(false); closeAllSubmenus(); }
      });
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && mq.matches) { setMenu(false); closeAllSubmenus(); toggle.focus(); }
      });
      const onBreakpoint = (event) => { if (!event.matches) { setMenu(false); closeAllSubmenus(); } };
      if (mq.addEventListener) mq.addEventListener('change', onBreakpoint); else mq.addListener(onBreakpoint);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
