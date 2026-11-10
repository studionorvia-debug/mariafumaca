/* Maria Fumaça Restaurante — comportamento do site */
(() => {
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- o bilhete do dia: aberto agora? (horário de Brasília) ---------- */
  const DAYS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  const LUNCH = [11 * 60 + 30, 15 * 60];
  const DINNER = [17 * 60, 23 * 60];

  function nowInRio() {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23'
    }).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t).value;
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
    return { day, minutes: Number(get('hour')) * 60 + Number(get('minute')) };
  }
  const hasDinner = (day) => day !== 1;
  const fmt = (m) => {
    const h = Math.floor(m / 60), mm = m % 60;
    return mm ? `${h}h${String(mm).padStart(2, '0')}` : `${h}h`;
  };

  function status() {
    const { day, minutes } = nowInRio();
    if (minutes >= LUNCH[0] && minutes < LUNCH[1]) {
      return { open: 'almoco', day, text: `Aberto agora · almoço até ${fmt(LUNCH[1])}`,
        next: hasDinner(day) ? `Jantar à la carte a partir das ${fmt(DINNER[0])}` : 'Hoje sem jantar · voltamos amanhã às 11h30' };
    }
    if (hasDinner(day) && minutes >= DINNER[0] && minutes < DINNER[1]) {
      return { open: 'jantar', day, text: `Aberto agora · jantar até ${fmt(DINNER[1])}`, next: 'Amanhã, almoço a partir das 11h30' };
    }
    if (minutes < LUNCH[0]) {
      return { open: null, day, text: `Abrimos hoje às ${fmt(LUNCH[0])}`, next: 'Almoço self-service até as 15h' };
    }
    if (hasDinner(day) && minutes < DINNER[0]) {
      return { open: null, day, text: `O jantar começa às ${fmt(DINNER[0])}`, next: 'À la carte, servido à mesa até as 23h' };
    }
    const tomorrow = (day + 1) % 7;
    return { open: null, day, text: 'Fechado agora', next: `Voltamos ${DAYS[tomorrow] === 'domingo' ? 'no' : 'na'} ${DAYS[tomorrow]}, às 11h30` };
  }

  function paintStatus() {
    const s = status();
    const ticket = document.querySelector('.ticket');
    document.querySelector('[data-today]').textContent = `Hoje, ${DAYS[s.day]}`;
    const st = document.querySelector('[data-status]');
    st.innerHTML = '<span class="dot" aria-hidden="true"></span>';
    st.append(s.text);
    document.querySelector('[data-next]').textContent = s.next;
    ticket.classList.toggle('is-open', Boolean(s.open));

    document.querySelectorAll('.timetable tr[data-day]').forEach((tr) => {
      tr.classList.toggle('is-today', Number(tr.dataset.day) === s.day);
    });
    document.querySelectorAll('.pass').forEach((p) => {
      const flag = p.querySelector('.now-flag');
      const isNow = p.dataset.service === s.open;
      if (isNow && !flag) {
        const f = document.createElement('span');
        f.className = 'now-flag';
        f.textContent = 'Servindo agora';
        p.prepend(f);
      } else if (!isNow && flag) flag.remove();
    });
  }
  paintStatus();
  setInterval(paintStatus, 60 * 1000);

  const year = document.querySelector('[data-year]');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- menu do celular ---------- */
  const burger = document.querySelector('.burger');
  const nav = document.querySelector('.nav');
  const setMenu = (open) => {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    nav.classList.toggle('is-open', open);
  };
  burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  /* ---------- navegação suave entre seções ---------- */
  root.style.scrollBehavior = 'auto';
  function scrollToY(y) {
    if (reduce) { window.scrollTo(0, y); return; }
    const from = window.scrollY, dist = y - from;
    const dur = Math.min(1100, 450 + Math.abs(dist) * 0.12);
    const t0 = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 4);
    const step = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      window.scrollTo(0, from + dist * ease(t));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    setTimeout(() => window.scrollTo(0, y), dur + 80); // garante o destino
  }
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href').length < 2) return;
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const offset = document.querySelector('.bar').offsetHeight + 16;
    const y = target.id === 'inicio' ? 0 : target.getBoundingClientRect().top + window.scrollY - offset;
    scrollToY(Math.max(0, y));
    history.pushState(null, '', a.getAttribute('href'));
    if (a.classList.contains('skip')) target.focus({ preventScroll: true });
  });

  /* ---------- cabeçalho e link ativo ---------- */
  const bar = document.querySelector('.bar');
  const onScroll = () => bar.classList.toggle('is-scrolled', window.scrollY > 24);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const links = [...document.querySelectorAll('.nav a')];
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      links.forEach((a) => a.setAttribute('aria-current', String(a.getAttribute('href') === `#${en.target.id}`)));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  ['inicio', 'sobre', 'cardapio', 'contato'].forEach((id) => spy.observe(document.getElementById(id)));

  /* ---------- galeria: ao apontar uma foto, as outras recuam ---------- */
  const tiles = document.querySelector('.tiles');
  if (window.matchMedia('(hover: hover)').matches) {
    tiles.addEventListener('pointerover', (e) => tiles.classList.toggle('is-pointing', Boolean(e.target.closest('.tile'))));
    tiles.addEventListener('pointerleave', () => tiles.classList.remove('is-pointing'));
  }

  /* ---------- movimento ---------- */
  function splitWords(el) {
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = words.map((w) => `<span class="split-line" aria-hidden="true"><span>${w}</span></span>`).join(' ');
    return el.querySelectorAll('.split-line > span');
  }

  function start() {
    const gsap = window.gsap;
    if (!gsap || reduce) { root.classList.add('ready'); return; }
    gsap.registerPlugin(window.ScrollTrigger);
    const EASE = 'power3.out';

    document.querySelectorAll('[data-split]').forEach((el) => {
      const parts = splitWords(el);
      gsap.set(parts, { yPercent: 110 });
      el._parts = parts;
    });
    gsap.set('[data-rise]', { autoAlpha: 0, y: 28 });
    gsap.set('[data-tile]', { autoAlpha: 0, y: 32 });
    root.classList.add('ready');

    // hero: título palavra a palavra, depois o texto, os botões e o bilhete
    const h1 = document.querySelector('.hero [data-split]');
    const heroImg = document.querySelector('[data-hero-img]');
    const intro = gsap.timeline({ defaults: { ease: EASE } });
    intro
      .fromTo(heroImg, { scale: 1.12 }, { scale: 1, duration: 1.6, ease: 'power2.out' }, 0)
      .to(h1._parts, { yPercent: 0, duration: 0.9, stagger: 0.07 }, 0.1)
      .to('.hero [data-rise]', { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.09 }, 0.55)
      .from('[data-seal]', { scale: 0.92, autoAlpha: 0, duration: 1.2, ease: 'power2.out' }, 0)
      .from('.ring-line', { scale: 0.9, transformOrigin: '50% 50%', autoAlpha: 0, duration: 1, stagger: 0.12 }, 0.2);

    // o anel do selo gira devagar e acelera com a rolagem, como uma roda em movimento
    const spin = gsap.to('[data-spin]', { rotation: 360, duration: 60, ease: 'none', repeat: -1, transformOrigin: '200px 200px' });
    ScrollTrigger.create({
      trigger: '.hero', start: 'top top', end: 'bottom top',
      onUpdate: (self) => {
        gsap.to(spin, { timeScale: 1 + Math.abs(self.getVelocity()) / 120, duration: 0.2, overwrite: true });
        gsap.to(spin, { timeScale: 1, duration: 1.2, delay: 0.2 });
      }
    });

    // foto do selo desliza levemente com a rolagem
    gsap.to(heroImg, {
      yPercent: 6, scale: 1.06, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
    });

    // entradas por seção: título, depois texto, depois imagem (60–90ms entre partes)
    document.querySelectorAll('main > section:not(.hero), .foot').forEach((sec) => {
      const heads = sec.querySelectorAll('[data-split]');
      const rises = sec.querySelectorAll('[data-rise]');
      const tl = gsap.timeline({ defaults: { ease: EASE }, scrollTrigger: { trigger: sec, start: 'top 78%', once: true } });
      heads.forEach((h) => tl.to(h._parts, { yPercent: 0, duration: 0.85, stagger: 0.06 }, 0));
      if (rises.length) tl.to(rises, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.08 }, heads.length ? 0.25 : 0);
    });

    gsap.to('[data-tile]', {
      autoAlpha: 1, y: 0, duration: 0.8, ease: EASE, stagger: { each: 0.07, grid: 'auto' },
      scrollTrigger: { trigger: '.tiles', start: 'top 82%', once: true }
    });

    // passes do cardápio: a foto sobe por dentro do recorte
    document.querySelectorAll('.pass-pic img').forEach((img) => {
      gsap.fromTo(img, { yPercent: -6, scale: 1.12 }, {
        yPercent: 6, scale: 1.12, ease: 'none',
        scrollTrigger: { trigger: img.closest('.pass'), start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });

    // avaliações: o cartão impresso endireita ao entrar e os números contam
    const card = document.querySelector('[data-card]');
    const tilt = window.innerWidth < 560 ? -1 : -1.5;
    gsap.fromTo(card, { rotate: tilt - 3, y: 48 }, {
      rotate: tilt, y: 0, ease: 'none',
      scrollTrigger: { trigger: '.proof', start: 'top bottom', end: 'top 25%', scrub: 0.6 }
    });
    gsap.from('.card > *', {
      autoAlpha: 0, y: 20, duration: 0.7, ease: EASE, stagger: 0.08,
      scrollTrigger: { trigger: card, start: 'top 70%', once: true }
    });
    gsap.from('.stars-on use', {
      scale: 0, transformOrigin: '50% 50%', duration: 0.5, ease: 'back.out(2.5)', stagger: 0.08,
      scrollTrigger: { trigger: '.stars', start: 'top 85%', once: true }
    });
    document.querySelectorAll('[data-count]').forEach((el) => {
      const target = Number(el.dataset.count);
      const decimals = target % 1 ? 1 : 0;
      const box = { v: 0 };
      gsap.to(box, {
        v: target, duration: 1.6, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 85%', once: true },
        onUpdate: () => {
          el.textContent = box.v.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
        }
      });
    });

    // selo do cartão-postal
    gsap.from('.stamp', {
      rotate: -18, scale: 0.6, autoAlpha: 0, duration: 0.9, ease: 'back.out(1.8)',
      scrollTrigger: { trigger: '.postcard', start: 'top 75%', once: true }
    });
  }

  // GSAP chega por CDN com defer; se falhar, a página aparece inteira mesmo assim
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
  setTimeout(() => root.classList.add('ready'), 2500);
})();
