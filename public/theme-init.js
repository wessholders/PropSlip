      (() => {
        const key = "prop-slip-appearance";
        let stored = "system";
        try {
          stored = localStorage.getItem(key) || "system";
        } catch (error) {
          stored = "system";
        }
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        const theme = stored === "system" ? (prefersDark ? "dark" : "light") : stored;
        document.documentElement.dataset.appearance = stored;
        document.documentElement.dataset.theme = theme;
      })();

