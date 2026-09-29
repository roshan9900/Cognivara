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
  devops:{file:'assets/Cognivara-DevOps-Brochure.pdf', label:'DevOps Engineer', program:'DevOps Engineer'},
  genai:{file:'assets/Cognivara-GenAI-Brochure.pdf', label:'Advanced GenAI Engineer', program:'Advanced GenAI Engineer'}
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
    if(note){note.textContent='Fill in your details below and the '+b.label+' brochure will download automatically once submitted.';note.classList.add('show');}
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
       if(pendingBrochure){
         downloadBrochure(pendingBrochure);
         say('Thanks! Your '+BROCHURES[pendingBrochure].label+' brochure is downloading, and we will reply soon.','ok');
         pendingBrochure=null;
       }else{
         say('Thanks. Your enquiry is in and we will reply soon.','ok');
       }
       note&&note.classList.remove('show');if(note)note.textContent='';
       form.reset();
     })
     .catch(function(){
       /* We can no longer promise delivery on a failed/opaque response - be honest with the user
          instead of always showing a success message (see security & quality audit, finding #2). */
       say('We could not confirm delivery. Please WhatsApp us on +91 99200 11295 so your enquiry is not missed.','err');
     })
     .finally(function(){btn.disabled=false});
  });
}
})();
