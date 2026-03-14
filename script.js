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
    return calcAreaBasedPrice(1.0, 350, true);
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
}

document.addEventListener("DOMContentLoaded", init);
