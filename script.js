document.addEventListener("DOMContentLoaded", () => {
  const yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  const simulatorForm = document.getElementById("simulator-form");
  const proposalForm = document.getElementById("proposal-form");
  const contactForm = document.getElementById("contact-form");

  const mainServiceEl = document.getElementById("mainService");
  const includeMAPEl = document.getElementById("includeMAP");
  const includeCoordenacaoEl = document.getElementById("includeCoordenacao");
  const includeSimulacroEl = document.getElementById("includeSimulacro");
  const areaEl = document.getElementById("area");
  const districtEl = document.getElementById("district");
  const utIndexEl = document.getElementById("utIndex");

  const resultEmpty = document.getElementById("resultEmpty");
  const resultContent = document.getElementById("resultContent");
  const resultItems = document.getElementById("resultItems");
  const resultTotal = document.getElementById("resultTotal");
  const resultDiscount = document.getElementById("resultDiscount");

  const proposalStatus = document.getElementById("proposalStatus");
  const contactStatus = document.getElementById("contactStatus");

  const formatCurrency = (value) =>
    new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR"
    }).format(value);

  const districtCosts = {
    "Viana do Castelo": 220,
  "Braga": 220,
  "Vila Real": 220,
  "Bragança": 220,
  "Porto": 220,
  "Aveiro": 180,
  "Viseu": 180,
  "Guarda": 180,
  "Coimbra": 180,
  "Castelo Branco": 180,
  "Leiria": 180,
  "Lisboa": 25,
  "Santarém": 40,
  "Setúbal": 40,
  "Portalegre": 120,
  "Évora": 120,
  "Beja": 120,
  "Faro": 180,
  };

  const utMultipliers = {
    0: 1.00,
    1: 1.10,
    2: 1.15,
    3: 1.20,
    4: 1.35,
    5: 1.30,
    6: 1.25,
    7: 1.20,
    8: 1.15,
    9: 1.10,
    10: 1.10,
    11: 1.30
  };

  function getAreaValue() {
    const area = parseFloat(areaEl.value);
    return isNaN(area) || area < 0 ? 0 : area;
  }

  function calculateMainServicePrice(service, area, utMultiplier) {
    if (!service || !area || !utMultiplier) return 0;

    if (service === "projeto") {
      let base = 0;

      if (area <= 250) {
        base = 250;
      } else if (area <= 500) {
        base = 350;
      } else if (area <= 1000) {
        base = 500;
      } else if (area <= 2500) {
        base = 750;
      } else {
        base = 750 + (area - 2500) * 0.12;
      }

      return base * utMultiplier;
    }

    if (service === "ficha") {
      let base = 0;

      if (area <= 250) {
        base = 120;
      } else if (area <= 500) {
        base = 160;
      } else if (area <= 1000) {
        base = 220;
      } else if (area <= 2500) {
        base = 300;
      } else {
        base = 300 + (area - 2500) * 0.05;
      }

      return base * utMultiplier;
    }

    return 0;
  }

  function calculateExtras(area) {
    const extras = [];

    if (includeMAPEl.checked) {
      let value = 180;
      if (area > 500 && area <= 1000) value = 240;
      else if (area > 1000 && area <= 2500) value = 320;
      else if (area > 2500) value = 450;

      extras.push({
        label: "Medidas de Autoproteção",
        value
      });
    }

    if (includeCoordenacaoEl.checked) {
      let value = 150;
      if (area > 500 && area <= 1000) value = 220;
      else if (area > 1000 && area <= 2500) value = 320;
      else if (area > 2500) value = 450;

      extras.push({
        label: "Coordenação de Segurança",
        value
      });
    }

    if (includeSimulacroEl.checked) {
      let value = 180;
      if (area > 500 && area <= 1000) value = 240;
      else if (area > 1000 && area <= 2500) value = 300;
      else if (area > 2500) value = 400;

      extras.push({
        label: "Simulacro",
        value
      });
    }

    return extras;
  }

  function renderResult(items, total, discountText = "") {
    resultItems.innerHTML = "";

    items.forEach((item) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <span>${item.label}</span>
        <strong>${formatCurrency(item.value)}</strong>
      `;
      resultItems.appendChild(li);
    });

    resultTotal.textContent = formatCurrency(total);

    if (discountText) {
      resultDiscount.textContent = discountText;
      resultDiscount.classList.remove("hidden");
    } else {
      resultDiscount.textContent = "";
      resultDiscount.classList.add("hidden");
    }

    resultEmpty.classList.add("hidden");
    resultContent.classList.remove("hidden");
  }

  function resetResult() {
    resultItems.innerHTML = "";
    resultTotal.textContent = formatCurrency(0);
    resultDiscount.textContent = "";
    resultDiscount.classList.add("hidden");
    resultContent.classList.add("hidden");
    resultEmpty.classList.remove("hidden");
  }

  function updateSimulator() {
    const mainService = mainServiceEl.value;
    const area = getAreaValue();
    const district = districtEl.value;
    const utIndex = utIndexEl.value;

    const hasAnyExtra =
      includeMAPEl.checked ||
      includeCoordenacaoEl.checked ||
      includeSimulacroEl.checked;

    if (!mainService && !hasAnyExtra) {
      resetResult();
      return;
    }

    const items = [];
    let total = 0;

    const utMultiplier =
      utIndex !== "" ? utMultipliers[Number(utIndex)] || 1 : 1;

    if (mainService) {
      const mainPrice = calculateMainServicePrice(mainService, area, utMultiplier);

      if (mainPrice > 0) {
        items.push({
          label: mainService === "projeto" ? "Projeto SCIE" : "Ficha de Segurança",
          value: Math.round(mainPrice * 100) / 100
        });

        total += mainPrice;
      }
    }

    const extras = calculateExtras(area);
    extras.forEach((extra) => {
      items.push(extra);
      total += extra.value;
    });

    if (district && districtCosts[district] !== undefined) {
      items.push({
        label: `Custos operacionais (${district})`,
        value: districtCosts[district]
      });

      total += districtCosts[district];
    }

    let discountText = "";
    const selectedServicesCount =
      (mainService ? 1 : 0) +
      (includeMAPEl.checked ? 1 : 0) +
      (includeCoordenacaoEl.checked ? 1 : 0) +
      (includeSimulacroEl.checked ? 1 : 0);

    if (selectedServicesCount >= 3) {
      const discountValue = total * 0.08;
      total -= discountValue;
      discountText = `Desconto de pacote aplicado: ${formatCurrency(discountValue)}`;
    }

    total = Math.round(total * 100) / 100;

    if (items.length === 0) {
      resetResult();
      return;
    }

    renderResult(items, total, discountText);
  }

  if (simulatorForm) {
    simulatorForm.addEventListener("input", updateSimulator);
    simulatorForm.addEventListener("change", updateSimulator);
  }

  if (proposalForm) {
    proposalForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const nome = document.getElementById("nome")?.value?.trim() || "";
      const empresa = document.getElementById("empresa")?.value?.trim() || "";
      const email = document.getElementById("email")?.value?.trim() || "";
      const telefone = document.getElementById("telefone")?.value?.trim() || "";
      const tipoEdificio = document.getElementById("tipoEdificio")?.value?.trim() || "";
      const mensagem = document.getElementById("mensagem")?.value?.trim() || "";

      const mainService = mainServiceEl.value;
      const area = areaEl.value;
      const district = districtEl.value;
      const utText = utIndexEl.options[utIndexEl.selectedIndex]?.text || "";

      const extras = [];
      if (includeMAPEl.checked) extras.push("Medidas de Autoproteção");
      if (includeCoordenacaoEl.checked) extras.push("Coordenação de Segurança");
      if (includeSimulacroEl.checked) extras.push("Simulacro");

      const bodyLines = [
        "Novo pedido de orçamento detalhado",
        "",
        `Nome: ${nome}`,
        `Empresa: ${empresa}`,
        `Email: ${email}`,
        `Telefone: ${telefone}`,
        `Tipo de edifício: ${tipoEdificio}`,
        "",
        "Dados do simulador:",
        `Serviço principal: ${mainService || "Não selecionado"}`,
        `Extras: ${extras.length ? extras.join(", ") : "Nenhum"}`,
        `Área: ${area || "Não indicada"} m²`,
        `Distrito: ${district || "Não indicado"}`,
        `Utilização-Tipo: ${utText || "Não indicada"}`,
        "",
        `Mensagem adicional: ${mensagem || "Sem mensagem adicional"}`
      ];

      const subject = encodeURIComponent("Pedido de orçamento - Lisprotec");
      const body = encodeURIComponent(bodyLines.join("\n"));

      window.location.href = `mailto:lisprotec@outlook.com?subject=${subject}&body=${body}`;

      proposalStatus.textContent = "O seu cliente de email foi aberto para enviar o pedido.";
    });
  }

  if (contactForm) {
    contactForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const name = document.getElementById("contactName")?.value?.trim() || "";
      const email = document.getElementById("contactEmail")?.value?.trim() || "";
      const phone = document.getElementById("contactPhone")?.value?.trim() || "";
      const message = document.getElementById("contactMessage")?.value?.trim() || "";

      const subject = encodeURIComponent("Contacto através do site - Lisprotec");
      const body = encodeURIComponent(
        [
          "Nova mensagem enviada através do site",
          "",
          `Nome: ${name}`,
          `Email: ${email}`,
          `Telefone: ${phone}`,
          "",
          "Mensagem:",
          message
        ].join("\n")
      );

      window.location.href = `mailto:lisprotec@outlook.com?subject=${subject}&body=${body}`;

      contactStatus.textContent = "O seu cliente de email foi aberto para enviar a mensagem.";
    });
  }

  updateSimulator();
});
