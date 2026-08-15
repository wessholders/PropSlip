(() => {
  const bundle = window.PropSlipGearRatioData;
  const manufacturerData = window.PropSlipGearRatioManufacturers || {};
  const manufacturerRequests = new Map();
  const elements = {
    header: document.querySelector(".app-header"),
    dock: document.querySelector(".gear-dock"),
    mobileToggle: document.querySelector("#gearMobileToggle"),
    path: document.querySelector("#gearPath"),
    title: document.querySelector("#gearLevelTitle"),
    list: document.querySelector("#gearList"),
    result: document.querySelector("#gearResult"),
    message: document.querySelector("#gearMessage")
  };

  if (!elements.path || !elements.title || !elements.list || !elements.result || !elements.message) return;

  function syncSidebarTop() {
    if (!elements.header) return;
    const headerBottom = Math.max(0, Math.ceil(elements.header.getBoundingClientRect().bottom));
    document.documentElement.style.setProperty("--gear-sidebar-top", `${headerBottom}px`);
  }

  function setMobileOpen(isOpen) {
    if (!elements.dock || !elements.mobileToggle) return;
    elements.dock.classList.toggle("mobile-open", isOpen);
    elements.mobileToggle.setAttribute("aria-expanded", String(isOpen));
  }

  function hasSelection() {
    return Boolean(selection.make || selection.year || selection.hp || selection.model);
  }

  const selection = {
    make: null,
    year: null,
    hp: null,
    model: null
  };

  function slugify(value) {
    return String(value)
      .trim()
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function hpId(value) {
    const number = Number.parseFloat(value);
    if (!Number.isFinite(number)) return "";
    return Number.parseFloat(number.toFixed(3)).toString();
  }

  function formatRatio(ratio) {
    return String(ratio).replace(/\s*:\s*/g, " : ");
  }

  function manufacturerList() {
    if (!bundle || !Array.isArray(bundle.manufacturers)) return [];
    return bundle.manufacturers;
  }

  function getManufacturer(slug) {
    return manufacturerList().find((manufacturer) => manufacturer.slug === slug) || null;
  }

  function loadScript(src) {
    return new Promise((resolveLoad, rejectLoad) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        existing.addEventListener("load", resolveLoad, { once: true });
        existing.addEventListener("error", rejectLoad, { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.addEventListener("load", resolveLoad, { once: true });
      script.addEventListener("error", rejectLoad, { once: true });
      document.head.append(script);
    });
  }

  async function loadManufacturerData(make) {
    if (!make || manufacturerData[make]) return manufacturerData[make] || null;

    if (!manufacturerRequests.has(make)) {
      manufacturerRequests.set(make, loadScript(`gear-ratio-data/${make}.js`)
        .then(() => manufacturerData[make] || null)
        .catch(() => null));
    }

    return manufacturerRequests.get(make);
  }

  function recordsFor(make, year) {
    return manufacturerData?.[make]?.[String(year)] || [];
  }

  function horsepowerOptions(make, year) {
    const options = new Map();

    recordsFor(make, year).forEach((record) => {
      const id = hpId(record.hpValue);
      if (!id || options.has(id)) return;
      options.set(id, {
        id,
        label: record.hpLabel,
        value: record.hpValue
      });
    });

    return Array.from(options.values()).sort((a, b) => a.value - b.value);
  }

  function modelOptions(make, year, hp) {
    const matchingRecords = recordsFor(make, year)
      .filter((record) => hpId(record.hpValue) === hp)
      .sort((a, b) => a.modelLabel.localeCompare(b.modelLabel, "en", { numeric: true, sensitivity: "base" }));

    const seen = new Map();

    return matchingRecords.map((record) => {
      const baseId = slugify(record.modelLabel || record.model) || "model";
      const seenCount = seen.get(baseId) || 0;
      seen.set(baseId, seenCount + 1);

      return {
        id: seenCount === 0 ? baseId : `${baseId}-${seenCount + 1}`,
        label: record.modelLabel,
        record
      };
    });
  }

  function selectedHpOption() {
    if (!selection.make || !selection.year || !selection.hp) return null;
    return horsepowerOptions(selection.make, selection.year).find((option) => option.id === selection.hp) || null;
  }

  function selectedModelOption() {
    if (!selection.make || !selection.year || !selection.hp || !selection.model) return null;
    return modelOptions(selection.make, selection.year, selection.hp).find((option) => option.id === selection.model) || null;
  }

  function selectedPath() {
    const make = selection.make ? getManufacturer(selection.make) : null;
    const hp = selectedHpOption();
    const model = selectedModelOption();
    const segments = [];

    if (make) {
      segments.push({
        level: "make",
        label: make.name
      });
    }

    if (make && selection.year) {
      segments.push({
        level: "year",
        label: String(selection.year)
      });
    }

    if (make && selection.year && hp) {
      segments.push({
        level: "hp",
        label: hp.label
      });
    }

    if (make && selection.year && hp && model) {
      segments.push({
        level: "model",
        label: model.label
      });
    }

    return segments;
  }

  function setMessage(text = "") {
    elements.message.textContent = text;
    elements.message.hidden = !text;
  }

  function clearDownstream(level) {
    if (level === "make") {
      selection.make = null;
      selection.year = null;
      selection.hp = null;
      selection.model = null;
    } else if (level === "year") {
      selection.year = null;
      selection.hp = null;
      selection.model = null;
    } else if (level === "hp") {
      selection.hp = null;
      selection.model = null;
    } else if (level === "model") {
      selection.model = null;
    }
  }

  function updateUrl(mode = "push") {
    const url = new URL(window.location.href);
    ["make", "year", "hp", "model"].forEach((key) => url.searchParams.delete(key));

    if (selection.make) url.searchParams.set("make", selection.make);
    if (selection.year) url.searchParams.set("year", selection.year);
    if (selection.hp) url.searchParams.set("hp", selection.hp);
    if (selection.model) url.searchParams.set("model", selection.model);

    const method = mode === "replace" ? "replaceState" : "pushState";
    window.history[method]({ gearLookup: true }, "", url);
  }

  function createRow(option, onClick) {
    const item = document.createElement("div");
    item.className = "gear-row-item";
    item.setAttribute("role", "listitem");

    const button = document.createElement("button");
    button.className = "gear-row";
    button.type = "button";
    button.dataset.optionId = option.id;
    button.addEventListener("click", onClick);

    const label = document.createElement("span");
    label.className = "gear-row-label";
    label.textContent = option.label;

    const indicator = document.createElement("span");
    indicator.className = "gear-row-indicator";
    indicator.setAttribute("aria-hidden", "true");
    indicator.textContent = ">";

    button.append(label, indicator);
    item.append(button);
    return item;
  }

  function renderPath() {
    const segments = selectedPath();
    elements.path.replaceChildren();
    elements.path.hidden = segments.length === 0;

    segments.forEach((segment, index) => {
      if (index > 0) {
        const separator = document.createElement("span");
        separator.className = "gear-path-separator";
        separator.setAttribute("aria-hidden", "true");
        separator.textContent = ">";
        elements.path.append(separator);
      }

      const button = document.createElement("button");
      button.className = "gear-path-button";
      button.type = "button";
      button.textContent = segment.label;
      button.addEventListener("click", () => {
        clearDownstream(segment.level);
        updateUrl();
        void render();
      });
      elements.path.append(button);
    });
  }

  function renderRows(title, options, onChoose) {
    elements.title.textContent = title;
    elements.result.hidden = true;
    elements.result.replaceChildren();
    elements.list.hidden = false;
    elements.list.replaceChildren(...options.map((option) => createRow(option, () => onChoose(option))));
  }

  function renderResult() {
    const model = selectedModelOption();
    elements.title.textContent = model?.record?.ratios?.length > 1 ? "Known gear ratios" : "Gear ratio";
    elements.list.hidden = true;
    elements.list.replaceChildren();
    elements.result.hidden = false;
    elements.result.replaceChildren();

    if (!model) {
      setMessage("That model is no longer available for this lookup.");
      return;
    }

    const ratios = Array.isArray(model.record.ratios) ? model.record.ratios : [];
    if (ratios.length === 0) {
      const empty = document.createElement("p");
      empty.className = "gear-result-note";
      empty.textContent = "No gear ratio is listed for this model yet.";
      elements.result.append(empty);
      return;
    }

    const list = document.createElement("div");
    list.className = ratios.length > 1 ? "ratio-list multiple" : "ratio-list";

    ratios.forEach((ratio) => {
      const value = document.createElement("p");
      value.className = "ratio-value";
      value.textContent = formatRatio(ratio);
      list.append(value);
    });

    elements.result.append(list);

    if (ratios.length > 1) {
      const note = document.createElement("p");
      note.className = "gear-result-note";
      note.textContent = "Multiple gearcase configurations are listed for this model.";
      elements.result.append(note);
    }
  }

  async function render() {
    setMessage();
    renderPath();

    if (!bundle) {
      elements.title.textContent = "Manufacturer";
      elements.list.hidden = true;
      elements.result.hidden = true;
      setMessage("Gear ratio data is not available.");
      return;
    }

    if (!selection.make) {
      renderRows("Manufacturer", manufacturerList().map((manufacturer) => ({
        id: manufacturer.slug,
        label: manufacturer.name
      })), (option) => {
        selection.make = option.id;
        selection.year = null;
        selection.hp = null;
        selection.model = null;
        updateUrl();
        void render();
      });
      return;
    }

    const manufacturer = getManufacturer(selection.make);
    if (!manufacturer) {
      clearDownstream("make");
      updateUrl("replace");
      await render();
      setMessage("That manufacturer is not available.");
      return;
    }

    if (!manufacturerData[selection.make]) {
      elements.title.textContent = "Loading";
      elements.result.hidden = true;
      elements.result.replaceChildren();
      elements.list.hidden = false;
      elements.list.replaceChildren();
      await loadManufacturerData(selection.make);

      if (!manufacturerData[selection.make]) {
        clearDownstream("make");
        updateUrl("replace");
        await render();
        setMessage("Gear ratio data is not available for that manufacturer.");
        return;
      }

      renderPath();
    }

    if (!selection.year) {
      renderRows("Year", manufacturer.years.map((year) => ({
        id: String(year),
        label: String(year)
      })), (option) => {
        selection.year = option.id;
        selection.hp = null;
        selection.model = null;
        updateUrl();
        void render();
      });
      return;
    }

    if (!manufacturer.years.map(String).includes(String(selection.year))) {
      selection.year = null;
      selection.hp = null;
      selection.model = null;
      updateUrl("replace");
      await render();
      setMessage("That year is not available for this manufacturer.");
      return;
    }

    if (!selection.hp) {
      renderRows("Horsepower", horsepowerOptions(selection.make, selection.year), (option) => {
        selection.hp = option.id;
        selection.model = null;
        updateUrl();
        void render();
      });
      return;
    }

    if (!selectedHpOption()) {
      selection.hp = null;
      selection.model = null;
      updateUrl("replace");
      await render();
      setMessage("That horsepower is not available for this year.");
      return;
    }

    if (!selection.model) {
      renderRows("Model", modelOptions(selection.make, selection.year, selection.hp), (option) => {
        selection.model = option.id;
        updateUrl();
        void render();
      });
      return;
    }

    if (!selectedModelOption()) {
      selection.model = null;
      updateUrl("replace");
      await render();
      setMessage("That model is not available for this horsepower.");
      return;
    }

    renderResult();
  }

  function loadFromUrl() {
    const params = new URLSearchParams(window.location.search);
    selection.make = params.get("make") || null;
    selection.year = params.get("year") || null;
    selection.hp = params.get("hp") || null;
    selection.model = params.get("model") || null;

    if (selection.make) selection.make = selection.make.toLowerCase();
    if (selection.year && !/^[0-9]{4}$/.test(selection.year)) selection.year = null;
    if (selection.hp) selection.hp = hpId(selection.hp);
  }

  window.addEventListener("popstate", () => {
    loadFromUrl();
    if (hasSelection()) setMobileOpen(true);
    void render();
  });

  window.addEventListener("resize", syncSidebarTop);
  window.addEventListener("load", syncSidebarTop);
  elements.mobileToggle?.addEventListener("click", () => {
    setMobileOpen(elements.mobileToggle.getAttribute("aria-expanded") !== "true");
  });

  syncSidebarTop();
  loadFromUrl();
  if (hasSelection()) setMobileOpen(true);
  void render();
})();
