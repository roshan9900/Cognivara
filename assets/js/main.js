(function(){
'use strict';
var root=document.documentElement,$=function(i){return document.getElementById(i)};
function store(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(e){return null}}

/* ---- Theme toggle (every page) ---- */
var saved=store('cg_theme');
if(saved)root.dataset.theme=saved;else if(matchMedia('(prefers-color-scheme: light)').matches)root.dataset.theme='light';
var themeBtn=$('theme');
if(themeBtn)themeBtn.onclick=function(){var t=root.dataset.theme==='dark'?'light':'dark';root.dataset.theme=t;store('cg_theme',t)};

/* ---- Mobile nav toggle (every page) ---- */
var links=$('links'),menu=$('menu');
if(links&&menu){
  menu.onclick=function(){var o=links.classList.toggle('open');menu.setAttribute('aria-expanded',o)};
  links.onclick=function(){links.classList.remove('open');menu.setAttribute('aria-expanded',false)};
}

/* ---- Brochure data (every page) ---- */
var BROCHURES={
  genai:{file:'assets/Equitient-AI-Advanced-GenAI-Brochure.pdf', label:'Advanced GenAI Engineer', program:'Advanced GenAI Engineer'}
};
function downloadBrochure(key){
  var b=BROCHURES[key];if(!b)return;
  var a=document.createElement('a');a.href=b.file;a.download='';a.style.display='none';
  document.body.appendChild(a);a.click();document.body.removeChild(a);
}

var form=$('form'),msg=$('msg'),btn=$('send'),loaded=Date.now(),note=$('brochNote'),pendingBrochure=null;

document.querySelectorAll('[data-program]').forEach(function(a){a.addEventListener('click',function(){if(form)form.program.value=a.dataset.program})});

function requestBrochure(key){
  var b=BROCHURES[key];if(!b)return;
  if(form){
    pendingBrochure=key;
    form.program.value=b.program;
    if(note){note.textContent='Fill in your details below \u2014 the official 6-page '+b.label+' curriculum brochure (PDF) will download automatically once submitted.';note.classList.add('show');}
    var contact=$('contact');if(contact)contact.scrollIntoView({behavior:'smooth'});
    setTimeout(function(){if(form.name)form.name.focus()},450);
  }else{
    /* No enquiry form on this page (e.g. policy pages) - download straight away */
    downloadBrochure(key);
  }
}
document.querySelectorAll('[data-brochure]').forEach(function(b){b.addEventListener('click',function(){
  requestBrochure(b.dataset.brochure);
  var dd=b.closest('.dd');if(dd)dd.classList.remove('open');
})});

/* ---- "Download brochure" dropdowns (every page) ---- */
document.querySelectorAll('[data-dd]').forEach(function(dd){
  var trigger=dd.querySelector('.dd-btn');
  if(!trigger)return;
  trigger.addEventListener('click',function(e){
    e.stopPropagation();
    var open=dd.classList.toggle('open');
    trigger.setAttribute('aria-expanded',open);
    document.querySelectorAll('[data-dd].open').forEach(function(o){if(o!==dd){o.classList.remove('open');o.querySelector('.dd-btn').setAttribute('aria-expanded',false)}});
  });
});
document.addEventListener('click',function(){document.querySelectorAll('[data-dd].open').forEach(function(o){o.classList.remove('open');o.querySelector('.dd-btn').setAttribute('aria-expanded',false)})});
document.addEventListener('keydown',function(e){if(e.key==='Escape')document.querySelectorAll('[data-dd].open').forEach(function(o){o.classList.remove('open')})});

/* ---- Contact form (index.html only - guarded, does nothing on other pages) ---- */
if(form){
  /* SCRIPT_URL is injected at deploy time from the SCRIPT_URL secret in GitHub Actions
     (see .github/workflows/static.yml). It is intentionally NOT committed to source control.
     For local testing only, you may temporarily paste a real URL below - just never commit it. */
  var SCRIPT_URL='__SCRIPT_URL__';

  function say(t,c){msg.textContent=t;msg.className=c||''}

  form.addEventListener('submit',function(e){
    e.preventDefault();
    var f=new FormData(form);
    if(f.get('website'))return;                       // honeypot: bots fill this
    var name=(f.get('name')||'').trim(),email=(f.get('email')||'').trim(),phone=(f.get('phone')||'').replace(/[\s\-()]/g,'');
    if(name.length<2)return say('Enter your full name.','err');
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))return say('Enter a valid email address.','err');
    if(!/^(\+?91)?[6-9]\d{9}$/.test(phone))return say('Enter a valid 10-digit Indian mobile number.','err');
    if(Date.now()-loaded<3000)return say('Please take a moment to review, then send again.','err');
    var last=+store('cg_last')||0;
    if(Date.now()-last<60000)return say('You just sent an enquiry. Please wait a minute before sending another.','err');
    if(!/^https:\/\/script\.google\.com\//.test(SCRIPT_URL))return say('Form is not connected yet. Add the SCRIPT_URL secret in the repository\u2019s GitHub Actions settings.','err');
    btn.disabled=true;say('Sending...');
    f.set('phone',phone);
    fetch(SCRIPT_URL,{method:'POST',mode:'cors',body:new URLSearchParams(f)})
     .then(function(res){
       if(!res.ok)throw new Error('bad-status');
       store('cg_last',String(Date.now()));
       var overlay = $('eqOverlay');
       if(overlay && overlay.classList.contains('eq-open')){
         overlay.querySelector('.eq-right').classList.add('eq-success');
         try { localStorage.setItem('eq_submitted', '1'); } catch(e){}
       }
       if(pendingBrochure){
         downloadBrochure(pendingBrochure);
         say('Thanks! Your '+BROCHURES[pendingBrochure].label+' curriculum brochure is downloading now. We will also reach out to answer any questions.','ok');
         pendingBrochure=null;
       }else{
         say('Thanks. Your enquiry is in and we will reply soon.','ok');
       }
       note&&note.classList.remove('show');if(note)note.textContent='';
       form.reset();
     })
     .catch(function(){
       var overlay = $('eqOverlay');
       if(overlay && overlay.classList.contains('eq-open')){
         var errEl = overlay.querySelector('.eq-fine');
         if(errEl) {
           errEl.textContent = 'Could not confirm delivery. Please WhatsApp us on +91 99200 11295.';
           errEl.style.color = '#ff8f8f';
         }
         var subBtn = $('eqSubmit');
         if(subBtn) { subBtn.disabled = false; subBtn.textContent = 'Request a Call Back'; }
       }
       say('We could not confirm delivery. Please WhatsApp us on +91 99200 11295 so your enquiry is not missed.','err');
     })
     .finally(function(){btn.disabled=false});
  });
}

/* ---- Enquiry Popup (index.html only) ---- */
var overlay = $('eqOverlay');
if(overlay){
  var STAGES = [30000, 60000];
  if (/[?&]demo\b/.test(location.search)) STAGES = [3000, 6000];
  var K_DONE = 'eq_submitted', K_START = 'eq_start', K_SHOWN = 'eq_shown';
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} return null; }
  function ss(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) {} return null; }

  if (/[?&]demo\b/.test(location.search)) { ls(K_DONE, null); ss(K_SHOWN, null); ss(K_START, null); }
  if (ls(K_DONE) !== '1') {
    var modal = $('eqModal'), eqForm = $('eqForm'), lastFocus = null;
    var start = parseInt(ss(K_START), 10);
    if (!start) { start = Date.now(); ss(K_START, String(start)); }
    var shown = parseInt(ss(K_SHOWN), 10) || 0;

    function openPopup() {
      if (overlay.classList.contains('eq-open') || ls(K_DONE) === '1') return;
      lastFocus = document.activeElement;
      overlay.classList.add('eq-open'); document.body.style.overflow = 'hidden';
      shown++; ss(K_SHOWN, String(shown));
      setTimeout(function () { var n = $('eqName'); if(n) n.focus(); }, 60);
    }
    function closePopup() {
      overlay.classList.remove('eq-open'); document.body.style.overflow = '';
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    if (shown < STAGES.length) {
      for (var i = shown; i < STAGES.length; i++) {
        (function (idx) {
          var wait = STAGES[idx] - (Date.now() - start);
          if (wait < 3000) wait = 3000 * (idx - shown + 1);
          setTimeout(function () { if (shown === idx) openPopup(); }, wait);
        })(i);
      }
    }

    var eqClose = $('eqClose'), eqDone = $('eqDone');
    if (eqClose) eqClose.addEventListener('click', closePopup);
    if (eqDone) eqDone.addEventListener('click', closePopup);
    overlay.addEventListener('mousedown', function (e) { if (e.target === overlay) closePopup(); });
    document.addEventListener('keydown', function (e) {
      if (!overlay.classList.contains('eq-open')) return;
      if (e.key === 'Escape') closePopup();
      if (e.key === 'Tab' && modal) {
        var f = modal.querySelectorAll('button,input:not(.eq-hp),select'); if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    var eqMobile = $('eqMobile');
    if (eqMobile) eqMobile.addEventListener('input', function () { this.value = this.value.replace(/\D/g, '').slice(0, 10); });

    function flag(id, bad) { var el = $(id); if(el && el.closest) el.closest('.eq-f').classList.toggle('eq-bad', bad); return !bad; }

    if (eqForm) {
      eqForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var name = (eqForm.elements.name ? eqForm.elements.name.value : '').trim(),
            mobile = (eqForm.elements.mobile ? eqForm.elements.mobile.value : '').trim(),
            email = (eqForm.elements.email ? eqForm.elements.email.value : '').trim(),
            course = (eqForm.elements.course ? eqForm.elements.course.value : '');
        var ok = true;
        ok = flag('eqName', name.length < 2) && ok;
        ok = flag('eqMobile', !/^[6-9]\d{9}$/.test(mobile)) && ok;
        ok = flag('eqEmail', !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) && ok;
        ok = flag('eqCourse', course === '') && ok;
        if (!ok) return;
        if (eqForm.elements.website && eqForm.elements.website.value) return;

        if (!form) return;
        if (form.name) form.name.value = name;
        if (form.phone) form.phone.value = mobile;
        if (form.email) form.email.value = email;
        if (form.program) form.program.value = course;
        if (form.message) form.message.value = 'Enquiry from the website popup';

        var subBtn = $('eqSubmit');
        if (subBtn) { subBtn.disabled = true; subBtn.textContent = 'Sending...'; }

        if (form.requestSubmit) form.requestSubmit();
        else form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      });
    }
  }
}

/* ---- Mobile & touch polish (scroll progress, bar, reveal) ---- */
(function () {
  var d = document, de = d.documentElement;
  var mq = window.matchMedia ? window.matchMedia('(max-width: 820px)') : { matches: false };
  var prog = d.getElementById('eqProg'), hdr = d.querySelector('header'), bar = d.getElementById('eqBar');

  var ticking = false;
  function onScroll() {
    ticking = false;
    var h = de.scrollHeight - window.innerHeight;
    if (prog) prog.style.width = (h > 0 ? Math.min(100, (window.pageYOffset / h) * 100) : 0) + '%';
    if (hdr) hdr.classList.toggle('eq-scrolled', window.pageYOffset > 8);
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; window.requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  if (mq.matches && 'IntersectionObserver' in window) {
    de.classList.add('eq-js');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('eq-in'); io.unobserve(en.target); } });
    }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });
    var els = d.querySelectorAll('main .card, main .steps > div, main .marks span, main h2, main .lead, main details');
    Array.prototype.forEach.call(els, function (el) {
      var idx = Array.prototype.indexOf.call(el.parentNode.children, el);
      el.style.transitionDelay = Math.min(idx, 4) * 60 + 'ms';
      el.classList.add('eq-reveal'); io.observe(el);
    });
  }

  if (bar) {
    var hideReasons = { popup: false, typing: false, contact: false };
    function sync() { bar.classList.toggle('eq-hide', hideReasons.popup || hideReasons.typing || hideReasons.contact); }
    var ov = d.getElementById('eqOverlay');
    if (ov && 'MutationObserver' in window) {
      new MutationObserver(function () { hideReasons.popup = ov.classList.contains('eq-open'); sync(); }).observe(ov, { attributes: true, attributeFilter: ['class'] });
    }
    d.addEventListener('focusin', function (e) { if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) { hideReasons.typing = true; sync(); } });
    d.addEventListener('focusout', function () { hideReasons.typing = false; sync(); });
    var contact = d.getElementById('contact');
    if (contact && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { hideReasons.contact = en[0].isIntersecting; sync(); }, { threshold: 0.25 }).observe(contact);
    }
  }

  /* ---- Case Studies Filter Tabs (case-studies.html) ---- */
  var csTabs = d.querySelectorAll('.cs-tab');
  var csCards = d.querySelectorAll('.cs-card');
  if (csTabs.length && csCards.length) {
    Array.prototype.forEach.call(csTabs, function(tab) {
      tab.addEventListener('click', function() {
        Array.prototype.forEach.call(csTabs, function(t) { t.classList.remove('active'); });
        tab.classList.add('active');
        var filter = tab.getAttribute('data-filter');
        Array.prototype.forEach.call(csCards, function(card) {
          if (filter === 'all' || card.getAttribute('data-category') === filter) {
            card.style.display = '';
          } else {
            card.style.display = 'none';
          }
        });
      });
    });
  }
})();
})();

