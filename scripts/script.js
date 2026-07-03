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
      navigateTo("/your-details/");
    });
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

    if (email && emailTarget) {
      emailTarget.textContent = email;
    }
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

  updateOrderLedger();
  initOrderControls();
})();
