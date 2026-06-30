(function () {
  const page = document.body.dataset.page;

  function setInvalid(row, invalid) {
    row.classList.toggle("is-invalid", invalid);
    const input = row.querySelector("input");
    if (input) {
      input.setAttribute("aria-invalid", invalid ? "true" : "false");
    }
  }

  function hasValue(input) {
    return input.value.trim().length > 0;
  }

  function initOrderControls() {
    const orderAccordion = document.querySelector(".order-accordion");
    const orderToggle = document.querySelector(".order-summary-toggle");
    const orderJump = document.querySelector(".order-jump");

    if (!orderAccordion || !orderToggle) {
      return;
    }

    function toggleOrder(forceOpen) {
      const isCollapsed = orderAccordion.classList.contains("is-collapsed");
      const shouldOpen = typeof forceOpen === "boolean" ? forceOpen : isCollapsed;
      orderAccordion.classList.toggle("is-collapsed", !shouldOpen);
      orderToggle.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
      if (shouldOpen) {
        document.querySelector("#your-order").scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }

    orderToggle.addEventListener("click", () => toggleOrder());
    if (orderJump) {
      orderJump.addEventListener("click", () => toggleOrder(true));
    }
  }

  function initSignin() {
    const form = document.querySelector(".signin-card");
    const input = document.querySelector("#signin-identifier");
    const row = input.closest(".field-row");

    input.value = sessionStorage.getItem("checkoutIdentifier") || "";

    input.addEventListener("input", () => setInvalid(row, false));
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!hasValue(input)) {
        setInvalid(row, true);
        input.focus();
        return;
      }

      sessionStorage.setItem("checkoutIdentifier", input.value.trim());
      window.location.href = "/your-details/";
    });
  }

  function initDetails() {
    const form = document.querySelector(".details-form");
    const email = document.querySelector("#email");
    const storedIdentifier = sessionStorage.getItem("checkoutIdentifier");

    if (storedIdentifier && storedIdentifier.includes("@")) {
      email.value = storedIdentifier;
    }

    form.querySelectorAll("input").forEach((input) => {
      input.addEventListener("input", () => {
        const row = input.closest(".field-row");
        if (row) {
          setInvalid(row, false);
        }
      });
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const firstName = document.querySelector("#first-name").value.trim();
      const lastName = document.querySelector("#last-name").value.trim();
      sessionStorage.setItem("checkoutEmail", email.value.trim() || "alex_smith@gmail.com");
      sessionStorage.setItem("checkoutName", `${firstName} ${lastName}`.trim() || "Alex Smith");
      window.location.href = "/delivery/";
    });
  }

  function initDelivery() {
    const email = sessionStorage.getItem("checkoutEmail") || sessionStorage.getItem("checkoutIdentifier");
    const name = sessionStorage.getItem("checkoutName");
    const emailTarget = document.querySelector("[data-summary-email]");
    const nameTarget = document.querySelector("[data-summary-name]");
    const deliveryOptions = document.querySelectorAll(".delivery-option");
    const addressLookup = document.querySelector("[data-address-lookup]");
    const addressInput = document.querySelector("#address-line-1");
    const suggestions = document.querySelector("#address-suggestions");
    const addressLine2 = document.querySelector("#address-line-2");
    const townCity = document.querySelector("#town-city");
    const postcode = document.querySelector("#postcode");
    const form = document.querySelector(".delivery-form");
    const deliveryStates = document.querySelectorAll("[data-delivery-state]");
    const deliveryAddressTargets = document.querySelectorAll("[data-deliver-to]");
    let deliveryTimer;
    const addresses = [
      {
        line1: "12 Mill Hill",
        line2: "Enderby",
        town: "Leicester",
        postcode: "LE19 4AD",
        label: "12 Mill Hill, Enderby, Leicester, LE19 4AD"
      },
      {
        line1: "14 Mill Hill",
        line2: "Enderby",
        town: "Leicester",
        postcode: "LE19 4AF",
        label: "14 Mill Hill, Enderby, Leicester, LE19 4AF"
      },
      {
        line1: "18 Mill Hill Lane",
        line2: "Enderby",
        town: "Leicester",
        postcode: "LE19 4AQ",
        label: "18 Mill Hill Lane, Enderby, Leicester, LE19 4AQ"
      },
      {
        line1: "22 Mill Hill Road",
        line2: "Narborough",
        town: "Leicester",
        postcode: "LE19 2AA",
        label: "22 Mill Hill Road, Narborough, Leicester, LE19 2AA"
      },
      {
        line1: "4 Mill Hill Close",
        line2: "Whetstone",
        town: "Leicester",
        postcode: "LE8 6ZD",
        label: "4 Mill Hill Close, Whetstone, Leicester, LE8 6ZD"
      }
    ];

    if (email && emailTarget) {
      emailTarget.textContent = email;
    }

    if (name && nameTarget) {
      nameTarget.textContent = name;
    }

    deliveryOptions.forEach((option) => {
      const input = option.querySelector("input");
      input.addEventListener("change", () => {
        deliveryOptions.forEach((item) => item.classList.toggle("is-selected", item === option));
      });
    });

    function normalise(value) {
      return value.trim().toLowerCase();
    }

    function showDeliveryState(state) {
      deliveryStates.forEach((panel) => {
        panel.hidden = panel.dataset.deliveryState !== state;
      });
    }

    function selectedAddressLabel() {
      const parts = [addressInput.value, addressLine2.value, townCity.value, postcode.value].map((value) => value.trim()).filter(Boolean);
      return parts.length ? parts.join(", ") : "12 Mill Hill, Enderby, Leicester, LE19 4AD";
    }

    function setDeliveryAddressLabel(label) {
      deliveryAddressTargets.forEach((target) => {
        target.textContent = label;
      });
    }

    function matchingAddresses() {
      const query = normalise(addressInput.value);
      if (!query) {
        return [];
      }

      return addresses.filter((address) => normalise(address.label).startsWith(query));
    }

    function closeSuggestions() {
      addressLookup.classList.remove("is-open");
      addressInput.setAttribute("aria-expanded", "false");
    }

    function selectAddress(address) {
      addressInput.value = address.line1;
      addressLine2.value = address.line2;
      townCity.value = address.town;
      postcode.value = address.postcode;
      setDeliveryAddressLabel(address.label);
      closeSuggestions();
      addressInput.focus();
    }

    function renderSuggestions() {
      const matches = matchingAddresses();
      suggestions.innerHTML = "";

      matches.forEach((address, index) => {
        const option = document.createElement("button");
        option.className = "address-suggestion";
        option.type = "button";
        option.role = "option";
        option.id = `address-option-${index}`;
        option.textContent = address.label;
        option.addEventListener("click", () => selectAddress(address));
        suggestions.append(option);
      });

      addressLookup.classList.toggle("is-open", matches.length > 0);
      addressInput.setAttribute("aria-expanded", matches.length > 0 ? "true" : "false");
    }

    if (addressLookup && addressInput && suggestions) {
      addressInput.addEventListener("focus", renderSuggestions);
      addressInput.addEventListener("input", renderSuggestions);
      addressLookup.querySelector(".field-icon-button").addEventListener("click", () => {
        addressInput.focus();
        renderSuggestions();
      });
      document.addEventListener("click", (event) => {
        if (!addressLookup.contains(event.target)) {
          closeSuggestions();
        }
      });
      addressInput.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          closeSuggestions();
        }
      });
    }

    if (form) {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        clearTimeout(deliveryTimer);
        window.history.replaceState({}, "", "/delivery/");
        setDeliveryAddressLabel(selectedAddressLabel());
        showDeliveryState("loading");
        deliveryTimer = window.setTimeout(() => {
          showDeliveryState("dates");
          initDatePicker();
        }, 2000);
      });
    }

    if (sessionStorage.getItem("deliveryStage") === "dates") {
      sessionStorage.removeItem("deliveryStage");
      setDeliveryAddressLabel("12 Mill Hill, Enderby, Leicester, LE19 4AD");
      showDeliveryState("dates");
      initDatePicker();
    }
  }

  function initDatePicker() {
    document.querySelectorAll(".date-chip").forEach((chip) => {
      const input = chip.querySelector("input");
      input.addEventListener("change", () => {
        document.querySelectorAll(".date-chip").forEach((item) => item.classList.toggle("is-selected", item === chip));
      });
    });

    const dateContinue = document.querySelector("[data-date-continue]");
    if (dateContinue) {
      dateContinue.addEventListener("click", () => {
        window.location.href = "/payment/";
      });
    }
  }

  function initPayment() {
    const email = sessionStorage.getItem("checkoutEmail") || sessionStorage.getItem("checkoutIdentifier");
    const name = sessionStorage.getItem("checkoutName");
    const emailTarget = document.querySelector("[data-summary-email]");
    const nameTarget = document.querySelector("[data-summary-name]");
    const cardButton = document.querySelector("[data-payment-method='card']");
    const cardPanel = document.querySelector(".card-panel");
    const paymentMethods = document.querySelectorAll(".payment-method");
    const payNowButton = document.querySelector("[data-pay-now]");

    if (email && emailTarget) {
      emailTarget.textContent = email;
    }

    if (name && nameTarget) {
      nameTarget.textContent = name;
    }

    function collapseCard() {
      if (!cardButton || !cardPanel) {
        return;
      }

      cardButton.hidden = false;
      cardButton.setAttribute("aria-expanded", "false");
      cardButton.setAttribute("aria-checked", "false");
      cardButton.classList.remove("is-selected");
      cardPanel.hidden = true;
    }

    function expandCard() {
      if (!cardButton || !cardPanel) {
        return;
      }

      paymentMethods.forEach((method) => {
        method.classList.remove("is-selected");
        method.setAttribute("aria-checked", "false");
      });
      cardButton.hidden = true;
      cardButton.setAttribute("aria-expanded", "true");
      cardPanel.hidden = false;
      cardPanel.querySelector("input")?.focus();
    }

    paymentMethods.forEach((method) => {
      method.addEventListener("click", () => {
        if (method === cardButton) {
          expandCard();
          return;
        }

        collapseCard();
        method.classList.add("is-selected");
        method.setAttribute("aria-checked", "true");
      });
    });

    if (payNowButton) {
      payNowButton.addEventListener("click", () => {
        window.location.href = "/order-complete/";
      });
    }
  }

  function initOrderComplete() {
    const email = sessionStorage.getItem("checkoutEmail") || sessionStorage.getItem("checkoutIdentifier");
    const emailTarget = document.querySelector("[data-complete-email]");

    if (email && emailTarget) {
      emailTarget.textContent = email;
    }
  }

  if (page === "signin-register") {
    initSignin();
  }

  if (page === "your-details") {
    initDetails();
  }

  if (page === "delivery") {
    initDelivery();
  }

  if (page === "payment") {
    initPayment();
  }

  if (page === "order-complete") {
    initOrderComplete();
  }

  initOrderControls();
})();
