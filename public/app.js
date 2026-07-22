      const MPH_PER_KNOT = 1.15077945;
      const MPH_PER_KPH = 0.621371192;
      const APPEARANCE_KEY = "prop-slip-appearance";
      const UNIT_SYSTEM_KEY = "prop-slip-unit-system";
      const COMPARISON_MODE_KEY = "prop-slip-comparison-mode";
      const UNIT_SYSTEMS = {
        imperial: { speedUnit: "mph", speedLabel: "mph" },
        metric: { speedUnit: "kph", speedLabel: "km/h" },
        nautical: { speedUnit: "knots", speedLabel: "kn" }
      };
      const systemScheme = window.matchMedia("(prefers-color-scheme: dark)");
      let activeUnitSystem = "imperial";
      const fields = {
        form: document.querySelector("#calculator-form"),
        pitch: document.querySelector("#pitch"),
        pitchUnitLabel: document.querySelector("#pitchUnitLabel"),
        gearRatio: document.querySelector("#gearRatio"),
        rpm: document.querySelector("#rpm"),
        speed: document.querySelector("#speed"),
        speedUnit: document.querySelector("#speedUnit"),
        slipValue: document.querySelector("#slipValue"),
        statusPill: document.querySelector("#statusPill"),
        propRpmValue: document.querySelector("#propRpmValue"),
        theoreticalValue: document.querySelector("#theoreticalValue"),
        clearButton: document.querySelector("#clearButton"),
        slipValidation: document.querySelector("#slipValidation"),
        whatIfForm: document.querySelector("#whatif-form"),
        comparePitchA: document.querySelector("#comparePitchA"),
        compareGearRatioA: document.querySelector("#compareGearRatioA"),
        compareRpmA: document.querySelector("#compareRpmA"),
        compareSlipA: document.querySelector("#compareSlipA"),
        comparePitchB: document.querySelector("#comparePitchB"),
        compareGearRatioB: document.querySelector("#compareGearRatioB"),
        compareRpmB: document.querySelector("#compareRpmB"),
        compareSlipB: document.querySelector("#compareSlipB"),
        compareSetupB: document.querySelector("#compareSetupB"),
        setupAValidation: document.querySelector("#setupAValidation"),
        setupBValidation: document.querySelector("#setupBValidation"),
        whatIfMetricLabel: document.querySelector("#whatIfMetricLabel"),
        whatIfResultValue: document.querySelector("#whatIfResultValue"),
        whatIfStatusPill: document.querySelector("#whatIfStatusPill"),
        whatIfStatA: document.querySelector("#whatIfStatA"),
        whatIfStatALabel: document.querySelector("#whatIfStatALabel"),
        whatIfStatAValue: document.querySelector("#whatIfStatAValue"),
        whatIfStatB: document.querySelector("#whatIfStatB"),
        whatIfStatBLabel: document.querySelector("#whatIfStatBLabel"),
        whatIfStatBValue: document.querySelector("#whatIfStatBValue"),
        whatIfTab: document.querySelector("#whatIfTab"),
        calculatorSwitcher: document.querySelector("#calculatorSwitcher"),
        comparisonModeToggle: document.querySelector("#comparisonModeToggle"),
        viewSwitcherButtons: document.querySelectorAll("[data-view]"),
        views: {
          slip: document.querySelector("#view-slip"),
          whatif: document.querySelector("#view-whatif")
        },
        menuButton: document.querySelector("#menuButton"),
        menuSheet: document.querySelector("#menuSheet"),
        menuItems: document.querySelectorAll("[data-open-sheet]"),
        tutorialSheet: document.querySelector("#tutorialSheet"),
        aboutSheet: document.querySelector("#aboutSheet"),
        privacySheet: document.querySelector("#privacySheet"),
        accessibilitySheet: document.querySelector("#accessibilitySheet"),
        termsSheet: document.querySelector("#termsSheet"),
        contactSheet: document.querySelector("#contactSheet"),
        mobileAppsSheet: document.querySelector("#mobileAppsSheet"),
        settingsSheet: document.querySelector("#settingsSheet"),
        closeButtons: document.querySelectorAll("[data-close]"),
        backButtons: document.querySelectorAll("[data-back-menu]"),
        appearanceButtons: document.querySelectorAll("button[data-appearance]"),
        unitSystemButtons: document.querySelectorAll("button[data-unit-system]"),
        themeColor: document.querySelector('meta[name="theme-color"]')
      };

      const numberFormatter = new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 1
      });

      const diffFormatter = new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 1,
        signDisplay: "always"
      });

      const integerFormatter = new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 0
      });

      function getStoredAppearance() {
        try {
          return localStorage.getItem(APPEARANCE_KEY) || "system";
        } catch (error) {
          return "system";
        }
      }

      function getStoredUnitSystem() {
        try {
          const stored = localStorage.getItem(UNIT_SYSTEM_KEY) || "imperial";
          return UNIT_SYSTEMS[stored] ? stored : "imperial";
        } catch (error) {
          return "imperial";
        }
      }

      function getStoredComparisonMode() {
        try {
          return localStorage.getItem(COMPARISON_MODE_KEY) === "on";
        } catch (error) {
          return false;
        }
      }

      function toNumber(input) {
        const value = Number.parseFloat(input.value);
        return Number.isFinite(value) ? value : NaN;
      }

      function formatList(items) {
        if (items.length <= 1) return items[0] || "";
        if (items.length === 2) return `${items[0]} and ${items[1]}`;
        return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
      }

      function sentenceCase(text) {
        return text.charAt(0).toUpperCase() + text.slice(1);
      }

      function setFieldValidity(input, isValid, messageId) {
        input.setAttribute("aria-invalid", String(!isValid));
        input.closest(".field-row").classList.toggle("invalid", !isValid);

        if (isValid) {
          input.removeAttribute("aria-describedby");
        } else {
          input.setAttribute("aria-describedby", messageId);
        }
      }

      function clearValidation(messageElement, configs) {
        messageElement.hidden = true;
        messageElement.textContent = "";
        configs.forEach((config) => setFieldValidity(config.input, true, messageElement.id));
      }

      function validateFields(messageElement, configs) {
        const values = {};
        const missing = [];
        const errors = [];

        configs.forEach((config) => {
          const rawValue = config.input.value.trim();
          const value = Number.parseFloat(rawValue);
          let error = "";

          if (rawValue === "") {
            missing.push(config.label);
            error = `${sentenceCase(config.label)} is required.`;
          } else if (!Number.isFinite(value)) {
            error = `${sentenceCase(config.label)} must be a number.`;
          } else if (config.minExclusive !== undefined && value <= config.minExclusive) {
            error = `${sentenceCase(config.label)} must be greater than ${config.minExclusive}.`;
          } else if (config.minInclusive !== undefined && value < config.minInclusive) {
            error = `${sentenceCase(config.label)} must be at least ${config.minInclusive}.`;
          } else if (config.maxInclusive !== undefined && value > config.maxInclusive) {
            error = `${sentenceCase(config.label)} must be ${config.maxInclusive} or less.`;
          }

          if (error) {
            errors.push(error);
            setFieldValidity(config.input, false, messageElement.id);
          } else {
            values[config.key] = value;
            setFieldValidity(config.input, true, messageElement.id);
          }
        });

        if (errors.length === 0) {
          messageElement.hidden = true;
          messageElement.textContent = "";
          return { isValid: true, values, hasMissing: false };
        }

        messageElement.textContent = missing.length === errors.length
          ? `Enter ${formatList(missing)}.`
          : errors[0];
        messageElement.hidden = false;
        return { isValid: false, values, hasMissing: missing.length > 0 };
      }

      function slipValidationConfigs() {
        return [
          { key: "pitch", input: fields.pitch, label: "propeller pitch", minExclusive: 0 },
          { key: "gearRatio", input: fields.gearRatio, label: "gear ratio", minExclusive: 0 },
          { key: "rpm", input: fields.rpm, label: "engine RPM", minExclusive: 0 },
          { key: "speed", input: fields.speed, label: "GPS speed", minInclusive: 0 }
        ];
      }

      function setupValidationConfigs(prefix) {
        const fieldSuffix = prefix === "A" ? "A" : "B";
        return [
          { key: "pitch", input: fields[`comparePitch${fieldSuffix}`], label: `Setup ${fieldSuffix} propeller pitch`, minExclusive: 0 },
          { key: "gearRatio", input: fields[`compareGearRatio${fieldSuffix}`], label: `Setup ${fieldSuffix} gear ratio`, minExclusive: 0 },
          { key: "rpm", input: fields[`compareRpm${fieldSuffix}`], label: `Setup ${fieldSuffix} engine RPM`, minExclusive: 0 },
          { key: "slip", input: fields[`compareSlip${fieldSuffix}`], label: `Setup ${fieldSuffix} target slip`, minInclusive: 0, maxInclusive: 100 }
        ];
      }

      function speedToMph(speed, unit) {
        if (unit === "knots") return speed * MPH_PER_KNOT;
        if (unit === "kph") return speed * MPH_PER_KPH;
        return speed;
      }

      function speedFromMph(mph, unit) {
        if (unit === "knots") return mph / MPH_PER_KNOT;
        if (unit === "kph") return mph / MPH_PER_KPH;
        return mph;
      }

      function speedUnitLabel(unit) {
        const system = Object.values(UNIT_SYSTEMS).find((entry) => entry.speedUnit === unit);
        return system ? system.speedLabel : unit;
      }

      function formatSpeed(mph, unit = UNIT_SYSTEMS[activeUnitSystem].speedUnit) {
        return `${numberFormatter.format(speedFromMph(mph, unit))} ${speedUnitLabel(unit)}`;
      }

      function formatInputValue(value, digits = 2) {
        if (!Number.isFinite(value)) return "";
        return Number.parseFloat(value.toFixed(digits)).toString();
      }

      function setWaiting(label = "Waiting", className = "status-pill") {
        fields.slipValue.textContent = "--";
        fields.statusPill.textContent = label;
        fields.statusPill.className = className;
        fields.propRpmValue.textContent = "--";
        fields.theoreticalValue.textContent = "--";
      }

      function describeSlip(slip) {
        if (slip < 0) {
          return {
            label: "Check data",
            className: "status-pill warn",
            scaleClass: "warn"
          };
        }

        if (slip <= 5) {
          return {
            label: "Excellent",
            className: "status-pill good",
            scaleClass: "good"
          };
        }

        if (slip <= 10) {
          return {
            label: "Great",
            className: "status-pill good",
            scaleClass: "good"
          };
        }

        if (slip <= 15) {
          return {
            label: "Good",
            className: "status-pill",
            scaleClass: ""
          };
        }

        if (slip <= 20) {
          return {
            label: "OK",
            className: "status-pill caution",
            scaleClass: "caution"
          };
        }

        return {
          label: "Poor",
          className: "status-pill warn",
          scaleClass: "warn"
        };
      }

      function calculate() {
        const validation = validateFields(fields.slipValidation, slipValidationConfigs());
        if (!validation.isValid) {
          setWaiting(validation.hasMissing ? "Incomplete" : "Check setup", "status-pill warn");
          return;
        }

        const { pitch, gearRatio, rpm, speed } = validation.values;
        const actualMph = speedToMph(speed, fields.speedUnit.value);
        const propRpm = rpm / gearRatio;
        const theoreticalMph = (propRpm * pitch) / 1056;
        const slip = ((theoreticalMph - actualMph) / theoreticalMph) * 100;
        const status = describeSlip(slip);

        fields.slipValue.textContent = `${numberFormatter.format(slip)}%`;
        fields.statusPill.textContent = status.label;
        fields.statusPill.className = status.className;
        fields.propRpmValue.textContent = integerFormatter.format(propRpm);
        fields.theoreticalValue.textContent = formatSpeed(theoreticalMph);
      }

      function estimateSetup(pitch, gearRatio, rpm, slip) {
        if (![pitch, gearRatio, rpm, slip].every(Number.isFinite)) return null;
        if (pitch <= 0 || gearRatio <= 0 || rpm <= 0 || slip < 0 || slip > 100) return null;

        const propRpm = rpm / gearRatio;
        const theoreticalMph = (propRpm * pitch) / 1056;
        const estimatedMph = theoreticalMph * (1 - (slip / 100));
        return { propRpm, theoreticalMph, estimatedMph };
      }

      function setWhatIfWaiting(label = "Waiting", className = "status-pill") {
        fields.whatIfMetricLabel.textContent = fields.comparisonModeToggle.checked ? "Speed difference" : "Estimated speed";
        fields.whatIfResultValue.textContent = "--";
        fields.whatIfStatusPill.hidden = false;
        fields.whatIfStatusPill.textContent = label;
        fields.whatIfStatusPill.className = className;
        fields.whatIfStatA.className = "mini-stat";
        fields.whatIfStatB.className = "mini-stat";
        fields.whatIfStatALabel.textContent = fields.comparisonModeToggle.checked ? "Setup A" : "Prop RPM";
        fields.whatIfStatAValue.textContent = "--";
        fields.whatIfStatBLabel.textContent = fields.comparisonModeToggle.checked ? "Setup B" : "Theoretical";
        fields.whatIfStatBValue.textContent = "--";
      }

      function calculateWhatIf() {
        const setupAValidation = validateFields(fields.setupAValidation, setupValidationConfigs("A"));
        if (!setupAValidation.isValid) {
          clearValidation(fields.setupBValidation, setupValidationConfigs("B"));
          setWhatIfWaiting(setupAValidation.hasMissing ? "Incomplete" : "Check setup", "status-pill warn");
          return;
        }

        const setupA = estimateSetup(
          setupAValidation.values.pitch,
          setupAValidation.values.gearRatio,
          setupAValidation.values.rpm,
          setupAValidation.values.slip
        );
        const unit = UNIT_SYSTEMS[activeUnitSystem].speedUnit;
        const label = UNIT_SYSTEMS[activeUnitSystem].speedLabel;

        if (!fields.comparisonModeToggle.checked) {
          clearValidation(fields.setupBValidation, setupValidationConfigs("B"));
          fields.whatIfMetricLabel.textContent = "Estimated speed";
          fields.whatIfResultValue.textContent = formatSpeed(setupA.estimatedMph, unit);
          fields.whatIfStatusPill.hidden = false;
          fields.whatIfStatusPill.textContent = "Setup A";
          fields.whatIfStatusPill.className = "status-pill";
          fields.whatIfStatA.className = "mini-stat";
          fields.whatIfStatB.className = "mini-stat";
          fields.whatIfStatALabel.textContent = "Prop RPM";
          fields.whatIfStatAValue.textContent = integerFormatter.format(setupA.propRpm);
          fields.whatIfStatBLabel.textContent = "Theoretical";
          fields.whatIfStatBValue.textContent = formatSpeed(setupA.theoreticalMph, unit);
          return;
        }

        const setupBValidation = validateFields(fields.setupBValidation, setupValidationConfigs("B"));
        if (!setupBValidation.isValid) {
          setWhatIfWaiting(setupBValidation.hasMissing ? "Incomplete" : "Check setup", "status-pill warn");
          return;
        }

        const setupB = estimateSetup(
          setupBValidation.values.pitch,
          setupBValidation.values.gearRatio,
          setupBValidation.values.rpm,
          setupBValidation.values.slip
        );
        const diff = speedFromMph(setupB.estimatedMph - setupA.estimatedMph, unit);

        fields.whatIfMetricLabel.textContent = "Speed difference";
        fields.whatIfStatusPill.hidden = true;
        fields.whatIfStatALabel.textContent = "Setup A";
        fields.whatIfStatAValue.textContent = formatSpeed(setupA.estimatedMph, unit);
        fields.whatIfStatBLabel.textContent = "Setup B";
        fields.whatIfStatBValue.textContent = formatSpeed(setupB.estimatedMph, unit);

        if (Math.abs(diff) < 0.05) {
          fields.whatIfResultValue.textContent = `0 ${label}`;
          fields.whatIfStatA.className = "mini-stat";
          fields.whatIfStatB.className = "mini-stat";
          return;
        }

        fields.whatIfResultValue.textContent = `${diffFormatter.format(diff)} ${label}`;

        if (diff > 0) {
          fields.whatIfStatA.className = "mini-stat warn";
          fields.whatIfStatB.className = "mini-stat good";
        } else {
          fields.whatIfStatA.className = "mini-stat good";
          fields.whatIfStatB.className = "mini-stat warn";
        }
      }

      function clearInputs() {
        fields.pitch.value = "";
        fields.gearRatio.value = "";
        fields.rpm.value = "";
        fields.speed.value = "";
        fields.speedUnit.value = UNIT_SYSTEMS[activeUnitSystem].speedUnit;
        calculate();
        fields.pitch.focus();
      }

      function resolveTheme(appearance) {
        if (appearance === "system") return systemScheme.matches ? "dark" : "light";
        return appearance;
      }

      function applyAppearance(appearance, persist = true) {
        const theme = resolveTheme(appearance);
        document.documentElement.dataset.appearance = appearance;
        document.documentElement.dataset.theme = theme;
        fields.themeColor.setAttribute("content", theme === "dark" ? "#000000" : "#f2f2f7");

        fields.appearanceButtons.forEach((button) => {
          button.setAttribute("aria-pressed", String(button.dataset.appearance === appearance));
        });

        if (!persist) return;

        try {
          localStorage.setItem(APPEARANCE_KEY, appearance);
        } catch (error) {
          return;
        }
      }

      function applyUnitSystem(unitSystem, convertValues = true, persist = true) {
        if (!UNIT_SYSTEMS[unitSystem]) return;

        const next = UNIT_SYSTEMS[unitSystem];
        const currentSpeed = toNumber(fields.speed);
        const speedMph = speedToMph(currentSpeed, fields.speedUnit.value);

        activeUnitSystem = unitSystem;
        fields.pitchUnitLabel.textContent = "in";
        fields.speedUnit.value = next.speedUnit;

        if (convertValues) {
          if (Number.isFinite(speedMph)) {
            fields.speed.value = formatInputValue(speedFromMph(speedMph, next.speedUnit));
          }
        }

        fields.unitSystemButtons.forEach((button) => {
          button.setAttribute("aria-pressed", String(button.dataset.unitSystem === unitSystem));
        });

        if (persist) {
          try {
            localStorage.setItem(UNIT_SYSTEM_KEY, unitSystem);
          } catch (error) {
            return;
          }
        }

        calculate();
        calculateWhatIf();
      }

      function openSheet(sheet) {
        if (typeof sheet.showModal === "function") {
          sheet.showModal();
          return;
        }

        sheet.setAttribute("open", "");
      }

      function closeSheet(sheet) {
        if (typeof sheet.close === "function") {
          sheet.close();
          return;
        }

        sheet.removeAttribute("open");
      }

      function switchSheet(fromSheet, toSheet) {
        closeSheet(fromSheet);
        openSheet(toSheet);
      }

      function switchView(viewId) {
        fields.viewSwitcherButtons.forEach((button) => {
          const isSelected = button.dataset.view === viewId;
          button.setAttribute("aria-selected", String(isSelected));
          button.tabIndex = isSelected ? 0 : -1;
        });

        Object.entries(fields.views).forEach(([id, view]) => {
          if (id === viewId) {
            view.removeAttribute("hidden");
          } else {
            view.setAttribute("hidden", "");
          }
        });
      }

      function switchViewByOffset(offset) {
        const buttons = Array.from(fields.viewSwitcherButtons);
        const activeIndex = buttons.findIndex((button) => button === document.activeElement);
        const selectedIndex = buttons.findIndex((button) => button.getAttribute("aria-selected") === "true");
        const currentIndex = activeIndex >= 0 ? activeIndex : Math.max(selectedIndex, 0);
        const nextIndex = (currentIndex + offset + buttons.length) % buttons.length;
        switchViewByIndex(nextIndex);
      }

      function switchViewByIndex(index) {
        const buttons = Array.from(fields.viewSwitcherButtons);
        const nextButton = buttons[index];
        switchView(nextButton.dataset.view);
        nextButton.focus();
      }

      function applyComparisonMode(enabled, persist = true) {
        fields.comparisonModeToggle.checked = enabled;
        fields.compareSetupB.hidden = !enabled;
        calculateWhatIf();

        if (persist) {
          try {
            localStorage.setItem(COMPARISON_MODE_KEY, enabled ? "on" : "off");
          } catch (error) {
            return;
          }
        }
      }

      fields.viewSwitcherButtons.forEach((button) => {
        button.addEventListener("click", () => switchView(button.dataset.view));
      });

      fields.calculatorSwitcher.addEventListener("keydown", (event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          switchViewByOffset(-1);
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          switchViewByOffset(1);
        } else if (event.key === "Home") {
          event.preventDefault();
          switchViewByIndex(0);
        } else if (event.key === "End") {
          event.preventDefault();
          switchViewByIndex(fields.viewSwitcherButtons.length - 1);
        }
      });

      fields.form.addEventListener("input", calculate);
      fields.form.addEventListener("change", calculate);
      fields.form.addEventListener("reset", () => {
        window.setTimeout(() => {
          fields.pitch.value = "";
          fields.gearRatio.value = "";
          fields.rpm.value = "";
          fields.speed.value = "";
          fields.speedUnit.value = UNIT_SYSTEMS[activeUnitSystem].speedUnit;
          calculate();
        }, 0);
      });
      fields.whatIfForm.addEventListener("input", calculateWhatIf);
      fields.whatIfForm.addEventListener("change", calculateWhatIf);
      fields.comparisonModeToggle.addEventListener("change", () => {
        applyComparisonMode(fields.comparisonModeToggle.checked);
      });
      fields.clearButton.addEventListener("click", clearInputs);
      fields.menuButton.addEventListener("click", () => openSheet(fields.menuSheet));

      fields.closeButtons.forEach((button) => {
        button.addEventListener("click", () => {
          closeSheet(document.querySelector(`#${button.dataset.close}`));
        });
      });

      fields.backButtons.forEach((button) => {
        button.addEventListener("click", () => {
          const currentSheet = button.closest("dialog");
          switchSheet(currentSheet, fields.menuSheet);
        });
      });

      fields.menuItems.forEach((button) => {
        button.addEventListener("click", () => {
          const targetSheet = document.querySelector(`#${button.dataset.openSheet}`);
          switchSheet(fields.menuSheet, targetSheet);
        });
      });

      [fields.menuSheet, fields.tutorialSheet, fields.aboutSheet, fields.privacySheet, fields.accessibilitySheet, fields.termsSheet, fields.contactSheet, fields.mobileAppsSheet, fields.settingsSheet].forEach((sheet) => {
        sheet.addEventListener("click", (event) => {
          if (event.target === sheet) closeSheet(sheet);
        });
      });

      fields.appearanceButtons.forEach((button) => {
        button.addEventListener("click", () => {
          applyAppearance(button.dataset.appearance);
        });
      });

      fields.unitSystemButtons.forEach((button) => {
        button.addEventListener("click", () => {
          applyUnitSystem(button.dataset.unitSystem);
        });
      });

      fields.speedUnit.addEventListener("change", () => {
        const nextUnitSystem = {
          mph: "imperial",
          kph: "metric",
          knots: "nautical"
        }[fields.speedUnit.value] || activeUnitSystem;

        fields.speedUnit.value = UNIT_SYSTEMS[activeUnitSystem].speedUnit;
        applyUnitSystem(nextUnitSystem);
      });

      const handleSystemSchemeChange = () => {
        if (document.documentElement.dataset.appearance === "system") {
          applyAppearance("system", false);
        }
      };

      if (typeof systemScheme.addEventListener === "function") {
        systemScheme.addEventListener("change", handleSystemSchemeChange);
      } else if (typeof systemScheme.addListener === "function") {
        systemScheme.addListener(handleSystemSchemeChange);
      }

      applyAppearance(getStoredAppearance(), false);
      applyUnitSystem(getStoredUnitSystem(), true, false);
      applyComparisonMode(getStoredComparisonMode(), false);
      calculateWhatIf();

