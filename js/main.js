/* ==================================================================
 * Freshbrook — main.js
 * Vanilla JavaScript, no jQuery. One function per feature, each with
 * guard clauses so it is safe to load on every page.
 * ================================================================== */
(function () {
  "use strict";

  /* ----------------------------------------------------------------
   * PRICES — every number the quote card, calculator and booking
   * recap use. Edit here to change your pricing everywhere.
   *   base  : studio or 1 bedroom with 1 bathroom
   *   bed   : each bedroom after the first
   *   bath  : each bathroom after the first
   * ---------------------------------------------------------------- */
  var PRICES = {
    currency: "$",
    hourly: 45,            // cleaner-hour rate used to estimate time on site
    carpetMinimum: 90,     // minimum for a carpet & upholstery only visit
    services: {
      regular: { label: "Regular home clean", base: 89, bed: 22, bath: 18 },
      deep:    { label: "Deep clean", base: 159, bed: 38, bath: 30 },
      tenancy: { label: "End-of-tenancy clean", base: 199, bed: 45, bath: 35 },
      carpet:  { label: "Carpet & upholstery", base: 0, bed: 0, bath: 0 }
    },
    // "included" lists services where the extra is already part of the clean
    extras: {
      oven:     { label: "Inside the oven", price: 45, included: ["tenancy"] },
      fridge:   { label: "Inside the fridge", price: 30, included: ["tenancy"] },
      windows:  { label: "Interior windows", price: 40, included: ["deep", "tenancy"] },
      cabinets: { label: "Inside kitchen cabinets", price: 35, included: ["deep", "tenancy"] },
      laundry:  { label: "Laundry & ironing", price: 30, included: [] },
      balcony:  { label: "Balcony or patio", price: 25, included: [] }
    },
    counts: {
      carpet: { one: "carpet room", many: "carpet rooms", price: 35 },
      stairs: { one: "flight of stairs", many: "flights of stairs", price: 45 },
      seats:  { one: "upholstery seat", many: "upholstery seats", price: 22 }
    },
    // Frequency discounts apply to regular home cleans only
    frequency: {
      once:     { label: "One-off", unit: "for one visit", discount: 0 },
      monthly:  { label: "Monthly", unit: "per visit, monthly", discount: 0.10 },
      biweekly: { label: "Every 2 weeks", unit: "per visit, every 2 weeks", discount: 0.15 },
      weekly:   { label: "Weekly", unit: "per visit, weekly", discount: 0.20 }
    },
    newClientDeepDiscount: 0.15
  };

  var prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var params = new URLSearchParams(window.location.search);

  /* ----------------------------------------------------------------
   * Helpers
   * ---------------------------------------------------------------- */
  function money(n) { return PRICES.currency + Math.round(n).toLocaleString("en-US"); }
  function plural(n, one, many) { return n + " " + (n === 1 ? one : many); }
  function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }
  function toInt(v, fallback) { var n = parseInt(v, 10); return isNaN(n) ? fallback : n; }

  function homeLabel(bed, bath) {
    return (bed === 0 ? "Studio" : bed + " bed") + ", " + bath + " bath";
  }

  /* Works out an estimate from a plain state object. Shared by the
     homepage quote card, the calculator and the booking recap. */
  function estimate(s) {
    var svc = PRICES.services[s.service] || PRICES.services.regular;
    var lines = [];
    if (s.service !== "carpet") {
      lines.push({ label: "Base price (studio or 1 bed, 1 bath)", value: svc.base });
      var xBed = Math.max(0, s.bed - 1);
      var xBath = Math.max(0, s.bath - 1);
      if (xBed) lines.push({ label: plural(xBed, "extra bedroom", "extra bedrooms"), value: xBed * svc.bed });
      if (xBath) lines.push({ label: plural(xBath, "extra bathroom", "extra bathrooms"), value: xBath * svc.bath });
      (s.extras || []).forEach(function (id) {
        var e = PRICES.extras[id];
        if (!e || e.included.indexOf(s.service) > -1) return;
        lines.push({ label: e.label, value: e.price });
      });
    }
    Object.keys(PRICES.counts).forEach(function (key) {
      var n = s[key] || 0;
      var c = PRICES.counts[key];
      if (n > 0) lines.push({ label: plural(n, c.one, c.many) + " × " + money(c.price), value: n * c.price });
    });
    var subtotal = lines.reduce(function (sum, l) { return sum + l.value; }, 0);
    if (s.service === "carpet" && subtotal < PRICES.carpetMinimum) {
      lines.push({ label: subtotal ? "Top-up to the $" + PRICES.carpetMinimum + " visit minimum" : "Minimum carpet visit", value: PRICES.carpetMinimum - subtotal });
      subtotal = PRICES.carpetMinimum;
    }
    var freq = PRICES.frequency[s.service === "regular" ? s.freq : "once"] || PRICES.frequency.once;
    var rate = freq.discount;
    var discountLabel = rate ? freq.label + " discount (" + Math.round(rate * 100) + "%)" : "";
    if (s.service === "deep" && s.newclient) {
      rate = PRICES.newClientDeepDiscount;
      discountLabel = "First deep clean (" + Math.round(rate * 100) + "% off)";
    }
    var discount = Math.round(subtotal * rate);
    var workHours = subtotal / PRICES.hourly;
    var team = workHours > 4 ? 2 : 1;
    var onSite = Math.max(1, Math.round((workHours / team) * 2) / 2);
    return {
      lines: lines, subtotal: subtotal, discount: discount, discountLabel: discountLabel,
      total: subtotal - discount, unit: freq.unit, team: team, hours: onSite, label: svc.label
    };
  }

  /* ----------------------------------------------------------------
   * Mobile navigation: close the collapse after a link is tapped
   * ---------------------------------------------------------------- */
  function initNav() {
    var collapse = document.getElementById("primary-nav");
    if (!collapse || !window.bootstrap) return;
    collapse.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        if (!collapse.classList.contains("show")) return;
        var inst = window.bootstrap.Collapse.getInstance(collapse);
        if (inst) inst.hide();
      });
    });
  }

  /* ----------------------------------------------------------------
   * Header shadow once the page scrolls
   * ---------------------------------------------------------------- */
  function initStickyHeader() {
    var header = document.querySelector(".site-header");
    if (!header) return;
    var onScroll = function () { header.classList.toggle("scrolled", window.scrollY > 8); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ----------------------------------------------------------------
   * Reveal on scroll (content is visible without JS; see .js .reveal)
   * ---------------------------------------------------------------- */
  function initReveal() {
    var items = document.querySelectorAll(".reveal");
    if (!items.length) return;
    if (prefersReduced || !("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in");
        io.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ----------------------------------------------------------------
   * Count-up stats
   * ---------------------------------------------------------------- */
  function initCounters() {
    var nums = document.querySelectorAll("[data-count]");
    if (!nums.length || prefersReduced || !("IntersectionObserver" in window)) return;
    var run = function (el) {
      var target = parseFloat(el.getAttribute("data-count"));
      var decimals = toInt(el.getAttribute("data-decimals"), 0);
      var suffix = el.getAttribute("data-suffix") || "";
      var start = null;
      var step = function (ts) {
        if (!start) start = ts;
        var p = Math.min(1, (ts - start) / 1400);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = (target * eased).toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
        if (p < 1) window.requestAnimationFrame(step);
      };
      window.requestAnimationFrame(step);
    };
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        run(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.6 });
    nums.forEach(function (el) { io.observe(el); });
  }

  /* ----------------------------------------------------------------
   * Accessible tabs (WAI-ARIA tabs pattern, automatic activation)
   * ---------------------------------------------------------------- */
  function initTabs() {
    document.querySelectorAll("[data-tabs]").forEach(function (wrap) {
      var tabs = Array.prototype.slice.call(wrap.querySelectorAll('[role="tab"]'));
      if (!tabs.length) return;
      var select = function (tab, focus) {
        tabs.forEach(function (t) {
          var on = t === tab;
          t.setAttribute("aria-selected", on ? "true" : "false");
          t.tabIndex = on ? 0 : -1;
          var panel = document.getElementById(t.getAttribute("aria-controls"));
          if (panel) panel.hidden = !on;
        });
        if (focus) tab.focus();
      };
      tabs.forEach(function (tab, i) {
        tab.addEventListener("click", function () { select(tab, false); });
        tab.addEventListener("keydown", function (e) {
          var next = null;
          if (e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
          else if (e.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
          else if (e.key === "Home") next = tabs[0];
          else if (e.key === "End") next = tabs[tabs.length - 1];
          if (!next) return;
          e.preventDefault();
          select(next, true);
        });
      });
      select(tabs.filter(function (t) { return t.getAttribute("aria-selected") === "true"; })[0] || tabs[0], false);
    });
  }

  /* ----------------------------------------------------------------
   * Homepage instant quote card
   * ---------------------------------------------------------------- */
  function initQuickQuote() {
    var form = document.querySelector("[data-quick-quote]");
    if (!form) return;
    var out = document.getElementById("qq-total");
    var unit = document.getElementById("qq-unit");
    var bed = form.elements.bed;
    var bath = form.elements.bath;
    var update = function () {
      var service = form.elements.service.value;
      var isCarpet = service === "carpet";
      bed.disabled = isCarpet;
      bath.disabled = isCarpet;
      var r = estimate({ service: service, bed: toInt(bed.value, 1), bath: toInt(bath.value, 1), freq: "once" });
      if (out) out.textContent = money(r.total);
      if (unit) unit.textContent = isCarpet ? "minimum visit, add rooms next" : "per visit, before extras";
    };
    form.addEventListener("change", update);
    update();
  }

  /* ----------------------------------------------------------------
   * Pricing page quote calculator
   * ---------------------------------------------------------------- */
  function initSteppers(scope) {
    scope.querySelectorAll(".stepper").forEach(function (box) {
      var input = box.querySelector("input");
      if (!input) return;
      var min = toInt(input.min, 0);
      var max = toInt(input.max, 99);
      var buttons = box.querySelectorAll("[data-step]");
      var sync = function () {
        buttons.forEach(function (b) {
          var d = toInt(b.getAttribute("data-step"), 0);
          var v = toInt(input.value, min);
          b.disabled = input.disabled || (d < 0 ? v <= min : v >= max);
        });
      };
      buttons.forEach(function (b) {
        b.addEventListener("click", function () {
          input.value = clamp(toInt(input.value, min) + toInt(b.getAttribute("data-step"), 0), min, max);
          input.dispatchEvent(new Event("input", { bubbles: true }));
        });
      });
      input.addEventListener("input", sync);
      input.addEventListener("change", function () {
        input.value = clamp(toInt(input.value, min), min, max);
        sync();
      });
      box.addEventListener("freshbrook:sync", sync);
      sync();
    });
  }

  function initCalculator() {
    var form = document.querySelector("[data-calc]");
    if (!form) return;
    var el = function (sel) { return form.querySelector(sel); };
    var homeSet = el("[data-home-size]");
    var carpetNote = el("[data-carpet-note]");
    var freqNote = el("[data-freq-note]");
    var lines = el("[data-sum-lines]");
    var totalOut = el("[data-sum-total]");

    // Apply values passed from the homepage quote card or a service link
    var setRadio = function (name, value) {
      var r = form.querySelector('input[name="' + name + '"][value="' + value + '"]');
      if (r) r.checked = true;
    };
    if (params.get("service")) setRadio("service", params.get("service"));
    if (params.get("freq")) setRadio("freq", params.get("freq"));
    ["bed", "bath", "carpet", "stairs", "seats"].forEach(function (key) {
      var input = form.elements[key];
      if (input && params.get(key) !== null) input.value = clamp(toInt(params.get(key), toInt(input.value, 0)), toInt(input.min, 0), toInt(input.max, 99));
    });
    params.getAll("extras").forEach(function (v) {
      var cb = form.querySelector('input[name="extras"][value="' + v + '"]');
      if (cb) cb.checked = true;
    });
    if (params.get("newclient")) form.elements.newclient.checked = true;

    initSteppers(form);

    var read = function () {
      var extras = [];
      form.querySelectorAll('input[name="extras"]:checked').forEach(function (cb) { extras.push(cb.value); });
      var checked = function (name) { var r = form.querySelector('input[name="' + name + '"]:checked'); return r ? r.value : ""; };
      return {
        service: checked("service") || "regular",
        bed: toInt(form.elements.bed.value, 1),
        bath: toInt(form.elements.bath.value, 1),
        extras: extras,
        carpet: toInt(form.elements.carpet.value, 0),
        stairs: toInt(form.elements.stairs.value, 0),
        seats: toInt(form.elements.seats.value, 0),
        freq: checked("freq") || "once",
        newclient: form.elements.newclient.checked
      };
    };

    var update = function () {
      var s = read();
      var isCarpet = s.service === "carpet";

      // Home size is irrelevant for carpet-only visits
      if (homeSet) {
        homeSet.disabled = isCarpet;
        homeSet.querySelectorAll(".stepper").forEach(function (b) { b.dispatchEvent(new Event("freshbrook:sync")); });
      }
      if (carpetNote) carpetNote.hidden = !isCarpet;

      // Extras: unavailable for carpet-only, marked "Included" where the service covers them
      form.querySelectorAll('input[name="extras"]').forEach(function (cb) {
        var e = PRICES.extras[cb.value];
        var tag = cb.parentNode.querySelector("[data-price-tag]");
        var included = e && e.included.indexOf(s.service) > -1;
        cb.disabled = isCarpet || included;
        if (tag) tag.textContent = included ? "Included" : "+" + money(e ? e.price : 0);
      });

      // Frequency: regular cleans only
      form.querySelectorAll('input[name="freq"]').forEach(function (r) {
        r.disabled = s.service !== "regular" && r.value !== "once";
        if (r.disabled && r.checked) setRadio("freq", "once");
      });
      if (freqNote) {
        freqNote.textContent = s.service === "regular"
          ? "Regular home cleans get cheaper the more often we visit."
          : "Frequency discounts apply to regular home cleans. This service is booked as a one-off.";
      }
      s = read();

      var r = estimate(s);
      if (lines) {
        lines.innerHTML = "";
        r.lines.forEach(function (l) {
          var li = document.createElement("li");
          li.innerHTML = "<span></span><span></span>";
          li.children[0].textContent = l.label;
          li.children[1].textContent = money(l.value);
          lines.appendChild(li);
        });
        if (r.discount) {
          var li = document.createElement("li");
          li.className = "discount";
          li.innerHTML = "<span></span><span></span>";
          li.children[0].textContent = r.discountLabel;
          li.children[1].textContent = "−" + money(r.discount);
          lines.appendChild(li);
        }
      }
      var svcText = isCarpet ? "Carpets, stairs and upholstery" : r.label + " · " + homeLabel(s.bed, s.bath);
      el("[data-sum-service]").textContent = svcText;
      totalOut.textContent = money(r.total);
      el("[data-sum-unit]").textContent = r.unit;
      el("[data-sum-team]").textContent = isCarpet ? "1 technician" : plural(r.team, "cleaner", "cleaners");
      el("[data-sum-hours]").textContent = "about " + plural(r.hours, "hour", "hours") + " on site";
      el("[data-sum-input]").value = r.total;
    };

    form.addEventListener("input", update);
    form.addEventListener("change", update);
    update();
    initCalcBar(form);
  }

  /* Small screens: a fixed bar keeps the total visible while the
     calculator scrolls, and hides once the full summary is on screen */
  function initCalcBar(form) {
    var bar = document.querySelector("[data-calc-bar]");
    var main = form.querySelector(".calc-main");
    var summary = form.querySelector(".summary");
    var out = bar && bar.querySelector("[data-calc-bar-total]");
    var total = form.querySelector("[data-sum-total]");
    if (!bar || !main || !summary || !out || !total) return;
    var sync = function () { out.textContent = total.textContent; };
    form.addEventListener("input", sync);
    form.addEventListener("change", sync);
    sync();
    if (!("IntersectionObserver" in window)) return;
    var mainIn = false, sumIn = false;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.target === main) mainIn = e.isIntersecting;
        if (e.target === summary) sumIn = e.isIntersecting;
      });
      bar.classList.toggle("is-hidden", !mainIn || sumIn);
    }, { threshold: 0 });
    io.observe(main);
    io.observe(summary);
  }

  /* ----------------------------------------------------------------
   * Shared validation for front-end-only forms
   * ---------------------------------------------------------------- */
  function fieldWrap(input) {
    return input.closest(".field") || null;
  }

  function markField(input, ok) {
    var wrap = fieldWrap(input);
    if (input.type === "radio" || input.type === "checkbox") {
      if (wrap) wrap.classList.toggle("invalid", !ok);
    } else {
      input.classList.toggle("is-invalid", !ok);
    }
    if (ok) input.removeAttribute("aria-invalid");
    else input.setAttribute("aria-invalid", "true");
  }

  /* Returns a list of {input, message} for every invalid field.
     `extra` can add custom checks: function(input) -> message|"" */
  function validateForm(form, extra) {
    var problems = [];
    var seenRadio = {};
    form.querySelectorAll("input, select, textarea").forEach(function (input) {
      if (input.disabled || input.type === "hidden" || input.closest("[hidden]")) return;
      if (input.type === "radio") {
        if (seenRadio[input.name]) return;
        seenRadio[input.name] = true;
        var group = form.querySelectorAll('input[name="' + input.name + '"]');
        var required = Array.prototype.some.call(group, function (r) { return r.required; });
        var picked = form.querySelector('input[name="' + input.name + '"]:checked');
        var ok = !required || !!picked;
        group.forEach(function (r) { markField(r, ok); });
        if (!ok) problems.push({ input: group[0] });
        return;
      }
      var msg = "";
      if (!input.checkValidity()) msg = "invalid";
      if (!msg && extra) msg = extra(input) || "";
      markField(input, !msg);
      if (msg) problems.push({ input: input });
    });
    return problems;
  }

  function errorText(input) {
    var ids = (input.getAttribute("aria-describedby") || "").split(/\s+/);
    var wrap = input.closest("[aria-describedby]");
    if (wrap && wrap !== input) ids = ids.concat(wrap.getAttribute("aria-describedby").split(/\s+/));
    for (var i = 0; i < ids.length; i++) {
      var node = ids[i] && document.getElementById(ids[i]);
      if (node && node.classList.contains("field-error")) return node.textContent;
    }
    return "Please check this field.";
  }

  function liveRevalidate(form, extra) {
    form.addEventListener("input", function (e) {
      var t = e.target;
      if (t.getAttribute("aria-invalid") !== "true" || t.type === "radio") return;
      var ok = t.checkValidity() && !(extra && extra(t));
      markField(t, ok);
    });
    form.addEventListener("change", function (e) {
      var t = e.target;
      if (t.type === "radio" || t.type === "checkbox") {
        var wrap = fieldWrap(t);
        if (wrap && wrap.classList.contains("invalid")) {
          var ok = t.type === "radio" ? true : t.checked || !t.required;
          markField(t, ok);
          if (t.type === "radio") form.querySelectorAll('input[name="' + t.name + '"]').forEach(function (r) { markField(r, true); });
        }
      }
    });
  }

  /* Generic forms (contact): validate, then show the success panel */
  function initForms() {
    document.querySelectorAll("form[data-validate]").forEach(function (form) {
      liveRevalidate(form);
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var problems = validateForm(form);
        if (problems.length) { problems[0].input.focus(); return; }
        var success = form.querySelector(".form-success");
        var fields = form.querySelector(".form-fields");
        var nameInput = form.elements.name;
        var nameSlot = form.querySelector("[data-success-name]");
        if (nameSlot && nameInput && nameInput.value.trim()) nameSlot.textContent = nameInput.value.trim().split(/\s+/)[0] + ", we’ve got it";
        if (fields) fields.hidden = true;
        if (success) { success.classList.add("show"); success.focus(); }
      });
    });
  }

  /* Contact page: preselect topic from ?topic= and show office fields */
  function initContactTopic() {
    var topic = document.getElementById("ct-topic");
    if (!topic) return;
    var office = document.querySelector("[data-office-fields]");
    var wanted = params.get("topic");
    if (wanted && topic.querySelector('option[value="' + wanted + '"]')) topic.value = wanted;
    var sync = function () { if (office) office.hidden = topic.value !== "office"; };
    topic.addEventListener("change", sync);
    sync();
  }

  /* ----------------------------------------------------------------
   * Booking page
   * ---------------------------------------------------------------- */
  function isoDate(d) {
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  }
  function parseISO(v) {
    var p = (v || "").split("-");
    if (p.length !== 3) return null;
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    return isNaN(d.getTime()) ? null : d;
  }
  function longDate(d) {
    return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  }

  function initBooking() {
    var form = document.querySelector("[data-booking]");
    if (!form) return;
    var summary = document.querySelector("[data-error-summary]");
    var list = document.querySelector("[data-error-list]");
    var confirm = document.querySelector("[data-confirm]");
    var recap = document.querySelector("[data-quote-recap]");
    var dateInput = form.elements.date;
    var slots = form.querySelectorAll('input[name="slot"]');
    var slotStatus = document.getElementById("b-slot-status");
    var accessNotes = form.elements.access_notes;
    var accessOptional = form.querySelector("[data-access-optional]");
    var petNotes = form.querySelector("[data-pet-notes]");

    // Prefill from the calculator
    ["service", "freq", "bed", "bath"].forEach(function (key) {
      var v = params.get(key);
      var sel = form.elements[key];
      if (v !== null && sel && sel.querySelector('option[value="' + v + '"]')) sel.value = v;
    });

    if (recap && params.get("estimate")) {
      var s = {
        service: params.get("service") || "regular",
        bed: toInt(params.get("bed"), 1), bath: toInt(params.get("bath"), 1),
        extras: params.getAll("extras"),
        carpet: toInt(params.get("carpet"), 0), stairs: toInt(params.get("stairs"), 0), seats: toInt(params.get("seats"), 0),
        freq: params.get("freq") || "once", newclient: !!params.get("newclient")
      };
      var r = estimate(s);
      var parts = [];
      s.extras.forEach(function (id) { if (PRICES.extras[id] && PRICES.extras[id].included.indexOf(s.service) < 0) parts.push(PRICES.extras[id].label.toLowerCase()); });
      Object.keys(PRICES.counts).forEach(function (k) { if (s[k]) parts.push(plural(s[k], PRICES.counts[k].one, PRICES.counts[k].many)); });
      var text = recap.querySelector("[data-quote-recap-text]");
      var what = s.service === "carpet" ? r.label : r.label + ", " + homeLabel(s.bed, s.bath).toLowerCase();
      text.innerHTML = "<strong></strong> <span></span>";
      text.children[0].textContent = "Your quote: " + money(r.total) + " " + r.unit + ".";
      text.children[1].textContent = what + (parts.length ? ", plus " + parts.join(", ") : "") + ". Estimated, confirmed before your clean.";
      recap.hidden = false;
      form.dataset.estimate = money(r.total) + " " + r.unit;
    }

    // Dates: tomorrow onwards, up to 8 weeks out, no Sundays
    var tomorrow = new Date(); tomorrow.setHours(0, 0, 0, 0); tomorrow.setDate(tomorrow.getDate() + 1);
    var last = new Date(tomorrow); last.setDate(last.getDate() + 56);
    if (dateInput) { dateInput.min = isoDate(tomorrow); dateInput.max = isoDate(last); }

    var dateProblem = function (input) {
      if (input !== dateInput) return "";
      var d = parseISO(dateInput.value);
      if (!d || d < tomorrow || d > last || d.getDay() === 0) return "bad-date";
      return "";
    };

    // Demo availability: a few windows are already taken on each day,
    // worked out from the date so the same day always looks the same.
    var updateSlots = function () {
      var d = parseISO(dateInput.value);
      if (!d || dateProblem(dateInput)) {
        slots.forEach(function (r) { r.disabled = false; });
        if (slotStatus) slotStatus.textContent = d && d.getDay() === 0 ? "We don’t clean on Sundays. Please pick Monday to Saturday." : "Pick a date to see which windows are free.";
        return;
      }
      var seed = d.getFullYear() * 372 + d.getMonth() * 31 + d.getDate();
      var free = 0;
      var taken = Array.prototype.map.call(slots, function (r, i) { return ((seed * (i + 3)) % 7) < 2; });
      if (d.getDay() === 6) taken[slots.length - 1] = true; // Saturdays finish early
      if (taken.filter(function (t) { return !t; }).length < 2) { taken[1] = false; taken[2] = false; }
      slots.forEach(function (r, i) {
        r.disabled = taken[i];
        if (taken[i] && r.checked) r.checked = false;
        r.nextElementSibling.querySelector("small").textContent = taken[i] ? "Booked" : ["Early", "Morning", "Midday", "Afternoon", "Late"][i];
        if (!taken[i]) free++;
      });
      if (slotStatus) slotStatus.textContent = free + " of " + slots.length + " arrival windows free on " + longDate(d) + ".";
    };
    if (dateInput) dateInput.addEventListener("change", updateSlots);

    // Access notes become required when nobody will be home
    var syncAccess = function () {
      var picked = form.querySelector('input[name="access"]:checked');
      var needed = picked && picked.value !== "home";
      if (!accessNotes) return;
      accessNotes.required = !!needed;
      if (accessOptional) accessOptional.textContent = needed ? "(required)" : "(optional)";
      if (!needed) markField(accessNotes, true);
    };
    var syncPets = function () {
      var picked = form.querySelector('input[name="pets"]:checked');
      if (petNotes) petNotes.hidden = !picked || picked.value === "none";
    };
    form.addEventListener("change", function (e) {
      if (e.target.name === "access") syncAccess();
      if (e.target.name === "pets") syncPets();
    });
    syncAccess();
    syncPets();
    liveRevalidate(form, dateProblem);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var problems = validateForm(form, dateProblem);
      if (problems.length) {
        list.innerHTML = "";
        problems.forEach(function (p) {
          var li = document.createElement("li");
          var a = document.createElement("a");
          a.href = "#" + p.input.id;
          a.textContent = errorText(p.input);
          a.addEventListener("click", function (ev) { ev.preventDefault(); p.input.focus(); });
          li.appendChild(a);
          list.appendChild(li);
        });
        summary.classList.add("show");
        summary.focus();
        return;
      }
      summary.classList.remove("show");

      // Build the confirmation
      var val = function (name) { var f = form.elements[name]; return f ? (f.value || "").trim() : ""; };
      var opt = function (name) { var s = form.elements[name]; return s && s.options ? s.options[s.selectedIndex].text : ""; };
      var checkedLabel = function (name) { var r = form.querySelector('input[name="' + name + '"]:checked'); return r ? r.nextElementSibling.textContent.trim() : ""; };
      var first = val("name").split(/\s+/)[0];
      var d = parseISO(val("date"));
      var rows = [
        ["Service", opt("service") + (val("service") === "carpet" ? "" : " · " + homeLabel(toInt(val("bed"), 1), toInt(val("bath"), 1))) + " · " + opt("freq")],
        ["When", (d ? longDate(d) : val("date")) + ", arriving " + checkedLabel("slot").replace(/(Early|Morning|Midday|Afternoon|Late)$/, "").trim()],
        ["Address", [val("street"), val("unit"), val("city"), val("postcode")].filter(Boolean).join(", ")],
        ["Getting in", checkedLabel("access") + (val("access_notes") ? " — " + val("access_notes") : "")],
        ["Pets", checkedLabel("pets") + (val("pet_notes") && checkedLabel("pets") !== "No pets" ? " — " + val("pet_notes") : "")]
      ];
      if (form.dataset.estimate) rows.push(["Estimate", form.dataset.estimate]);
      var dl = confirm.querySelector("[data-confirm-list]");
      dl.innerHTML = "";
      rows.forEach(function (row) {
        var dt = document.createElement("dt"); dt.textContent = row[0];
        var dd = document.createElement("dd"); dd.textContent = row[1];
        dl.appendChild(dt); dl.appendChild(dd);
      });
      confirm.querySelector("[data-confirm-title]").textContent = "Thanks, " + first + ". Your booking request is in.";
      confirm.querySelector("[data-confirm-ref]").textContent = "FB-" + String(Math.floor(10000 + Math.random() * 89999));
      form.hidden = true;
      if (recap) recap.hidden = true;
      confirm.classList.add("show");
      confirm.focus();
      confirm.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "start" });
    });

    var again = confirm && confirm.querySelector("[data-book-again]");
    if (again) {
      again.addEventListener("click", function () {
        form.reset();
        form.hidden = false;
        confirm.classList.remove("show");
        syncAccess(); syncPets(); updateSlots();
        form.querySelector("select, input").focus();
      });
    }
  }

  /* ----------------------------------------------------------------
   * Before / after comparison slider (native range input underneath,
   * so arrow keys, Home/End and Page keys work out of the box)
   * ---------------------------------------------------------------- */
  function initCompare() {
    document.querySelectorAll("[data-compare]").forEach(function (box) {
      var range = box.querySelector(".compare-range");
      if (!range) return;
      var set = function (v) {
        v = clamp(Math.round(v), 0, 100);
        range.value = v;
        box.style.setProperty("--pos", v + "%");
        range.setAttribute("aria-valuetext", v + "% before, " + (100 - v) + "% after");
      };
      range.addEventListener("input", function () { set(+range.value); });

      // Pointer dragging maps the exact pointer position to the split
      var dragging = false;
      var fromX = function (x) {
        var rect = box.getBoundingClientRect();
        set(((x - rect.left) / rect.width) * 100);
      };
      range.addEventListener("keydown", function () { box.removeAttribute("data-pointer"); });
      range.addEventListener("pointerdown", function (e) {
        dragging = true;
        box.setAttribute("data-pointer", "");
        if (range.setPointerCapture) range.setPointerCapture(e.pointerId);
        e.preventDefault();
        range.focus({ preventScroll: true });
        fromX(e.clientX);
      });
      range.addEventListener("pointermove", function (e) { if (dragging) fromX(e.clientX); });
      ["pointerup", "pointercancel"].forEach(function (t) { range.addEventListener(t, function () { dragging = false; }); });
      set(+range.value);

      // Example switcher (rug / sofa)
      var card = box.closest(".compare-card");
      var buttons = card ? card.querySelectorAll("[data-compare-src]") : [];
      buttons.forEach(function (btn) {
        btn.addEventListener("click", function () {
          buttons.forEach(function (b) { b.setAttribute("aria-pressed", b === btn ? "true" : "false"); });
          var src = btn.getAttribute("data-compare-src");
          box.querySelectorAll("img").forEach(function (img) { img.src = src; });
          box.querySelector(".compare-after").alt = btn.getAttribute("data-compare-alt");
          set(50);
        });
      });
    });
  }

  /* ----------------------------------------------------------------
   * Calero's Cleaning Services — bilingual text (ES/EN).
   * Every element with [data-i18n] takes its text from this dict.
   * Default language is Spanish; the ES/EN toggle calls setCalerosLang.
   * ---------------------------------------------------------------- */
  var CALEROS_I18N = {
    es: {
      "skip": "Saltar al contenido principal",
      "announce": "Limpieza profesional para tu hogar o negocio en Charlotte y todo NC.",
      "announce-area": "Charlotte y alrededores, NC",
      "nav-home": "Inicio", "nav-services": "Servicios", "nav-quote": "Cotización",
      "nav-carpet": "Alfombras y pisos", "nav-contact": "Contacto", "nav-book": "Reserva",
      "hero-title": "Limpieza profesional para tu hogar o negocio",
      "hero-sub": "Limpieza profesional para tu hogar o negocio en Charlotte y todo NC. Pide tu cotización — sin compromiso.",
      "quote-title": "Pide tu cotización",
      "quote-note": "Cuéntanos qué necesitas y te respondemos con tu cotización personalizada.",
      "f-service": "Servicio", "f-bed": "Dormitorios", "f-bath": "Baños",
      "f-name": "Nombre", "f-phone": "Teléfono",
      "quote-free": "Cotización personalizada, sin compromiso",
      "quote-submit": "Pedir mi cotización",
      "hero-p1": "Cotización sin compromiso", "hero-p2": "Charlotte y alrededores",
      "hero-p3": "Se habla español",
      "chip1-t": "Asegurada $1M/$2M", "chip1-s": "en cada trabajo",
      "chip2-t": "Cotización sin compromiso", "chip2-s": "sin costo y sin obligación",
      "trust1-t": "Dueña operadora", "trust1-s": "Lesly atiende tu limpieza personalmente",
      "trust2-t": "Asegurada $1M/$2M", "trust2-s": "Seguro de responsabilidad civil",
      "trust3-t": "Si algo no quedó bien, dínoslo", "trust3-s": "Revisamos el trabajo contigo",
      "trust4-t": "Se habla español", "trust4-s": "Atención en español e inglés",
      "svc-eyebrow": "Lo que limpiamos",
      "services-title": "Servicios",
      "services-intro": "Limpieza de casas y apartamentos, vacíos o habitados, oficinas, centros comerciales y más — en Charlotte y alrededores, puede ser todo NC.",
      "svc-1": "Limpieza de casas — vacías o habitadas",
      "svc-2": "Limpieza de apartamentos — vacíos o habitados",
      "svc-3": "Limpieza de oficinas",
      "svc-4": "Limpieza de centros comerciales",
      "svc-5": "Limpieza profunda",
      "svc-6": "Limpieza post-construcción y post-renovación",
      "svc-7": "Limpieza para Airbnb y rentas vacacionales",
      "svc-8": "Limpieza de alfombras y pisos",
      "svc-9": "Limpieza de ventanas",
      "svc-10": "Limpieza después de eventos",
      "svc-1-d": "Limpieza completa de casas, vacías o habitadas, en Charlotte y alrededores.",
      "svc-1-b1": "Cocina y baños a fondo", "svc-1-b2": "Dormitorios y sala",
      "svc-1-b3": "Pisos aspirados y trapeados",
      "svc-2-d": "Apartamentos vacíos o habitados, listos para vivir o para entregar.",
      "svc-2-b1": "Ideal para mudanzas", "svc-2-b2": "Cocina y baños", "svc-2-b3": "Entrega lista",
      "svc-3-d": "Limpieza de oficinas y espacios de trabajo, en el horario que te convenga.",
      "svc-3-b1": "Fuera del horario de trabajo", "svc-3-b2": "Baños y cocina",
      "svc-3-b3": "Por visita o con horario fijo",
      "svc-4-d": "Limpieza de locales y centros comerciales, con horario flexible.",
      "svc-4-b1": "Áreas comunes", "svc-4-b2": "Baños públicos", "svc-4-b3": "Horario flexible",
      "svc-5-d": "Una limpieza a fondo: rincones, juntas, detrás de los muebles y todo lo que la limpieza regular no alcanza.",
      "svc-5-b1": "Cocina a fondo", "svc-5-b2": "Baños a fondo",
      "svc-5-b3": "Detrás de muebles y electrodomésticos",
      "svc-6-d": "Limpieza después de construir o renovar: polvo fino, restos de obra y todo listo para estrenar.",
      "svc-6-b1": "Polvo fino de obra", "svc-6-b2": "Pisos y ventanas", "svc-6-b3": "Lista para estrenar",
      "svc-7-d": "Cambio de huéspedes: limpieza completa y lista para el siguiente check-in.",
      "svc-7-b1": "Cambio de sábanas y toallas", "svc-7-b2": "Cocina y baños listos",
      "svc-7-b3": "Lista para el siguiente huésped",
      "svc-8-d": "Limpieza de alfombras y pisos, con aspirado profundo y cuidado de cada superficie.",
      "svc-8-b1": "Aspirado profundo", "svc-8-b2": "Manchas tratadas", "svc-8-b3": "Cuidado por superficie",
      "svc-9-d": "Ventanas limpias por dentro, con marcos y rieles.",
      "svc-9-b1": "Por dentro", "svc-9-b2": "Marcos y rieles", "svc-9-b3": "Sin marcas",
      "svc-10-d": "Después de la fiesta o el evento, nosotros nos encargamos de todo.",
      "svc-10-b1": "Basura retirada", "svc-10-b2": "Pisos y mesas", "svc-10-b3": "Lista para usar de nuevo",
      "svc-price": "Cotización personalizada", "svc-cta": "Pedir cotización", "svc-cta-more": "Ver más",
      "svc-tag-popular": "La más pedida",
      "svc-1-s": "Limpieza de casas", "svc-2-s": "Limpieza de apartamentos",
      "svc-3-s": "Limpieza de oficinas", "svc-5-s": "Limpieza profunda", "svc-7-s": "Limpieza para Airbnb",
      "cta-card-t": "¿No sabes qué limpieza necesitas?",
      "cta-card-s": "Cuéntanos qué necesitas y te decimos qué servicio te conviene, sin compromiso.",
      "cta-card-b": "Pedir mi cotización",
      "how-eyebrow": "Cómo funciona",
      "how-title": "Pide tu cotización en dos minutos",
      "how-sub": "Sin cuentas y sin vueltas por teléfono. Cuéntanos qué necesitas y te respondemos con tu cotización.",
      "how-s1-t": "Pide tu cotización",
      "how-s1-s": "Elige el servicio y cuéntanos el tamaño de tu espacio. Te respondemos con tu cotización personalizada.",
      "how-s2-t": "Elige fecha y hora",
      "how-s2-s": "Escoge el día y la hora que te convengan. Los cambios se acuerdan con tiempo.",
      "how-s3-t": "Limpiamos",
      "how-s3-s": "Llegamos con lo necesario, seguimos la lista de tareas y te avisamos cuando esté listo.",
      "how-s4-t": "Disfruta tu espacio",
      "how-s4-s": "Llegas a un lugar limpio y ordenado. Si algo no quedó bien, dínoslo y lo revisamos contigo.",
      "check-eyebrow": "Qué incluye", "check-title": "Cada cuarto, cada vez",
      "check-sub": "Esto es lo que cubre cada servicio. Lo que dice “extra” se agrega a tu cotización.",
      "check-task": "Tarea", "check-col-reg": "Regular", "check-col-deep": "Profunda",
      "check-col-move": "Mudanza", "check-add": "Extra",
      "check-legend": "La limpieza de alfombras y tapicería se puede agregar a cualquier servicio, o pedirse por separado.",
      "check-cap-t": "Revisado cuarto por cuarto.",
      "check-cap-s": "Seguimos la lista de tareas en cada limpieza.",
      "tab-kitchen": "Cocina", "tab-bath": "Baños", "tab-living": "Dormitorios y sala",
      "ck1": "Limpiar mesones, salpicadero y fregadero",
      "ck2": "Limpiar la estufa y el exterior de los electrodomésticos",
      "ck3": "Vaciar basureros y lavar las tapas",
      "ck4": "Desengrasar la campana y los filtros",
      "ck5": "Limpiar por dentro gabinetes y cajones",
      "ck6": "Horno y refrigerador por dentro",
      "ck7": "Quitar el sarro de las llaves y pulir el fregadero",
      "cb1": "Limpiar inodoro, lavamanos, tina y ducha",
      "cb2": "Pulir espejos, llaves y cromo",
      "cb3": "Trapear pisos y limpiar zócalos",
      "cb4": "Quitar el sarro de mamparas y azulejos",
      "cb5": "Restregar juntas y sellos de silicona",
      "cb6": "Limpiar la tapa del extractor",
      "cl1": "Quitar el polvo de superficies, repisas y zócalos",
      "cl2": "Aspirar alfombras y trapear pisos duros",
      "cl3": "Tender camas (con sábanas limpias si las dejas fuera)",
      "cl4": "Limpiar interruptores, manijas y marcos de puertas",
      "cl5": "Quitar el polvo de lámparas y marcos de fotos",
      "cl6": "Por dentro de clósets y cajones",
      "cl7": "Ventanas interiores y repisas",
      "about-eyebrow": "Nosotros", "about-title": "Un negocio local de Charlotte",
      "about-text": "Calero's Cleaning Services LLC es un negocio local de Charlotte. Dueña: Lesly J. Calero. No somos una cadena: la misma persona que te atiende es la que limpia tu hogar o negocio.",
      "about-l1-t": "Dueña operadora",
      "about-l1-s": "Lesly atiende personalmente cada cotización y cada limpieza.",
      "about-l2-t": "Charlotte y alrededores",
      "about-l2-s": "Puede ser todo NC. Dinos tu ciudad al pedir la cotización.",
      "about-l3-t": "Asegurada $1M/$2M",
      "about-l3-s": "Seguro de responsabilidad civil en cada trabajo.",
      "about-l4-t": "Se habla español", "about-l4-s": "Atención en español e inglés.",
      "about-note": "¿Prefieres un producto en especial o tienes alergias? Dínoslo al pedir la cotización y lo tomamos en cuenta.",
      "prom-eyebrow": "Por qué Calero's",
      "prom-title": "Quién entra a tu hogar importa",
      "prom-sub": "Contratarnos es tratar directo con la dueña, no con una cadena.",
      "prom1-t": "Dueña operadora",
      "prom1-s": "Lesly atiende personalmente tu limpieza, con la misma persona cada vez.",
      "prom1-b1": "Trato directo con la dueña", "prom1-b2": "La misma persona cada vez",
      "prom1-b3": "Negocio local de Charlotte",
      "prom2-t": "Asegurada, de principio a fin",
      "prom2-s": "Seguro de responsabilidad civil de $1M por ocurrencia / $2M agregado en cada trabajo.",
      "prom2-b1": "$1M por ocurrencia", "prom2-b2": "$2M agregado",
      "prom2-b3": "Calero's Cleaning Services LLC",
      "prom3-t": "Si algo no quedó bien, dínoslo",
      "prom3-s": "Revisamos el trabajo contigo y lo dejamos como debe ser.",
      "prom3-b1": "Revisión al terminar", "prom3-b2": "Cotización antes de empezar",
      "prom3-b3": "Sin sorpresas en el precio",
      "gal-eyebrow": "Galería", "gallery-title": "Galería",
      "gallery-sub": "Así trabajamos: cocina, pisos, detalles y ese final que se nota.",
      "faq-title": "Preguntas frecuentes",
      "faq-sub": "Lo que preguntan antes de su primera limpieza.",
      "faq-help-t": "¿Aún no estás seguro?",
      "faq-help-s": "Llámanos o escríbenos y te atendemos en español o inglés.",
      "faq1-q": "¿Cómo pido una cotización?",
      "faq1-a": "Llena el formulario de esta página o llama al (704) 387-1705. La cotización es personalizada y sin compromiso.",
      "faq2-q": "¿Qué áreas cubren?",
      "faq2-a": "Charlotte y alrededores; puede ser todo NC. Dinos tu ciudad al pedir la cotización.",
      "faq3-q": "¿Necesito estar en casa durante la limpieza?",
      "faq3-a": "No. Se acuerda cómo entrar al agendar: llave, código o alguien en casa.",
      "faq4-q": "¿Traen sus productos y equipo?",
      "faq4-a": "Sí, llevamos nuestros productos y equipo. Si prefieres que usemos los tuyos, avísanos al pedir la cotización.",
      "faq5-q": "¿Cómo se calcula el precio?",
      "faq5-a": "Cada cotización es personalizada: depende del servicio, el tamaño del espacio y la frecuencia. Sin sorpresas: el precio se acuerda antes de limpiar.",
      "faq6-q": "¿Atienden en español?",
      "faq6-a": "Sí, se habla español e inglés. El formulario y esta página están en los dos idiomas.",
      "cta-title": "Tu cotización está a un minuto",
      "cta-sub": "Sin cuentas, sin llamadas, sin compromiso. Cuéntanos qué necesitas.",
      "cta-b1": "Pedir mi cotización", "cta-b2": "Reserva",
      "footer-about": "Limpieza profesional para tu hogar o negocio en Charlotte y todo NC. Dueña: Lesly J. Calero.",
      "badge1": "Asegurada $1M/$2M", "badge2": "Se habla español", "badge3": "Cotización sin compromiso",
      "footer-svc-t": "Servicios", "footer-svc-all": "Ver todos",
      "footer-co-t": "Empresa", "footer-co-inc": "Qué incluye",
      "footer-contact-t": "Contacto",
      "footer-area": "Charlotte y alrededores, NC",
      "footer-hours": "Atención en español e inglés",
      "footer-copy": "Calero's Cleaning Services LLC. Todos los derechos reservados.",
      "footer-tpl": "Plantilla de",
      "footer-dev": "Sitio desarrollado por WayakBatz Technology LLC",
      "pq-title": "Pide tu cotización",
      "pq-sub": "Cuéntanos qué necesitas y te respondemos con tu cotización personalizada. Sin compromiso y sin sorpresas: el precio se acuerda antes de limpiar.",
      "pq-note": "Te respondemos con tu cotización personalizada. Si prefieres, llama al (704) 387-1705.",
      "pq-how-eyebrow": "Cómo funciona",
      "pq-how-title": "Cómo funciona tu cotización",
      "pq-h1-t": "Cuéntanos qué necesitas",
      "pq-h1-s": "Llena el formulario con el servicio, el tamaño de tu espacio y la fecha que te convenga.",
      "pq-h2-t": "Recibe tu cotización",
      "pq-h2-s": "Te respondemos con tu cotización personalizada, sin compromiso.",
      "pq-h3-t": "Agendamos la limpieza",
      "pq-h3-s": "Si te conviene la cotización, agendamos el día y la hora.",
      "pq-fixed": "Algunos servicios pueden tener precio fijo — se acuerda en tu cotización.",
      "f-email": "Correo", "f-type": "Tipo de propiedad",
      "f-type-house": "Casa", "f-type-apt": "Apartamento", "f-type-office": "Oficina",
      "f-type-mall": "Centro comercial", "f-type-other": "Otro",
      "f-occupied": "¿Vacía o habitada?",
      "f-occ-occupied": "Habitada", "f-occ-vacant": "Vacía",
      "f-city": "Ciudad / Código postal", "f-date": "Fecha deseada", "f-freq": "Frecuencia",
      "f-freq-once": "Una vez", "f-freq-weekly": "Semanal",
      "f-freq-biweekly": "Cada 2 semanas", "f-freq-monthly": "Mensual",
      "f-msg": "Mensaje o detalles",
      "f-msg-ph": "Cuéntanos cuántos cuartos y baños, y cualquier detalle que debamos saber.",
      "bk-title": "Reserva tu limpieza",
      "bk-sub": "Elige el servicio y la fecha que te convenga. Te llamamos para confirmar la fecha y la hora — nada queda agendado hasta que lo confirmemos contigo.",
      "bk-step1": "Tu limpieza", "bk-step2": "Horario y lugar", "bk-step3": "Detalles", "bk-step4": "Tus datos",
      "bk-slot": "Horario preferido",
      "bk-slot-morning": "Mañana", "bk-slot-midday": "Mediodía", "bk-slot-afternoon": "Tarde",
      "bk-slot-hint": "El horario se confirma por teléfono.",
      "bk-street": "Dirección",
      "bk-msg-ph": "Cómo entramos, si hay mascotas, y cualquier detalle que debamos saber.",
      "bk-submit": "Enviar mi reserva",
      "bk-note": "Te llamamos para confirmar. Nada queda agendado hasta entonces.",
      "bk-aside-t": "Conviene saber",
      "bk-aside-1": "Te confirmamos por teléfono", "bk-aside-2": "Cotización sin compromiso",
      "bk-aside-3": "Asegurada $1M/$2M", "bk-aside-4": "Se habla español",
      "bk-prep-t": "Antes de que lleguemos",
      "bk-prep-1": "Quita el desorden de las superficies para que limpiemos en lugar de ordenar.",
      "bk-prep-2": "Avísanos de superficies delicadas, como mármol o madera sin sellar.",
      "bk-prep-3": "Cuéntanos si hay mascotas en casa.",
      "bk-questions": "¿Preguntas? (704) 387-1705",
      "cp-title": "Limpieza de alfombras y pisos",
      "cp-sub": "Limpiamos alfombras, tapetes y pisos en casas, apartamentos y oficinas. Pide tu cotización y te decimos qué incluye.",
      "cp-quote": "Pide tu cotización",
      "cp-fact-1": "Cotización personalizada", "cp-fact-2": "Casas, apartamentos y oficinas", "cp-fact-3": "Se habla español",
      "cp-clean-eyebrow": "Qué limpiamos", "cp-clean-title": "Alfombras, tapetes y pisos",
      "cp-clean-sub": "Se puede pedir solo o como parte de una limpieza de casa u oficina. Cada trabajo se cotiza según el tamaño y el estado.",
      "cp-item-1-t": "Alfombras", "cp-item-1-s": "Alfombras de cuarto por cuarto, en casas y apartamentos.",
      "cp-item-2-t": "Tapetes", "cp-item-2-s": "Tapetes de sala, entrada y dormitorios.",
      "cp-item-3-t": "Pisos", "cp-item-3-s": "Pisos duros: trapeado y limpieza a fondo.",
      "cp-item-4-t": "Escaleras", "cp-item-4-s": "Escaleras alfombradas y pasillos, donde se marca más el paso.",
      "cp-process-eyebrow": "Cómo trabajamos", "cp-process-title": "Así limpiamos tus alfombras y pisos",
      "cp-p1-t": "Revisamos el área contigo", "cp-p1-s": "Vemos el tamaño, el material y el estado de las alfombras y los pisos, y te decimos qué se puede lograr.",
      "cp-p2-t": "Aspiramos y tratamos las manchas", "cp-p2-s": "Primero se aspira bien y se tratan las manchas antes de limpiar.",
      "cp-p3-t": "Limpiamos y dejamos todo en su lugar", "cp-p3-s": "Limpiamos las alfombras y los pisos, y devolvemos los muebles a su sitio.",
      "cp-stain-eyebrow": "Primeros auxilios para manchas",
      "cp-stain-title": "¿Se te derramó algo? Haz esto antes de llamarnos",
      "cp-stain-sub": "Los primeros diez minutos deciden si la mancha sale. Absorbe, nunca frotes.",
      "cp-st1-t": "Vino tinto", "cp-st1-s": "Absorbe con un trapo blanco y luego toca con agua fría. Trabaja desde afuera de la mancha hacia adentro.", "cp-st1-d": "No le eches sal",
      "cp-st2-t": "Café y té", "cp-st2-s": "Absorbe, luego toca con agua tibia y una gota de jabón de trastes. Enjuaga con agua limpia y seca absorbiendo.", "cp-st2-d": "No uses agua caliente",
      "cp-st3-t": "Accidentes de mascotas", "cp-st3-s": "Levanta lo que puedas, absorbe, y cubre con toallas de papel y un peso. Para el olor, pide un tratamiento con enzimas.", "cp-st3-d": "No uses limpiadores con amoníaco",
      "cp-st4-t": "Lodo", "cp-st4-s": "Deja que se seque por completo, quiebra con una cuchara y aspira. Lo que quede se trata con agua tibia.", "cp-st4-d": "No lo frotes mojado",
      "cp-faq-eyebrow": "Preguntas sobre alfombras y pisos", "cp-faq-title": "Antes de reservar",
      "cp-faq-sub": "Respuestas directas sobre muebles, manchas y materiales.",
      "cp-help-t": "Pide tu cotización", "cp-help-s": "Cuéntanos cuántos cuartos y qué tipo de piso o alfombra tienes.", "cp-help-btn": "Pedir cotización",
      "cp-q1": "¿Tengo que mover los muebles?", "cp-a1": "Solo las cosas pequeñas y frágiles, y lo que esté en el piso. Movemos sillas, mesas y muebles ligeros, y los devolvemos a su lugar.",
      "cp-q2": "¿Salen todas las manchas?", "cp-a2": "La mayoría sí. Las manchas de cloro, quemaduras y tintes viejos pueden aclararse pero rara vez desaparecen. Te decimos antes de empezar cuáles pueden quedar.",
      "cp-q3": "¿Es seguro para mascotas y niños?", "cp-a3": "Dinos si hay mascotas o niños en casa y qué productos prefieres que usemos. Lo tomamos en cuenta al cotizar.",
      "cp-q4": "¿Limpian cuero o terciopelo?", "cp-a4": "Algunos materiales necesitan otro método. Se revisa primero en la cotización.",
      "ct-title": "Hablemos",
      "ct-sub": "¿Preguntas sobre una limpieza, una cotización o una reserva? Escríbenos o llámanos — te respondemos lo antes posible.",
      "ct-call-t": "Llámanos", "ct-call-s": "Atención en español e inglés",
      "ct-mail-t": "Correo", "ct-mail-s": "Te respondemos lo antes posible",
      "ct-area-t": "Área de servicio", "ct-area-s": "Charlotte y alrededores, NC", "ct-area-note": "Pregúntanos si llegamos a tu zona.",
      "ct-form-t": "Manda un mensaje", "ct-form-s": "¿Quieres precio directo?", "ct-form-link": "Pide tu cotización",
      "ct-optional": "(opcional)",
      "ct-topic": "¿De qué se trata?", "ct-topic-ph": "Elige un tema…",
      "ct-topic-home": "Pregunta de limpieza de casa", "ct-topic-office": "Limpieza de oficina",
      "ct-topic-carpet": "Alfombras y pisos", "ct-topic-booking": "Una reserva que ya tengo",
      "ct-topic-feedback": "Comentario o algo que no quedó bien",
      "ct-msg-ph": "Cuéntanos qué necesitas y cuándo te conviene.",
      "ct-submit": "Enviar mensaje",
      "ct-where-t": "Dónde limpiamos", "ct-where-s": "Charlotte y alrededores, y posiblemente todo NC. Escríbenos con tu ciudad y te confirmamos si llegamos.",
      "ct-hours-t": "Horario", "ct-hours-s": "Llámanos o escríbenos y coordinamos el día y la hora que te convengan. Atención en español e inglés.",
      "ct-missed-eyebrow": "¿Algo no quedó bien?", "ct-missed-t": "Dínoslo",
      "ct-missed-s": "Si algo no quedó como esperabas, llámanos o escríbenos. Lo revisamos contigo y lo resolvemos.",
      "ct-missed-1": "Llámanos al (704) 387-1705", "ct-missed-2": "O escríbenos al correo del negocio",
      "ct-missed-3": "Si puedes, manda una foto de lo que quedó pendiente",
      "fs-ok-title": "¡Gracias! Ya lo recibimos.",
      "fs-ok-sub": "Te respondemos lo antes posible. Si prefieres, llámanos al (704) 387-1705.",
      "fs-err": "Hubo un problema al enviarlo. Inténtalo de nuevo o llámanos al (704) 387-1705."
    },
    en: {
      "skip": "Skip to main content",
      "announce": "Professional cleaning for your home or business in Charlotte and across NC.",
      "announce-area": "Charlotte and surrounding areas, NC",
      "nav-home": "Home", "nav-services": "Services", "nav-quote": "Get a quote",
      "nav-carpet": "Carpet & floors", "nav-contact": "Contact", "nav-book": "Book",
      "hero-title": "Professional cleaning for your home or business",
      "hero-sub": "Professional cleaning for your home or business in Charlotte and across NC. Request your free quote — no commitment.",
      "quote-title": "Request your quote",
      "quote-note": "Tell us what you need and we will reply with your custom quote.",
      "f-service": "Service", "f-bed": "Bedrooms", "f-bath": "Bathrooms",
      "f-name": "Name", "f-phone": "Phone",
      "quote-free": "Custom quote, no commitment",
      "quote-submit": "Request my quote",
      "hero-p1": "No-commitment quote", "hero-p2": "Charlotte and surrounding areas",
      "hero-p3": "Se habla español",
      "chip1-t": "Insured $1M/$2M", "chip1-s": "on every job",
      "chip2-t": "No-commitment quote", "chip2-s": "free and with no obligation",
      "trust1-t": "Owner-operated", "trust1-s": "Lesly handles your cleaning personally",
      "trust2-t": "Insured $1M/$2M", "trust2-s": "Liability insurance",
      "trust3-t": "If something is not right, tell us", "trust3-s": "We go over the work with you",
      "trust4-t": "Se habla español", "trust4-s": "Service in Spanish and English",
      "svc-eyebrow": "What we clean",
      "services-title": "Services",
      "services-intro": "House and apartment cleaning, vacant or occupied, offices, shopping centers and more — in Charlotte and surrounding areas, possibly all of NC.",
      "svc-1": "House cleaning — vacant or occupied",
      "svc-2": "Apartment cleaning — vacant or occupied",
      "svc-3": "Office cleaning",
      "svc-4": "Shopping center cleaning",
      "svc-5": "Deep cleaning",
      "svc-6": "Post-construction & post-renovation cleaning",
      "svc-7": "Airbnb & vacation-rental turnover cleaning",
      "svc-8": "Carpet & floor cleaning",
      "svc-9": "Window cleaning",
      "svc-10": "After-event cleaning",
      "svc-1-d": "Complete house cleaning, vacant or occupied, in Charlotte and surrounding areas.",
      "svc-1-b1": "Kitchen and bathrooms deep cleaned", "svc-1-b2": "Bedrooms and living room",
      "svc-1-b3": "Floors vacuumed and mopped",
      "svc-2-d": "Vacant or occupied apartments, ready to live in or to hand over.",
      "svc-2-b1": "Ideal for move-ins and move-outs", "svc-2-b2": "Kitchen and bathrooms",
      "svc-2-b3": "Ready to hand over",
      "svc-3-d": "Office and workspace cleaning, at a time that suits you.",
      "svc-3-b1": "Outside working hours", "svc-3-b2": "Bathrooms and kitchen",
      "svc-3-b3": "Per visit or on a fixed schedule",
      "svc-4-d": "Cleaning for retail spaces and shopping centers, with a flexible schedule.",
      "svc-4-b1": "Common areas", "svc-4-b2": "Public restrooms", "svc-4-b3": "Flexible schedule",
      "svc-5-d": "A deep clean: corners, grout, behind furniture and everything a regular clean misses.",
      "svc-5-b1": "Kitchen deep cleaned", "svc-5-b2": "Bathrooms deep cleaned",
      "svc-5-b3": "Behind furniture and appliances",
      "svc-6-d": "Cleaning after building or renovating: fine dust, debris, everything ready to move in.",
      "svc-6-b1": "Fine construction dust", "svc-6-b2": "Floors and windows",
      "svc-6-b3": "Ready to move in",
      "svc-7-d": "Guest turnover: a complete clean, ready for the next check-in.",
      "svc-7-b1": "Fresh sheets and towels", "svc-7-b2": "Kitchen and bathrooms ready",
      "svc-7-b3": "Ready for the next guest",
      "svc-8-d": "Carpet and floor cleaning, with deep vacuuming and care for every surface.",
      "svc-8-b1": "Deep vacuuming", "svc-8-b2": "Stains treated", "svc-8-b3": "Care for each surface",
      "svc-9-d": "Windows cleaned inside, with frames and tracks.",
      "svc-9-b1": "Inside", "svc-9-b2": "Frames and tracks", "svc-9-b3": "Streak-free",
      "svc-10-d": "After the party or event, we take care of everything.",
      "svc-10-b1": "Trash taken out", "svc-10-b2": "Floors and tables",
      "svc-10-b3": "Ready to use again",
      "svc-price": "Custom quote", "svc-cta": "Request a quote", "svc-cta-more": "Learn more",
      "svc-tag-popular": "Most requested",
      "svc-1-s": "House cleaning", "svc-2-s": "Apartment cleaning",
      "svc-3-s": "Office cleaning", "svc-5-s": "Deep cleaning", "svc-7-s": "Airbnb cleaning",
      "cta-card-t": "Not sure which cleaning you need?",
      "cta-card-s": "Tell us what you need and we will tell you which service fits, no commitment.",
      "cta-card-b": "Request my quote",
      "how-eyebrow": "How it works",
      "how-title": "Request your quote in two minutes",
      "how-sub": "No accounts, no phone tag. Tell us what you need and we will reply with your quote.",
      "how-s1-t": "Request your quote",
      "how-s1-s": "Pick a service and tell us the size of your space. We reply with your custom quote.",
      "how-s2-t": "Pick a date and time",
      "how-s2-s": "Choose the day and time that suit you. Changes are agreed in advance.",
      "how-s3-t": "We clean",
      "how-s3-s": "We arrive with what we need, follow the task checklist and let you know when it is done.",
      "how-s4-t": "Enjoy your space",
      "how-s4-s": "You come home to a clean, tidy place. If something is not right, tell us and we will go over it with you.",
      "check-eyebrow": "What's included", "check-title": "Every room, every time",
      "check-sub": "This is what each service covers. Anything marked “add-on” is added to your quote.",
      "check-task": "Task", "check-col-reg": "Regular", "check-col-deep": "Deep",
      "check-col-move": "Move-out", "check-add": "Add-on",
      "check-legend": "Carpet and upholstery cleaning can be added to any service, or booked on its own.",
      "check-cap-t": "Checked room by room.",
      "check-cap-s": "We follow the task checklist on every clean.",
      "tab-kitchen": "Kitchen", "tab-bath": "Bathrooms", "tab-living": "Bedrooms & living",
      "ck1": "Wipe worktops, splashbacks and sink",
      "ck2": "Clean hob and outside of appliances",
      "ck3": "Empty bins and wash bin lids",
      "ck4": "Degrease extractor hood and filters",
      "ck5": "Wipe inside cupboards and drawers",
      "ck6": "Inside oven and fridge",
      "ck7": "Descale taps and polish the sink",
      "cb1": "Clean toilet, basin, bath and shower",
      "cb2": "Polish mirrors, taps and chrome",
      "cb3": "Mop floors and wipe skirting",
      "cb4": "Remove limescale from screens and tiles",
      "cb5": "Scrub grout and silicone seals",
      "cb6": "Wipe extractor fan cover",
      "cl1": "Dust surfaces, shelves and skirting boards",
      "cl2": "Vacuum carpets and mop hard floors",
      "cl3": "Make beds (fresh linen if left out)",
      "cl4": "Wipe switches, handles and door frames",
      "cl5": "Dust light fittings and picture frames",
      "cl6": "Inside wardrobes and drawers",
      "cl7": "Interior windows and sills",
      "about-eyebrow": "About us", "about-title": "A local Charlotte business",
      "about-text": "Calero's Cleaning Services LLC is a local Charlotte business. Owner: Lesly J. Calero. We are not a chain: the same person who talks to you is the one who cleans your home or business.",
      "about-l1-t": "Owner-operated",
      "about-l1-s": "Lesly personally handles every quote and every clean.",
      "about-l2-t": "Charlotte and surrounding areas",
      "about-l2-s": "Possibly all of NC. Tell us your city when you request a quote.",
      "about-l3-t": "Insured $1M/$2M",
      "about-l3-s": "Liability insurance on every job.",
      "about-l4-t": "Se habla español", "about-l4-s": "Service in Spanish and English.",
      "about-note": "Do you prefer a specific product or have allergies? Tell us when you request a quote and we will keep it in mind.",
      "prom-eyebrow": "Why Calero's",
      "prom-title": "Who comes into your home matters",
      "prom-sub": "Hiring us means dealing directly with the owner, not a chain.",
      "prom1-t": "Owner-operated",
      "prom1-s": "Lesly personally handles your cleaning, the same person every time.",
      "prom1-b1": "Direct dealings with the owner", "prom1-b2": "The same person every time",
      "prom1-b3": "Local Charlotte business",
      "prom2-t": "Insured, start to finish",
      "prom2-s": "$1M per occurrence / $2M aggregate liability insurance on every job.",
      "prom2-b1": "$1M per occurrence", "prom2-b2": "$2M aggregate",
      "prom2-b3": "Calero's Cleaning Services LLC",
      "prom3-t": "If something is not right, tell us",
      "prom3-s": "We go over the work with you and leave it as it should be.",
      "prom3-b1": "A walk-through when we finish", "prom3-b2": "Quote before we start",
      "prom3-b3": "No surprises on the price",
      "gal-eyebrow": "Gallery", "gallery-title": "Gallery",
      "gallery-sub": "How we work: kitchens, floors, details and that finish you can see.",
      "faq-title": "Frequently asked questions",
      "faq-sub": "What people ask before their first clean.",
      "faq-help-t": "Still unsure?",
      "faq-help-s": "Call or write to us and we will help you in Spanish or English.",
      "faq1-q": "How do I request a quote?",
      "faq1-a": "Fill in the form on this page or call (704) 387-1705. The quote is custom and with no commitment.",
      "faq2-q": "Which areas do you cover?",
      "faq2-a": "Charlotte and surrounding areas; possibly all of NC. Tell us your city when you request a quote.",
      "faq3-q": "Do I need to be home during the clean?",
      "faq3-a": "No. We agree on how to get in when you book: a key, a code, or someone at home.",
      "faq4-q": "Do you bring your own supplies and equipment?",
      "faq4-a": "Yes, we bring our own products and equipment. If you would rather we used yours, let us know when you request a quote.",
      "faq5-q": "How is the price worked out?",
      "faq5-a": "Every quote is custom: it depends on the service, the size of the space and the frequency. No surprises: the price is agreed before we clean.",
      "faq6-q": "Do you serve customers in Spanish?",
      "faq6-a": "Yes, we speak Spanish and English. This page and the form are in both languages.",
      "cta-title": "Your quote is a minute away",
      "cta-sub": "No accounts, no phone calls, no commitment. Tell us what you need.",
      "cta-b1": "Request my quote", "cta-b2": "Book",
      "footer-about": "Professional cleaning for your home or business in Charlotte and across NC. Owner: Lesly J. Calero.",
      "badge1": "Insured $1M/$2M", "badge2": "Se habla español", "badge3": "No-commitment quote",
      "footer-svc-t": "Services", "footer-svc-all": "See all",
      "footer-co-t": "Company", "footer-co-inc": "What's included",
      "footer-contact-t": "Contact",
      "footer-area": "Charlotte and surrounding areas, NC",
      "footer-hours": "Service in Spanish and English",
      "footer-copy": "Calero's Cleaning Services LLC. All rights reserved.",
      "footer-tpl": "Template by",
      "footer-dev": "Website developed by WayakBatz Technology LLC",
      "pq-title": "Request your quote",
      "pq-sub": "Tell us what you need and we will reply with your custom quote. No commitment and no surprises: the price is agreed before we clean.",
      "pq-note": "We will reply with your custom quote. If you prefer, call (704) 387-1705.",
      "pq-how-eyebrow": "How it works",
      "pq-how-title": "How your quote works",
      "pq-h1-t": "Tell us what you need",
      "pq-h1-s": "Fill in the form with the service, the size of your space and the date that suits you.",
      "pq-h2-t": "Receive your quote",
      "pq-h2-s": "We reply with your custom quote, no commitment.",
      "pq-h3-t": "We schedule the clean",
      "pq-h3-s": "If the quote suits you, we book the day and time.",
      "pq-fixed": "Some services may have a fixed price — it is agreed in your quote.",
      "f-email": "Email", "f-type": "Property type",
      "f-type-house": "House", "f-type-apt": "Apartment", "f-type-office": "Office",
      "f-type-mall": "Shopping center", "f-type-other": "Other",
      "f-occupied": "Vacant or occupied?",
      "f-occ-occupied": "Occupied", "f-occ-vacant": "Vacant",
      "f-city": "City / ZIP code", "f-date": "Preferred date", "f-freq": "Frequency",
      "f-freq-once": "One-time", "f-freq-weekly": "Weekly",
      "f-freq-biweekly": "Every 2 weeks", "f-freq-monthly": "Monthly",
      "f-msg": "Message or details",
      "f-msg-ph": "Tell us how many bedrooms and bathrooms, and anything else we should know.",
      "bk-title": "Book your clean",
      "bk-sub": "Pick the service and the date that suits you. We call to confirm the date and time — nothing is scheduled until we confirm it with you.",
      "bk-step1": "Your clean", "bk-step2": "Time and place", "bk-step3": "Details", "bk-step4": "Your details",
      "bk-slot": "Preferred time",
      "bk-slot-morning": "Morning", "bk-slot-midday": "Midday", "bk-slot-afternoon": "Afternoon",
      "bk-slot-hint": "The time is confirmed by phone.",
      "bk-street": "Street address",
      "bk-msg-ph": "How to get in, whether there are pets, and anything else we should know.",
      "bk-submit": "Send my booking",
      "bk-note": "We call to confirm. Nothing is scheduled until then.",
      "bk-aside-t": "Good to know",
      "bk-aside-1": "We confirm by phone", "bk-aside-2": "Free quote, no commitment",
      "bk-aside-3": "Insured $1M/$2M", "bk-aside-4": "Se habla español",
      "bk-prep-t": "Before we arrive",
      "bk-prep-1": "Clear clutter off surfaces so we can clean rather than tidy.",
      "bk-prep-2": "Point out delicate surfaces, such as marble or unsealed wood.",
      "bk-prep-3": "Tell us if there are pets at home.",
      "bk-questions": "Questions? (704) 387-1705",
      "cp-title": "Carpet & floor cleaning",
      "cp-sub": "We clean carpets, rugs and floors in homes, apartments and offices. Request your quote and we will tell you what it includes.",
      "cp-quote": "Request your quote",
      "cp-fact-1": "Custom quote", "cp-fact-2": "Homes, apartments and offices", "cp-fact-3": "Se habla español",
      "cp-clean-eyebrow": "What we clean", "cp-clean-title": "Carpets, rugs and floors",
      "cp-clean-sub": "Book it on its own or as part of a home or office clean. Every job is quoted by size and condition.",
      "cp-item-1-t": "Carpets", "cp-item-1-s": "Room-by-room carpet cleaning, in homes and apartments.",
      "cp-item-2-t": "Rugs", "cp-item-2-s": "Living room, entry and bedroom rugs.",
      "cp-item-3-t": "Floors", "cp-item-3-s": "Hard floors: mopping and deep cleaning.",
      "cp-item-4-t": "Stairs", "cp-item-4-s": "Carpeted stairs and hallways, where foot traffic shows most.",
      "cp-process-eyebrow": "How we work", "cp-process-title": "How we clean your carpets and floors",
      "cp-p1-t": "We look at the area with you", "cp-p1-s": "We check the size, the material and the condition of the carpets and floors, and tell you what can be achieved.",
      "cp-p2-t": "We vacuum and treat stains", "cp-p2-s": "First a thorough vacuum, then stain treatment before cleaning.",
      "cp-p3-t": "We clean and put everything back", "cp-p3-s": "We clean the carpets and floors and return the furniture to its place.",
      "cp-stain-eyebrow": "Stain first aid",
      "cp-stain-title": "Spilled something? Do this before you call us",
      "cp-stain-sub": "The first ten minutes decide whether a stain comes out. Blot, never rub.",
      "cp-st1-t": "Red wine", "cp-st1-s": "Blot with a white cloth, then dab with cold water. Work from the outside of the stain inwards.", "cp-st1-d": "Don't pour salt on it",
      "cp-st2-t": "Coffee & tea", "cp-st2-s": "Blot, then dab with lukewarm water and a drop of dish soap. Rinse with plain water and blot dry.", "cp-st2-d": "Don't use hot water",
      "cp-st3-t": "Pet accidents", "cp-st3-s": "Lift what you can, blot, then cover with paper towels and a weight. For the smell, ask for an enzyme treatment.", "cp-st3-d": "Don't use ammonia cleaners",
      "cp-st4-t": "Mud", "cp-st4-s": "Let it dry completely, break it up with a spoon and vacuum. Treat anything left with warm water.", "cp-st4-d": "Don't scrub it wet",
      "cp-faq-eyebrow": "Carpet and floor questions", "cp-faq-title": "Before you book",
      "cp-faq-sub": "Straight answers on furniture, stains and materials.",
      "cp-help-t": "Request your quote", "cp-help-s": "Tell us how many rooms and what kind of floor or carpet you have.", "cp-help-btn": "Request a quote",
      "cp-q1": "Do I need to move the furniture?", "cp-a1": "Just small items, breakables and anything on the floor. We move chairs, tables and light furniture, and put them back.",
      "cp-q2": "Will every stain come out?", "cp-a2": "Most do. Bleach marks, burns and old dye stains may lighten but rarely disappear. We tell you before starting which marks may stay.",
      "cp-q3": "Is it safe for pets and children?", "cp-a3": "Tell us if there are pets or children at home and which products you prefer we use. We take it into account when quoting.",
      "cp-q4": "Do you clean leather or velvet?", "cp-a4": "Some materials need a different method. That is checked first in the quote.",
      "ct-title": "Let's talk",
      "ct-sub": "Questions about a clean, a quote or a booking? Write or call us — we reply as soon as we can.",
      "ct-call-t": "Call us", "ct-call-s": "Service in Spanish and English",
      "ct-mail-t": "Email", "ct-mail-s": "We reply as soon as we can",
      "ct-area-t": "Service area", "ct-area-s": "Charlotte and surroundings, NC", "ct-area-note": "Ask us if we reach your area.",
      "ct-form-t": "Send a message", "ct-form-s": "Want a price right away?", "ct-form-link": "Request your quote",
      "ct-optional": "(optional)",
      "ct-topic": "What's it about?", "ct-topic-ph": "Choose a topic…",
      "ct-topic-home": "Home cleaning question", "ct-topic-office": "Office cleaning",
      "ct-topic-carpet": "Carpets and floors", "ct-topic-booking": "A booking I already have",
      "ct-topic-feedback": "Feedback or something that didn't come out right",
      "ct-msg-ph": "Tell us what you need and when suits you.",
      "ct-submit": "Send message",
      "ct-where-t": "Where we clean", "ct-where-s": "Charlotte and surroundings, and possibly all of NC. Write with your city and we will confirm if we reach you.",
      "ct-hours-t": "Hours", "ct-hours-s": "Call or write and we arrange the day and time that suit you. Service in Spanish and English.",
      "ct-missed-eyebrow": "Something didn't come out right?", "ct-missed-t": "Tell us",
      "ct-missed-s": "If something didn't come out as you expected, call or write us. We go over it with you and fix it.",
      "ct-missed-1": "Call us at (704) 387-1705", "ct-missed-2": "Or write to the business email",
      "ct-missed-3": "If you can, send a photo of what was left",
      "fs-ok-title": "Thanks! We've got it.",
      "fs-ok-sub": "We'll reply as soon as we can. If you prefer, call us at (704) 387-1705.",
      "fs-err": "Something went wrong sending it. Please try again or call us at (704) 387-1705."
    }
  };

  function setCalerosLang(l) {
    if (!CALEROS_I18N[l]) return;
    document.documentElement.lang = l;
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var k = el.getAttribute("data-i18n");
      if (CALEROS_I18N[l][k] != null) el.textContent = CALEROS_I18N[l][k];
    });
    document.querySelectorAll("[data-lang]").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-lang") === l);
    });
    document.querySelectorAll("[data-i18n-ph]").forEach(function (el) {
      var pk = el.getAttribute("data-i18n-ph");
      if (CALEROS_I18N[l][pk] != null) el.setAttribute("placeholder", CALEROS_I18N[l][pk]);
    });
  }

  function initI18n() {
    document.querySelectorAll("[data-lang]").forEach(function (b) {
      b.addEventListener("click", function () { setCalerosLang(b.getAttribute("data-lang")); });
    });
    setCalerosLang("es");
  }

  /* ---------------------------------------------------------------- */
  function initFormspreeAjax() {
    /* Envía los formularios de Formspree sin salir de la página:
       en vez de la página de confirmación de Formspree, muestra
       un mensaje de gracias en el mismo sitio. Sin JS, el formulario
       sigue funcionando con el envío normal (página de Formspree). */
    document.querySelectorAll('form[action*="formspree.io"]').forEach(function (form) {
      var success = form.querySelector(".form-success");
      if (!success) {
        success = document.createElement("div");
        success.className = "form-success";
        success.setAttribute("role", "status");
        success.setAttribute("tabindex", "-1");
        success.innerHTML = '<h3><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9.5"/><polyline points="8 12.5 11 15.5 16.5 9"/></svg> <span data-i18n="fs-ok-title"></span></h3><p data-i18n="fs-ok-sub"></p>';
        form.appendChild(success);
      }
      var err = document.createElement("p");
      err.className = "field-error";
      err.setAttribute("data-i18n", "fs-err");
      err.style.display = "none";
      form.appendChild(err);
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var btn = form.querySelector('button[type="submit"]');
        if (btn) btn.disabled = true;
        err.style.display = "none";
        fetch(form.action, {
          method: "POST",
          body: new FormData(form),
          headers: { "Accept": "application/json" }
        }).then(function (resp) {
          if (!resp.ok) throw new Error("formspree");
          Array.prototype.forEach.call(form.children, function (child) {
            if (child !== success) child.hidden = true;
          });
          success.classList.add("show");
          success.focus();
        }).catch(function () {
          if (btn) btn.disabled = false;
          err.style.display = "block";
        });
      });
    });
  }

  function init() {
    initNav();
    initStickyHeader();
    initReveal();
    initCounters();
    initTabs();
    initQuickQuote();
    initCalculator();
    initForms();
    initContactTopic();
    initBooking();
    initCompare();
    initFormspreeAjax();
    initI18n();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
