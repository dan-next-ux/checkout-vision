(function () {
  const page = document.body.dataset.page;
  const deliveryLedger = {
    home: {
      total: "£29.95",
      topLabel: "(Incl. £4.95 Delivery)",
      summaryLabel: "Total (Incl. Delivery: £4.95)"
    },
    collection: {
      total: "£25.00",
      topLabel: "(Incl. Collection FREE)",
      summaryLabel: "Total (Incl. Collection FREE)"
    },
    parcelshop: {
      total: "£28.50",
      topLabel: "(Incl. £3.50 Parcelshop)",
      summaryLabel: "Total (Incl. Parcelshop: £3.50)"
    }
  };
  const deliveryDateLabels = {
    "wed-12": "Wednesday 12th July",
    "thu-13": "Thursday 13th July",
    "fri-14": "Friday 14th July",
    "sat-15": "Saturday 15th July",
    "sun-16": "Sunday 16th July",
    "mon-17": "Monday 17th July"
  };

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

  function storedValue(key, fallback = "") {
    return sessionStorage.getItem(key) || fallback;
  }

  function routePath(path) {
    const githubPagesBase = "/checkout-vision";
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const isGithubPages = window.location.pathname === githubPagesBase || window.location.pathname.startsWith(`${githubPagesBase}/`);
    if (!isGithubPages || normalizedPath.startsWith(`${githubPagesBase}/`)) {
      return normalizedPath;
    }
    return `${githubPagesBase}${normalizedPath}`;
  }

  function navigateTo(path) {
    window.location.href = routePath(path);
  }

  function normaliseInternalPageLinks() {
    document.querySelectorAll("a[href^='/']").forEach((link) => {
      const href = link.getAttribute("href");
      if (href) {
        link.setAttribute("href", routePath(href));
      }
    });
  }

  function setInputValue(selector, value) {
    const input = document.querySelector(selector);
    if (input && value) {
      input.value = value;
    }
  }

  function deliveryTypeFromState() {
    return sessionStorage.getItem("deliveryType") || "home";
  }

  function updateOrderLedger(type = deliveryTypeFromState()) {
    const ledger = deliveryLedger[type] || deliveryLedger.home;
    document.querySelectorAll("[data-order-total]").forEach((target) => {
      target.textContent = ledger.total;
    });
    document.querySelectorAll("[data-order-delivery-label]").forEach((target) => {
      target.textContent = ledger.topLabel;
    });
    document.querySelectorAll("[data-order-total-label]").forEach((target) => {
      target.textContent = ledger.summaryLabel;
    });
    sessionStorage.setItem("orderTotal", ledger.total);
    sessionStorage.setItem("orderDeliveryLabel", ledger.topLabel);
  }

  function selectedDeliveryDateLabel() {
    const selectedDate = document.querySelector("input[name='deliveryDate']:checked");
    return deliveryDateLabels[selectedDate?.value] || "Wednesday 12th July";
  }

  function scrollToStep(selector) {
    const target = document.querySelector(selector);
    if (!target) {
      return;
    }

    window.requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function setStepScrollTarget(target) {
    sessionStorage.setItem("checkoutScrollTarget", target);
  }

  function consumeStepScrollTarget(target, selector) {
    if (sessionStorage.getItem("checkoutScrollTarget") !== target) {
      return;
    }

    sessionStorage.removeItem("checkoutScrollTarget");
    scrollToStep(selector);
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
    const applePayTrigger = document.querySelector("[data-apple-pay-trigger]");
    const applePayToast = document.querySelector("[data-apple-pay-toast]");
    const applePayComplete = document.querySelector("[data-apple-pay-complete]");
    const recognisedEmail = "recognised@email.com";

    input.value = sessionStorage.getItem("checkoutIdentifier") || "";

    input.addEventListener("input", () => setInvalid(row, false));
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!hasValue(input)) {
        setInvalid(row, true);
        input.focus();
        return;
      }

      const identifier = input.value.trim();
      sessionStorage.setItem("checkoutIdentifier", identifier);
      sessionStorage.setItem("accountMatchVisible", identifier.toLowerCase() === recognisedEmail ? "true" : "false");
      sessionStorage.setItem("accountMatchedSignin", "false");
      navigateTo("/your-details/");
    });

    if (applePayTrigger && applePayToast && applePayComplete) {
      applePayTrigger.addEventListener("click", () => {
        applePayToast.hidden = false;
        applePayComplete.focus();
      });

      applePayComplete.addEventListener("click", () => {
        sessionStorage.setItem("checkoutIdentifier", "apple_pay_customer@example.com");
        sessionStorage.setItem("checkoutEmail", "apple_pay_customer@example.com");
        sessionStorage.setItem("checkoutName", "Apple Pay Customer");
        sessionStorage.setItem("checkoutFirstName", "Apple Pay");
        sessionStorage.setItem("checkoutLastName", "Customer");
        sessionStorage.setItem("accountMatchVisible", "false");
        sessionStorage.setItem("accountMatchedSignin", "false");
        sessionStorage.setItem("deliveryType", "home");
        sessionStorage.setItem("deliveryAddressLabel", "Apple Pay delivery address");
        sessionStorage.setItem("deliveryDateLabel", "Express delivery");
        updateOrderLedger("home");
        navigateTo("/order-complete/");
      });
    }
  }

  function initDetails() {
    const form = document.querySelector(".details-form");
    const email = document.querySelector("#email");
    const emailRow = email?.closest(".field-row");
    const accountMatch = document.querySelector("[data-account-match]");
    const accountPassword = document.querySelector("#account-password");
    const accountPasswordToggle = document.querySelector("[data-account-password-toggle]");
    const accountSignIn = document.querySelector("[data-account-signin]");
    const storedIdentifier = sessionStorage.getItem("checkoutIdentifier");
    const recognisedEmail = "recognised@email.com";

    email.value = storedValue("checkoutEmail", storedIdentifier && storedIdentifier.includes("@") ? storedIdentifier : "");
    setInputValue("#account-password", storedValue("accountMatchPassword"));
    setInputValue("#first-name", storedValue("checkoutFirstName"));
    setInputValue("#last-name", storedValue("checkoutLastName"));
    setInputValue("#password", storedValue("checkoutPassword"));
    document.querySelectorAll("input[name='marketing']").forEach((input) => {
      input.checked = storedValue(`checkoutMarketing${input.value}`) === "true";
    });

    form.querySelectorAll("input").forEach((input) => {
      input.addEventListener("input", () => {
        const row = input.closest(".field-row");
        if (row) {
          setInvalid(row, false);
        }
        if (input === email) {
          setAccountMatch(email.value.trim().toLowerCase() === recognisedEmail);
        }
      });
    });

    function setAccountMatch(isMatched) {
      if (!accountMatch) {
        return;
      }
      accountMatch.hidden = !isMatched;
      emailRow?.classList.toggle("is-account-match", isMatched);
      email.setAttribute("aria-expanded", isMatched ? "true" : "false");
      sessionStorage.setItem("accountMatchVisible", isMatched ? "true" : "false");
      if (!isMatched && accountPassword && accountPasswordToggle) {
        accountPassword.type = "password";
        accountPasswordToggle.textContent = "SHOW";
        accountPasswordToggle.setAttribute("aria-pressed", "false");
      }
    }

    if (accountPasswordToggle && accountPassword) {
      accountPasswordToggle.addEventListener("click", () => {
        const isPasswordVisible = accountPassword.type === "text";
        accountPassword.type = isPasswordVisible ? "password" : "text";
        accountPasswordToggle.textContent = isPasswordVisible ? "SHOW" : "HIDE";
        accountPasswordToggle.setAttribute("aria-pressed", isPasswordVisible ? "false" : "true");
      });
      accountPassword.addEventListener("input", () => {
        sessionStorage.setItem("accountMatchPassword", accountPassword.value);
      });
    }

    setAccountMatch(email.value.trim().toLowerCase() === recognisedEmail && (storedValue("accountMatchVisible") === "true" || storedIdentifier?.trim().toLowerCase() === recognisedEmail));

    accountSignIn?.addEventListener("click", () => {
      seedOtpCheckoutDetails();
      navigateTo("/payment/");
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const firstName = document.querySelector("#first-name").value.trim();
      const lastName = document.querySelector("#last-name").value.trim();
      const password = document.querySelector("#password").value;
      sessionStorage.setItem("accountMatchedSignin", "false");
      sessionStorage.setItem("checkoutEmail", email.value.trim() || "alex_smith@gmail.com");
      sessionStorage.setItem("checkoutFirstName", firstName);
      sessionStorage.setItem("checkoutLastName", lastName);
      sessionStorage.setItem("checkoutPassword", password);
      sessionStorage.setItem("checkoutName", `${firstName} ${lastName}`.trim() || "Alex Smith");
      document.querySelectorAll("input[name='marketing']").forEach((input) => {
        sessionStorage.setItem(`checkoutMarketing${input.value}`, input.checked ? "true" : "false");
      });
      setStepScrollTarget("delivery");
      navigateTo("/delivery/");
    });
  }

  function seedOtpCheckoutDetails() {
    sessionStorage.setItem("checkoutIdentifier", "alex_smith@gmail.com");
    sessionStorage.setItem("checkoutEmail", "alex_smith@gmail.com");
    sessionStorage.setItem("accountMatchedSignin", "true");
    sessionStorage.setItem("checkoutFirstName", "Alex");
    sessionStorage.setItem("checkoutLastName", "Smith");
    sessionStorage.setItem("checkoutName", "Alex Smith");
    sessionStorage.setItem("deliveryType", "home");
    sessionStorage.setItem("deliveryAddressLine1", "12 Mill Hill");
    sessionStorage.setItem("deliveryAddressLine2", "Enderby");
    sessionStorage.setItem("deliveryTownCity", "Leicester");
    sessionStorage.setItem("deliveryPostcode", "LE19 4AD");
    sessionStorage.setItem("deliveryAddressLabel", "12 Mill Hill, Enderby, Leicester, LE19 4AD");
    sessionStorage.setItem("deliveryDate", "wed-12");
    sessionStorage.setItem("deliveryDateLabel", "Wednesday 12th July");
    updateOrderLedger("home");
  }

  function initEnterOtp() {
    const form = document.querySelector(".otp-form");
    const inputs = Array.from(document.querySelectorAll(".otp-input"));

    inputs.forEach((input, index) => {
      input.addEventListener("input", () => {
        input.value = input.value.replace(/\D/g, "").slice(0, 1);
        if (input.value && inputs[index + 1]) {
          inputs[index + 1].focus();
          inputs[index + 1].select();
        }
      });

      input.addEventListener("keydown", (event) => {
        if (event.key === "Backspace" && !input.value && inputs[index - 1]) {
          inputs[index - 1].focus();
          inputs[index - 1].select();
        }
      });
    });

    form?.addEventListener("submit", (event) => {
      event.preventDefault();
      seedOtpCheckoutDetails();
      navigateTo("/payment/");
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
    const addressInputLabel = document.querySelector("label[for='address-line-1']");
    const addressSearchButton = addressLookup?.querySelector(".field-icon-button");
    const suggestions = document.querySelector("#address-suggestions");
    const addressLine2 = document.querySelector("#address-line-2");
    const townCity = document.querySelector("#town-city");
    const postcode = document.querySelector("#postcode");
    const phoneNumber = document.querySelector("#phone-number");
    const form = document.querySelector(".delivery-form");
    const deliveryStep = document.querySelector(".delivery-step");
    const deliveryStates = document.querySelectorAll("[data-delivery-state]");
    const deliveryAddressTargets = document.querySelectorAll("[data-deliver-to]");
    const collectionStoreTargets = document.querySelectorAll("[data-collect-from]");
    const deliveryDateTargets = document.querySelectorAll("[data-delivery-date]");
    const detailFields = document.querySelectorAll("[data-delivery-detail-field]");
    const collectionRequiredMarker = document.querySelector(".delivery-collection-required");
    const deliveryQuestion = document.querySelector(".delivery-question");
    const collectionContinue = document.querySelector("[data-collection-continue]");
    const changeCollectionStore = document.querySelector("[data-change-collection-store]");
    const collectionResultsTitle = document.querySelector("#collection-results-title");
    const collectionResultsSummary = document.querySelector(".collection-results-summary");
    const collectionStoreList = document.querySelector(".collection-store-list");
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
    const pickupLocations = {
      collection: {
        fieldLabel: "Find a store",
        placeholder: "Start typing a store name or postcode",
        searchLabel: "Stores near",
        searchButtonLabel: "Search stores",
        resultsTitle: "Select a collection store",
        resultsAriaLabel: "Collection stores",
        defaultLocation: "enderby",
        locations: [
          {
            id: "enderby",
            name: "Next Leicester - Fosse Park",
            address: "Fosse Park Avenue, Leicester, LE19 1HX",
            meta: "Open today: 09:00 - 20:00"
          },
          {
            id: "leicester-highcross",
            name: "Next Leicester - Highcross",
            address: "Highcross Shopping Centre, Leicester, LE1 4FR",
            meta: "Open today: 09:30 - 20:00"
          },
          {
            id: "blaby",
            name: "Next Blaby",
            address: "Johns Court, Blaby, Leicester, LE8 4DJ",
            meta: "Open today: 09:00 - 18:00"
          }
        ]
      },
      parcelshop: {
        fieldLabel: "Find a parcelshop",
        placeholder: "Start typing a parcelshop name or postcode",
        searchLabel: "Parcelshops near",
        searchButtonLabel: "Search parcelshops",
        resultsTitle: "Select a parcelshop",
        resultsAriaLabel: "Parcelshops",
        defaultLocation: "mercury-news",
        locations: [
          {
            id: "mercury-news",
            name: "Mercury News",
            address: "5-7 Mill Lane, Enderby, LE19 4NW"
          },
          {
            id: "evri-locker",
            name: "Evri Locker",
            address: "D&R News Ltd-Mercury News Shop, 5-7 Mill Lane, Enderby, LE19 4NW"
          },
          {
            id: "costcutter",
            name: "COSTCUTTER",
            address: "110 Forest Road, Narborough, LE19 3EQ"
          }
        ]
      }
    };

    if (email && emailTarget) {
      emailTarget.textContent = email;
    }

    if (name && nameTarget) {
      nameTarget.textContent = name;
    }

    setInputValue("#address-line-1", storedValue("deliveryAddressLine1"));
    setInputValue("#address-line-2", storedValue("deliveryAddressLine2"));
    setInputValue("#town-city", storedValue("deliveryTownCity"));
    setInputValue("#postcode", storedValue("deliveryPostcode"));
    setInputValue("#phone-number", storedValue("deliveryPhoneNumber"));
    if (storedValue("deliveryType")) {
      const storedDeliveryType = document.querySelector(`input[name='delivery-type'][value='${storedValue("deliveryType")}']`);
      if (storedDeliveryType) {
        storedDeliveryType.checked = true;
      }
    }
    setDeliveryAddressLabel(storedValue("deliveryAddressLabel", selectedAddressLabel()));
    setDeliveryDateLabel(storedValue("deliveryDateLabel", deliveryDateLabels[storedValue("deliveryDate", "wed-12")]));

    deliveryOptions.forEach((option) => {
      const input = option.querySelector("input");
      option.classList.toggle("is-selected", input.checked);
      input.addEventListener("change", () => {
        deliveryOptions.forEach((item) => item.classList.toggle("is-selected", item === option));
        clearTimeout(deliveryTimer);
        sessionStorage.setItem("deliveryType", input.value);
        sessionStorage.removeItem("deliveryStage");
        syncDeliveryTypeLayout();
        showDeliveryState("address");
        updateOrderLedger(input.value);
        scrollToStep(".delivery-step");
      });
    });

    function selectedDeliveryType() {
      return document.querySelector("input[name='delivery-type']:checked")?.value || "home";
    }

    function isPickupDelivery(type = selectedDeliveryType()) {
      return type === "collection" || type === "parcelshop";
    }

    function pickupConfig(type = selectedDeliveryType()) {
      return pickupLocations[type] || pickupLocations.collection;
    }

    function syncDeliveryTypeLayout() {
      const deliveryType = selectedDeliveryType();
      const isPickup = isPickupDelivery(deliveryType);
      const config = pickupConfig(deliveryType);
      form.classList.toggle("is-collection", isPickup);
      deliveryStep?.classList.toggle("is-collection-mode", isPickup);
      if (deliveryQuestion) {
        deliveryQuestion.textContent = isPickup ? "Where would you like to collect your order?" : "Where would you like us to deliver your order?";
      }
      if (addressInputLabel) {
        addressInputLabel.innerHTML = `${isPickup ? config.fieldLabel : "Address Line 1"} <span class="required">*</span>`;
      }
      addressInput.placeholder = isPickup ? config.placeholder : "Start typing your address and pick from the list";
      addressSearchButton?.setAttribute("aria-label", isPickup ? config.searchButtonLabel : "Search address");
      if (collectionRequiredMarker) {
        collectionRequiredMarker.hidden = !isPickup;
      }
      detailFields.forEach((field) => {
        field.hidden = isPickup;
      });
      addressLine2.required = !isPickup;
      townCity.required = !isPickup;
      postcode.required = !isPickup;
      phoneNumber.required = !isPickup;
    }

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

    function setCollectionStoreLabel(label) {
      collectionStoreTargets.forEach((target) => {
        target.textContent = label;
      });
    }

    function setDeliveryDateLabel(label) {
      deliveryDateTargets.forEach((target) => {
        target.textContent = label;
      });
    }

    function saveDeliveryForm() {
      sessionStorage.setItem("deliveryType", document.querySelector("input[name='delivery-type']:checked")?.value || "home");
      updateOrderLedger(sessionStorage.getItem("deliveryType"));
      sessionStorage.setItem("deliveryAddressLine1", addressInput.value.trim());
      sessionStorage.setItem("deliveryAddressLine2", addressLine2.value.trim());
      sessionStorage.setItem("deliveryTownCity", townCity.value.trim());
      sessionStorage.setItem("deliveryPostcode", postcode.value.trim());
      sessionStorage.setItem("deliveryPhoneNumber", phoneNumber.value.trim());
      sessionStorage.setItem("deliveryAddressLabel", selectedAddressLabel());
    }

    function selectedCollectionStoreLabel() {
      const selectedStore = document.querySelector("input[name='collectionStore']:checked");
      return selectedStore?.closest(".collection-store")?.querySelector("strong")?.textContent || pickupConfig().locations[0].name;
    }

    function selectedCollectionStoreSummary() {
      const selectedStore = document.querySelector("input[name='collectionStore']:checked")?.closest(".collection-store");
      const storeName = selectedStore?.querySelector("strong")?.textContent.trim();
      const storeAddress = selectedStore?.querySelector("small")?.textContent.trim();
      const fallback = pickupConfig().locations[0];
      return [storeName, storeAddress].filter(Boolean).join(", ") || `${fallback.name}, ${fallback.address}`;
    }

    function initCollectionStorePicker() {
      const config = pickupConfig();
      if (collectionResultsTitle) {
        collectionResultsTitle.innerHTML = `${config.resultsTitle} <span class="required">*</span>`;
      }
      if (collectionResultsSummary) {
        collectionResultsSummary.innerHTML = `${config.searchLabel} <span data-collection-search>your search</span>`;
      }
      if (collectionStoreList) {
        collectionStoreList.setAttribute("aria-label", config.resultsAriaLabel);
        collectionStoreList.innerHTML = "";
        config.locations.forEach((location) => {
          const store = document.createElement("label");
          store.className = "collection-store";
          store.innerHTML = `
            <input type="radio" name="collectionStore" value="${location.id}">
            <span class="radio-dot" aria-hidden="true"></span>
            <span class="collection-store-copy">
              <strong>${location.name}</strong>
              <small>${location.address}</small>
              ${location.meta ? `<small>${location.meta}</small>` : ""}
            </span>
          `;
          collectionStoreList.append(store);
        });
      }

      const collectionSearchTarget = document.querySelector("[data-collection-search]");
      if (collectionSearchTarget) {
        collectionSearchTarget.textContent = addressInput.value.trim() || sessionStorage.getItem("collectionSearch") || "your search";
      }

      const storedStore = storedValue("collectionStore", config.defaultLocation);
      const stores = Array.from(document.querySelectorAll(".collection-store"));
      let hasSelectedStore = false;
      stores.forEach((store) => {
        const input = store.querySelector("input");
        input.checked = input.value === storedStore;
        hasSelectedStore = hasSelectedStore || input.checked;
        store.classList.toggle("is-selected", input.checked);
        input.onchange = () => {
          document.querySelectorAll(".collection-store").forEach((item) => item.classList.toggle("is-selected", item === store));
          sessionStorage.setItem("collectionStore", input.value);
          sessionStorage.setItem("deliveryAddressLabel", selectedCollectionStoreLabel());
          sessionStorage.setItem("collectionStoreSummary", selectedCollectionStoreSummary());
          setCollectionStoreLabel(selectedCollectionStoreSummary());
        };
      });
      if (!hasSelectedStore && stores[0]) {
        stores[0].querySelector("input").checked = true;
        stores[0].classList.add("is-selected");
        sessionStorage.setItem("collectionStore", stores[0].querySelector("input").value);
      }

      sessionStorage.setItem("deliveryAddressLabel", selectedCollectionStoreLabel());
      sessionStorage.setItem("collectionStoreSummary", selectedCollectionStoreSummary());
      setCollectionStoreLabel(selectedCollectionStoreSummary());
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
      sessionStorage.setItem("deliveryAddressLabel", address.label);
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

    syncDeliveryTypeLayout();
    updateOrderLedger(selectedDeliveryType());

    if (form) {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        clearTimeout(deliveryTimer);
        window.history.replaceState({}, "", routePath("/delivery/"));
        saveDeliveryForm();
        if (isPickupDelivery()) {
          sessionStorage.setItem("collectionSearch", addressInput.value.trim());
          showDeliveryState("collection-loading");
          scrollToStep(".delivery-step");
          deliveryTimer = window.setTimeout(() => {
            sessionStorage.setItem("deliveryStage", "collection-results");
            showDeliveryState("collection-results");
            initCollectionStorePicker();
            scrollToStep(".delivery-step");
          }, 2000);
          return;
        }

        setDeliveryAddressLabel(selectedAddressLabel());
        showDeliveryState("loading");
        scrollToStep(".delivery-step");
        deliveryTimer = window.setTimeout(() => {
          showDeliveryState("dates");
          initDatePicker();
          scrollToStep(".delivery-step");
        }, 2000);
      });
    }

    if (collectionContinue) {
      collectionContinue.addEventListener("click", () => {
        clearTimeout(deliveryTimer);
        sessionStorage.setItem("deliveryType", selectedDeliveryType());
        sessionStorage.setItem("deliveryAddressLabel", selectedCollectionStoreLabel());
        sessionStorage.setItem("collectionStoreSummary", selectedCollectionStoreSummary());
        setCollectionStoreLabel(selectedCollectionStoreSummary());
        showDeliveryState("collection-date-loading");
        scrollToStep(".delivery-step");
        deliveryTimer = window.setTimeout(() => {
          sessionStorage.setItem("deliveryStage", "collection-dates");
          showDeliveryState("collection-dates");
          setCollectionStoreLabel(storedValue("collectionStoreSummary", selectedCollectionStoreSummary()));
          initDatePicker();
          scrollToStep(".delivery-step");
        }, 2000);
      });
    }

    if (changeCollectionStore) {
      changeCollectionStore.addEventListener("click", () => {
        clearTimeout(deliveryTimer);
        sessionStorage.setItem("deliveryStage", "collection-results");
        showDeliveryState("collection-results");
        initCollectionStorePicker();
        scrollToStep(".delivery-step");
      });
    }

    if (sessionStorage.getItem("deliveryStage") === "dates") {
      sessionStorage.removeItem("deliveryStage");
      setDeliveryAddressLabel(storedValue("deliveryAddressLabel", "12 Mill Hill, Enderby, Leicester, LE19 4AD"));
      showDeliveryState("dates");
      initDatePicker();
    }

    if (sessionStorage.getItem("deliveryStage") === "collection-results") {
      sessionStorage.removeItem("deliveryStage");
      showDeliveryState("collection-results");
      initCollectionStorePicker();
    }

    if (sessionStorage.getItem("deliveryStage") === "collection-dates") {
      sessionStorage.removeItem("deliveryStage");
      showDeliveryState("collection-dates");
      setCollectionStoreLabel(storedValue("collectionStoreSummary", selectedCollectionStoreSummary()));
      initDatePicker();
    }

    consumeStepScrollTarget("delivery", ".delivery-step");
  }

  function initDatePicker() {
    document.querySelectorAll(".date-chip").forEach((chip) => {
      const input = chip.querySelector("input");
      const storedDate = storedValue("deliveryDate", "wed-12");
      input.checked = input.value === storedDate;
      chip.classList.toggle("is-selected", input.checked);
      input.addEventListener("change", () => {
        document.querySelectorAll(".date-chip").forEach((item) => item.classList.toggle("is-selected", item === chip));
        sessionStorage.setItem("deliveryDate", input.value);
        sessionStorage.setItem("deliveryDateLabel", selectedDeliveryDateLabel());
      });
    });

    document.querySelectorAll("[data-date-continue]").forEach((dateContinue) => {
      dateContinue.addEventListener("click", () => {
        const selectedDate = document.querySelector("input[name='deliveryDate']:checked");
        if (selectedDate) {
          sessionStorage.setItem("deliveryDate", selectedDate.value);
          sessionStorage.setItem("deliveryDateLabel", selectedDeliveryDateLabel());
        }
        setStepScrollTarget("payment");
        navigateTo("/payment/");
      });
    });
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
    const deliverySummary = document.querySelector("[data-summary-delivery-address]");
    const deliveryDateSummary = document.querySelector("[data-summary-delivery-date]");
    const useDeliveryAddressInput = document.querySelector("#use-delivery-address");
    const billingAddressFields = document.querySelector("[data-billing-address-fields]");
    const billingAddressLookup = document.querySelector("#billing-address-line-1")?.closest("[data-address-lookup]");
    const billingAddressInput = document.querySelector("#billing-address-line-1");
    const billingSuggestions = document.querySelector("#billing-address-suggestions");
    const billingAddressLine2 = document.querySelector("#billing-address-line-2");
    const billingTownCity = document.querySelector("#billing-town-city");
    const billingPostcode = document.querySelector("#billing-postcode");
    const billingAddresses = [
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

    if (deliverySummary) {
      deliverySummary.textContent = storedValue("deliveryAddressLabel", "12 Mill Hill, Enderby, Leicester, LE19 4AD");
    }

    if (deliveryDateSummary) {
      deliveryDateSummary.textContent = storedValue("deliveryDateLabel", "Wednesday 12th July");
    }

    setInputValue("#card-number", storedValue("paymentCardNumber"));
    setInputValue("#cardholder-name", storedValue("paymentCardholderName"));
    setInputValue("#expiry-date", storedValue("paymentExpiryDate"));
    setInputValue("#security-code", storedValue("paymentSecurityCode"));
    setInputValue("#billing-address-line-1", storedValue("paymentBillingAddressLine1", storedValue("deliveryAddressLine1")));
    setInputValue("#billing-address-line-2", storedValue("paymentBillingAddressLine2", storedValue("deliveryAddressLine2")));
    setInputValue("#billing-town-city", storedValue("paymentBillingTownCity", storedValue("deliveryTownCity")));
    setInputValue("#billing-postcode", storedValue("paymentBillingPostcode", storedValue("deliveryPostcode")));

    function persistBillingAddress() {
      sessionStorage.setItem("paymentBillingAddressLine1", billingAddressInput?.value.trim() || "");
      sessionStorage.setItem("paymentBillingAddressLine2", billingAddressLine2?.value.trim() || "");
      sessionStorage.setItem("paymentBillingTownCity", billingTownCity?.value.trim() || "");
      sessionStorage.setItem("paymentBillingPostcode", billingPostcode?.value.trim() || "");
    }

    function normaliseBillingAddress(value) {
      return value.trim().toLowerCase();
    }

    function closeBillingSuggestions() {
      if (!billingAddressLookup || !billingAddressInput) {
        return;
      }

      billingSuggestions.innerHTML = "";
      billingAddressLookup.classList.remove("is-open");
      billingAddressInput.setAttribute("aria-expanded", "false");
    }

    function selectBillingAddress(address) {
      if (!billingAddressInput || !billingAddressLine2 || !billingTownCity || !billingPostcode) {
        return;
      }

      billingAddressInput.value = address.line1;
      billingAddressLine2.value = address.line2;
      billingTownCity.value = address.town;
      billingPostcode.value = address.postcode;
      persistBillingAddress();
      closeBillingSuggestions();
      billingAddressInput.focus();
    }

    function renderBillingSuggestions() {
      if (!billingAddressLookup || !billingAddressInput || !billingSuggestions) {
        return;
      }

      const query = normaliseBillingAddress(billingAddressInput.value);
      const matches = query.length >= 2 ? billingAddresses.filter((address) => normaliseBillingAddress(address.label).startsWith(query)) : [];
      billingSuggestions.innerHTML = "";

      matches.forEach((address, index) => {
        const option = document.createElement("button");
        option.className = "address-suggestion";
        option.type = "button";
        option.role = "option";
        option.id = `billing-address-option-${index}`;
        option.textContent = address.label;
        option.addEventListener("click", () => selectBillingAddress(address));
        billingSuggestions.append(option);
      });

      billingAddressLookup.classList.toggle("is-open", matches.length > 0);
      billingAddressInput.setAttribute("aria-expanded", matches.length > 0 ? "true" : "false");
    }

    function syncBillingAddressVisibility() {
      if (!billingAddressFields || !useDeliveryAddressInput) {
        return;
      }

      const useDeliveryAddress = useDeliveryAddressInput.checked;
      billingAddressFields.hidden = useDeliveryAddress;
      if (useDeliveryAddress) {
        closeBillingSuggestions();
        return;
      }

      if (!(billingAddressInput?.value || billingAddressLine2?.value || billingTownCity?.value || billingPostcode?.value)) {
        billingAddressInput.value = storedValue("deliveryAddressLine1");
        billingAddressLine2.value = storedValue("deliveryAddressLine2");
        billingTownCity.value = storedValue("deliveryTownCity");
        billingPostcode.value = storedValue("deliveryPostcode");
        persistBillingAddress();
      }
    }

    function syncCollectionBillingAddressOption() {
      if (!useDeliveryAddressInput) {
        return;
      }

      const checkboxLabel = useDeliveryAddressInput.closest(".card-checkbox");
      const isPickupDelivery = deliveryTypeFromState() === "collection" || deliveryTypeFromState() === "parcelshop";
      useDeliveryAddressInput.disabled = isPickupDelivery;
      checkboxLabel?.classList.toggle("is-disabled", isPickupDelivery);
      useDeliveryAddressInput.setAttribute("aria-disabled", isPickupDelivery ? "true" : "false");

      if (isPickupDelivery) {
        useDeliveryAddressInput.checked = false;
        sessionStorage.setItem("paymentUseDeliveryAddress", "false");
      }
    }

    document.querySelectorAll(".card-checkbox input").forEach((input) => {
      const checkboxLabel = input.closest(".card-checkbox");
      function syncCheckboxState() {
        checkboxLabel?.classList.toggle("is-checked", input.checked);
        checkboxLabel?.classList.toggle("is-disabled", input.disabled);
      }

      const storedChecked = sessionStorage.getItem(`payment${input.name.charAt(0).toUpperCase()}${input.name.slice(1)}`);
      if (storedChecked !== null) {
        input.checked = storedChecked === "true";
      }
      if (input === useDeliveryAddressInput) {
        syncCollectionBillingAddressOption();
      }
      syncCheckboxState();
      input.addEventListener("change", () => {
        sessionStorage.setItem(`payment${input.name.charAt(0).toUpperCase()}${input.name.slice(1)}`, input.checked ? "true" : "false");
        syncCheckboxState();
        if (input === useDeliveryAddressInput) {
          syncBillingAddressVisibility();
          if (!input.checked) {
            billingAddressInput?.focus();
          }
        }
      });
      input.addEventListener("focus", () => checkboxLabel?.classList.add("is-focused"));
      input.addEventListener("blur", () => checkboxLabel?.classList.remove("is-focused"));
    });
    syncBillingAddressVisibility();
    document.querySelectorAll(".card-input").forEach((input) => {
      input.addEventListener("input", () => {
        sessionStorage.setItem(`payment${input.name.charAt(0).toUpperCase()}${input.name.slice(1)}`, input.value);
      });
    });

    if (billingAddressLookup && billingAddressInput && billingSuggestions) {
      billingAddressInput.addEventListener("focus", renderBillingSuggestions);
      billingAddressInput.addEventListener("input", () => {
        persistBillingAddress();
        renderBillingSuggestions();
      });
      billingAddressLookup.querySelector(".field-icon-button")?.addEventListener("click", () => {
        billingAddressInput.focus();
        renderBillingSuggestions();
      });
      [billingAddressLine2, billingTownCity, billingPostcode].forEach((input) => {
        input?.addEventListener("input", persistBillingAddress);
      });
      document.addEventListener("click", (event) => {
        if (!billingAddressLookup.contains(event.target)) {
          closeBillingSuggestions();
        }
      });
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
      scrollToStep(".card-panel");
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
        navigateTo("/order-complete/");
      });
    }

    consumeStepScrollTarget("payment", ".payment-step");
  }

  function initOrderComplete() {
    const email = sessionStorage.getItem("checkoutEmail") || sessionStorage.getItem("checkoutIdentifier");
    const emailTarget = document.querySelector("[data-complete-email]");
    const countdown = document.querySelector("[data-delivery-offer-countdown]");
    const signupPanel = document.querySelector(".signup-panel");
    const passkeyPanel = document.querySelector("[data-passkey-panel]");
    const detailsToggle = document.querySelector("[data-order-details-toggle]");
    const detailsPanel = document.querySelector("[data-order-complete-details]");
    const completeName = document.querySelector("[data-complete-name]");
    const completeAddress = document.querySelector("[data-complete-address]");
    const completeDeliveryType = document.querySelector("[data-complete-delivery-type]");
    const completeDeliveryLines = document.querySelector("[data-complete-delivery-lines]");
    const completeDeliveryCost = document.querySelector("[data-complete-delivery-cost]");
    const completeOrderTotal = document.querySelector("[data-complete-order-total]");
    const showPasskeyPanel = sessionStorage.getItem("accountMatchedSignin") === "true";

    if (email && emailTarget) {
      emailTarget.textContent = email;
    }

    if (signupPanel && passkeyPanel) {
      signupPanel.hidden = showPasskeyPanel;
      passkeyPanel.hidden = !showPasskeyPanel;
    }

    function splitAddressLabel(label) {
      return label
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
    }

    function deliveryAddressLines(type) {
      if (type === "collection" || type === "parcelshop") {
        return splitAddressLabel(storedValue("deliveryAddressLabel", "Next Leicester - Fosse Park"));
      }

      const structuredAddress = [
        storedValue("deliveryAddressLine1"),
        storedValue("deliveryAddressLine2"),
        storedValue("deliveryTownCity"),
        storedValue("deliveryPostcode")
      ].filter(Boolean);

      if (structuredAddress.length > 0) {
        return structuredAddress;
      }

      return splitAddressLabel(storedValue("deliveryAddressLabel", "12 Mill Hill, Enderby, Leicester, LE19 4AD"));
    }

    function renderLineList(target, lines) {
      if (!target) {
        return;
      }
      target.innerHTML = "";
      lines.filter(Boolean).forEach((line) => {
        const span = document.createElement("span");
        span.textContent = line;
        target.append(span);
      });
    }

    function deliveryDetailLines(type) {
      const dateLabel = storedValue("deliveryDateLabel", "Friday 21st April");
      if (type === "collection") {
        return ["Collect From Store", dateLabel, "After 1pm"];
      }
      if (type === "parcelshop") {
        return ["Collect From Parcelshop", dateLabel, "After 1pm"];
      }
      if (dateLabel === "Express delivery") {
        return ["Express Delivery", "Apple Pay", "(Confirmed)"];
      }
      return ["Next Day Delivery", dateLabel, "(Anytime)"];
    }

    function deliveryTypeLabel(type) {
      if (type === "collection") {
        return "Collection";
      }
      if (type === "parcelshop") {
        return "Parcelshop";
      }
      return "Home Delivery";
    }

    function deliveryCost(type) {
      if (type === "collection") {
        return "FREE";
      }
      if (type === "parcelshop") {
        return "£3.50";
      }
      return "£4.95";
    }

    const deliveryType = deliveryTypeFromState();
    const addressLines = deliveryAddressLines(deliveryType);
    if (completeName) {
      completeName.textContent = storedValue("checkoutName", "Alex Smith");
    }
    renderLineList(completeAddress, addressLines);
    if (completeDeliveryType) {
      completeDeliveryType.textContent = deliveryTypeLabel(deliveryType);
    }
    renderLineList(completeDeliveryLines, deliveryDetailLines(deliveryType));
    if (completeDeliveryCost) {
      completeDeliveryCost.textContent = deliveryCost(deliveryType);
    }
    if (completeOrderTotal) {
      completeOrderTotal.textContent = storedValue("orderTotal", (deliveryLedger[deliveryType] || deliveryLedger.home).total);
    }

    if (detailsToggle && detailsPanel) {
      detailsToggle.addEventListener("click", () => {
        const isExpanded = detailsToggle.getAttribute("aria-expanded") === "true";
        detailsPanel.hidden = isExpanded;
        detailsToggle.setAttribute("aria-expanded", isExpanded ? "false" : "true");
        detailsToggle.textContent = isExpanded ? "Show Details" : "Hide Details";
      });
    }

    if (!countdown) {
      return;
    }

    const countdownStartedAt = Date.now();
    const countdownDuration = 30 * 60 * 1000;
    const digitTargets = {
      minutesTens: countdown.querySelector("[data-countdown-digit='minutes-tens']"),
      minutesOnes: countdown.querySelector("[data-countdown-digit='minutes-ones']"),
      secondsTens: countdown.querySelector("[data-countdown-digit='seconds-tens']"),
      secondsOnes: countdown.querySelector("[data-countdown-digit='seconds-ones']")
    };
    let countdownTimer;

    function updateDeliveryOfferCountdown() {
      const remainingMs = Math.max(0, countdownDuration - (Date.now() - countdownStartedAt));
      const remainingSeconds = Math.ceil(remainingMs / 1000);
      const minutes = Math.floor(remainingSeconds / 60);
      const seconds = remainingSeconds % 60;
      const value = `${String(minutes).padStart(2, "0")}${String(seconds).padStart(2, "0")}`;

      digitTargets.minutesTens.textContent = value[0];
      digitTargets.minutesOnes.textContent = value[1];
      digitTargets.secondsTens.textContent = value[2];
      digitTargets.secondsOnes.textContent = value[3];
      countdown.setAttribute("aria-label", `${minutes} minutes and ${seconds} seconds remaining`);
      countdown.dateTime = `PT${minutes}M${seconds}S`;

      if (remainingSeconds === 0) {
        window.clearInterval(countdownTimer);
      }
    }

    updateDeliveryOfferCountdown();
    countdownTimer = window.setInterval(updateDeliveryOfferCountdown, 1000);
  }

  function initSinglePage() {
    const sections = {
      entry: document.querySelector("[data-single-section='entry']"),
      details: document.querySelector("[data-single-section='details']"),
      delivery: document.querySelector("[data-single-section='delivery']"),
      payment: document.querySelector("[data-single-section='payment']"),
      complete: document.querySelector("[data-single-section='complete']")
    };
    const knownAddresses = [
      "12 Mill Hill, Enderby, Leicester, LE19 4AD",
      "22 Mill Hill Road, Enderby, Leicester, LE19 4AL",
      "48 High Street, Leicester, LE1 5YP",
      "8 King Street, Leicester, LE1 6RJ",
      "101 Narborough Road, Leicester, LE3 0PA"
    ];
    const pickupLocations = {
      collection: [
        ["Next Leicester - Fosse Park", "Fosse Park Avenue, Leicester, LE19 1HX", "Open today: 09:00 - 20:00"],
        ["Next Leicester - Highcross", "Highcross Shopping Centre, Leicester, LE1 4FR", "Open today: 09:30 - 20:00"],
        ["Next Blaby", "Johns Court, Blaby, Leicester, LE8 4DJ", "Open today: 09:00 - 18:00"]
      ],
      parcelshop: [
        ["Mercury News", "5-7 Mill Lane, Enderby, LE19 4NW", "Open today: 08:00 - 20:00"],
        ["Evri Locker", "D&R News Ltd-Mercury News Shop, 5-7 Mill Lane, Enderby, LE19 4NW", "Open today: 24 hours"],
        ["COSTCUTTER", "110 Forest Road, Narborough, LE19 3EQ", "Open today: 07:00 - 22:00"]
      ]
    };
    const pickupCopy = {
      home: {
        question: "Where would you like us to deliver your order?",
        label: "Address Line 1",
        placeholder: "Start typing your address and pick from the list"
      },
      collection: {
        question: "Where would you like to collect your order?",
        label: "Find a store",
        placeholder: "Start typing a store name or postcode"
      },
      parcelshop: {
        question: "Where would you like to collect your order?",
        label: "Find a parcelshop",
        placeholder: "Start typing a parcelshop name or postcode"
      }
    };
    const entryForm = document.querySelector(".single-entry-form");
    const identifier = document.querySelector("#single-identifier");
    const accountMatch = document.querySelector("[data-single-account-match]");
    const otpPanel = document.querySelector("[data-single-otp-panel]");
    const detailsForm = document.querySelector("[data-single-details-form]");
    const detailsEmail = document.querySelector("#single-email");
    const deliveryForm = document.querySelector("[data-single-delivery-form]");
    const deliveryInput = document.querySelector("#single-address-line-1");
    const deliveryLabel = document.querySelector("[data-single-delivery-label]");
    const deliveryQuestion = document.querySelector("[data-single-delivery-question]");
    const suggestions = document.querySelector("#single-address-suggestions");
    const pickupList = document.querySelector("[data-single-pickup-list]");
    const deliverySubmit = document.querySelector("[data-single-delivery-submit]");
    const datePrompt = document.querySelector("[data-single-date-prompt]");
    const datePlaceholder = document.querySelector("[data-single-date-placeholder]");
    const billingSame = document.querySelector("#single-use-delivery-address");
    const billingFields = document.querySelector("[data-single-billing-fields]");
    const appleToast = document.querySelector("[data-single-apple-toast]");
    let deliveryType = sessionStorage.getItem("deliveryType") || "home";
    let selectedPickup = "";
    let countdownTimer;
    let homeAutoSubmitTimer;
    let homeAutoSubmitSignature = "";
    let homeDatesLoading = false;

    function reveal(sectionName, shouldScroll = true) {
      Object.entries(sections).forEach(([name, section]) => {
        if (!section) {
          return;
        }
        if (name === "entry") {
          section.hidden = false;
          return;
        }
        section.hidden = name === "complete" ? sectionName !== "complete" : false;
      });
      if (shouldScroll && sections[sectionName]) {
        scrollToStep(`[data-single-section='${sectionName}']`);
      }
    }

    function saveDetails() {
      const first = document.querySelector("#single-first-name")?.value.trim() || "Alex";
      const last = document.querySelector("#single-last-name")?.value.trim() || "Smith";
      const email = detailsEmail?.value.trim() || identifier?.value.trim() || "alex_smith@gmail.com";
      sessionStorage.setItem("checkoutEmail", email);
      sessionStorage.setItem("checkoutFirstName", first);
      sessionStorage.setItem("checkoutLastName", last);
      sessionStorage.setItem("checkoutName", `${first} ${last}`.trim());
    }

    function seedRecognisedCustomer() {
      sessionStorage.setItem("checkoutIdentifier", "alex_smith@gmail.com");
      sessionStorage.setItem("checkoutEmail", "alex_smith@gmail.com");
      sessionStorage.setItem("checkoutFirstName", "Alex");
      sessionStorage.setItem("checkoutLastName", "Smith");
      sessionStorage.setItem("checkoutName", "Alex Smith");
      sessionStorage.setItem("accountMatchedSignin", "true");
      sessionStorage.setItem("deliveryType", "home");
      sessionStorage.setItem("deliveryAddressLabel", "12 Mill Hill, Enderby, Leicester, LE19 4AD");
      sessionStorage.setItem("deliveryAddressLine1", "12 Mill Hill");
      sessionStorage.setItem("deliveryAddressLine2", "Enderby");
      sessionStorage.setItem("deliveryTownCity", "Leicester");
      sessionStorage.setItem("deliveryPostcode", "LE19 4AD");
      sessionStorage.setItem("deliveryDateLabel", "Wednesday 12th July");
      updateOrderLedger("home");
      if (detailsEmail) detailsEmail.value = "alex_smith@gmail.com";
      setInputValue("#single-first-name", "Alex");
      setInputValue("#single-last-name", "Smith");
      populateHomeAddress("12 Mill Hill, Enderby, Leicester, LE19 4AD");
    }

    function recognised(value) {
      return value.trim().toLowerCase() === "recognised@email.com";
    }

    function renderAddressSuggestions() {
      if (!suggestions || !deliveryInput || deliveryType !== "home") {
        return;
      }
      const query = deliveryInput.value.trim().toLowerCase();
      suggestions.innerHTML = "";
      deliveryInput.setAttribute("aria-expanded", "false");
      if (!query) {
        return;
      }
      knownAddresses
        .filter((address) => address.toLowerCase().startsWith(query))
        .forEach((address) => {
          const button = document.createElement("button");
          button.type = "button";
          button.textContent = address;
          button.addEventListener("click", () => {
            populateHomeAddress(address);
            suggestions.innerHTML = "";
            deliveryInput.setAttribute("aria-expanded", "false");
            queueAutoHomeSubmit();
          });
          suggestions.appendChild(button);
          deliveryInput.setAttribute("aria-expanded", "true");
        });
    }

    function populateHomeAddress(address, shouldShowDates = false) {
      const parts = address.split(",").map((part) => part.trim());
      setInputValue("#single-address-line-1", parts[0] || "");
      setInputValue("#single-address-line-2", parts[1] || "");
      setInputValue("#single-town-city", parts[2] || "");
      setInputValue("#single-postcode", parts[3] || "");
      sessionStorage.setItem("deliveryAddressLabel", address);
      sessionStorage.setItem("deliveryAddressLine1", parts[0] || "");
      sessionStorage.setItem("deliveryAddressLine2", parts[1] || "");
      sessionStorage.setItem("deliveryTownCity", parts[2] || "");
      sessionStorage.setItem("deliveryPostcode", parts[3] || "");
      if (shouldShowDates) {
        renderInlineDatePicker();
      }
    }

    function homeFieldValues() {
      return {
        line1: document.querySelector("#single-address-line-1")?.value.trim() || "",
        line2: document.querySelector("#single-address-line-2")?.value.trim() || "",
        town: document.querySelector("#single-town-city")?.value.trim() || "",
        postcode: document.querySelector("#single-postcode")?.value.trim() || "",
        phone: document.querySelector("#single-phone-number")?.value.trim() || ""
      };
    }

    function homeFieldsAreComplete() {
      const values = homeFieldValues();
      return Boolean(values.line1 && values.town && values.postcode && values.phone);
    }

    function persistHomeFields() {
      const values = homeFieldValues();
      const address = [values.line1, values.line2, values.town, values.postcode].filter(Boolean).join(", ");
      sessionStorage.setItem("deliveryAddressLabel", address);
      sessionStorage.setItem("deliveryAddressLine1", values.line1);
      sessionStorage.setItem("deliveryAddressLine2", values.line2);
      sessionStorage.setItem("deliveryTownCity", values.town);
      sessionStorage.setItem("deliveryPostcode", values.postcode);
      sessionStorage.setItem("deliveryPhoneNumber", values.phone);
      return address;
    }

    function submitHomeDeliveryForDates() {
      if (deliveryType !== "home" || !homeFieldsAreComplete() || homeDatesLoading) {
        return;
      }
      const signature = JSON.stringify(homeFieldValues());
      if (signature === homeAutoSubmitSignature) {
        return;
      }
      homeAutoSubmitSignature = signature;
      homeDatesLoading = true;
      const address = persistHomeFields();
      document.querySelector("[data-single-deliver-to]").textContent = address;
      showDeliveryState("loading");
      window.setTimeout(() => {
        renderInlineDatePicker();
        document.querySelector("[data-single-dates-label]").textContent = "Deliver to:";
        document.querySelector("[data-single-dates-address]").textContent = address;
        document.querySelector("[data-single-change-pickup]").hidden = true;
        homeDatesLoading = false;
        showDeliveryState("dates");
      }, 2000);
    }

    function queueAutoHomeSubmit() {
      if (deliveryType !== "home") {
        return;
      }
      window.clearTimeout(homeAutoSubmitTimer);
      if (!homeFieldsAreComplete()) {
        renderInlineDatePlaceholder();
        return;
      }
      homeAutoSubmitTimer = window.setTimeout(submitHomeDeliveryForDates, 350);
    }

    function renderInlineDatePlaceholder() {
      if (!datePrompt || !datePlaceholder) {
        return;
      }
      datePrompt.hidden = false;
      datePlaceholder.className = "single-date-placeholder";
      datePlaceholder.textContent = "Enter a delivery address to view available dates";
    }

    function renderInlineDatePicker() {
      if (!datePrompt || !datePlaceholder) {
        return;
      }
      datePrompt.hidden = false;
      datePlaceholder.className = "single-date-picker";
      datePlaceholder.innerHTML = `
        <div class="date-options" role="radiogroup" aria-label="Available delivery dates">
          <label class="date-chip is-selected"><input type="radio" name="single-inline-date" value="Wednesday 12th July" checked><span>Wed</span><strong>12</strong><small>Jul</small></label>
          <label class="date-chip"><input type="radio" name="single-inline-date" value="Thursday 13th July"><span>Thu</span><strong>13</strong><small>Jul</small></label>
          <label class="date-chip"><input type="radio" name="single-inline-date" value="Friday 14th July"><span>Fri</span><strong>14</strong><small>Jul</small></label>
        </div>
      `;
      datePlaceholder.querySelectorAll("input").forEach((input) => {
        input.addEventListener("change", () => {
          datePlaceholder.querySelectorAll(".date-chip").forEach((chip) => chip.classList.remove("is-selected"));
          input.closest(".date-chip")?.classList.add("is-selected");
          sessionStorage.setItem("deliveryDateLabel", input.value);
        });
      });
      sessionStorage.setItem("deliveryDateLabel", "Wednesday 12th July");
    }

    function syncDeliveryType(type) {
      deliveryType = type;
      sessionStorage.setItem("deliveryType", type);
      updateOrderLedger(type);
      document.querySelectorAll("input[name='single-delivery-type']").forEach((input) => {
        input.checked = input.value === type;
        input.closest(".delivery-option")?.classList.toggle("is-selected", input.checked);
      });
      const copy = pickupCopy[type] || pickupCopy.home;
      if (deliveryQuestion) deliveryQuestion.textContent = copy.question;
      if (deliveryLabel) deliveryLabel.innerHTML = `${copy.label} <span class="required">*</span>`;
      const hasCompleteHomeAddress = storedValue("deliveryAddressLine1") && storedValue("deliveryTownCity") && storedValue("deliveryPostcode") && storedValue("deliveryPhoneNumber");
      if (deliveryInput) {
        deliveryInput.placeholder = copy.placeholder;
        deliveryInput.value = type === "home" && hasCompleteHomeAddress ? storedValue("deliveryAddressLine1") : "";
      }
      document.querySelectorAll("[data-single-home-field]").forEach((field) => {
        field.hidden = type !== "home";
      });
      if (deliverySubmit) {
        deliverySubmit.hidden = type === "home";
      }
      if (datePrompt) {
        datePrompt.hidden = type !== "home";
      }
      if (type === "home") {
        if (hasCompleteHomeAddress) {
          renderInlineDatePicker();
        } else {
          renderInlineDatePlaceholder();
        }
      }
      document.querySelectorAll("[data-single-delivery-state]").forEach((state) => {
        state.hidden = true;
      });
      deliveryForm.hidden = false;
      syncBillingAddressRule();
    }

    function renderPickupResults() {
      if (!pickupList) {
        return;
      }
      const locations = pickupLocations[deliveryType] || pickupLocations.collection;
      pickupList.innerHTML = locations.map((location, index) => `
        <label class="collection-store${index === 0 ? " is-selected" : ""}">
          <input type="radio" name="singlePickupLocation" value="${index}" ${index === 0 ? "checked" : ""}>
          <span class="radio-dot" aria-hidden="true"></span>
          <span class="collection-store-copy">
            <strong>${location[0]}</strong>
            <small>${location[1]}</small>
            <small>${location[2]}</small>
          </span>
        </label>
      `).join("");
      selectedPickup = `${locations[0][0]}, ${locations[0][1]}`;
      pickupList.querySelectorAll("input").forEach((input) => {
        input.addEventListener("change", () => {
          pickupList.querySelectorAll(".collection-store").forEach((store) => store.classList.remove("is-selected"));
          input.closest(".collection-store")?.classList.add("is-selected");
          const location = locations[Number(input.value)];
          selectedPickup = `${location[0]}, ${location[1]}`;
        });
      });
      const title = document.querySelector("[data-single-pickup-results-title]");
      const summary = document.querySelector("[data-single-pickup-results-summary]");
      if (title) title.innerHTML = deliveryType === "parcelshop" ? "Select a parcelshop <span class=\"required\">*</span>" : "Select a collection store <span class=\"required\">*</span>";
      if (summary) summary.textContent = deliveryType === "parcelshop" ? "Parcelshops near your search" : "Stores near your search";
    }

    function showDeliveryState(state) {
      deliveryForm.hidden = true;
      document.querySelectorAll("[data-single-delivery-state]").forEach((panel) => {
        panel.hidden = panel.dataset.singleDeliveryState !== state;
      });
    }

    function completeDeliverySelection() {
      const address = deliveryType === "home"
        ? [
            document.querySelector("#single-address-line-1")?.value,
            document.querySelector("#single-address-line-2")?.value,
            document.querySelector("#single-town-city")?.value,
            document.querySelector("#single-postcode")?.value
          ].filter(Boolean).join(", ")
        : selectedPickup;
      if (address) {
        sessionStorage.setItem("deliveryAddressLabel", address);
      }
      sessionStorage.setItem("deliveryDateLabel", document.querySelector("input[name='single-inline-date']:checked")?.value || document.querySelector("input[name='single-date']:checked")?.value || "Wednesday 12th July");
      reveal("payment");
    }

    function syncBillingAddressRule() {
      if (!billingSame || !billingFields) {
        return;
      }
      const isPickup = deliveryType !== "home";
      if (isPickup) {
        billingSame.checked = false;
        billingSame.disabled = true;
      } else {
        billingSame.disabled = false;
      }
      billingFields.hidden = billingSame.checked;
      billingSame.closest(".card-checkbox")?.classList.toggle("is-disabled", billingSame.disabled);
      billingSame.closest(".card-checkbox")?.classList.toggle("is-checked", billingSame.checked);
    }

    function showOrderComplete(emailOverride) {
      const email = emailOverride || sessionStorage.getItem("checkoutEmail") || "alex_smith@gmail.com";
      const name = sessionStorage.getItem("checkoutName") || "Alex Smith";
      const address = sessionStorage.getItem("deliveryAddressLabel") || "12 Mill Hill, Enderby, Leicester, LE19 4AD";
      const date = sessionStorage.getItem("deliveryDateLabel") || "Wednesday 12th July";
      document.querySelector("[data-single-complete-email]").textContent = email;
      document.querySelector("[data-single-complete-name]").textContent = name;
      document.querySelector("[data-single-complete-address]").innerHTML = address.split(",").map((part) => `<span>${part.trim()}</span>`).join("");
      document.querySelector("[data-single-complete-delivery-type]").textContent = deliveryType === "home" ? "Home Delivery" : deliveryType === "collection" ? "Collection" : "Parcelshop";
      document.querySelector("[data-single-complete-delivery-lines]").innerHTML = `<span>${deliveryType === "home" ? "Next Day Delivery" : "Ready to collect"}</span><span>${date}</span><span>(Anytime)</span>`;
      const matched = sessionStorage.getItem("accountMatchedSignin") === "true";
      document.querySelector("[data-single-signup-panel]").hidden = matched;
      document.querySelector("[data-single-passkey-panel]").hidden = !matched;
      reveal("complete");
      startSingleCountdown();
    }

    function startSingleCountdown() {
      const countdown = document.querySelector("[data-single-countdown]");
      if (!countdown) {
        return;
      }
      const digits = countdown.querySelectorAll("span");
      const started = Date.now();
      window.clearInterval(countdownTimer);
      function tick() {
        const secondsLeft = Math.max(0, 1800 - Math.floor((Date.now() - started) / 1000));
        const minutes = Math.floor(secondsLeft / 60);
        const seconds = secondsLeft % 60;
        const value = `${String(minutes).padStart(2, "0")}${String(seconds).padStart(2, "0")}`;
        digits.forEach((digit, index) => {
          digit.textContent = value[index];
        });
      }
      tick();
      countdownTimer = window.setInterval(tick, 1000);
    }

    identifier?.addEventListener("input", () => {
      if (recognised(identifier.value)) {
        accountMatch.hidden = false;
        if (detailsEmail) detailsEmail.value = identifier.value.trim();
      }
    });
    entryForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      if (recognised(identifier.value)) {
        accountMatch.hidden = false;
        scrollToStep("[data-single-account-match]");
      } else {
        if (detailsEmail) detailsEmail.value = identifier.value.trim();
        reveal("details");
      }
    });
    document.querySelector("[data-single-guest]")?.addEventListener("click", () => reveal("details"));
    document.querySelector("[data-single-account-signin]")?.addEventListener("click", () => {
      seedRecognisedCustomer();
      reveal("payment");
    });
    document.querySelector("[data-single-otp-trigger]")?.addEventListener("click", () => {
      otpPanel.hidden = false;
      scrollToStep("[data-single-otp-panel]");
    });
    document.querySelector("[data-single-otp-continue]")?.addEventListener("click", () => {
      seedRecognisedCustomer();
      reveal("payment");
    });
    document.querySelector("[data-single-password-toggle]")?.addEventListener("click", (event) => {
      const password = document.querySelector("#single-account-password");
      const show = password.type === "password";
      password.type = show ? "text" : "password";
      event.currentTarget.textContent = show ? "HIDE" : "SHOW";
    });
    detailsEmail?.addEventListener("input", () => {
      if (recognised(detailsEmail.value)) {
        if (identifier) identifier.value = detailsEmail.value.trim();
        accountMatch.hidden = false;
      }
    });
    detailsForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      saveDetails();
      reveal("delivery");
    });
    document.querySelectorAll("input[name='single-delivery-type']").forEach((input) => {
      input.addEventListener("change", () => syncDeliveryType(input.value));
    });
    deliveryInput?.addEventListener("input", renderAddressSuggestions);
    ["#single-address-line-1", "#single-address-line-2", "#single-town-city", "#single-postcode", "#single-phone-number"].forEach((selector) => {
      document.querySelector(selector)?.addEventListener("input", queueAutoHomeSubmit);
    });
    deliveryForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      if (deliveryType === "home") {
        submitHomeDeliveryForDates();
      } else {
        renderPickupResults();
        showDeliveryState("loading");
        window.setTimeout(() => showDeliveryState("pickup-results"), 2000);
      }
    });
    document.querySelector("[data-single-pickup-continue]")?.addEventListener("click", () => {
      showDeliveryState("loading");
      window.setTimeout(() => {
        document.querySelector("[data-single-dates-label]").textContent = deliveryType === "parcelshop" ? "Collect from parcelshop:" : "Collect from:";
        document.querySelector("[data-single-dates-address]").textContent = selectedPickup;
        document.querySelector("[data-single-change-pickup]").hidden = false;
        showDeliveryState("dates");
      }, 2000);
    });
    document.querySelector("[data-single-change-pickup]")?.addEventListener("click", () => showDeliveryState("pickup-results"));
    document.querySelector("[data-single-delivery-continue]")?.addEventListener("click", completeDeliverySelection);
    document.querySelectorAll("input[name='single-date']").forEach((input) => {
      input.addEventListener("change", () => {
        document.querySelectorAll(".date-chip").forEach((chip) => chip.classList.remove("is-selected"));
        input.closest(".date-chip")?.classList.add("is-selected");
      });
    });
    billingSame?.addEventListener("change", syncBillingAddressRule);
    document.querySelector("[data-single-pay-now]")?.addEventListener("click", () => {
      saveDetails();
      showOrderComplete();
    });
    document.querySelector("[data-single-details-toggle]")?.addEventListener("click", (event) => {
      const details = document.querySelector("[data-single-complete-details]");
      const open = details.hidden;
      details.hidden = !open;
      event.currentTarget.textContent = open ? "Hide Details" : "Show Details";
      event.currentTarget.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.querySelector("[data-single-apple-pay]")?.addEventListener("click", () => {
      appleToast.hidden = false;
    });
    document.querySelector("[data-single-apple-complete]")?.addEventListener("click", () => {
      sessionStorage.setItem("checkoutEmail", "apple_pay_customer@example.com");
      sessionStorage.setItem("checkoutName", "Apple Pay Customer");
      sessionStorage.setItem("accountMatchedSignin", "false");
      sessionStorage.setItem("deliveryType", "home");
      sessionStorage.setItem("deliveryAddressLabel", sessionStorage.getItem("deliveryAddressLabel") || "12 Mill Hill, Enderby, Leicester, LE19 4AD");
      appleToast.hidden = true;
      updateOrderLedger("home");
      showOrderComplete("apple_pay_customer@example.com");
    });

    setInputValue("#single-email", storedValue("checkoutEmail"));
    setInputValue("#single-first-name", storedValue("checkoutFirstName"));
    setInputValue("#single-last-name", storedValue("checkoutLastName"));
    setInputValue("#single-address-line-1", storedValue("deliveryAddressLine1"));
    setInputValue("#single-address-line-2", storedValue("deliveryAddressLine2"));
    setInputValue("#single-town-city", storedValue("deliveryTownCity"));
    setInputValue("#single-postcode", storedValue("deliveryPostcode"));
    setInputValue("#single-phone-number", storedValue("deliveryPhoneNumber"));
    syncDeliveryType(deliveryType);
  }

  normaliseInternalPageLinks();

  if (page === "signin-register") {
    initSignin();
  }

  if (page === "your-details") {
    initDetails();
  }

  if (page === "enter-otp") {
    initEnterOtp();
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

  if (page === "single-page") {
    initSinglePage();
  }

  updateOrderLedger();
  initOrderControls();
})();
