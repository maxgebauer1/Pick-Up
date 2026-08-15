(function () {
  "use strict";

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Hero flower bloom-in is a pure CSS keyframe animation (see style.css,
  // .flower-shot / .flower-center) — no JS trigger needed, and it can't be
  // starved by requestAnimationFrame throttling in backgrounded tabs.

  // ---------------------------------------------------------------------
  // Reveal-on-scroll
  // ---------------------------------------------------------------------
  var revealEls = document.querySelectorAll(".reveal");
  if (revealEls.length) {
    if (reducedMotion || !("IntersectionObserver" in window)) {
      revealEls.forEach(function (el) { el.classList.add("is-visible"); });
    } else {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              io.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
      );
      revealEls.forEach(function (el) { io.observe(el); });

      // Safety net: a fragment link (e.g. #join) or an instant programmatic
      // scroll can land the page already-scrolled before images finish
      // loading and the document reaches its final height — the observer's
      // initial read can end up checking against a since-stale layout and
      // never fire again for a section that's actually on screen. Once
      // everything has loaded and layout has settled, force-reveal anything
      // still hidden that's currently in (or has been scrolled past) the
      // viewport.
      window.addEventListener("load", function () {
        revealEls.forEach(function (el) {
          if (el.classList.contains("is-visible")) return;
          var r = el.getBoundingClientRect();
          if (r.top < window.innerHeight && r.bottom > 0) {
            el.classList.add("is-visible");
            io.unobserve(el);
          }
        });
      });
    }
  }

  // ---------------------------------------------------------------------
  // Signup forms (email + phone)
  //
  // No backend is wired up yet. Submissions validate client-side and are
  // cached in localStorage so the UI has something real to show. Point
  // WAITLIST_ENDPOINT at a real endpoint (e.g. POST /api/waitlist) to go
  // live — the fetch call below already matches that shape.
  // ---------------------------------------------------------------------
  var WAITLIST_ENDPOINT = null; // e.g. "https://your-api.example.com/api/waitlist"

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function digitsOnly(str) {
    return (str || "").replace(/\D/g, "");
  }

  function isValidPhone(str) {
    var d = digitsOnly(str);
    return d.length >= 10 && d.length <= 15;
  }

  function handleSubmit(form) {
    var emailInput = form.querySelector('input[name="email"]');
    var phoneInput = form.querySelector('input[name="phone"]');
    var errorEl = form.querySelector(".signup-error");
    var successEl = form.querySelector(".signup-success");
    var submitBtn = form.querySelector(".btn-primary");

    function showError(msg) {
      errorEl.textContent = msg;
      errorEl.classList.add("is-visible");
    }
    function clearError() {
      errorEl.textContent = "";
      errorEl.classList.remove("is-visible");
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      clearError();

      var email = emailInput.value.trim();
      var phone = phoneInput.value.trim();

      if (!EMAIL_RE.test(email)) {
        showError("Enter a valid email address.");
        emailInput.focus();
        return;
      }
      if (!isValidPhone(phone)) {
        showError("Enter a valid phone number.");
        phoneInput.focus();
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = "Joining…";

      var entry = { email: email, phone: phone, ts: new Date().toISOString() };

      var submitPromise = WAITLIST_ENDPOINT
        ? fetch(WAITLIST_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(entry),
          })
        : Promise.resolve();

      submitPromise
        .catch(function () {
          /* endpoint unavailable — still record locally so the UI can succeed */
        })
        .then(function () {
          try {
            var existing = JSON.parse(localStorage.getItem("pu_waitlist") || "[]");
            existing.push(entry);
            localStorage.setItem("pu_waitlist", JSON.stringify(existing));
          } catch (err) {
            /* localStorage unavailable — non-fatal */
          }

          form.classList.add("is-submitted");
          successEl.classList.add("is-visible");
          submitBtn.disabled = false;
          submitBtn.textContent = "Get early access";
        });
    });
  }

  document.querySelectorAll("form.signup").forEach(handleSubmit);
})();
