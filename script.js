const UT_OPTIONS = [
  { label: "UT I – Habitacional", factor: 1 },
  { label: "UT II – Estacionamento", factor: 1.3 },
  { label: "UT III – Administrativo", factor: 1 },
  { label: "UT IV – Escolar", factor: 1.3 },
  { label: "UT V – Hospitalar / Lares", factor: 1.8 },
  { label: "UT VI – Espetáculos e reuniões públicas", factor: 1.3 },
  { label: "UT VII – Hoteleiro / Restauração", factor: 1.3 },
  { label: "UT VIII – Comercial / Gares de transporte", factor: 1 },
  { label: "UT IX – Desportivo / Lazer", factor: 1.3 },
  { label: "UT X – Museus e galerias", factor: 1 },
  { label: "UT XI – Bibliotecas e arquivos", factor: 1 },
  { label: "UT XII – Industrial / Oficinas / Armazéns", factor: 1.8 },
];

const DISTRICT_SURCHARGES = {
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

const euro = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
});

const byId = (id) => document.getElementById(id);

function getProgressiveDiscountRate(area) {
  if (area <= 750) return 0;
  if (area >= 2500) return 0.6;
  return ((area - 750) / (2500 - 750)) * 0.6;
}

function getDiscountedM2Rate(baseRate, area) {
  return baseRate * (1 - getProgressiveDiscountRate(area));
}

function getDistrictSurcharge(district) {
  return DISTRICT_SURCHARGES[district] || 0;
}

function getSimulacroBasePrice(area) {
  if (area <= 0) return 0;
  if (area <= 900) return 280;
  if (area >= 5000) return 1450;
  return Math.round(280 + ((area - 900) / (5000 - 900)) * (1450 - 280));
}

function getSimulacroDiscountRate(area) {
  if (area <= 2500) return 0;
  if (area >= 5000) return 0.6;
  return ((area - 2500) / (5000 - 2500)) * 0.6;
}

function calculateEstimate() {
  const mainService = byId("mainService")?.value || "";
  const includeMAP = byId("includeMAP")?.checked || false;
  const includeCoordenacao = byId("includeCoordenacao")?.checked || false;
  const includeSimulacro = byId("includeSimulacro")?.checked || false;
  const areaNum = parseFloat(byId("area")?.value || "0") || 0;
  const district = byId("district")?.value || "";
  const utIndexValue = byId("utIndex")?.value;
  const ut = utIndexValue === "" ? null : UT_OPTIONS[Number(utIndexValue)];

  const hasAnyService = mainService !== "" || includeMAP || includeCoordenacao || includeSimulacro;
  const needsUT = mainService !== "" || includeMAP;

  function calcAreaBasedPrice(baseRate, minPrice, useUTFactor = true) {
    if (areaNum <= 0) return { total: 0, discount: 0 };

    const effectiveRate = getDiscountedM2Rate(baseRate, areaNum);
    const multiplier = useUTFactor && ut ? ut.factor : 1;
    const gross = areaNum * baseRate * multiplier;
    const discounted = areaNum * effectiveRate * multiplier;
    const total = Math.max(discounted, minPrice);

    return {
      total,
      discount: Math.max(0, gross - total),
    };
  }

  function calcMainPrice() {
    if (!mainService || areaNum <= 0 || !ut) return { total: 0, discount: 0 };

    const minPrice = mainService === "projeto" ? 450 : 250;
    const baseRate = mainService === "projeto" ? 1.0 : 0.8;

    return calcAreaBasedPrice(baseRate, minPrice, true);
  }

  function calcMAPPrice() {
  if (!includeMAP || areaNum <= 0 || !ut) return { total: 0, discount: 0 };
  return calcAreaBasedPrice(0.6, 350, true);
}

  function calcCoordenacaoPrice() {
    if (!includeCoordenacao || areaNum <= 0) return { total: 0, discount: 0 };

    if (areaNum <= 7500) {
      return { total: 230, discount: 0 };
    }

    return {
      total: 230 + ((areaNum - 7500) * 0.15),
      discount: 0,
    };
  }

  function calcSimulacroPrice() {
    if (!includeSimulacro || areaNum <= 0) {
      return { total: 0, discount: 0, hasDiscount: false };
    }

    const basePrice = getSimulacroBasePrice(areaNum);
    const discountRate = getSimulacroDiscountRate(areaNum);
    const total = basePrice * (1 - discountRate);
    const discount = basePrice - total;

    return {
      total,
      discount,
      hasDiscount: discountRate > 0,
    };
  }

  const mainCalc = calcMainPrice();
  const mapCalc = calcMAPPrice();
  const coordenacaoCalc = calcCoordenacaoPrice();
  const simulacroCalc = calcSimulacroPrice();

  const districtSurcharge = getDistrictSurcharge(district);

  const mainPrice = mainCalc.total;
  const mapPrice = mapCalc.total;
  const coordenacaoPrice = coordenacaoCalc.total;
  const simulacroPrice = simulacroCalc.total;

  const totalDiscount =
    mainCalc.discount +
    mapCalc.discount +
    simulacroCalc.discount;

  const totalPrice =
    mainPrice +
    mapPrice +
    coordenacaoPrice +
    simulacroPrice +
    districtSurcharge;

  const canShow =
    hasAnyService &&
    areaNum > 0 &&
    district !== "" &&
    (!needsUT || ut !== null);

  return {
    canShow,
    areaNum,
    district,
    ut,
  
     items: [
  mainPrice > 0
    ? [mainService === "projeto" ? "Projeto SCIE" : "Ficha de Segurança", mainPrice]
    : null,
  mapPrice > 0 ? ["Medidas de Autoproteção", mapPrice] : null,
  coordenacaoPrice > 0 ? ["Coordenação de Segurança — Valor mensal", coordenacaoPrice] : null,
  simulacroPrice > 0 ? ["Simulacro", simulacroPrice] : null,
  districtSurcharge > 0 ? ["Custos operacionais", districtSurcharge] : null,
].filter(Boolean),
    totalPrice,
    totalDiscount,
    showDiscountMessage: totalDiscount > 0,
    services: [
      mainService === "projeto" ? "Projeto SCIE" : "",
      mainService === "ficha" ? "Ficha de Segurança" : "",
      includeMAP ? "Medidas de Autoproteção" : "",
      includeCoordenacao ? "Coordenação de Segurança (valor mensal)" : "",
      includeSimulacro ? "Simulacro" : "",
    ].filter(Boolean),
  };
}

function renderEstimate() {
  const result = calculateEstimate();
  const empty = byId("resultEmpty");
  const content = byId("resultContent");
  const list = byId("resultItems");
  const total = byId("resultTotal");
  const discount = byId("resultDiscount");

  if (!empty || !content || !list || !total || !discount) return;

  if (!result.canShow) {
    empty.classList.remove("hidden");
    content.classList.add("hidden");
    list.innerHTML = "";
    total.textContent = euro.format(0);
    discount.textContent = "";
    discount.classList.add("hidden");
    return;
  }

  empty.classList.add("hidden");
  content.classList.remove("hidden");

  list.innerHTML = result.items
    .map(([label, price]) => `<li><span>${label}</span><strong>${euro.format(price)}</strong></li>`)
    .join("");

  total.textContent = euro.format(result.totalPrice);

  if (result.showDiscountMessage) {
    discount.textContent = `Desconto aplicado: ${euro.format(result.totalDiscount)}`;
    discount.classList.remove("hidden");
  } else {
    discount.textContent = "";
    discount.classList.add("hidden");
  }
}

const FORMSPREE_ENDPOINT = "https://formspree.io/f/mreyeqdq";

function setStatus(elementId, message, type = "") {
  const el = byId(elementId);
  if (!el) return;
  el.textContent = message;
  el.className = `form-status${type ? ` ${type}` : ""}`;
}

async function submitToFormspree(payload) {
  const response = await fetch(FORMSPREE_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorMessage = "Não foi possível enviar o formulário. Tente novamente.";
    try {
      const data = await response.json();
      if (data?.errors?.length) {
        errorMessage = data.errors.map((item) => item.message).join(" ");
      }
    } catch (error) {
      // ignore parsing errors and keep generic message
    }
    throw new Error(errorMessage);
  }

  return response.json().catch(() => ({}));
}

async function openProposalEmail(event) {
  event.preventDefault();
  const result = calculateEstimate();

  if (!result.canShow) {
    setStatus("proposalStatus", "Preencha primeiro o simulador para gerar uma proposta detalhada.", "error");
    return;
  }

  const nome = byId("nome")?.value?.trim();
  const empresa = byId("empresa")?.value?.trim();
  const email = byId("email")?.value?.trim();
  const telefone = byId("telefone")?.value?.trim();
  const tipoEdificio = byId("tipoEdificio")?.value?.trim();
  const mensagem = byId("mensagem")?.value?.trim() || "(sem mensagem adicional)";
  const area = byId("area")?.value?.trim();

  if (!nome || !empresa || !email || !telefone || !tipoEdificio) {
    setStatus("proposalStatus", "Preencha todos os campos obrigatórios do pedido de proposta.", "error");
    return;
  }

  const form = byId("proposal-form");
  const submitButton = form?.querySelector('button[type="submit"]');
  submitButton && (submitButton.disabled = true);
  setStatus("proposalStatus", "A enviar pedido de orçamento...", "");

  try {
    await submitToFormspree({
      formType: "Pedido de orçamento",
      _subject: `Pedido de Proposta – ${result.services.join(" + ")}`,
      nome,
      empresa,
      email,
      telefone,
      tipoEdificio,
      area: `${area} m²`,
      distrito: result.district || "N/A",
      utilizacaoTipo: result.ut ? result.ut.label : "N/A",
      duracaoCoordenacao: byId("includeCoordenacao")?.checked ? "Valor mensal" : "N/A",
      servicos: result.services.join(", "),
      estimativa: result.items.map(([label, price]) => `${label}: ${euro.format(price)}`).join(" | "),
      valorTotal: euro.format(result.totalPrice),
      mensagem,
    });

    form?.reset();

    ["mainService", "area", "utIndex", "district"].forEach((id) => {
      if (byId(id)) byId(id).value = "";
    });

    ["includeMAP", "includeCoordenacao", "includeSimulacro"].forEach((id) => {
      if (byId(id)) byId(id).checked = false;
    });

    renderEstimate();
    setStatus("proposalStatus", "Pedido enviado com sucesso. Entraremos em contacto em breve.", "success");
  } catch (error) {
    setStatus("proposalStatus", error.message || "Não foi possível enviar o formulário.", "error");
  } finally {
    submitButton && (submitButton.disabled = false);
  }
}

async function openContactEmail(event) {
  event.preventDefault();
  const name = byId("contactName")?.value?.trim();
  const email = byId("contactEmail")?.value?.trim();
  const phone = byId("contactPhone")?.value?.trim() || "";
  const message = byId("contactMessage")?.value?.trim();

  if (!name || !email || !message) {
    setStatus("contactStatus", "Preencha nome, email e mensagem.", "error");
    return;
  }

  const form = byId("contact-form");
  const submitButton = form?.querySelector('button[type="submit"]');
  submitButton && (submitButton.disabled = true);
  setStatus("contactStatus", "A enviar mensagem...", "");

  try {
    await submitToFormspree({
      formType: "Contacto geral",
      _subject: `Pedido de contacto — ${name}`,
      nome: name,
      email,
      telefone: phone || "N/A",
      mensagem: message,
    });
    form?.reset();
    setStatus("contactStatus", "Mensagem enviada com sucesso.", "success");
  } catch (error) {
    setStatus("contactStatus", error.message || "Não foi possível enviar a mensagem.", "error");
  } finally {
    submitButton && (submitButton.disabled = false);
  }
}

function init() {
  byId("year") && (byId("year").textContent = new Date().getFullYear());

  [
    "mainService",
    "includeMAP",
    "includeCoordenacao",
    "includeSimulacro",
    "area",
    "utIndex",
    "district"
  ].forEach((id) => {
    const el = byId(id);
    el && el.addEventListener("input", renderEstimate);
    el && el.addEventListener("change", renderEstimate);
  });

  byId("proposal-form")?.addEventListener("submit", openProposalEmail);
  byId("contact-form")?.addEventListener("submit", openContactEmail);
  renderEstimate();
  initSCIECalculator();
  initFireloadCalculator();
}

document.addEventListener("DOMContentLoaded", init);
/* ===== CALCULADORA SCIE ===== */

const SCIE_FIELDS = {
  I: [
    { id: "altura", label: "Altura da utilização-tipo (m)", type: "number", min: 0, step: "0.01" },
    { id: "pisosAbaixo", label: "N.º de pisos abaixo do plano de referência", type: "number", min: 0, step: "1" }
  ],
  II: [
    { id: "espaco", label: "Tipo de espaço", type: "select", options: [["edificio", "Espaço coberto e fechado"], ["arlivre", "Ao ar livre"]] },
    { id: "altura", label: "Altura da utilização-tipo (m)", type: "number", min: 0, step: "0.01" },
    { id: "areaBruta", label: "Área bruta da utilização-tipo (m²)", type: "number", min: 0, step: "0.01" },
    { id: "pisosAbaixo", label: "N.º de pisos abaixo do plano de referência", type: "number", min: 0, step: "1" }
  ],
  III: [
    { id: "altura", label: "Altura da utilização-tipo (m)", type: "number", min: 0, step: "0.01" },
    { id: "efetivo", label: "Efetivo", type: "number", min: 0, step: "1" }
  ],
  IV: [
    { id: "altura", label: "Altura da utilização-tipo (m)", type: "number", min: 0, step: "0.01" },
    { id: "efetivo", label: "Efetivo", type: "number", min: 0, step: "1" },
    { id: "efetivoRisco", label: "Efetivo em locais de risco D ou E", type: "number", min: 0, step: "1" },
    { id: "saidaIndependente", label: "Locais de risco D/E com saídas independentes diretas ao exterior", type: "select", options: [["sim", "Sim"], ["nao", "Não"]] },
    { id: "semLocaisDE", label: "Não existem locais de risco D ou E?", type: "select", options: [["nao", "Não"], ["sim", "Sim"]] }
  ],
  V: [
    { id: "altura", label: "Altura da utilização-tipo (m)", type: "number", min: 0, step: "0.01" },
    { id: "efetivo", label: "Efetivo", type: "number", min: 0, step: "1" },
    { id: "efetivoRisco", label: "Efetivo em locais de risco D", type: "number", min: 0, step: "1" },
    { id: "saidaIndependente", label: "Locais de risco D com saídas independentes diretas ao exterior", type: "select", options: [["sim", "Sim"], ["nao", "Não"]] }
  ],
  VI: [
    { id: "espaco", label: "Tipo de espaço", type: "select", options: [["edificio", "Integrado em edifício / recinto coberto"], ["arlivre", "Ao ar livre"]] },
    { id: "altura", label: "Altura da utilização-tipo (m)", type: "number", min: 0, step: "0.01" },
    { id: "pisosAbaixo", label: "N.º de pisos abaixo do plano de referência", type: "number", min: 0, step: "1" },
    { id: "efetivo", label: "Efetivo", type: "number", min: 0, step: "1" }
  ],
  VII: [
    { id: "altura", label: "Altura da utilização-tipo (m)", type: "number", min: 0, step: "0.01" },
    { id: "efetivo", label: "Efetivo", type: "number", min: 0, step: "1" },
    { id: "efetivoRisco", label: "Efetivo em locais de risco E", type: "number", min: 0, step: "1" },
    { id: "saidaIndependente", label: "Locais de risco E com saídas independentes diretas ao exterior", type: "select", options: [["sim", "Sim"], ["nao", "Não"]] }
  ],
  VIII: [
    { id: "altura", label: "Altura da utilização-tipo (m)", type: "number", min: 0, step: "0.01" },
    { id: "pisosAbaixo", label: "N.º de pisos abaixo do plano de referência", type: "number", min: 0, step: "1" },
    { id: "efetivo", label: "Efetivo", type: "number", min: 0, step: "1" }
  ],
  IX: [
    { id: "espaco", label: "Tipo de espaço", type: "select", options: [["edificio", "Integrado em edifício / recinto coberto"], ["arlivre", "Ao ar livre"]] },
    { id: "altura", label: "Altura da utilização-tipo (m)", type: "number", min: 0, step: "0.01" },
    { id: "pisosAbaixo", label: "N.º de pisos abaixo do plano de referência", type: "number", min: 0, step: "1" },
    { id: "efetivo", label: "Efetivo", type: "number", min: 0, step: "1" }
  ],
  X: [
    { id: "altura", label: "Altura da utilização-tipo (m)", type: "number", min: 0, step: "0.01" },
    { id: "efetivo", label: "Efetivo", type: "number", min: 0, step: "1" }
  ],
  XI: [
    { id: "altura", label: "Altura da utilização-tipo (m)", type: "number", min: 0, step: "0.01" },
    { id: "pisosAbaixo", label: "N.º de pisos abaixo do plano de referência", type: "number", min: 0, step: "1" },
    { id: "efetivo", label: "Efetivo", type: "number", min: 0, step: "1" },
    { id: "carga", label: "Densidade de carga de incêndio modificada (MJ/m²)", type: "number", min: 0, step: "0.01" }
  ],
  XII: [
    { id: "espaco", label: "Tipo de espaço", type: "select", options: [["edificio", "Espaço coberto e fechado"], ["arlivre", "Ao ar livre"]] },
    { id: "pisosAbaixo", label: "N.º de pisos abaixo do plano de referência", type: "number", min: 0, step: "1" },
    { id: "carga", label: "Densidade de carga de incêndio modificada (MJ/m²)", type: "number", min: 0, step: "0.01" },
    { id: "soArmazem", label: "Destina-se exclusivamente a armazém?", type: "select", options: [["nao", "Não"], ["sim", "Sim"]] }
  ]
};

const SCIE_UT_LABELS = {
  I: "UT I – Habitacional",
  II: "UT II – Estacionamentos",
  III: "UT III – Administrativos",
  IV: "UT IV – Escolares",
  V: "UT V – Hospitalares e Lares",
  VI: "UT VI – Espetáculos e reuniões públicas",
  VII: "UT VII – Hoteleiros e restauração",
  VIII: "UT VIII – Comerciais e gares de transporte",
  IX: "UT IX – Desportivos e de lazer",
  X: "UT X – Museus e galerias",
  XI: "UT XI – Bibliotecas e arquivos",
  XII: "UT XII – Industrial / Oficinas / Armazéns"
};

function scieById(id) {
  return document.getElementById(id);
}

function scieCriteriaLine(label, ok, detail = "") {
  return { label, ok, detail };
}

function highestPassingCategory(checks) {
  for (const check of checks) {
    if (check.pass) return check;
  }
  return checks[checks.length - 1];
}

function renderSCIEFields() {
  const ut = scieById("scie-ut")?.value || "";
  const wrap = scieById("scie-fields");
  if (!wrap) return;

  wrap.innerHTML = "";
  if (!ut || !SCIE_FIELDS[ut]) return;

  const grid = document.createElement("div");
  grid.className = "risk-inline-grid";

  SCIE_FIELDS[ut].forEach((field) => {
    const group = document.createElement("div");
    group.className = "field-group";

    const label = document.createElement("label");
    label.setAttribute("for", `scie-${field.id}`);
    label.textContent = field.label;

    let control;

    if (field.type === "select") {
      control = document.createElement("select");
      field.options.forEach(([value, text]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = text;
        control.appendChild(option);
      });
    } else {
      control = document.createElement("input");
      control.type = field.type;
      control.min = field.min ?? "0";
      control.step = field.step ?? "1";
    }

    control.id = `scie-${field.id}`;
    group.appendChild(label);
    group.appendChild(control);
    grid.appendChild(group);
  });

  wrap.appendChild(grid);
}

function readSCIEData() {
  const ut = scieById("scie-ut")?.value || "";
  const data = { ut };

  (SCIE_FIELDS[ut] || []).forEach((field) => {
    const el = scieById(`scie-${field.id}`);
    if (!el) return;
    data[field.id] = el.tagName === "SELECT" ? el.value : (el.value === "" ? null : Number(el.value));
  });

  return data;
}

function validateSCIEData(data) {
  if (!data.ut) return "Selecione a utilização-tipo.";

  for (const field of (SCIE_FIELDS[data.ut] || [])) {
    const value = data[field.id];
    if (value === null || value === "") {
      return `Preencha o campo: ${field.label}`;
    }
  }

  return "";
}

function evalUTI(d) {
  return highestPassingCategory([
    {
      category: 1,
      pass: d.altura <= 9 && d.pisosAbaixo <= 1,
      criteria: [
        scieCriteriaLine("Altura ≤ 9 m", d.altura <= 9, `${d.altura} m`),
        scieCriteriaLine("Pisos abaixo do plano de referência ≤ 1", d.pisosAbaixo <= 1, `${d.pisosAbaixo}`)
      ]
    },
    {
      category: 2,
      pass: d.altura <= 28 && d.pisosAbaixo <= 3,
      criteria: [
        scieCriteriaLine("Altura ≤ 28 m", d.altura <= 28, `${d.altura} m`),
        scieCriteriaLine("Pisos abaixo do plano de referência ≤ 3", d.pisosAbaixo <= 3, `${d.pisosAbaixo}`)
      ]
    },
    {
      category: 3,
      pass: d.altura <= 50 && d.pisosAbaixo <= 5,
      criteria: [
        scieCriteriaLine("Altura ≤ 50 m", d.altura <= 50, `${d.altura} m`),
        scieCriteriaLine("Pisos abaixo do plano de referência ≤ 5", d.pisosAbaixo <= 5, `${d.pisosAbaixo}`)
      ]
    },
    {
      category: 4,
      pass: true,
      criteria: [scieCriteriaLine("Excede os limites da 3.ª categoria", true)]
    }
  ]);
}

function evalUTII(d) {
  if (d.espaco === "arlivre") {
    return {
      category: 1,
      pass: true,
      criteria: [scieCriteriaLine("Estacionamento ao ar livre", true, "Enquadramento direto na 1.ª categoria")]
    };
  }

  return highestPassingCategory([
    {
      category: 1,
      pass: d.altura <= 9 && d.areaBruta <= 3200 && d.pisosAbaixo <= 1,
      criteria: [
        scieCriteriaLine("Altura ≤ 9 m", d.altura <= 9, `${d.altura} m`),
        scieCriteriaLine("Área bruta ≤ 3 200 m²", d.areaBruta <= 3200, `${d.areaBruta} m²`),
        scieCriteriaLine("Pisos abaixo do plano de referência ≤ 1", d.pisosAbaixo <= 1, `${d.pisosAbaixo}`)
      ]
    },
    {
      category: 2,
      pass: d.altura <= 28 && d.areaBruta <= 9600 && d.pisosAbaixo <= 3,
      criteria: [
        scieCriteriaLine("Altura ≤ 28 m", d.altura <= 28, `${d.altura} m`),
        scieCriteriaLine("Área bruta ≤ 9 600 m²", d.areaBruta <= 9600, `${d.areaBruta} m²`),
        scieCriteriaLine("Pisos abaixo do plano de referência ≤ 3", d.pisosAbaixo <= 3, `${d.pisosAbaixo}`)
      ]
    },
    {
      category: 3,
      pass: d.altura <= 28 && d.areaBruta <= 32000 && d.pisosAbaixo <= 5,
      criteria: [
        scieCriteriaLine("Altura ≤ 28 m", d.altura <= 28, `${d.altura} m`),
        scieCriteriaLine("Área bruta ≤ 32 000 m²", d.areaBruta <= 32000, `${d.areaBruta} m²`),
        scieCriteriaLine("Pisos abaixo do plano de referência ≤ 5", d.pisosAbaixo <= 5, `${d.pisosAbaixo}`)
      ]
    },
    {
      category: 4,
      pass: true,
      criteria: [scieCriteriaLine("Excede os limites da 3.ª categoria", true)]
    }
  ]);
}

function evalUTIII(d) {
  return highestPassingCategory([
    {
      category: 1,
      pass: d.altura <= 9 && d.efetivo <= 100,
      criteria: [
        scieCriteriaLine("Altura ≤ 9 m", d.altura <= 9, `${d.altura} m`),
        scieCriteriaLine("Efetivo ≤ 100", d.efetivo <= 100, `${d.efetivo}`)
      ]
    },
    {
      category: 2,
      pass: d.altura <= 28 && d.efetivo <= 1000,
      criteria: [
        scieCriteriaLine("Altura ≤ 28 m", d.altura <= 28, `${d.altura} m`),
        scieCriteriaLine("Efetivo ≤ 1 000", d.efetivo <= 1000, `${d.efetivo}`)
      ]
    },
    {
      category: 3,
      pass: d.altura <= 50 && d.efetivo <= 5000,
      criteria: [
        scieCriteriaLine("Altura ≤ 50 m", d.altura <= 50, `${d.altura} m`),
        scieCriteriaLine("Efetivo ≤ 5 000", d.efetivo <= 5000, `${d.efetivo}`)
      ]
    },
    {
      category: 4,
      pass: true,
      criteria: [scieCriteriaLine("Excede os limites da 3.ª categoria", true)]
    }
  ]);
}

function evalUTIVorV(d, isUTIV) {
  const semLocais = isUTIV && d.semLocaisDE === "sim";
  const lim2 = semLocais ? 750 : 500;
  const lim3 = semLocais ? 2250 : 1500;
  const labelRisco = isUTIV ? "D ou E" : "D";

  return highestPassingCategory([
    {
      category: 1,
      pass: d.altura <= 9 && d.efetivo <= 100 && d.efetivoRisco <= 25 && d.saidaIndependente === "sim",
      criteria: [
        scieCriteriaLine("Altura ≤ 9 m", d.altura <= 9, `${d.altura} m`),
        scieCriteriaLine("Efetivo ≤ 100", d.efetivo <= 100, `${d.efetivo}`),
        scieCriteriaLine(`Efetivo em locais de risco ${labelRisco} ≤ 25`, d.efetivoRisco <= 25, `${d.efetivoRisco}`),
        scieCriteriaLine("Saídas independentes diretas ao exterior", d.saidaIndependente === "sim", d.saidaIndependente === "sim" ? "Sim" : "Não")
      ]
    },
    {
      category: 2,
      pass: d.altura <= 9 && d.efetivo <= lim2 && d.efetivoRisco <= 100,
      criteria: [
        scieCriteriaLine("Altura ≤ 9 m", d.altura <= 9, `${d.altura} m`),
        scieCriteriaLine(`Efetivo ≤ ${lim2}`, d.efetivo <= lim2, `${d.efetivo}`),
        scieCriteriaLine(`Efetivo em locais de risco ${labelRisco} ≤ 100`, d.efetivoRisco <= 100, `${d.efetivoRisco}`),
        scieCriteriaLine("Majoração de 50% aplicada ao efetivo", semLocais, semLocais ? "Aplicada" : "Não aplicável")
      ]
    },
    {
      category: 3,
      pass: d.altura <= 28 && d.efetivo <= lim3 && d.efetivoRisco <= 400,
      criteria: [
        scieCriteriaLine("Altura ≤ 28 m", d.altura <= 28, `${d.altura} m`),
        scieCriteriaLine(`Efetivo ≤ ${lim3}`, d.efetivo <= lim3, `${d.efetivo}`),
        scieCriteriaLine(`Efetivo em locais de risco ${labelRisco} ≤ 400`, d.efetivoRisco <= 400, `${d.efetivoRisco}`),
        scieCriteriaLine("Majoração de 50% aplicada ao efetivo", semLocais, semLocais ? "Aplicada" : "Não aplicável")
      ]
    },
    {
      category: 4,
      pass: true,
      criteria: [scieCriteriaLine("Excede os limites da 3.ª categoria", true)]
    }
  ]);
}

function evalUTVIorIX(d, label) {
  if (d.espaco === "arlivre") {
    return highestPassingCategory([
      {
        category: 1,
        pass: d.efetivo <= 1000,
        criteria: [
          scieCriteriaLine(`${label} ao ar livre`, true),
          scieCriteriaLine("Efetivo ≤ 1 000", d.efetivo <= 1000, `${d.efetivo}`)
        ]
      },
      {
        category: 2,
        pass: d.efetivo <= 15000,
        criteria: [
          scieCriteriaLine(`${label} ao ar livre`, true),
          scieCriteriaLine("Efetivo ≤ 15 000", d.efetivo <= 15000, `${d.efetivo}`)
        ]
      },
      {
        category: 3,
        pass: d.efetivo <= 40000,
        criteria: [
          scieCriteriaLine(`${label} ao ar livre`, true),
          scieCriteriaLine("Efetivo ≤ 40 000", d.efetivo <= 40000, `${d.efetivo}`)
        ]
      },
      {
        category: 4,
        pass: true,
        criteria: [scieCriteriaLine("Excede os limites da 3.ª categoria", true)]
      }
    ]);
  }

  return highestPassingCategory([
    {
      category: 1,
      pass: d.altura <= 9 && d.pisosAbaixo === 0 && d.efetivo <= 100,
      criteria: [
        scieCriteriaLine("Altura ≤ 9 m", d.altura <= 9, `${d.altura} m`),
        scieCriteriaLine("Pisos abaixo do plano de referência = 0", d.pisosAbaixo === 0, `${d.pisosAbaixo}`),
        scieCriteriaLine("Efetivo ≤ 100", d.efetivo <= 100, `${d.efetivo}`)
      ]
    },
    {
      category: 2,
      pass: d.altura <= 28 && d.pisosAbaixo <= 1 && d.efetivo <= 1000,
      criteria: [
        scieCriteriaLine("Altura ≤ 28 m", d.altura <= 28, `${d.altura} m`),
        scieCriteriaLine("Pisos abaixo do plano de referência ≤ 1", d.pisosAbaixo <= 1, `${d.pisosAbaixo}`),
        scieCriteriaLine("Efetivo ≤ 1 000", d.efetivo <= 1000, `${d.efetivo}`)
      ]
    },
    {
      category: 3,
      pass: d.altura <= 28 && d.pisosAbaixo <= 2 && d.efetivo <= 5000,
      criteria: [
        scieCriteriaLine("Altura ≤ 28 m", d.altura <= 28, `${d.altura} m`),
        scieCriteriaLine("Pisos abaixo do plano de referência ≤ 2", d.pisosAbaixo <= 2, `${d.pisosAbaixo}`),
        scieCriteriaLine("Efetivo ≤ 5 000", d.efetivo <= 5000, `${d.efetivo}`)
      ]
    },
    {
      category: 4,
      pass: true,
      criteria: [scieCriteriaLine("Excede os limites da 3.ª categoria", true)]
    }
  ]);
}

function evalUTVII(d) {
  return highestPassingCategory([
    {
      category: 1,
      pass: d.altura <= 9 && d.efetivo <= 100 && d.efetivoRisco <= 50 && d.saidaIndependente === "sim",
      criteria: [
        scieCriteriaLine("Altura ≤ 9 m", d.altura <= 9, `${d.altura} m`),
        scieCriteriaLine("Efetivo ≤ 100", d.efetivo <= 100, `${d.efetivo}`),
        scieCriteriaLine("Efetivo em locais de risco E ≤ 50", d.efetivoRisco <= 50, `${d.efetivoRisco}`),
        scieCriteriaLine("Saídas independentes diretas ao exterior", d.saidaIndependente === "sim", d.saidaIndependente === "sim" ? "Sim" : "Não")
      ]
    },
    {
      category: 2,
      pass: d.altura <= 28 && d.efetivo <= 500 && d.efetivoRisco <= 200,
      criteria: [
        scieCriteriaLine("Altura ≤ 28 m", d.altura <= 28, `${d.altura} m`),
        scieCriteriaLine("Efetivo ≤ 500", d.efetivo <= 500, `${d.efetivo}`),
        scieCriteriaLine("Efetivo em locais de risco E ≤ 200", d.efetivoRisco <= 200, `${d.efetivoRisco}`)
      ]
    },
    {
      category: 3,
      pass: d.altura <= 28 && d.efetivo <= 1500 && d.efetivoRisco <= 800,
      criteria: [
        scieCriteriaLine("Altura ≤ 28 m", d.altura <= 28, `${d.altura} m`),
        scieCriteriaLine("Efetivo ≤ 1 500", d.efetivo <= 1500, `${d.efetivo}`),
        scieCriteriaLine("Efetivo em locais de risco E ≤ 800", d.efetivoRisco <= 800, `${d.efetivoRisco}`)
      ]
    },
    {
      category: 4,
      pass: true,
      criteria: [scieCriteriaLine("Excede os limites da 3.ª categoria", true)]
    }
  ]);
}

function evalUTVIII(d) {
  return highestPassingCategory([
    {
      category: 1,
      pass: d.altura <= 9 && d.pisosAbaixo === 0 && d.efetivo <= 100,
      criteria: [
        scieCriteriaLine("Altura ≤ 9 m", d.altura <= 9, `${d.altura} m`),
        scieCriteriaLine("Pisos abaixo do plano de referência = 0", d.pisosAbaixo === 0, `${d.pisosAbaixo}`),
        scieCriteriaLine("Efetivo ≤ 100", d.efetivo <= 100, `${d.efetivo}`)
      ]
    },
    {
      category: 2,
      pass: d.altura <= 28 && d.pisosAbaixo <= 1 && d.efetivo <= 1000,
      criteria: [
        scieCriteriaLine("Altura ≤ 28 m", d.altura <= 28, `${d.altura} m`),
        scieCriteriaLine("Pisos abaixo do plano de referência ≤ 1", d.pisosAbaixo <= 1, `${d.pisosAbaixo}`),
        scieCriteriaLine("Efetivo ≤ 1 000", d.efetivo <= 1000, `${d.efetivo}`)
      ]
    },
    {
      category: 3,
      pass: d.altura <= 28 && d.pisosAbaixo <= 2 && d.efetivo <= 5000,
      criteria: [
        scieCriteriaLine("Altura ≤ 28 m", d.altura <= 28, `${d.altura} m`),
        scieCriteriaLine("Pisos abaixo do plano de referência ≤ 2", d.pisosAbaixo <= 2, `${d.pisosAbaixo}`),
        scieCriteriaLine("Efetivo ≤ 5 000", d.efetivo <= 5000, `${d.efetivo}`)
      ]
    },
    {
      category: 4,
      pass: true,
      criteria: [scieCriteriaLine("Excede os limites da 3.ª categoria", true)]
    }
  ]);
}

function evalUTX(d) {
  return highestPassingCategory([
    {
      category: 1,
      pass: d.altura <= 9 && d.efetivo <= 100,
      criteria: [
        scieCriteriaLine("Altura ≤ 9 m", d.altura <= 9, `${d.altura} m`),
        scieCriteriaLine("Efetivo ≤ 100", d.efetivo <= 100, `${d.efetivo}`)
      ]
    },
    {
      category: 2,
      pass: d.altura <= 28 && d.efetivo <= 500,
      criteria: [
        scieCriteriaLine("Altura ≤ 28 m", d.altura <= 28, `${d.altura} m`),
        scieCriteriaLine("Efetivo ≤ 500", d.efetivo <= 500, `${d.efetivo}`)
      ]
    },
    {
      category: 3,
      pass: d.altura <= 28 && d.efetivo <= 1500,
      criteria: [
        scieCriteriaLine("Altura ≤ 28 m", d.altura <= 28, `${d.altura} m`),
        scieCriteriaLine("Efetivo ≤ 1 500", d.efetivo <= 1500, `${d.efetivo}`)
      ]
    },
    {
      category: 4,
      pass: true,
      criteria: [scieCriteriaLine("Excede os limites da 3.ª categoria", true)]
    }
  ]);
}

function evalUTXI(d) {
  return highestPassingCategory([
    {
      category: 1,
      pass: d.altura <= 9 && d.pisosAbaixo === 0 && d.efetivo <= 100 && d.carga <= 5000,
      criteria: [
        scieCriteriaLine("Altura ≤ 9 m", d.altura <= 9, `${d.altura} m`),
        scieCriteriaLine("Pisos abaixo do plano de referência = 0", d.pisosAbaixo === 0, `${d.pisosAbaixo}`),
        scieCriteriaLine("Efetivo ≤ 100", d.efetivo <= 100, `${d.efetivo}`),
        scieCriteriaLine("Carga de incêndio modificada ≤ 5 000 MJ/m²", d.carga <= 5000, `${d.carga} MJ/m²`)
      ]
    },
    {
      category: 2,
      pass: d.altura <= 28 && d.pisosAbaixo <= 1 && d.efetivo <= 500 && d.carga <= 50000,
      criteria: [
        scieCriteriaLine("Altura ≤ 28 m", d.altura <= 28, `${d.altura} m`),
        scieCriteriaLine("Pisos abaixo do plano de referência ≤ 1", d.pisosAbaixo <= 1, `${d.pisosAbaixo}`),
        scieCriteriaLine("Efetivo ≤ 500", d.efetivo <= 500, `${d.efetivo}`),
        scieCriteriaLine("Carga de incêndio modificada ≤ 50 000 MJ/m²", d.carga <= 50000, `${d.carga} MJ/m²`)
      ]
    },
    {
      category: 3,
      pass: d.altura <= 28 && d.pisosAbaixo <= 2 && d.efetivo <= 1500 && d.carga <= 150000,
      criteria: [
        scieCriteriaLine("Altura ≤ 28 m", d.altura <= 28, `${d.altura} m`),
        scieCriteriaLine("Pisos abaixo do plano de referência ≤ 2", d.pisosAbaixo <= 2, `${d.pisosAbaixo}`),
        scieCriteriaLine("Efetivo ≤ 1 500", d.efetivo <= 1500, `${d.efetivo}`),
        scieCriteriaLine("Carga de incêndio modificada ≤ 150 000 MJ/m²", d.carga <= 150000, `${d.carga} MJ/m²`)
      ]
    },
    {
      category: 4,
      pass: true,
      criteria: [scieCriteriaLine("Excede os limites da 3.ª categoria", true)]
    }
  ]);
}

function evalUTXII(d) {
  const factor = d.soArmazem === "sim" ? 10 : 1;

  if (d.espaco === "arlivre") {
    return highestPassingCategory([
      {
        category: 1,
        pass: d.carga <= 1000 * factor,
        criteria: [
          scieCriteriaLine("UT XII ao ar livre", true),
          scieCriteriaLine(`Carga de incêndio modificada ≤ ${1000 * factor} MJ/m²`, d.carga <= 1000 * factor, `${d.carga} MJ/m²`)
        ]
      },
      {
        category: 2,
        pass: d.carga <= 10000 * factor,
        criteria: [
          scieCriteriaLine("UT XII ao ar livre", true),
          scieCriteriaLine(`Carga de incêndio modificada ≤ ${10000 * factor} MJ/m²`, d.carga <= 10000 * factor, `${d.carga} MJ/m²`)
        ]
      },
      {
        category: 3,
        pass: d.carga <= 30000 * factor,
        criteria: [
          scieCriteriaLine("UT XII ao ar livre", true),
          scieCriteriaLine(`Carga de incêndio modificada ≤ ${30000 * factor} MJ/m²`, d.carga <= 30000 * factor, `${d.carga} MJ/m²`)
        ]
      },
      {
        category: 4,
        pass: true,
        criteria: [scieCriteriaLine("Excede os limites da 3.ª categoria", true)]
      }
    ]);
  }

  return highestPassingCategory([
    {
      category: 1,
      pass: d.carga <= 500 * factor && d.pisosAbaixo === 0,
      criteria: [
        scieCriteriaLine(`Carga de incêndio modificada ≤ ${500 * factor} MJ/m²`, d.carga <= 500 * factor, `${d.carga} MJ/m²`),
        scieCriteriaLine("Pisos abaixo do plano de referência = 0", d.pisosAbaixo === 0, `${d.pisosAbaixo}`),
        scieCriteriaLine("Majoração ×10 por armazém exclusivo", d.soArmazem === "sim", d.soArmazem === "sim" ? "Aplicada" : "Não aplicável")
      ]
    },
    {
      category: 2,
      pass: d.carga <= 5000 * factor && d.pisosAbaixo <= 1,
      criteria: [
        scieCriteriaLine(`Carga de incêndio modificada ≤ ${5000 * factor} MJ/m²`, d.carga <= 5000 * factor, `${d.carga} MJ/m²`),
        scieCriteriaLine("Pisos abaixo do plano de referência ≤ 1", d.pisosAbaixo <= 1, `${d.pisosAbaixo}`),
        scieCriteriaLine("Majoração ×10 por armazém exclusivo", d.soArmazem === "sim", d.soArmazem === "sim" ? "Aplicada" : "Não aplicável")
      ]
    },
    {
      category: 3,
      pass: d.carga <= 15000 * factor && d.pisosAbaixo <= 1,
      criteria: [
        scieCriteriaLine(`Carga de incêndio modificada ≤ ${15000 * factor} MJ/m²`, d.carga <= 15000 * factor, `${d.carga} MJ/m²`),
        scieCriteriaLine("Pisos abaixo do plano de referência ≤ 1", d.pisosAbaixo <= 1, `${d.pisosAbaixo}`),
        scieCriteriaLine("Majoração ×10 por armazém exclusivo", d.soArmazem === "sim", d.soArmazem === "sim" ? "Aplicada" : "Não aplicável")
      ]
    },
    {
      category: 4,
      pass: true,
      criteria: [scieCriteriaLine("Excede os limites da 3.ª categoria", true)]
    }
  ]);
}

function evaluateSCIECategory(data) {
  switch (data.ut) {
    case "I": return evalUTI(data);
    case "II": return evalUTII(data);
    case "III": return evalUTIII(data);
    case "IV": return evalUTIVorV(data, true);
    case "V": return evalUTIVorV(data, false);
    case "VI": return evalUTVIorIX(data, "UT VI");
    case "VII": return evalUTVII(data);
    case "VIII": return evalUTVIII(data);
    case "IX": return evalUTVIorIX(data, "UT IX");
    case "X": return evalUTX(data);
    case "XI": return evalUTXI(data);
    case "XII": return evalUTXII(data);
    default: return null;
  }
}

function getSCIEMeasures(ut, category) {
  const common = [
    {
      title: "Instruções de segurança",
      detail: "Devem existir instruções de segurança adequadas à utilização, ocupação e procedimentos de atuação."
    },
    {
      title: "Registos de segurança",
      detail: "Devem ser mantidos registos das ocorrências relevantes, manutenção, vistorias, ações de formação, exercícios e incidentes."
    },
    {
      title: "Procedimentos de prevenção",
      detail: "Devem existir procedimentos para prevenção e controlo dos riscos associados à exploração do edifício."
    }
  ];

  const cat2plus = [
    {
      title: "Plano de prevenção",
      detail: "Deve existir plano de prevenção ajustado aos riscos, meios existentes, rotinas de exploração e responsáveis."
    },
    {
      title: "Organização da segurança",
      detail: "A organização da segurança deve ser definida em função do efetivo, horário de funcionamento e risco da utilização."
    }
  ];

  const cat3plus = [
    {
      title: "Plano de emergência interno",
      detail: "Deve existir plano de emergência interno com procedimentos de alarme, alerta, evacuação e primeira intervenção."
    },
    {
      title: "Formação em SCIE",
      detail: "Os intervenientes com responsabilidades na exploração e emergência devem ter formação adequada."
    },
    {
      title: "Simulacros",
      detail: "Devem ser realizados exercícios e simulacros para testar os procedimentos de resposta."
    }
  ];

  const cat4plus = [
    {
      title: "Reforço da organização de segurança",
      detail: "A organização da segurança, equipas, treino e controlo documental exigem validação técnica mais rigorosa."
    },
    {
      title: "Validação técnica obrigatória",
      detail: "A verificação final das medidas deve ser confirmada por técnico competente."
    }
  ];

  const utSpecific = {
    IV: [{ title: "Gestão de ocupantes mais vulneráveis", detail: "Devem ser considerados procedimentos próprios para crianças e ocupantes com menor autonomia." }],
    V: [{ title: "Evacuação assistida", detail: "Devem existir procedimentos específicos para doentes, utentes dependentes e evacuação assistida." }],
    VI: [{ title: "Controlo de lotação e público", detail: "Devem ser validados procedimentos operacionais associados à lotação, acolhimento de público e evacuação." }],
    VII: [{ title: "Gestão de ocupação noturna", detail: "Devem ser considerados procedimentos de emergência adequados à ocupação noturna e dormidas." }],
    VIII: [{ title: "Afluência e gestão de público", detail: "Devem ser validados procedimentos compatíveis com grande afluência e apoio à evacuação." }],
    IX: [{ title: "Eventos e concentração de pessoas", detail: "Devem ser avaliados procedimentos operacionais em função da lotação e tipo de atividade." }],
    XI: [{ title: "Carga de incêndio documental", detail: "Devem ser considerados procedimentos ajustados à proteção do acervo e à carga de incêndio." }],
    XII: [{ title: "Procedimentos de exploração industrial/armazém", detail: "Devem ser avaliados procedimentos específicos para armazenamento, operações e riscos próprios da atividade." }]
  };

  let measures = [...common];
  if (category >= 2) measures = measures.concat(cat2plus);
  if (category >= 3) measures = measures.concat(cat3plus);
  if (category >= 4) measures = measures.concat(cat4plus);
  if (utSpecific[ut]) measures = measures.concat(utSpecific[ut]);

  return measures;
}

function renderSCIEResult(data, result) {
  const box = scieById("resultado-risco");
  if (!box) return;

  const catText = `${result.category}.ª Categoria de Risco`;
  const measures = getSCIEMeasures(data.ut, result.category);

  box.className = "panel risk-result show";
  box.innerHTML = `
    <div class="risk-badge cat-${result.category}">${catText}</div>
    <h3 style="margin-top:0;">${SCIE_UT_LABELS[data.ut]}</h3>
    <p class="small-note">A categoria apresentada é a mais baixa cujos critérios foram integralmente cumpridos.</p>

    <h4 class="risk-section-title">Critérios verificados para esta categoria</h4>
    <ul class="criteria-list">
      ${result.criteria.map((item) => `
        <li class="${item.ok ? "ok" : "fail"}">
          <strong>${item.ok ? "Cumpre" : "Não cumpre"} — ${item.label}</strong>
          ${item.detail ? `<span>${item.detail}</span>` : ""}
        </li>
      `).join("")}
    </ul>

    <h4 class="risk-section-title">Medidas obrigatórias / a validar</h4>
    <ul class="measures-list">
      ${measures.map((item) => `
        <li>
          <strong>${item.title}</strong>
          <span>${item.detail}</span>
        </li>
      `).join("")}
    </ul>

    <div class="risk-actions">
      <a class="btn btn-primary" href="#contacto">Pedir análise técnica</a>
    </div>

    <p class="risk-legal-note">
      Resultado indicativo. O enquadramento final deve ser validado tecnicamente, sobretudo em utilizações mistas ou situações especiais.
    </p>
  `;
}

function calcularRiscoSCIE() {
  const data = readSCIEData();
  const validationError = validateSCIEData(data);

  if (validationError) {
    alert(validationError);
    return;
  }

  const result = evaluateSCIECategory(data);
  if (!result) {
    alert("Não foi possível calcular a categoria de risco.");
    return;
  }

  renderSCIEResult(data, result);
}

function resetSCIECalculator() {
  const ut = scieById("scie-ut");
  const fields = scieById("scie-fields");
  const result = scieById("resultado-risco");

  if (ut) ut.value = "";
  if (fields) fields.innerHTML = "";
  if (result) {
    result.className = "panel risk-result";
    result.innerHTML = "";
  }
}

function initSCIECalculator() {
  const ut = scieById("scie-ut");
  const calcBtn = scieById("scie-calculate-btn");
  const resetBtn = scieById("scie-reset-btn");

  if (!ut || !calcBtn || !resetBtn) return;

  ut.addEventListener("change", () => {
    renderSCIEFields();
    const result = scieById("resultado-risco");
    if (result) {
      result.className = "panel risk-result";
      result.innerHTML = "";
    }
  });

  calcBtn.addEventListener("click", calcularRiscoSCIE);
  resetBtn.addEventListener("click", resetSCIECalculator);
  }

  /* ===== CALCULADORA PROFISSIONAL — DENSIDADE DA CARGA DE INCÊNDIO ===== */

/*
Base legal de cálculo:
- Método determinístico:
  Qs = Σ (Mi × Hi × Ci × Rai)
  qs = Qs / S
- Método probabilístico:
  Atividade: Qs = Σ (qsi × Si × Ci × Rai)
  Armazenamento: Qs = Σ (qvi × hi × Si × Ci × Rai)
  qs = Qs / S

Nota:
Os bancos abaixo são um "banco inicial Lisprotec" para teste e operação.
Os valores continuam editáveis no frontend e devem ser validados tecnicamente caso a caso.
*/

const FIRELOAD_PRODUCTS = [
  { id: "papel-cartao", name: "Papel / Cartão", category: "Celulósicos", hi: 17, c: 1.00, r: 1.00, unit: "kg" },
  { id: "madeira-macia", name: "Madeira macia", category: "Madeiras", hi: 17, c: 1.00, r: 1.00, unit: "kg" },
  { id: "madeira-dura", name: "Madeira dura", category: "Madeiras", hi: 18, c: 1.00, r: 1.00, unit: "kg" },
  { id: "aglomerado", name: "Aglomerado / MDF", category: "Madeiras", hi: 18, c: 1.05, r: 1.00, unit: "kg" },
  { id: "texteis-algodao", name: "Têxteis de algodão", category: "Têxteis", hi: 17, c: 1.00, r: 1.00, unit: "kg" },
  { id: "texteis-sinteticos", name: "Têxteis sintéticos", category: "Têxteis", hi: 25, c: 1.10, r: 1.10, unit: "kg" },
  { id: "borracha", name: "Borracha", category: "Elastómeros", hi: 33, c: 1.10, r: 1.20, unit: "kg" },
  { id: "pe", name: "Polietileno (PE)", category: "Plásticos", hi: 43, c: 1.20, r: 1.50, unit: "kg" },
  { id: "pp", name: "Polipropileno (PP)", category: "Plásticos", hi: 43, c: 1.20, r: 1.50, unit: "kg" },
  { id: "ps", name: "Poliestireno (PS)", category: "Plásticos", hi: 39, c: 1.20, r: 1.50, unit: "kg" },
  { id: "pet", name: "PET", category: "Plásticos", hi: 23, c: 1.10, r: 1.30, unit: "kg" },
  { id: "pvc", name: "PVC", category: "Plásticos", hi: 18, c: 1.00, r: 1.20, unit: "kg" },
  { id: "espuma-pu", name: "Espuma de poliuretano", category: "Espumas", hi: 26, c: 1.20, r: 1.60, unit: "kg" },
  { id: "couro", name: "Couro", category: "Orgânicos", hi: 18, c: 1.00, r: 1.00, unit: "kg" },
  { id: "oleos", name: "Óleos / gorduras", category: "Líquidos combustíveis", hi: 37, c: 1.20, r: 1.40, unit: "kg" },
  { id: "alcool", name: "Álcool", category: "Líquidos inflamáveis", hi: 27, c: 1.20, r: 1.60, unit: "kg" },
  { id: "tintas-solvente", name: "Tintas com solvente", category: "Químicos", hi: 30, c: 1.20, r: 1.60, unit: "kg" },
  { id: "embalagens-mistas", name: "Embalagens mistas", category: "Embalagens", hi: 22, c: 1.10, r: 1.20, unit: "kg" },
  { id: "livros", name: "Livros / arquivo em papel", category: "Arquivo", hi: 17, c: 1.00, r: 1.00, unit: "kg" },
  { id: "paletes-madeira", name: "Paletes de madeira", category: "Logística", hi: 17, c: 1.00, r: 1.20, unit: "kg" }
];

const FIRELOAD_PROB_PRESETS = {
  atividade: [
    { id: "arquivo", name: "Arquivo / biblioteca", q: 1200, c: 1.00, r: 1.00, unitLabel: "MJ/m²" },
    { id: "escritorio", name: "Escritório / administrativo", q: 600, c: 1.00, r: 1.00, unitLabel: "MJ/m²" },
    { id: "comercial-leve", name: "Comércio ligeiro", q: 900, c: 1.00, r: 1.50, unitLabel: "MJ/m²" },
    { id: "oficina", name: "Oficina", q: 1300, c: 1.10, r: 1.50, unitLabel: "MJ/m²" },
    { id: "industrial-geral", name: "Indústria geral", q: 1500, c: 1.10, r: 1.50, unitLabel: "MJ/m²" }
  ],
  armazenamento: [
    { id: "armazem-papel", name: "Armazenamento de papel/cartão", q: 900, c: 1.00, r: 1.50, unitLabel: "MJ/m³" },
    { id: "armazem-madeira", name: "Armazenamento de madeira", q: 850, c: 1.00, r: 1.50, unitLabel: "MJ/m³" },
    { id: "armazem-plasticos", name: "Armazenamento de plásticos", q: 1800, c: 1.20, r: 2.00, unitLabel: "MJ/m³" },
    { id: "armazem-textil", name: "Armazenamento têxtil", q: 1100, c: 1.10, r: 1.50, unitLabel: "MJ/m³" },
    { id: "armazem-misto", name: "Armazenamento misto", q: 1200, c: 1.10, r: 1.50, unitLabel: "MJ/m³" }
  ]
};

let fireloadItems = [];

function flById(id) {
  return document.getElementById(id);
}

function flFormatNumber(value, decimals = 2) {
  return Number(value || 0).toLocaleString("pt-PT", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

function flFormatUnit(value, unit) {
  return `${flFormatNumber(value)} ${unit}`;
}

function normalizeQuantityToKg(quantity, unit) {
  if (unit === "t") return quantity * 1000;
  return quantity;
}

function getSelectedPreset(list, id) {
  return (list || []).find((item) => item.id === id) || null;
}

function populateFireloadProductSelect() {
  const select = flById("fl-product-select");
  if (!select) return;
  select.innerHTML = '<option value="">Selecionar produto</option>';

  FIRELOAD_PRODUCTS.forEach((product) => {
    const option = document.createElement("option");
    option.value = product.id;
    option.textContent = `${product.name} — Hi ${product.hi} MJ/kg`;
    select.appendChild(option);
  });
}

function populateProbabilisticPresets() {
  const mode = flById("fl-prob-mode")?.value || "";
  const select = flById("fl-prob-preset");
  if (!select) return;

  select.innerHTML = '<option value="">Selecionar opção</option>';
  if (!mode || !FIRELOAD_PROB_PRESETS[mode]) return;

  FIRELOAD_PROB_PRESETS[mode].forEach((preset) => {
    const option = document.createElement("option");
    option.value = preset.id;
    option.textContent = `${preset.name} — ${preset.q} ${preset.unitLabel}`;
    select.appendChild(option);
  });
}

function applyProbabilisticPreset() {
  const mode = flById("fl-prob-mode")?.value || "";
  const presetId = flById("fl-prob-preset")?.value || "";
  const preset = getSelectedPreset(FIRELOAD_PROB_PRESETS[mode], presetId);

  if (!preset) return;

  if (flById("fl-prob-q")) flById("fl-prob-q").value = preset.q;
  if (flById("fl-prob-c")) flById("fl-prob-c").value = preset.c;
  if (flById("fl-prob-r")) flById("fl-prob-r").value = preset.r;
}

function renderFireloadMode() {
  const method = flById("fl-method")?.value || "";
  const note = flById("fl-mode-note");
  const det = flById("fl-deterministico");
  const prob = flById("fl-probabilistico");

  det?.classList.add("hidden");
  prob?.classList.add("hidden");

  if (method === "deterministico") {
    det?.classList.remove("hidden");
    if (note) note.textContent = "Método determinístico: baseado na quantidade, Hi, C e R dos materiais existentes.";
  } else if (method === "probabilistico") {
    prob?.classList.remove("hidden");
    if (note) note.textContent = "Método probabilístico: baseado em valores estatísticos q e nos coeficientes C e R.";
  } else {
    if (note) note.textContent = "";
  }
}

function renderFireloadEntryMode() {
  const mode = flById("fl-entry-mode")?.value || "predefinido";
  const manual = flById("fl-manual-fields");

  if (!manual) return;
  if (mode === "manual") manual.classList.remove("hidden");
  else manual.classList.add("hidden");
}

function buildFireloadItemFromManual(quantity, unit) {
  const name = flById("fl-manual-name")?.value?.trim() || "";
  const category = flById("fl-manual-category")?.value?.trim() || "Manual";
  const hi = Number(flById("fl-manual-hi")?.value || 0);
  const c = Number(flById("fl-manual-c")?.value || 0);
  const r = Number(flById("fl-manual-r")?.value || 0);
  const manualUnit = flById("fl-manual-unit")?.value || unit || "kg";

  if (!name || hi <= 0 || c <= 0 || r <= 0) {
    alert("Preencha todos os campos do material manual.");
    return null;
  }

  return { name, category, hi, c, r, quantity, unit: manualUnit };
}

function buildFireloadItemFromPreset(quantity, unit) {
  const selectedId = flById("fl-product-select")?.value || "";
  const product = FIRELOAD_PRODUCTS.find((p) => p.id === selectedId);

  if (!product) {
    alert("Selecione um produto da lista.");
    return null;
  }

  return {
    name: product.name,
    category: product.category,
    hi: product.hi,
    c: product.c,
    r: product.r,
    quantity,
    unit: unit || product.unit || "kg"
  };
}

function addFireloadItem() {
  const mode = flById("fl-entry-mode")?.value || "predefinido";
  const quantity = Number(flById("fl-quantity")?.value || 0);
  const unit = flById("fl-unit")?.value || "kg";

  if (quantity <= 0) {
    alert("Introduza uma quantidade válida.");
    return;
  }

  const item = mode === "manual"
    ? buildFireloadItemFromManual(quantity, unit)
    : buildFireloadItemFromPreset(quantity, unit);

  if (!item) return;

  fireloadItems.push(item);
  renderFireloadItems();

  if (flById("fl-quantity")) flById("fl-quantity").value = "";
}

function getDeterministicPartial(item) {
  const qKg = normalizeQuantityToKg(item.quantity, item.unit);
  return qKg * item.hi * item.c * item.r;
}

function renderFireloadItems() {
  const body = flById("fl-items-body");
  if (!body) return;

  body.innerHTML = fireloadItems.map((item, index) => {
    const partial = getDeterministicPartial(item);

    return `
      <tr>
        <td>${item.name}</td>
        <td><span class="fl-chip">${item.category}</span></td>
        <td>${flFormatNumber(item.quantity)} ${item.unit}</td>
        <td>${flFormatNumber(item.hi)} MJ/kg</td>
        <td>${flFormatNumber(item.c)}</td>
        <td>${flFormatNumber(item.r)}</td>
        <td>${flFormatNumber(partial)} MJ</td>
        <td><button type="button" class="btn btn-outline btn-small" onclick="removeFireloadItem(${index})">Remover</button></td>
      </tr>
    `;
  }).join("");
}

function removeFireloadItem(index) {
  fireloadItems.splice(index, 1);
  renderFireloadItems();
}

function getDeterministicCalculation(area) {
  const totalMJ = fireloadItems.reduce((sum, item) => sum + getDeterministicPartial(item), 0);
  const density = totalMJ / area;

  return {
    method: "Determinístico",
    totalMJ,
    density,
    memory: fireloadItems.map((item) => {
      const qKg = normalizeQuantityToKg(item.quantity, item.unit);
      const partial = getDeterministicPartial(item);
      return {
        title: item.name,
        detail: `${flFormatNumber(qKg)} kg × ${flFormatNumber(item.hi)} × ${flFormatNumber(item.c)} × ${flFormatNumber(item.r)} = ${flFormatNumber(partial)} MJ`
      };
    })
  };
}

function getProbabilisticCalculation(area) {
  const mode = flById("fl-prob-mode")?.value || "";
  const zoneArea = Number(flById("fl-prob-zone-area")?.value || 0);
  const height = Number(flById("fl-prob-height")?.value || 0);
  const q = Number(flById("fl-prob-q")?.value || 0);
  const c = Number(flById("fl-prob-c")?.value || 0);
  const r = Number(flById("fl-prob-r")?.value || 0);
  const presetText = flById("fl-prob-preset")?.selectedOptions?.[0]?.textContent || "Manual";

  if (!mode || zoneArea <= 0 || q <= 0 || c <= 0 || r <= 0) {
    alert("Preencha os campos obrigatórios do cálculo probabilístico.");
    return null;
  }

  let totalMJ = 0;
  let formulaText = "";

  if (mode === "atividade") {
    totalMJ = q * zoneArea * c * r;
    formulaText = `${flFormatNumber(q)} × ${flFormatNumber(zoneArea)} × ${flFormatNumber(c)} × ${flFormatNumber(r)}`;
  } else {
    if (height <= 0) {
      alert("Introduza a altura de armazenagem.");
      return null;
    }
    totalMJ = q * height * zoneArea * c * r;
    formulaText = `${flFormatNumber(q)} × ${flFormatNumber(height)} × ${flFormatNumber(zoneArea)} × ${flFormatNumber(c)} × ${flFormatNumber(r)}`;
  }

  const density = totalMJ / area;

  return {
    method: "Probabilístico",
    totalMJ,
    density,
    memory: [
      {
        title: `Preset / referência: ${presetText}`,
        detail: mode === "atividade"
          ? "Fórmula aplicada: qs = (qsi × Si × Ci × Rai) / S"
          : "Fórmula aplicada: qs = (qvi × hi × Si × Ci × Rai) / S"
      },
      {
        title: "Memória de cálculo",
        detail: `${formulaText} = ${flFormatNumber(totalMJ)} MJ`
      }
    ]
  };
}

function getGeneralMeasures() {
  return [
    { title: "Validação técnica", detail: "Confirmar enquadramento da atividade, compartimentação e coeficientes adotados." },
    { title: "Coerência documental", detail: "As premissas do cálculo devem ser coerentes com o processo SCIE, exploração e layout real." },
    { title: "Atualização dos dados", detail: "Alterações de materiais, armazenagem ou atividade exigem revisão do cálculo." }
  ];
}

function renderFireloadResult(area, calculation) {
  const box = flById("fl-result");
  if (!box) return;

  const measures = getGeneralMeasures();

  box.className = "panel risk-result show";
  box.innerHTML = `
    <div class="risk-badge info">Resultado</div>
    <h3 style="margin-top:0;">Cálculo ${calculation.method}</h3>

    <h4 class="risk-section-title">Resultado principal</h4>
    <ul class="criteria-list">
      <li><strong>Carga de incêndio modificada (Qs)</strong><span>${flFormatNumber(calculation.totalMJ)} MJ</span></li>
      <li><strong>Densidade da carga de incêndio modificada (qs)</strong><span>${flFormatNumber(calculation.density)} MJ/m²</span></li>
      <li><strong>Área útil do compartimento (S)</strong><span>${flFormatNumber(area)} m²</span></li>
    </ul>

    <h4 class="risk-section-title">Memória de cálculo</h4>
    <ul class="memory-list">
      ${calculation.memory.map((item) => `
        <li>
          <strong>${item.title}</strong>
          <span>${item.detail}</span>
        </li>
      `).join("")}
    </ul>

    <h4 class="risk-section-title">Notas de validação</h4>
    <ul class="measures-list">
      ${measures.map((item) => `
        <li>
          <strong>${item.title}</strong>
          <span>${item.detail}</span>
        </li>
      `).join("")}
    </ul>

    <div class="risk-actions">
      <a class="btn btn-primary" href="#contacto">Pedir análise técnica</a>
    </div>

    <p class="risk-legal-note">
      Ferramenta indicativa. O cálculo deve ser validado tecnicamente à luz do Despacho n.º 8954/2020 e do enquadramento SCIE aplicável.
    </p>
  `;
}

function calculateFireloadProfessional() {
  const method = flById("fl-method")?.value || "";
  const area = Number(flById("fl-area")?.value || 0);

  if (!method) {
    alert("Selecione o método de cálculo.");
    return;
  }

  if (area <= 0) {
    alert("Introduza a área útil do compartimento.");
    return;
  }

  if (method === "deterministico") {
    if (!fireloadItems.length) {
      alert("Adicione pelo menos um produto / material.");
      return;
    }
    renderFireloadResult(area, getDeterministicCalculation(area));
    return;
  }

  const calc = getProbabilisticCalculation(area);
  if (!calc) return;
  renderFireloadResult(area, calc);
}

function resetFireloadProfessional() {
  fireloadItems = [];
  renderFireloadItems();

  [
    "fl-method",
    "fl-area",
    "fl-entry-mode",
    "fl-product-select",
    "fl-manual-name",
    "fl-manual-category",
    "fl-manual-hi",
    "fl-manual-c",
    "fl-manual-r",
    "fl-manual-unit",
    "fl-quantity",
    "fl-unit",
    "fl-prob-mode",
    "fl-prob-preset",
    "fl-prob-zone-area",
    "fl-prob-height",
    "fl-prob-q",
    "fl-prob-c",
    "fl-prob-r"
  ].forEach((id) => {
    const el = flById(id);
    if (!el) return;
    if (el.tagName === "SELECT") el.selectedIndex = 0;
    else el.value = "";
  });

  flById("fl-deterministico")?.classList.add("hidden");
  flById("fl-probabilistico")?.classList.add("hidden");
  flById("fl-manual-fields")?.classList.add("hidden");

  const note = flById("fl-mode-note");
  if (note) note.textContent = "";

  const result = flById("fl-result");
  if (result) {
    result.className = "panel risk-result";
    result.innerHTML = "";
  }
}

function initFireloadCalculator() {
  if (!flById("fl-method")) return;

  populateFireloadProductSelect();
  populateProbabilisticPresets();
  renderFireloadEntryMode();
  renderFireloadItems();

  flById("fl-method")?.addEventListener("change", renderFireloadMode);
  flById("fl-entry-mode")?.addEventListener("change", renderFireloadEntryMode);

  flById("fl-prob-mode")?.addEventListener("change", () => {
    populateProbabilisticPresets();
    if (flById("fl-prob-q")) flById("fl-prob-q").value = "";
    if (flById("fl-prob-c")) flById("fl-prob-c").value = "";
    if (flById("fl-prob-r")) flById("fl-prob-r").selectedIndex = 0;
  });

  flById("fl-prob-preset")?.addEventListener("change", applyProbabilisticPreset);
  flById("fl-add-item-btn")?.addEventListener("click", addFireloadItem);
  flById("fl-calc-btn")?.addEventListener("click", calculateFireloadProfessional);
  flById("fl-reset-btn")?.addEventListener("click", resetFireloadProfessional);
  /* ===== VERIFICADOR DE ENQUADRAMENTO SCIE ===== */

const CHECK_UT_LABELS = {
  I: "UT I – Habitacional",
  II: "UT II – Estacionamentos",
  III: "UT III – Administrativos",
  IV: "UT IV – Escolares",
  V: "UT V – Hospitalares e Lares",
  VI: "UT VI – Espetáculos e reuniões públicas",
  VII: "UT VII – Hoteleiros e restauração",
  VIII: "UT VIII – Comerciais e gares de transporte",
  IX: "UT IX – Desportivos e de lazer",
  X: "UT X – Museus e galerias",
  XI: "UT XI – Bibliotecas e arquivos",
  XII: "UT XII – Industrial / Oficinas / Armazéns"
};

function checkById(id) {
  return document.getElementById(id);
}

function readCheckData() {
  return {
    ut: checkById("check-ut")?.value || "",
    area: Number(checkById("check-area")?.value || 0),
    height: Number(checkById("check-height")?.value || 0),
    effective: Number(checkById("check-effective")?.value || 0),
    pisos: Number(checkById("check-pisos")?.value || 0),
    publicUse: checkById("check-public")?.value || "",
    sleep: checkById("check-sleep")?.value || "",
    storage: checkById("check-storage")?.value || ""
  };
}

function validateCheckData(data) {
  if (!data.ut) return "Selecione a utilização-tipo.";
  if (data.area <= 0) return "Introduza a área.";
  if (data.height < 0) return "Introduza uma altura válida.";
  if (data.effective < 0) return "Introduza um efetivo válido.";
  if (data.pisos < 0) return "Introduza um número de pisos válido.";
  if (!data.publicUse) return "Indique se existe atendimento ao público.";
  if (!data.sleep) return "Indique se existe dormida / pernoita.";
  if (!data.storage) return "Indique se existe armazenamento relevante.";
  return "";
}

function buildCheckAssessment(data) {
  const outputs = [];
  const nextSteps = [];
  let level = "baixo";

  const ut = data.ut;

  if (ut === "I" && data.height <= 9 && data.pisos <= 1) {
    outputs.push("Tende para enquadramento simples da utilização habitacional.");
    nextSteps.push("Validar a categoria de risco com a calculadora SCIE.");
  } else if (ut === "I") {
    outputs.push("Tende para enquadramento habitacional com maior exigência técnica.");
    nextSteps.push("Recomenda-se análise técnica e confirmação documental.");
    level = "medio";
  }

  if (["III", "VIII", "X"].includes(ut) && data.effective <= 100 && data.height <= 9) {
    outputs.push("Pode enquadrar em situação compatível com ficha de segurança, dependendo da categoria final.");
    nextSteps.push("Confirmar categoria de risco e exigências específicas do município / processo.");
  }

  if (["IV", "V", "VI", "VII", "IX", "XI", "XII"].includes(ut)) {
    outputs.push("A utilização-tipo tende a exigir análise técnica mais cuidada.");
    nextSteps.push("Confirmar categoria de risco e medidas de autoproteção aplicáveis.");
    level = "medio";
  }

  if (data.publicUse === "sim") {
    outputs.push("A existência de público reforça a necessidade de validação do efetivo e das condições de evacuação.");
  }

  if (data.sleep === "sim") {
    outputs.push("A existência de dormida / pernoita aumenta a sensibilidade do enquadramento.");
    nextSteps.push("Validar condições específicas de evacuação, deteção e organização de segurança.");
    level = "elevado";
  }

  if (data.storage === "sim" || ["XI", "XII"].includes(ut)) {
    outputs.push("Existe probabilidade de ser relevante calcular a densidade da carga de incêndio.");
    nextSteps.push("Usar a calculadora de carga de incêndio e confirmar o impacto no enquadramento.");
    if (level !== "elevado") level = "medio";
  }

  if (data.height > 9 || data.effective > 100 || data.pisos > 1) {
    outputs.push("Os parâmetros indicam um caso com probabilidade de sair do enquadramento mais simples.");
    nextSteps.push("Confirmar se o caso exige projeto SCIE.");
    if (level !== "elevado") level = "medio";
  }

  if (data.height > 28 || data.effective > 1000 || data.storage === "sim" && ut === "XII") {
    outputs.push("Os dados apontam para maior complexidade técnica.");
    nextSteps.push("É fortemente recomendada análise técnica especializada.");
    level = "elevado";
  }

  const likelyDocs = [];
  if (level === "baixo") likelyDocs.push("Ficha de segurança ou enquadramento documental simplificado, sujeito a confirmação.");
  if (level !== "baixo") likelyDocs.push("Projeto SCIE ou verificação técnica aprofundada, sujeito a confirmação.");
  likelyDocs.push("Verificação da necessidade de medidas de autoproteção.");
  if (["XI", "XII"].includes(ut) || data.storage === "sim") likelyDocs.push("Cálculo da densidade da carga de incêndio pode ser necessário.");

  return { level, outputs, nextSteps, likelyDocs };
}

function renderCheckResult(data, assessment) {
  const box = checkById("check-result");
  if (!box) return;

  const badgeClass = assessment.level === "baixo" ? "cat-1" : assessment.level === "medio" ? "cat-3" : "cat-4";
  const badgeLabel = assessment.level === "baixo" ? "Enquadramento simples" : assessment.level === "medio" ? "Enquadramento intermédio" : "Enquadramento técnico reforçado";

  box.className = "panel risk-result show";
  box.innerHTML = `
    <div class="risk-badge ${badgeClass}">${badgeLabel}</div>
    <h3 style="margin-top:0;">${CHECK_UT_LABELS[data.ut]}</h3>

    <h4 class="risk-section-title">Leitura preliminar</h4>
    <ul class="criteria-list">
      ${assessment.outputs.map((item) => `<li><strong>Observação</strong><span>${item}</span></li>`).join("")}
    </ul>

    <h4 class="risk-section-title">Documentação / verificação provável</h4>
    <ul class="measures-list">
      ${assessment.likelyDocs.map((item) => `<li><strong>A validar</strong><span>${item}</span></li>`).join("")}
    </ul>

    <h4 class="risk-section-title">Próximos passos</h4>
    <ul class="memory-list">
      ${assessment.nextSteps.map((item) => `<li><strong>Passo</strong><span>${item}</span></li>`).join("")}
    </ul>

    <p class="risk-legal-note">
      Ferramenta orientadora. A confirmação final depende do RJ-SCIE e do Regulamento Técnico aplicável ao caso concreto.
    </p>
  `;
}

function calculateSCIECheck() {
  const data = readCheckData();
  const error = validateCheckData(data);
  if (error) {
    alert(error);
    return;
  }

  const assessment = buildCheckAssessment(data);
  renderCheckResult(data, assessment);
}

function resetSCIECheck() {
  [
    "check-ut",
    "check-area",
    "check-height",
    "check-effective",
    "check-pisos",
    "check-public",
    "check-sleep",
    "check-storage"
  ].forEach((id) => {
    const el = checkById(id);
    if (!el) return;
    if (el.tagName === "SELECT") el.selectedIndex = 0;
    else el.value = "";
  });

  const box = checkById("check-result");
  if (box) {
    box.className = "panel risk-result";
    box.innerHTML = "";
  }
}

function initSCIECheck() {
  if (!checkById("check-calc-btn")) return;
  checkById("check-calc-btn")?.addEventListener("click", calculateSCIECheck);
  checkById("check-reset-btn")?.addEventListener("click", resetSCIECheck);
}

/* ===== EXPORTAÇÃO PDF ===== */

function buildPdfHtml(title, sourceSelector) {
  const source = document.querySelector(sourceSelector);
  if (!source) return "";

  const content = source.innerHTML;
  const now = new Date().toLocaleString("pt-PT");

  return `
    <!doctype html>
    <html lang="pt-PT">
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; color:#111827; padding:28px; }
          h1, h2, h3 { margin: 0 0 12px 0; }
          .meta { margin: 0 0 18px 0; color:#4b5563; font-size:14px; }
          .panel, .pdf-box { border:1px solid #d1d5db; border-radius:12px; padding:14px; margin-bottom:14px; }
          ul { margin: 10px 0 0 18px; }
          li { margin-bottom: 8px; }
          .btn { display:none !important; }
          @media print { body { margin:0; } }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="meta">Lisprotec · Exportado em ${now}</div>
        <div class="pdf-box">${content}</div>
      </body>
    </html>
  `;
}

function openPrintWindow(title, sourceSelector) {
  const html = buildPdfHtml(title, sourceSelector);
  if (!html) {
    alert("Não foi encontrado conteúdo para exportar.");
    return;
  }

  const win = window.open("", "_blank");
  if (!win) {
    alert("O navegador bloqueou a janela de exportação.");
    return;
  }

  win.document.open();
  win.document.write(html);
  win.document.close();

  setTimeout(() => {
    win.focus();
    win.print();
  }, 300);
}

function exportSCIEPdf() {
  const box = document.querySelector("#resultado-risco.show");
  if (!box) {
    alert("Ainda não existe resultado da categoria SCIE para exportar.");
    return;
  }
  openPrintWindow("Resultado da Categoria de Risco SCIE", "#resultado-risco");
}

function exportFireloadPdf() {
  const box = document.querySelector("#fl-result.show");
  if (!box) {
    alert("Ainda não existe resultado da carga de incêndio para exportar.");
    return;
  }
  openPrintWindow("Resultado da Carga de Incêndio", "#fl-result");
}

function exportCheckPdf() {
  const box = document.querySelector("#check-result.show");
  if (!box) {
    alert("Ainda não existe resultado do verificador de enquadramento para exportar.");
    return;
  }
  openPrintWindow("Verificador de Enquadramento SCIE", "#check-result");
}

function initPdfExports() {
  document.getElementById("export-scie-pdf-btn")?.addEventListener("click", exportSCIEPdf);
  document.getElementById("export-fireload-pdf-btn")?.addEventListener("click", exportFireloadPdf);
  document.getElementById("export-check-pdf-btn")?.addEventListener("click", exportCheckPdf);
}
}


