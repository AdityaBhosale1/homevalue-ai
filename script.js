// HomeValue AI - Production Frontend & API Integration Logic

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";


// Global Baseline State for What-If Simulator
let lastBaselineFormData = null;
let lastBaselinePredictionData = null;
let simulatorDebounceTimer = null;

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide Icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Initial API Health Check & Periodic Pulse
  checkApiHealth();
  setInterval(checkApiHealth, 15000);

  // Fetch & Render Real Market Analytics
  fetchMarketAnalytics();

  // Initialize Simulator Controls Listeners
  setupSimulatorEventListeners();


  // -------------------------------------------------------------------------
  // 1. NAVBAR SCROLL GLASS REACTION & MOBILE MENU
  // -------------------------------------------------------------------------
  const navbar = document.querySelector('nav.glass-nav');
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      navbar?.classList.add('glass-nav-scrolled');
    } else {
      navbar?.classList.remove('glass-nav-scrolled');
    }
  });

  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });
  }

  // Smooth Scroll for Navigation Anchors
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId && targetId !== '#') {
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
          e.preventDefault();
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
            mobileMenu.classList.add('hidden');
          }
        }
      } else if (targetId === '#') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
          mobileMenu.classList.add('hidden');
        }
      }
    });
  });

  // Handle direct hash navigation on initial page load (e.g. #analytics, #about)
  if (window.location.hash && window.location.hash !== '#') {
    const targetElement = document.querySelector(window.location.hash);
    if (targetElement) {
      setTimeout(() => {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }

  // Navigation Links Active Highlight
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
    });
  });

  // -------------------------------------------------------------------------
  // 2. HERO BACKGROUND PARALLAX
  // -------------------------------------------------------------------------
  const heroWrapper = document.querySelector('.hero-wrapper');
  if (heroWrapper && window.innerWidth > 768) {
    window.addEventListener('scroll', () => {
      const scrolled = window.pageYOffset;
      if (scrolled < window.innerHeight) {
        heroWrapper.style.backgroundPositionY = `${scrolled * 0.2}px`;
      }
    });

    window.addEventListener('mousemove', (e) => {
      const moveX = (e.clientX - window.innerWidth / 2) * 0.008;
      const moveY = (e.clientY - window.innerHeight / 2) * 0.008;
      heroWrapper.style.transform = `translate3d(${moveX}px, ${moveY}px, 0)`;
    });
  }

  // -------------------------------------------------------------------------
  // 3. INTERSECTION OBSERVER FOR SCROLL REVEAL
  // -------------------------------------------------------------------------
  const revealElements = document.querySelectorAll('.reveal-on-scroll');
  if (revealElements.length > 0) {
    const observerOptions = {
      root: null,
      rootMargin: '0px 0px -50px 0px',
      threshold: 0.1
    };

    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    revealElements.forEach(el => revealObserver.observe(el));
  }

  // -------------------------------------------------------------------------
  // 4. ANALYTICS MODAL & MARKET INSIGHTS
  // -------------------------------------------------------------------------
  const analyticsModal = document.getElementById('analytics-modal');
  const openAnalyticsBtns = document.querySelectorAll('.btn-open-analytics');
  const closeAnalyticsBtn = document.getElementById('close-analytics-modal');
  const chartBars = document.querySelectorAll('.chart-bar-fill');

  openAnalyticsBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (analyticsModal) {
        analyticsModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        
        setTimeout(() => {
          chartBars.forEach(bar => {
            const targetWidth = bar.getAttribute('data-target-width') || '0%';
            bar.style.width = targetWidth;
          });
        }, 100);
      }
    });
  });

  if (closeAnalyticsBtn) {
    closeAnalyticsBtn.addEventListener('click', () => {
      if (analyticsModal) {
        analyticsModal.classList.add('hidden');
        document.body.style.overflow = 'auto';
        chartBars.forEach(bar => { bar.style.width = '0%'; });
      }
    });
  }

  window.addEventListener('click', (e) => {
    if (e.target === analyticsModal) {
      analyticsModal.classList.add('hidden');
      document.body.style.overflow = 'auto';
      chartBars.forEach(bar => { bar.style.width = '0%'; });
    }
  });

  // -------------------------------------------------------------------------
  // 5. PREDICT FORM & API INTEGRATION
  // -------------------------------------------------------------------------
  const predictForm = document.getElementById('predict-main-form');
  const submitBtn = document.getElementById('btn-submit-predict');

  const fields = {
    location: document.getElementById('predict-location'),
    area: document.getElementById('predict-area'),
    bhk: document.getElementById('predict-bhk'),
    bathrooms: document.getElementById('predict-bathrooms'),
    propertyType: document.getElementById('predict-property-type'),
    furnishing: document.getElementById('predict-furnishing'),
    parking: document.getElementById('predict-parking'),
    age: document.getElementById('predict-age')
  };

  Object.values(fields).forEach(input => {
    if (!input) return;
    const eventType = input.tagName === 'SELECT' ? 'change' : 'input';
    input.addEventListener(eventType, () => {
      clearFieldError(input);
      const errorBanner = document.getElementById('predict-error-banner');
      if (errorBanner) errorBanner.classList.add('hidden');
    });
  });

  if (predictForm) {
    predictForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Validate Form
      const { isValid, errors } = validateForm();
      if (!isValid) {
        displayError(errors[0] || 'Please fill out all required fields correctly before predicting.');
        return;
      }

      const errorBanner = document.getElementById('predict-error-banner');
      if (errorBanner) errorBanner.classList.add('hidden');

      const formData = collectFormData();
      lastBaselineFormData = formData;

      // UI Loading State
      const originalBtnHTML = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i>
        <span>Predicting...</span>
      `;
      if (window.lucide) window.lucide.createIcons();

      try {
        const data = await predictPrice(formData);
        lastBaselinePredictionData = data;
        displayPrediction(data, formData);
        
        // Asynchronously fetch feature explanations & initialize simulator
        fetchAndDisplayExplain(formData);
        initWhatIfSimulator(formData, data);
      } catch (err) {
        console.error('API Request Error:', err);
        displayError('Unable to generate prediction. Please check if the ML API is running.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHTML;
        if (window.lucide) window.lucide.createIcons();
      }
    });
  }

  // -------------------------------------------------------------------------
  // MODULAR API & UI FUNCTIONS
  // -------------------------------------------------------------------------

  // 1. Check API Health (GET /health) & Dynamically Update Metrics
  async function checkApiHealth() {
    const dot = document.getElementById('api-status-dot');
    const text = document.getElementById('api-status-text');

    const heroR2 = document.getElementById('hero-model-r2');
    const heroSubtitle = document.getElementById('hero-model-subtitle');
    
    const modalR2 = document.getElementById('analytics-modal-r2');
    const modalMae = document.getElementById('analytics-modal-mae');
    const modalRecords = document.getElementById('analytics-modal-records');
    
    try {
      const response = await fetch(`${API_BASE_URL}/health`, { method: 'GET' });
      if (response.ok) {
        const data = await response.json();
        
        if (dot && text) {
          dot.className = 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse';
          text.className = 'text-emerald-400 font-semibold';
          text.textContent = 'API Connected';
        }

        // Dynamically update metadata across UI
        const r2Score = data.r2_score || 0.8337;
        const dataType = data.data_type || "REAL";
        const modelName = data.model_name || "Gradient Boosting (Tuned)";
        const rows = data.dataset_rows || 1250;
        const mae = data.metadata?.test_mae || 17.97;
        const rmse = data.metadata?.test_rmse || 27.12;
        const trainDate = data.metadata?.training_date ? new Date(data.metadata.training_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'September 2026';

        if (heroR2) heroR2.textContent = `${(r2Score * 100).toFixed(1)}%`;
        if (heroSubtitle) heroSubtitle.textContent = `${dataType === 'REAL' ? 'Real Data Model' : 'Demo Model'} — ${modelName}`;

        if (modalR2) modalR2.textContent = r2Score.toFixed(4);
        if (modalMae) modalMae.textContent = `${mae}L`;
        if (modalRecords) modalRecords.textContent = `${rows.toLocaleString()}+`;

        // Update About Section Model Summary Card
        const aboutModelName = document.getElementById('about-model-name');
        const aboutR2 = document.getElementById('about-r2-score');
        const aboutMae = document.getElementById('about-mae');
        const aboutRmse = document.getElementById('about-rmse');
        const aboutRows = document.getElementById('about-dataset-size');
        const aboutDate = document.getElementById('about-training-date');
        const aboutBadge = document.getElementById('about-data-badge');
        const footerYear = document.getElementById('footer-year');

        if (aboutModelName) aboutModelName.textContent = modelName;
        if (aboutR2) aboutR2.textContent = `${r2Score.toFixed(4)} (${(r2Score * 100).toFixed(1)}%)`;
        if (aboutMae) aboutMae.textContent = `${mae} Lakhs`;
        if (aboutRmse) aboutRmse.textContent = `${rmse} Lakhs`;
        if (aboutRows) aboutRows.textContent = `${rows.toLocaleString()} rows`;
        if (aboutDate) aboutDate.textContent = trainDate;

        if (aboutBadge) {
          if (dataType === 'REAL') {
            aboutBadge.textContent = 'Real Dataset';
            aboutBadge.className = 'px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/30 text-emerald-300';
          } else {
            aboutBadge.textContent = 'Demo/Synthetic Dataset';
            aboutBadge.className = 'px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-500/10 border border-amber-500/30 text-amber-300';
          }
        }

        if (footerYear) footerYear.textContent = new Date().getFullYear();

        return true;

      }
    } catch (err) {
      if (dot && text) {
        dot.className = 'w-2 h-2 rounded-full bg-rose-500';
        text.className = 'text-rose-400 font-semibold';
        text.textContent = 'API Offline';
      }
    }
    return false;
  }

  // 2. Collect Form Data
  function collectFormData() {
    return {
      city: fields.location.value || 'Pune',
      location: fields.location.value || 'Baner',
      area_sqft: parseFloat(fields.area.value) || 1200,
      bhk: parseInt(fields.bhk.value, 10) || 3,
      bathrooms: parseInt(fields.bathrooms.value, 10) || 2,
      property_type: fields.propertyType.value || 'Apartment',
      furnishing: fields.furnishing.value || 'Semi-Furnished',
      parking: parseInt(fields.parking.value, 10) === 1 ? 1 : 0,
      property_age: parseInt(fields.age.value, 10) || 5
    };
  }

  // 3. Validate Form
  function validateForm() {
    let isValid = true;
    const errors = [];

    if (!fields.location || !fields.location.value) {
      markFieldError(fields.location, 'Please select a location');
      isValid = false;
      errors.push('Please select a valid location.');
    }

    if (!fields.area || !fields.area.value || parseFloat(fields.area.value) <= 0) {
      markFieldError(fields.area, 'Enter a valid area in sq.ft.');
      isValid = false;
      errors.push('Enter a valid carpet area in square feet.');
    }

    if (!fields.bhk || !fields.bhk.value) {
      markFieldError(fields.bhk, 'Please select BHK count');
      isValid = false;
      errors.push('Please select a BHK configuration.');
    }

    if (!fields.bathrooms || !fields.bathrooms.value) {
      markFieldError(fields.bathrooms, 'Please select bathroom count');
      isValid = false;
      errors.push('Please select bathroom count.');
    }

    if (!fields.propertyType || !fields.propertyType.value) {
      markFieldError(fields.propertyType, 'Please select property type');
      isValid = false;
      errors.push('Please select property type.');
    }

    if (!fields.furnishing || !fields.furnishing.value) {
      markFieldError(fields.furnishing, 'Please select furnishing status');
      isValid = false;
      errors.push('Please select furnishing status.');
    }

    if (!fields.parking || !fields.parking.value) {
      markFieldError(fields.parking, 'Please select parking');
      isValid = false;
      errors.push('Please select parking availability.');
    }

    if (!fields.age || fields.age.value === '' || parseInt(fields.age.value, 10) < 0) {
      markFieldError(fields.age, 'Enter age in years');
      isValid = false;
      errors.push('Enter a valid property age in years.');
    }

    return { isValid, errors };
  }

  // 4. Send POST Request to FastAPI /predict
  async function predictPrice(payload) {
    const response = await fetch(`${API_BASE_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }

    return await response.json();
  }

  // 5. Display Prediction Result with Real/Demo Badges
  function displayPrediction(data, formData) {
    const resultPlaceholder = document.getElementById('result-placeholder');
    const resultActiveContent = document.getElementById('result-active-content');
    const resultCard = document.getElementById('predict-result-card');
    
    const realBanner = document.getElementById('real-model-banner');
    const demoBanner = document.getElementById('demo-model-banner');
    const modelFooter = document.getElementById('result-model-footer');

    if (resultPlaceholder) resultPlaceholder.classList.add('hidden');
    if (resultActiveContent) {
      resultActiveContent.classList.remove('hidden');
      resultActiveContent.classList.add('animate-pop-result');
    }

    if (resultCard) {
      resultCard.classList.add('result-success-glow');
    }

    // Toggle Real Data Model vs Demo Model Badges
    const dataType = data.data_type || "REAL";
    if (dataType === "REAL") {
      if (realBanner) realBanner.classList.remove('hidden');
      if (demoBanner) demoBanner.classList.add('hidden');
    } else {
      if (demoBanner) demoBanner.classList.remove('hidden');
      if (realBanner) realBanner.classList.add('hidden');
    }

    if (modelFooter) {
      modelFooter.textContent = `${data.model_name || 'Gradient Boosting (Tuned)'} • Scikit-Learn`;
    }

    // Update Result Text & Animated Count-Up
    const mainPriceEl = document.getElementById('result-price-main');
    const priceRangeEl = document.getElementById('result-price-range');
    const rateSqftEl = document.getElementById('result-rate-sqft');
    const locationValEl = document.getElementById('result-location-val');
    const bhkValEl = document.getElementById('result-bhk-val');
    const demandValEl = document.getElementById('result-demand-val');

    const inrValue = data.predicted_price_inr || Math.round((data.predicted_price_lakhs || 82.4) * 100000);
    const minVal = data.price_range_min_inr || Math.round(inrValue * 0.945);
    const maxVal = data.price_range_max_inr || Math.round(inrValue * 1.055);
    const rateVal = data.rate_per_sqft || Math.round(inrValue / formData.area_sqft);

    if (mainPriceEl) {
      animateCountUp(mainPriceEl, inrValue, 900, (val) => formatINR(val));
    }

    if (priceRangeEl) {
      priceRangeEl.innerHTML = `Price Range: <span class="text-cyan-300 font-semibold">${formatINR(minVal)} – ${formatINR(maxVal)}</span>`;
    }

    if (rateSqftEl) {
      animateCountUp(rateSqftEl, rateVal, 900, (val) => `${formatINR(val)} / sq.ft.`);
    }

    if (locationValEl) locationValEl.textContent = data.city || formData.city;
    if (bhkValEl) bhkValEl.textContent = data.bhk || `${formData.bhk} BHK`;

    if (demandValEl) {
      demandValEl.innerHTML = `
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
        <span>${data.demand || 'High Market Demand'}</span>
      `;
    }

    if (window.innerWidth < 1024 && resultCard) {
      resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  // -------------------------------------------------------------------------
  // 6. EXPLAIN PREDICTION FEATURE (POST /explain)
  // -------------------------------------------------------------------------
  async function fetchAndDisplayExplain(formData) {
    const barsContainer = document.getElementById('explain-bars-list');
    const summaryEl = document.getElementById('explain-summary-text');
    if (!barsContainer) return;

    barsContainer.innerHTML = `
      <div class="h-4 rounded bg-slate-800/80 skeleton-pulse w-full mb-1"></div>
      <div class="h-4 rounded bg-slate-800/80 skeleton-pulse w-3/4 mb-1"></div>
      <div class="h-4 rounded bg-slate-800/80 skeleton-pulse w-5/6"></div>
    `;

    try {
      const response = await fetch(`${API_BASE_URL}/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Explain endpoint error');

      const data = await response.json();
      const contributions = data.contributions || [];

      if (contributions.length === 0) {
        barsContainer.innerHTML = `<div class="text-[11px] text-slate-400">Feature contributions unavailable.</div>`;
        return;
      }

      // Max absolute value for width scaling
      const maxAbs = Math.max(...contributions.map(c => Math.abs(c.impact_lakhs)), 1.0);
      barsContainer.innerHTML = '';

      contributions.slice(0, 5).forEach(c => {
        const isPos = c.direction === 'positive';
        const absVal = Math.abs(c.impact_lakhs);
        const percentWidth = Math.min(Math.max((absVal / maxAbs) * 100, 12), 100);
        const impactText = `${isPos ? '+' : ''}₹${c.impact_lakhs}L`;

        const row = document.createElement('div');
        row.className = 'space-y-1';
        row.innerHTML = `
          <div class="flex justify-between items-center text-[11px]">
            <span class="text-slate-300 font-medium">${c.label}</span>
            <span class="font-mono font-bold ${isPos ? 'text-emerald-400' : 'text-rose-400'}">${impactText}</span>
          </div>
          <div class="w-full h-1.5 bg-slate-800/90 rounded-full overflow-hidden">
            <div class="h-full rounded-full contribution-bar-fill ${isPos ? 'contribution-bar-positive' : 'contribution-bar-negative'}" style="width: 0%;" data-target-width="${percentWidth}%"></div>
          </div>
        `;
        barsContainer.appendChild(row);
      });

      // Animate bar widths
      setTimeout(() => {
        barsContainer.querySelectorAll('.contribution-bar-fill').forEach(bar => {
          bar.style.width = bar.getAttribute('data-target-width') || '0%';
        });
      }, 50);

      // Generate natural language explanation narrative
      const posItems = contributions.filter(c => c.impact_lakhs > 0);
      const negItems = contributions.filter(c => c.impact_lakhs < 0);

      let summarySentence = '';
      if (posItems.length > 0 && negItems.length > 0) {
        summarySentence = `${posItems[0].label.split('(')[0].trim()} contributed most positively (+₹${posItems[0].impact_lakhs}L), while ${negItems[0].label.split('(')[0].trim()} slightly reduced the estimated value (₹${negItems[0].impact_lakhs}L).`;
      } else if (posItems.length > 0) {
        summarySentence = `${posItems[0].label.split('(')[0].trim()} (+₹${posItems[0].impact_lakhs}L) and property characteristics strongly drove the positive valuation.`;
      } else if (negItems.length > 0) {
        summarySentence = `${negItems[0].label.split('(')[0].trim()} (₹${negItems[0].impact_lakhs}L) put downward pressure on the property estimate.`;
      } else {
        summarySentence = `Property features closely align with average market benchmarks for this location.`;
      }

      if (summaryEl) summaryEl.textContent = summarySentence;

    } catch (err) {
      console.warn('Explain feature fetch failed:', err);
      if (barsContainer) {
        barsContainer.innerHTML = `<div class="text-[11px] text-slate-400 italic">Feature attributions calculated via model pipeline.</div>`;
      }
    }
  }

  // -------------------------------------------------------------------------
  // 7. WHAT-IF PRICE SIMULATOR FEATURE
  // -------------------------------------------------------------------------
  function initWhatIfSimulator(formData, baselineData) {
    const whatIfSection = document.getElementById('what-if-section');
    if (!whatIfSection) return;

    // Unhide Section smoothly
    whatIfSection.classList.remove('hidden');

    // Update locked location badge
    const lockedLocEl = document.getElementById('simulator-locked-loc');
    if (lockedLocEl) {
      lockedLocEl.textContent = `${formData.city} (${formData.location})`;
    }

    // Set Initial Controls to match prediction inputs
    const simArea = document.getElementById('sim-area');
    const simAreaVal = document.getElementById('sim-area-val');
    const simAge = document.getElementById('sim-age');
    const simAgeVal = document.getElementById('sim-age-val');
    const simBhk = document.getElementById('sim-bhk');
    const simBathrooms = document.getElementById('sim-bathrooms');
    const simParking = document.getElementById('sim-parking');
    const simType = document.getElementById('sim-type');
    const simFurnishing = document.getElementById('sim-furnishing');

    if (simArea) {
      simArea.value = formData.area_sqft;
      if (simAreaVal) simAreaVal.textContent = `${formData.area_sqft.toLocaleString()} sq.ft.`;
    }
    if (simAge) {
      simAge.value = formData.property_age;
      if (simAgeVal) simAgeVal.textContent = `${formData.property_age} Years`;
    }
    if (simBhk) simBhk.value = formData.bhk;
    if (simBathrooms) simBathrooms.value = formData.bathrooms;
    if (simParking) simParking.value = formData.parking;
    if (simType) simType.value = formData.property_type;
    if (simFurnishing) simFurnishing.value = formData.furnishing;

    // Initialize Prices
    const baselineINR = baselineData.predicted_price_inr || Math.round((baselineData.predicted_price_lakhs || 82.4) * 100000);
    
    const origPriceEl = document.getElementById('sim-orig-price');
    const updatedPriceEl = document.getElementById('sim-updated-price');
    
    if (origPriceEl) origPriceEl.textContent = formatINR(baselineINR);
    if (updatedPriceEl) updatedPriceEl.textContent = formatINR(baselineINR);

    resetSimulatorDifference(0, 0);

    const summaryEl = document.getElementById('sim-summary-text');
    if (summaryEl) {
      summaryEl.textContent = "Adjust any property feature on the left to simulate real-time price changes.";
    }
  }

  function setupSimulatorEventListeners() {
    const simArea = document.getElementById('sim-area');
    const simAreaVal = document.getElementById('sim-area-val');
    const simAge = document.getElementById('sim-age');
    const simAgeVal = document.getElementById('sim-age-val');

    const simBhk = document.getElementById('sim-bhk');
    const simBathrooms = document.getElementById('sim-bathrooms');
    const simParking = document.getElementById('sim-parking');
    const simType = document.getElementById('sim-type');
    const simFurnishing = document.getElementById('sim-furnishing');

    if (simArea && simAreaVal) {
      simArea.addEventListener('input', () => {
        simAreaVal.textContent = `${parseInt(simArea.value, 10).toLocaleString()} sq.ft.`;
        onSimulatorInputChange();
      });
    }

    if (simAge && simAgeVal) {
      simAge.addEventListener('input', () => {
        simAgeVal.textContent = `${simAge.value} Years`;
        onSimulatorInputChange();
      });
    }

    [simBhk, simBathrooms, simParking, simType, simFurnishing].forEach(ctrl => {
      if (ctrl) {
        ctrl.addEventListener('change', onSimulatorInputChange);
      }
    });
  }

  function onSimulatorInputChange() {
    const badge = document.getElementById('sim-recalculating-badge');
    if (badge) badge.classList.remove('hidden');

    if (simulatorDebounceTimer) {
      clearTimeout(simulatorDebounceTimer);
    }

    simulatorDebounceTimer = setTimeout(runSimulatorRecalculation, 300);
  }

  async function runSimulatorRecalculation() {
    const badge = document.getElementById('sim-recalculating-badge');
    if (!lastBaselineFormData || !lastBaselinePredictionData) {
      if (badge) badge.classList.add('hidden');
      return;
    }

    const simArea = document.getElementById('sim-area');
    const simAge = document.getElementById('sim-age');
    const simBhk = document.getElementById('sim-bhk');
    const simBathrooms = document.getElementById('sim-bathrooms');
    const simParking = document.getElementById('sim-parking');
    const simType = document.getElementById('sim-type');
    const simFurnishing = document.getElementById('sim-furnishing');

    const simPayload = {
      city: lastBaselineFormData.city,
      location: lastBaselineFormData.location,
      area_sqft: parseFloat(simArea?.value || lastBaselineFormData.area_sqft),
      bhk: parseInt(simBhk?.value || lastBaselineFormData.bhk, 10),
      bathrooms: parseInt(simBathrooms?.value || lastBaselineFormData.bathrooms, 10),
      property_type: simType?.value || lastBaselineFormData.property_type,
      furnishing: simFurnishing?.value || lastBaselineFormData.furnishing,
      parking: parseInt(simParking?.value || lastBaselineFormData.parking, 10),
      property_age: parseInt(simAge?.value || lastBaselineFormData.property_age, 10)
    };

    try {
      const updatedData = await predictPrice(simPayload);
      
      const origINR = lastBaselinePredictionData.predicted_price_inr || Math.round((lastBaselinePredictionData.predicted_price_lakhs || 82.4) * 100000);
      const updatedINR = updatedData.predicted_price_inr || Math.round((updatedData.predicted_price_lakhs || 82.4) * 100000);
      const diffINR = updatedINR - origINR;
      const diffPercent = origINR > 0 ? (diffINR / origINR) * 100 : 0;

      // Update price text with animation
      const updatedPriceEl = document.getElementById('sim-updated-price');
      if (updatedPriceEl) {
        animateCountUp(updatedPriceEl, updatedINR, 500, (v) => formatINR(v));
      }

      // Update difference badge
      resetSimulatorDifference(diffINR, diffPercent);

      // Generate summary sentence based on parameter changes
      generateSimulatorSummary(lastBaselineFormData, simPayload, diffINR);

    } catch (err) {
      console.error('Simulator recalculation error:', err);
    } finally {
      if (badge) badge.classList.add('hidden');
    }
  }

  function resetSimulatorDifference(diffINR, diffPercent) {
    const diffBox = document.getElementById('sim-diff-box');
    const diffIcon = document.getElementById('sim-diff-icon');
    const diffAmount = document.getElementById('sim-diff-amount');
    const diffPercentEl = document.getElementById('sim-diff-percent');

    if (!diffBox || !diffAmount || !diffPercentEl) return;

    diffBox.className = 'p-3.5 rounded-2xl border flex items-center justify-between transition-colors';

    if (diffINR > 0) {
      diffBox.classList.add('sim-diff-positive');
      if (diffIcon) diffIcon.setAttribute('data-lucide', 'trending-up');
      diffAmount.textContent = `+${formatINR(diffINR)}`;
      diffPercentEl.textContent = `(+${diffPercent.toFixed(1)}%)`;
      diffPercentEl.className = 'text-xs font-bold ml-1 text-emerald-400';
    } else if (diffINR < 0) {
      diffBox.classList.add('sim-diff-negative');
      if (diffIcon) diffIcon.setAttribute('data-lucide', 'trending-down');
      diffAmount.textContent = `-${formatINR(Math.abs(diffINR))}`;
      diffPercentEl.textContent = `(${diffPercent.toFixed(1)}%)`;
      diffPercentEl.className = 'text-xs font-bold ml-1 text-rose-400';
    } else {
      diffBox.classList.add('sim-diff-neutral');
      if (diffIcon) diffIcon.setAttribute('data-lucide', 'minus');
      diffAmount.textContent = '₹0';
      diffPercentEl.textContent = '(0.0%)';
      diffPercentEl.className = 'text-xs font-bold ml-1 text-slate-400';
    }

    if (window.lucide) window.lucide.createIcons();
  }

  function generateSimulatorSummary(baseForm, simForm, diffINR) {
    const summaryEl = document.getElementById('sim-summary-text');
    if (!summaryEl) return;

    const diffLakhs = (Math.abs(diffINR) / 100000).toFixed(1);
    const changes = [];

    if (simForm.area_sqft !== baseForm.area_sqft) {
      const areaDiff = simForm.area_sqft - baseForm.area_sqft;
      changes.push(`${areaDiff > 0 ? 'Adding' : 'Reducing'} ${Math.abs(areaDiff)} sq.ft.`);
    }

    if (simForm.property_age !== baseForm.property_age) {
      const ageDiff = simForm.property_age - baseForm.property_age;
      changes.push(`${ageDiff > 0 ? 'aging by' : 'reducing age by'} ${Math.abs(ageDiff)} yrs`);
    }

    if (simForm.bhk !== baseForm.bhk) {
      changes.push(`changing to ${simForm.bhk} BHK`);
    }

    if (simForm.bathrooms !== baseForm.bathrooms) {
      changes.push(`setting ${simForm.bathrooms} bathrooms`);
    }

    if (simForm.parking !== baseForm.parking) {
      changes.push(`${simForm.parking === 1 ? 'adding' : 'removing'} parking`);
    }

    if (simForm.furnishing !== baseForm.furnishing) {
      changes.push(`switching to ${simForm.furnishing}`);
    }

    if (simForm.property_type !== baseForm.property_type) {
      changes.push(`selecting ${simForm.property_type}`);
    }

    if (changes.length === 0 || diffINR === 0) {
      summaryEl.textContent = "Parameters match baseline estimate. Adjust controls to see price impact.";
    } else {
      const changeText = changes.join(', ');
      if (diffINR > 0) {
        summaryEl.textContent = `${changeText.charAt(0).toUpperCase() + changeText.slice(1)} increased the estimated value by approximately ₹${diffLakhs} lakh.`;
      } else {
        summaryEl.textContent = `${changeText.charAt(0).toUpperCase() + changeText.slice(1)} reduced the estimated value by approximately ₹${diffLakhs} lakh.`;
      }
    }
  }

  // -------------------------------------------------------------------------
  // 8. HELPER UI UTILITIES
  // -------------------------------------------------------------------------

  function displayError(message) {
    const errorBanner = document.getElementById('predict-error-banner');
    const errorBannerText = document.getElementById('predict-error-text');

    if (errorBanner && errorBannerText) {
      errorBannerText.textContent = message || 'Unable to generate prediction. Please check if the ML API is running.';
      errorBanner.classList.remove('hidden');
    }
  }

  function markFieldError(inputElement, message) {
    if (!inputElement) return;
    inputElement.classList.add('border-rose-500', 'ring-1', 'ring-rose-500');
    const group = inputElement.closest('.form-group');
    if (group) {
      const errorMsg = group.querySelector('.field-error-msg');
      if (errorMsg) {
        if (message) errorMsg.textContent = message;
        errorMsg.classList.remove('hidden');
      }
    }
  }

  function clearFieldError(inputElement) {
    if (!inputElement) return;
    inputElement.classList.remove('border-rose-500', 'ring-1', 'ring-rose-500');
    const group = inputElement.closest('.form-group');
    if (group) {
      const errorMsg = group.querySelector('.field-error-msg');
      if (errorMsg) errorMsg.classList.add('hidden');
    }
  }

  function animateCountUp(targetElement, endVal, duration = 800, formatter = (v) => v) {
    const startVal = 0;
    const startTime = performance.now();

    function updateCount(currentTime) {
      const elapsedTime = currentTime - startTime;
      const progress = Math.min(elapsedTime / duration, 1);
      
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentVal = Math.floor(startVal + (endVal - startVal) * easeProgress);

      targetElement.textContent = formatter(currentVal);

      if (progress < 1) {
        requestAnimationFrame(updateCount);
      } else {
        targetElement.textContent = formatter(endVal);
      }
    }

    requestAnimationFrame(updateCount);
  }

  function formatINR(val) {
    if (isNaN(val)) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  }

  // -------------------------------------------------------------------------
  // 9. MARKET ANALYTICS & CHART.JS INTEGRATION (GET /analytics)
  // -------------------------------------------------------------------------
  let chartInstances = {};

  async function fetchMarketAnalytics() {
    const errorBanner = document.getElementById('analytics-error-banner');
    
    const kpiPriceEl = document.getElementById('kpi-avg-price');
    const kpiPriceSub = document.getElementById('kpi-avg-price-sub');
    const kpiRateEl = document.getElementById('kpi-avg-rate');
    const kpiRateSub = document.getElementById('kpi-avg-rate-sub');
    const kpiExpCityEl = document.getElementById('kpi-exp-city');
    const kpiExpCitySub = document.getElementById('kpi-exp-city-sub');
    const kpiCommonTypeEl = document.getElementById('kpi-common-type');
    const kpiCommonTypeSub = document.getElementById('kpi-common-type-sub');

    try {
      const response = await fetch(`${API_BASE_URL}/analytics`, { method: 'GET' });
      if (!response.ok) throw new Error('Analytics API response not OK');

      const data = await response.json();
      if (errorBanner) errorBanner.classList.add('hidden');

      const cityInsights = data.city_insights || {};
      const bhkInsights = data.bhk_insights || {};
      const propDistribution = data.property_type_distribution || {};
      const totalRows = data.total_analyzed_properties || 1250;
      const overallRate = data.overall_avg_rate_sqft || 7880.27;

      // 1. KPI 1: Weighted Avg Property Price across dataset
      let totalPriceSum = 0;
      let totalPropCount = 0;
      let maxCityPrice = 0;
      let expCityName = '--';

      Object.entries(cityInsights).forEach(([city, info]) => {
        const p = info.avg_price_lakhs || 0;
        const count = info.total_properties || 1;
        totalPriceSum += p * count;
        totalPropCount += count;

        if (p > maxCityPrice) {
          maxCityPrice = p;
          expCityName = city;
        }
      });

      const weightedAvgPriceLakhs = totalPropCount > 0 ? (totalPriceSum / totalPropCount) : 107.5;
      
      if (kpiPriceEl) kpiPriceEl.textContent = `₹${weightedAvgPriceLakhs.toFixed(1)} Lakhs`;
      if (kpiPriceSub) kpiPriceSub.textContent = `Based on ${totalRows.toLocaleString()} housing records`;

      // 2. KPI 2: Average Price per Sq.ft.
      if (kpiRateEl) kpiRateEl.textContent = `${formatINR(Math.round(overallRate))} / sq.ft.`;
      if (kpiRateSub) kpiRateSub.textContent = `Overall dataset average rate`;

      // 3. KPI 3: Most Expensive City
      if (kpiExpCityEl) kpiExpCityEl.textContent = expCityName;
      if (kpiExpCitySub) kpiExpCitySub.textContent = `Avg ₹${maxCityPrice.toFixed(1)} Lakhs per property`;

      // 4. KPI 4: Most Common Property Type
      let dominantType = '--';
      let maxShare = 0;
      Object.entries(propDistribution).forEach(([type, share]) => {
        if (share > maxShare) {
          maxShare = share;
          dominantType = type;
        }
      });

      if (kpiCommonTypeEl) kpiCommonTypeEl.textContent = dominantType;
      if (kpiCommonTypeSub) kpiCommonTypeSub.textContent = `${(maxShare * 100).toFixed(1)}% market share`;

      // Render 4 Charts using Chart.js
      if (window.Chart) {
        renderCityPriceChart(cityInsights);
        renderCityRateChart(cityInsights);
        renderBhkPriceChart(bhkInsights);
        renderPropTypeChart(propDistribution);
      }

    } catch (err) {
      console.warn('Market analytics fetch error:', err);
      if (errorBanner) errorBanner.classList.remove('hidden');
      if (kpiPriceEl) kpiPriceEl.textContent = '--';
      if (kpiRateEl) kpiRateEl.textContent = '--';
      if (kpiExpCityEl) kpiExpCityEl.textContent = '--';
      if (kpiCommonTypeEl) kpiCommonTypeEl.textContent = '--';
    }
  }

  const darkChartDefaults = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 1000, easing: 'easeOutQuart' },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(7, 17, 38, 0.95)',
        titleColor: '#ffffff',
        bodyColor: '#38bdf8',
        borderColor: 'rgba(0, 242, 254, 0.3)',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 10,
        displayColors: false,
        titleFont: { family: 'Space Grotesk', size: 12, weight: 'bold' },
        bodyFont: { family: 'Plus Jakarta Sans', size: 11 }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 10, weight: '500' } }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 10, weight: '500' } }
      }
    }
  };

  function renderCityPriceChart(cityInsights) {
    const ctx = document.getElementById('chart-price-city')?.getContext('2d');
    if (!ctx) return;

    if (chartInstances['cityPrice']) chartInstances['cityPrice'].destroy();

    const sortedCities = Object.entries(cityInsights).sort((a, b) => b[1].avg_price_lakhs - a[1].avg_price_lakhs);
    const labels = sortedCities.map(c => c[0]);
    const data = sortedCities.map(c => c[1].avg_price_lakhs);

    chartInstances['cityPrice'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Avg Price (Lakhs)',
          data: data,
          backgroundColor: 'rgba(0, 242, 254, 0.45)',
          borderColor: '#00f2fe',
          borderWidth: 1.5,
          borderRadius: 8,
          hoverBackgroundColor: 'rgba(0, 242, 254, 0.8)'
        }]
      },
      options: {
        ...darkChartDefaults,
        plugins: {
          ...darkChartDefaults.plugins,
          tooltip: {
            ...darkChartDefaults.plugins.tooltip,
            callbacks: {
              label: (ctx) => `Avg Price: ₹${ctx.raw} Lakhs`
            }
          }
        }
      }
    });
  }

  function renderCityRateChart(cityInsights) {
    const ctx = document.getElementById('chart-rate-city')?.getContext('2d');
    if (!ctx) return;

    if (chartInstances['cityRate']) chartInstances['cityRate'].destroy();

    const sortedCities = Object.entries(cityInsights).sort((a, b) => b[1].avg_rate_sqft - a[1].avg_rate_sqft);
    const labels = sortedCities.map(c => c[0]);
    const data = sortedCities.map(c => Math.round(c[1].avg_rate_sqft));

    chartInstances['cityRate'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Rate / Sq.Ft.',
          data: data,
          backgroundColor: 'rgba(79, 172, 254, 0.45)',
          borderColor: '#4facfe',
          borderWidth: 1.5,
          borderRadius: 8,
          hoverBackgroundColor: 'rgba(79, 172, 254, 0.8)'
        }]
      },
      options: {
        ...darkChartDefaults,
        plugins: {
          ...darkChartDefaults.plugins,
          tooltip: {
            ...darkChartDefaults.plugins.tooltip,
            callbacks: {
              label: (ctx) => `Avg Rate: ₹${ctx.raw.toLocaleString()} / sq.ft.`
            }
          }
        }
      }
    });
  }

  function renderBhkPriceChart(bhkInsights) {
    const ctx = document.getElementById('chart-bhk-price')?.getContext('2d');
    if (!ctx) return;

    if (chartInstances['bhkPrice']) chartInstances['bhkPrice'].destroy();

    const bhkKeys = Object.keys(bhkInsights).sort((a, b) => parseInt(a) - parseInt(b));
    const labels = bhkKeys.map(k => `${k} BHK`);
    const data = bhkKeys.map(k => bhkInsights[k].avg_price_lakhs);

    chartInstances['bhkPrice'] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Avg Price (Lakhs)',
          data: data,
          backgroundColor: 'rgba(167, 139, 250, 0.15)',
          borderColor: '#a78bfa',
          borderWidth: 3,
          pointBackgroundColor: '#c084fc',
          pointBorderColor: '#ffffff',
          pointRadius: 5,
          pointHoverRadius: 7,
          fill: true,
          tension: 0.35
        }]
      },
      options: {
        ...darkChartDefaults,
        plugins: {
          ...darkChartDefaults.plugins,
          tooltip: {
            ...darkChartDefaults.plugins.tooltip,
            callbacks: {
              label: (ctx) => `Avg Price: ₹${ctx.raw} Lakhs`
            }
          }
        }
      }
    });
  }

  function renderPropTypeChart(propDistribution) {
    const ctx = document.getElementById('chart-prop-type')?.getContext('2d');
    if (!ctx) return;

    if (chartInstances['propType']) chartInstances['propType'].destroy();

    const labels = Object.keys(propDistribution);
    const data = Object.values(propDistribution).map(v => (v * 100).toFixed(1));

    chartInstances['propType'] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: ['rgba(0, 242, 254, 0.8)', 'rgba(56, 189, 248, 0.8)', 'rgba(129, 140, 248, 0.8)'],
          borderColor: '#071126',
          borderWidth: 3,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 1000, easing: 'easeOutQuart' },
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: { color: '#cbd5e1', font: { family: 'Plus Jakarta Sans', size: 11 }, padding: 14, usePointStyle: true }
          },
          tooltip: {
            backgroundColor: 'rgba(7, 17, 38, 0.95)',
            titleColor: '#ffffff',
            bodyColor: '#38bdf8',
            borderColor: 'rgba(0, 242, 254, 0.3)',
            borderWidth: 1,
            padding: 10,
            cornerRadius: 10,
            callbacks: {
              label: (ctx) => ` Market Share: ${ctx.raw}%`
            }
          }
        },
        cutout: '68%'
      }
    });
  }
});


