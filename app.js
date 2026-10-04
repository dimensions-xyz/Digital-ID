(function () {
  'use strict';
  const products = window.DPI_PRODUCTS || [];
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const page = document.body.dataset.page;
  const today = new Date();
  const DAY = 86400000;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
  }
  function formatDate(value) {
    if (!value) return '—';
    return new Intl.DateTimeFormat('tr-TR', { day:'2-digit', month:'long', year:'numeric' }).format(new Date(`${value}T12:00:00`));
  }
  function dayDiff(value) { return Math.ceil((new Date(`${value}T23:59:59`) - today) / DAY); }
  function toast(message) {
    const el = $('#toast'); if (!el) return;
    el.textContent = message; el.classList.add('show');
    clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('show'), 2600);
  }
  function safeRead(key, fallback) { try { const value = JSON.parse(localStorage.getItem(key)); return Array.isArray(fallback) ? (Array.isArray(value) ? value : fallback) : (value ?? fallback); } catch (_) { return fallback; } }
  function safeWrite(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (_) { return false; } }
  const icons = {
    manual:'<svg class="icon" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5Z"/><path d="M4 5.5v14M8 7h8M8 11h6"/></svg>',
    errors:'<svg class="icon" viewBox="0 0 24 24"><path d="M12 3 2.7 19h18.6L12 3Z"/><path d="M12 9v4M12 17h.01"/></svg>',
    warranty:'<svg class="icon" viewBox="0 0 24 24"><path d="M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6Z"/><path d="m8.5 12 2.3 2.3 4.7-4.8"/></svg>',
    service:'<svg class="icon" viewBox="0 0 24 24"><path d="m14.7 6.3 3-3a4 4 0 0 1-5 5L6 15l-3 6 6-3 6.7-6.7a4 4 0 0 1 5-5l-3 3"/></svg>',
    maintenance:'<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    specs:'<svg class="icon" viewBox="0 0 24 24"><path d="M4 4h16v16H4zM8 8h8M8 12h5M8 16h7"/></svg>',
    parts:'<svg class="icon" viewBox="0 0 24 24"><path d="m8 4 8 4v8l-8 4-5-3V7Z"/><path d="m8 4 5 3-5 3-5-3M8 10v10"/></svg>',
    assistant:'<svg class="icon" viewBox="0 0 24 24"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/></svg>',
    ownership:'<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0M18 5v6M15 8h6"/></svg>',
    location:'<svg class="icon" viewBox="0 0 24 24"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>'
  };

  if (page === 'dashboard') initDashboard();
  if (page === 'product') initProduct();

  function initDashboard() {
    const qrBox = $('#qrcode');
    if (location.protocol === 'file:') $('#fileWarning').classList.remove('hidden');
    function chooseProduct() {
      let pool = products;
      const last = qrBox.dataset.product;
      if (products.length > 1 && last) pool = products.filter(p => p.id !== last);
      return pool[Math.floor(Math.random() * pool.length)];
    }
    function productUrl(product) {
      const url = new URL('product.html', location.href);
      url.searchParams.set('id', product.id);
      return url.href;
    }
    function generate() {
      const product = chooseProduct();
      if (!product) return toast('Demo ürün verisi yüklenemedi.');
      const url = productUrl(product);
      qrBox.dataset.product = product.id;
      qrBox.innerHTML = '';
      if (window.QRCode) {
        new QRCode(qrBox, { text:url, width:190, height:190, colorDark:'#18201d', colorLight:'#ffffff', correctLevel:QRCode.CorrectLevel.H });
      } else {
        qrBox.innerHTML = '<div class="qr-placeholder"><div class="pulse"></div>QR kütüphanesi yüklenemedi.<br>İnternet bağlantısını kontrol edin.</div>';
      }
      $('#qrProduct').textContent = `${product.brand} ${product.model}`;
      $('#qrSerial').textContent = `Seri No: ${product.serial}`;
      $('#qrUrl').textContent = url;
      $('#openProduct').href = url; $('#openProduct').classList.remove('hidden');
      $('#newQr').classList.remove('hidden');
    }
    $('#generateQr').addEventListener('click', generate);
    $('#newQr').addEventListener('click', generate);
    $('#simulateNfc').addEventListener('click', () => {
      const product = chooseProduct();
      if (product) location.href = productUrl(product);
    });
  }

  function initProduct() {
    const id = new URLSearchParams(location.search).get('id');
    const product = products.find(item => item.id === id);
    if (!product) { $('#notFound').classList.remove('hidden'); return; }
    $('#productApp').classList.remove('hidden');
    document.title = `${product.brand} ${product.model} — Dijital Ürün Kimliği`;
    document.documentElement.style.setProperty('--product', product.color);
    renderProduct(product);
    bindProductEvents(product);
    trackRecent(product);
  }

  function productArt(type) {
    const label = type.toLowerCase();
    if (label.includes('şarj')) return '<svg viewBox="0 0 180 180" fill="none"><rect x="50" y="18" width="80" height="144" rx="20" stroke-width="7"/><rect x="68" y="42" width="44" height="36" rx="7" stroke-width="5"/><path d="m93 88-18 25h17l-7 27 24-34H91l2-18Z" stroke-width="5"/><path d="M130 60c22 5 27 23 27 41v25" stroke-width="7"/></svg>';
    if (label.includes('motor')) return '<svg viewBox="0 0 180 180" fill="none"><path d="M35 64h102v70H35zM137 83h22v33h-22M20 80h15v39H20M52 64V47h67v17" stroke-width="7"/><path d="M54 83v33M75 83v33M96 83v33M117 83v33" stroke-width="5"/></svg>';
    if (label.includes('kahve')) return '<svg viewBox="0 0 180 180" fill="none"><rect x="42" y="22" width="96" height="137" rx="17" stroke-width="7"/><rect x="58" y="42" width="64" height="39" rx="8" stroke-width="5"/><path d="M72 102h37v32H72zM109 108h9a12 12 0 0 1 0 23h-9M82 90h18" stroke-width="5"/></svg>';
    if (label.includes('klima')) return '<svg viewBox="0 0 180 180" fill="none"><rect x="19" y="42" width="142" height="67" rx="17" stroke-width="7"/><path d="M35 81h110M52 123c6 11 2 20-5 29M89 123c6 11 2 20-5 29M126 123c6 11 2 20-5 29" stroke-width="5"/></svg>';
    if (label.includes('çamaşır')) return '<svg viewBox="0 0 180 180" fill="none"><rect x="36" y="15" width="108" height="150" rx="14" stroke-width="7"/><circle cx="90" cy="103" r="38" stroke-width="7"/><path d="M53 40h11M77 40h11M112 40h15" stroke-width="5"/></svg>';
    if (label.includes('buzdolabı')) return '<svg viewBox="0 0 180 180" fill="none"><rect x="52" y="10" width="76" height="160" rx="13" stroke-width="7"/><path d="M52 70h76M68 37v17M68 90v24" stroke-width="5"/></svg>';
    return '<svg viewBox="0 0 180 180" fill="none"><rect x="38" y="13" width="104" height="154" rx="17" stroke-width="7"/><circle cx="90" cy="61" r="25" stroke-width="6"/><path d="M63 112h54M63 134h35M105 134h12" stroke-width="5"/></svg>';
  }

  function rows(items) {
    return items.map(([label, value, cls='']) => `<div class="data-row"><dt>${escapeHtml(label)}</dt><dd class="${cls}">${escapeHtml(value)}</dd></div>`).join('');
  }
  function renderProduct(p) {
    $('#heroType').textContent = p.type; $('#heroBrand').textContent = p.brand; $('#heroName').textContent = p.name; $('#heroModel').textContent = `Model ${p.model}`; $('#heroSerial').textContent = `SERİ NO · ${p.serial}`; $('#heroDate').textContent = formatDate(p.manufactured); $('#heroCountry').textContent = p.country; $('#heroEnergy').textContent = p.energy; $('#artLabel').textContent = p.type; $('#productArt').insertAdjacentHTML('afterbegin', productArt(p.type));
    if (p.campaign) { $('#campaignText').textContent = p.campaign; $('#campaignBanner').classList.remove('hidden'); }
    const quick = [['manual','Kullanım Kılavuzu','manual'],['errors','Hata Kodları','errors'],['warranty','Garanti','warranty'],['service','Servis Geçmişi','service'],['location','Yetkili Servis','service'],['maintenance','Bakım','overview'],['specs','Teknik Özellikler','assistant'],['parts','Yedek Parçalar','parts'],['assistant','Ürün Asistanı','assistant'],['ownership','Ürün Sahipliği','warranty']];
    $('#quickGrid').innerHTML = quick.map(([icon,label,target]) => `<button class="quick-card" data-target="${target}"><span class="quick-icon">${icons[icon]}</span><span>${label}</span></button>`).join('');
    $('#productInfo').innerHTML = rows([['Marka',p.brand],['Model',p.model],['Ürün tipi',p.type],['Kapasite',p.capacity],['Enerji / verim',p.energy],['Üretim yeri',`${p.city}, ${p.country}`],['Seri numarası',p.serial]]);
    renderMaintenance(p); renderManual(p); renderErrors(p, p.errors[0]); renderWarranty(p); renderService(p); renderLifecycle(p); renderParts(p); renderPassport(p);
    $('#techInfo').innerHTML = rows([['Ürün tipi',p.type],['Nominal kapasite',p.capacity],['Enerji sınıfı',p.energy],['Üretim tesisi',p.city],['Beklenen ömür',p.lifetime],['Onarılabilirlik',p.repairability]]);
  }
  function renderMaintenance(p) {
    const remaining = dayDiff(p.nextMaintenance); let state=''; let message='';
    if (remaining < 0) { state='overdue'; message=`Bakım ${Math.abs(remaining)} gün gecikti.`; }
    else if (remaining <= 45) { state='warning'; message=`Sonraki bakımınıza ${remaining} gün kaldı.`; }
    else message=`Sonraki bakımınıza ${remaining} gün kaldı.`;
    $('#maintenanceBox').innerHTML = `<div class="maintenance-callout ${state}"><small>${remaining < 0 ? 'Bakım gecikmiş' : remaining <= 45 ? 'Bakım yaklaşıyor' : 'Planlı bakım'}</small><strong>${escapeHtml(message)}</strong></div>`;
    $('#maintenanceInfo').innerHTML = rows([['Son bakım',formatDate(p.lastMaintenance)],['Önerilen bakım',formatDate(p.nextMaintenance)],['Durum',remaining < 0 ? 'Gecikmiş' : remaining <= 45 ? 'Yaklaşıyor' : 'Planlandı']]);
  }
  function renderManual(p) {
    $('#manualList').innerHTML = p.manual.map((item,index) => `<article class="accordion"><button aria-expanded="false">${escapeHtml(item[0])}</button><div class="accordion-body"><p>${escapeHtml(item[1])}</p>${item[2] ? `<button class="mini-action video-demo" data-topic="${escapeHtml(item[0])}">Videolu anlatımı izle</button>` : ''}</div></article>`).join('');
  }
  function renderErrors(p, selected) {
    $('#errorChips').innerHTML = p.errors.map(error => `<button class="error-chip ${error.code===selected.code?'active':''}" data-code="${error.code}">${error.code}</button>`).join('');
    $('#errorDetail').innerHTML = `<div class="error-detail"><div style="display:flex;justify-content:space-between;gap:10px"><div><b>${escapeHtml(selected.code)} · ${escapeHtml(selected.title)}</b><p style="font-size:12px;color:var(--muted)">${escapeHtml(selected.description)}</p></div><span class="risk">${escapeHtml(selected.risk)} risk</span></div><dl class="data-list">${rows([['Olası neden',selected.cause],['Servis gerekli mi?',selected.service],['Önerilen çözüm',selected.solution]])}</dl><b style="font-size:12px">Kullanıcı kontrolleri</b><ul class="check-list">${selected.checks.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul></div>`;
    $('#diagnosticSummary').innerHTML = `<b>Talebe eklenecek bilgiler</b><br>${escapeHtml(p.model)} · ${escapeHtml(p.serial)}<br>Hata: <span id="selectedError">${escapeHtml(selected.code)}</span> · Garanti: ${escapeHtml(p.warrantyStatus)}`;
    $('#requestService').dataset.code = selected.code;
  }
  function renderWarranty(p) {
    const start = new Date(p.warrantyStart), end = new Date(p.warrantyEnd);
    const total = Math.max(1,end-start), used = today-start;
    const percent = Math.max(0,Math.min(100,Math.round(used/total*100)));
    const remaining = Math.max(0,dayDiff(p.warrantyEnd));
    const active = today <= end;
    $('#warrantyInfo').innerHTML = rows([['Garanti durumu',active?'Aktif':'Sona erdi',active?'status-active':'status-expired'],['Başlangıç',formatDate(p.warrantyStart)],['Bitiş',formatDate(p.warrantyEnd)],['Kalan gün',active?String(remaining):'0'],['Garanti türü',p.warrantyType],['Fatura durumu',p.invoice]]);
    $('#warrantyProgress').style.width = `${percent}%`; $('#warrantyCaption').textContent = `Garanti süresinin %${percent}'i kullanıldı.`;
    updateOwnership(p);
  }
  function renderService(p) {
    $('#serviceTimeline').innerHTML = p.service.length ? p.service.map(s => `<article class="timeline-item"><span class="timeline-dot"></span><time>${formatDate(s[0])}</time><h4>${escapeHtml(s[1])}</h4><p><b>${escapeHtml(s[2])}</b> · Teknisyen: ${escapeHtml(s[3])}<br>Değiştirilen parça: ${escapeHtml(s[4])}<br>${escapeHtml(s[5])}</p></article>`).join('') : '<div class="empty-state">Bu ürün henüz servis görmedi.<br>İlk bakım planı oluşturulmuş durumda.</div>';
  }
  function renderLifecycle(p) {
    $('#lifecycleTimeline').innerHTML = p.lifecycle.map(x => `<article class="timeline-item"><span class="timeline-dot"></span><time>${x[1].match(/^\d{4}-/) ? formatDate(x[1]) : escapeHtml(x[1])}</time><h4>${escapeHtml(x[0])}</h4></article>`).join('');
    $('#batchInfo').innerHTML = rows([['Batch ID',p.batch],['Üretim tesisi',`${p.city}, ${p.country}`],['Üretim tarihi',formatDate(p.manufactured)],['Kalite durumu','Kontrolden geçti']]);
    if (p.campaign) $('#batchNotice').innerHTML = `<div class="alert-item"><b>Aktif ürün programı</b><br>${escapeHtml(p.campaign)}</div>`;
    else $('#batchNotice').innerHTML = '<div class="form-summary" style="margin-top:14px">Bu batch için aktif uyarı veya geri çağırma programı bulunmuyor.</div>';
  }
  function renderParts(p) {
    $('#partsList').innerHTML = p.parts.map(part => `<article class="part"><div><h4>${escapeHtml(part[0])}</h4><p>Parça kodu: ${escapeHtml(part[1])} · ${escapeHtml(part[2])}</p><span class="stock">${escapeHtml(part[3])}</span></div><button class="btn btn-soft buy-part" data-part="${escapeHtml(part[0])}" data-code="${escapeHtml(part[1])}">Satın Al</button></article>`).join('');
  }
  function renderPassport(p) {
    const labels = [['Manufacturer','manufacturer'],['Product identifier','identifier'],['Serial number','serial'],['Batch','batch'],['Manufacturing country','country'],['Manufacturing date','date'],['Materials','materials'],['Energy efficiency','energy'],['Repairability','repairability'],['Spare part availability','parts'],['Recycling information','recycling'],['Carbon / environmental','carbon'],['Expected lifetime','lifetime']];
    $('#passportGrid').innerHTML = labels.map(([label,key]) => `<div class="passport-item"><small>${label}</small><b>${escapeHtml(key==='date'?formatDate(p.passport[key]):p.passport[key])}</b></div>`).join('');
  }

  function bindProductEvents(p) {
    $$('.quick-card,.bottom-nav button').forEach(button => button.addEventListener('click', () => scrollToSection(button.dataset.target)));
    $$('.accordion button').forEach(button => button.addEventListener('click', () => { const box=button.parentElement; box.classList.toggle('open'); button.setAttribute('aria-expanded',box.classList.contains('open')); }));
    $$('.video-demo').forEach(button => button.addEventListener('click', () => openModal(`${button.dataset.topic} · Videolu anlatım`, `<div style="aspect-ratio:16/9;border-radius:15px;background:linear-gradient(135deg,#222826,#3e4743);display:grid;place-items:center;color:#fff;text-align:center"><div><div style="width:58px;height:58px;border-radius:50%;background:var(--brand);display:grid;place-items:center;margin:0 auto 12px;font-size:22px">▶</div><b>Demo eğitim videosu</b><br><small style="opacity:.65">Gerçek medya oynatılmaz</small></div></div><p>Bu prototip, ürüne ve kılavuz bölümüne özel video içeriğinin nasıl sunulacağını gösterir.</p>`)));
    $('#errorChips').addEventListener('click', event => { const button=event.target.closest('[data-code]'); if(button){const error=p.errors.find(e=>e.code===button.dataset.code); if(error) renderErrors(p,error);} });
    $('#errorSearch').addEventListener('input', event => { const q=event.target.value.trim().toLocaleLowerCase('tr-TR'); const filtered=p.errors.filter(e=>`${e.code} ${e.title} ${e.description}`.toLocaleLowerCase('tr-TR').includes(q)); $('#errorChips').innerHTML=filtered.length?filtered.map(e=>`<button class="error-chip" data-code="${e.code}">${e.code} · ${escapeHtml(e.title)}</button>`).join(''):'<span style="font-size:12px;color:var(--muted)">Eşleşen hata kodu bulunamadı.</span>'; });
    $('#requestService').addEventListener('click', event => serviceForm(p,event.currentTarget.dataset.code));
    $('#generalServiceRequest').addEventListener('click', () => serviceForm(p,'Genel kontrol'));
    $('#authorizedService').addEventListener('click', () => openModal('Yetkili servis noktaları', `<p>Demo konum sonucu · ${escapeHtml(p.city)} çevresi</p><div class="form-summary"><b>${escapeHtml(p.brand)} Demo Yetkili Servis</b><br>Merkez bölge · 3,2 km<br>Pzt–Cmt 08:30–18:00</div><button class="btn btn-primary btn-block" style="margin-top:14px" id="modalService">Bu servisten randevu iste</button>`));
    $('#claimProduct').addEventListener('click', () => { const owned=safeRead('dpi_owned_products',[]); if(!owned.includes(p.id)) owned.push(p.id); if (!safeWrite('dpi_owned_products',owned)) return toast('Kayıt yapılamadı. Tarayıcı depolama iznini kontrol edin.'); updateOwnership(p); toast('Ürün bu tarayıcıya kaydedildi.'); });
    $('#transferProduct').addEventListener('click', () => openModal('Sahipliği devret', `<p>Bu işlem bu tarayıcıdaki demo sahiplik kaydını kaldırır; başka bir hesaba aktarım yapılmaz.</p><button class="btn btn-primary btn-block" id="confirmTransfer">Demo sahipliği devret</button>`));
    document.addEventListener('click', event => {
      if(event.target.closest('#confirmTransfer')) { let owned=safeRead('dpi_owned_products',[]).filter(id=>id!==p.id); if (!safeWrite('dpi_owned_products',owned)) return toast('Kayıt güncellenemedi. Tarayıcı depolama iznini kontrol edin.'); closeModal(); updateOwnership(p); toast('Demo sahiplik kaydı devredildi.'); }
      if(event.target.closest('#modalService')) { closeModal(); serviceForm(p,'Genel kontrol'); }
      const buy=event.target.closest('.buy-part'); if(buy) openModal('Demo satın alma', `<p><b>${escapeHtml(buy.dataset.part)}</b> (${escapeHtml(buy.dataset.code)}) bu ürünle uyumludur.</p><div class="success-box">Bu prototip gerçek sipariş veya ödeme oluşturmaz. Yetkili parça satış akışı burada başlatılabilir.</div>`);
    });
    $('#chatForm').addEventListener('submit', event => { event.preventDefault(); askAssistant(p,$('#chatInput').value); });
    $$('.suggestion').forEach(button => button.addEventListener('click', () => askAssistant(p,button.textContent)));
    $('#downloadSpecs').addEventListener('click', () => downloadSpecs(p));
    $('#shareProduct').addEventListener('click', () => shareProduct(p));
    $('#globalModal').addEventListener('click', event => { if(event.target.id==='globalModal'||event.target.closest('[data-close-modal]')) closeModal(); });
    document.addEventListener('keydown', event => { if(event.key==='Escape') closeModal(); });
  }
  function scrollToSection(id) { const el=document.getElementById(id); if(el) el.scrollIntoView({behavior:'smooth',block:'start'}); }
  function updateOwnership(p) {
    const isOwned=safeRead('dpi_owned_products',[]).includes(p.id);
    $('#claimProduct').classList.toggle('hidden',isOwned); $('#transferProduct').classList.toggle('hidden',!isOwned);
    $('#ownershipStatus').textContent=isOwned?'✓ Ürün bu tarayıcıya kaydedildi.':'';
  }
  function serviceForm(p, code) {
    openModal('Demo servis talebi', `<p>Ürün ve tanılama bilgileri forma otomatik eklendi.</p><div class="form-summary"><b>${escapeHtml(p.brand)} ${escapeHtml(p.model)}</b><br>Seri: ${escapeHtml(p.serial)}<br>Hata / konu: ${escapeHtml(code)}<br>Garanti: ${escapeHtml(p.warrantyStatus)}</div><form class="form-grid" id="serviceForm"><div class="field"><label>Ad soyad</label><input required value="Demo Kullanıcı"></div><div class="field"><label>Telefon</label><input required type="tel" value="05xx xxx xx xx"></div><div class="field"><label>Açıklama</label><textarea rows="3">${escapeHtml(code)} için kontrol talep ediyorum.</textarea></div><button class="btn btn-primary" type="submit">Demo Talebi Oluştur</button></form>`);
    setTimeout(()=>{ const form=$('#serviceForm'); if(form) form.addEventListener('submit',event=>{event.preventDefault(); const requests=safeRead('dpi_service_requests',[]); requests.push({id:`SR-${Date.now().toString().slice(-7)}`,productId:p.id,model:p.model,serial:p.serial,code,warranty:p.warrantyStatus,createdAt:new Date().toISOString()}); if (!safeWrite('dpi_service_requests',requests)) return toast('Talep kaydedilemedi. Tarayıcı depolama iznini kontrol edin.'); $('#modalBody').innerHTML='<div class="success-box"><b>Talebiniz oluşturuldu</b><br>Demo servis talebi bu tarayıcıya kaydedildi.<br><small>Gerçek bir servise gönderilmedi.</small></div>'; }); },0);
  }
  function askAssistant(p, message) {
    const text=String(message||'').trim(); if(!text) return;
    const messages=$('#messages'); messages.insertAdjacentHTML('beforeend',`<div class="message user">${escapeHtml(text)}</div>`); $('#chatInput').value='';
    const q=text.toLocaleLowerCase('tr-TR'); let answer='Bu demo asistan; garanti, bakım, hata kodları, basınç/akış ve filtre temizliği hakkında ürün verisine bağlı yanıt verebilir.';
    if(q.includes('garanti')) answer=`${p.model} ürününün garanti bitiş tarihi ${formatDate(p.warrantyEnd)}. Güncel durum: ${p.warrantyStatus}. Garanti türü: ${p.warrantyType}.`;
    else if(q.includes('bakım')) answer=p.service.length?`Son kayıtlı bakım ${formatDate(p.lastMaintenance)} tarihinde yapıldı. Sonraki önerilen bakım ${formatDate(p.nextMaintenance)}.`:`Henüz servis kaydı yok. İlk önerilen bakım ${formatDate(p.nextMaintenance)}.`;
    else if(q.includes('e04')||q.includes('basınç')||q.includes('0.8')) answer=`0,8 gibi düşük bir değer E04 uyarısıyla ilişkili olabilir. Önce ${p.model} göstergesini ve erişilebilir vanaları kontrol edin. Ürün kapağını açmayın; sorun sürerse servis talebi oluşturun.`;
    else if(q.includes('filtre')||q.includes('temiz')) answer='Ürünün enerjisini güvenli biçimde kesin. Yalnızca kullanıcı erişimine açık filtreyi kılavuzdaki sırayla çıkarıp temizleyin; solvent veya basınçlı su kullanmayın. İç parçalara müdahale etmeyin.';
    else { const found=p.errors.find(e=>q.includes(e.code.toLocaleLowerCase('tr-TR'))); if(found) answer=`${found.code}: ${found.description} Olası neden: ${found.cause} Öneri: ${found.solution}`; }
    setTimeout(()=>{ messages.insertAdjacentHTML('beforeend',`<div class="message bot">${escapeHtml(answer)}</div>`); messages.scrollTop=messages.scrollHeight; },220);
  }
  async function shareProduct(p) {
    const url = new URL('product.html', location.href);
    url.searchParams.set('id', p.id);
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: p.brand + ' ' + p.model, text: 'Demo dijital ürün kimliği', url: url.href });
        return;
      } catch (error) {
        if (error.name === 'AbortError') return;
      }
    }
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try {
        await navigator.clipboard.writeText(url.href);
        toast('Ürün bağlantısı kopyalandı.');
        return;
      } catch (_) {}
    }
    openModal('Ürün bağlantısı', '<p>Bağlantıyı kopyalayıp paylaşabilirsiniz.</p><div class="field"><label for="shareUrl">Ürün bağlantısı</label><input id="shareUrl" type="url" readonly value="' + escapeHtml(url.href) + '"></div>');
    const input = $('#shareUrl');
    input.focus();
    input.select();
  }
  function downloadSpecs(p) {
    const content=[`${p.brand} ${p.model} — Demo Teknik Özet`,`Seri: ${p.serial}`,`Ürün tipi: ${p.type}`,`Kapasite: ${p.capacity}`,`Enerji / verim: ${p.energy}`,`Üretim: ${formatDate(p.manufactured)} · ${p.city}, ${p.country}`,`Batch: ${p.batch}`,`Onarılabilirlik: ${p.repairability}`,`Beklenen ömür: ${p.lifetime}`,'','DPI Studio Interactive Demo — gerçek uygunluk belgesi değildir.'].join('\n');
    const blob=new Blob([content],{type:'text/plain;charset=utf-8'}), link=document.createElement('a'); link.href=URL.createObjectURL(blob); link.download=`${p.id}-teknik-ozet.txt`; document.body.appendChild(link); link.click(); link.remove(); setTimeout(()=>URL.revokeObjectURL(link.href),1000);
  }
  function openModal(title, html) { $('#modalTitle').textContent=title; $('#modalBody').innerHTML=html; $('#globalModal').classList.add('open'); document.body.style.overflow='hidden'; }
  function closeModal() { const modal=$('#globalModal'); if(modal){modal.classList.remove('open');document.body.style.overflow='';} }
  function trackRecent(p) { let recent=safeRead('dpi_recent_products',[]).filter(id=>id!==p.id); recent.unshift(p.id); safeWrite('dpi_recent_products',recent.slice(0,6)); }
})();
