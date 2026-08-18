"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  addProductionIngredient,
  cancelFinalBeverageBlend,
  cancelProduction,
  completeProduction,
  createProduction,
  createFinalBeverageBlend,
  createTank,
  recordProductionParameter,
  setProduccionPin,
  updateTank,
  type IngredientInput,
} from "@/app/_actions/production";
import { createProductionSecondPhase, createProductionThirdPhase } from "@/app/_actions/production-phase";
import { formatProductionName } from "@/lib/production-naming";
import {
  evaluateProductionParametersWithFormula,
  formatFormulaDuration,
  profileFromFormula,
  type ParameterKey,
  type ProductionFormulaView,
  type ProductionType,
} from "@/lib/production-profiles";
import { getContainerStatus, getContainerStatusClasses, getContainerStatusLabel } from "@/lib/container-status";
import { resolvePublicAppUrl } from "@/lib/public-app-url";
import {
  formatDayCounter,
  getFermentationMetrics,
  getFermentationVisualClasses,
  getFermentationVisualStatus,
} from "@/lib/production-fermentation";

type ProdView = "params" | "additions" | "complete";

function fmtDate(d: string | Date | null | undefined) {
  if (!d) return "-";
  return new Date(d).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" });
}

function parseNum(value: string) {
  if (!value.trim()) return undefined;
  const n = Number(value);
  return Number.isNaN(n) ? undefined : n;
}

function findRawMaterialByKeywords(rawMaterials: any[], keywords: string[]) {
  return rawMaterials.find((item: any) => {
    const haystack = `${item?.name || ""} ${item?.category || ""}`.toLowerCase();
    return keywords.some((keyword) => haystack.includes(keyword));
  });
}

function buildIngredientsFromFormula(
  formula: ProductionFormulaView | null | undefined,
  targetLiters: number,
  rawMaterials: any[],
  defaultLocationId?: string,
): IngredientInput[] {
  if (!formula || !(targetLiters > 0)) return [];

  const rows: IngredientInput[] = [];
  const blendItems = Array.isArray(formula.blendItems) ? formula.blendItems : [];

  blendItems.forEach((item) => {
    if (!item.rawMaterialId) return;
    const quantity = Number(item.gramsPerLiter || 0) * targetLiters;
    if (!(quantity > 0)) return;
    rows.push({
      rawMaterialId: item.rawMaterialId,
      quantity,
      locationId: defaultLocationId || "",
    });
  });

  const sugarMaterial = findRawMaterialByKeywords(rawMaterials, ["azúcar", "azucar", "sugar"]);
  const sugarQuantity = Number(formula.sugarGramsPerLiter || 0) * targetLiters;
  if (sugarMaterial?.id && sugarQuantity > 0) {
    rows.push({
      rawMaterialId: sugarMaterial.id,
      quantity: sugarQuantity,
      locationId: defaultLocationId || "",
    });
  }

  const waterMaterial = findRawMaterialByKeywords(rawMaterials, ["agua", "water"]);
  const hotWaterQuantity = targetLiters * (Number(formula.brewWaterPercent || 0) / 100);
  if (waterMaterial?.id && hotWaterQuantity > 0) {
    rows.push({
      rawMaterialId: waterMaterial.id,
      quantity: hotWaterQuantity,
      locationId: defaultLocationId || "",
    });
  }

  return rows;
}

function formatBatchQuantity(value: number, unit = "") {
  if (!Number.isFinite(value)) return "-";
  if (unit.toLowerCase() === "g" && value >= 1000) {
    return `${(value / 1000).toLocaleString("es-MX", { maximumFractionDigits: 2 })} kg`;
  }
  return `${value.toLocaleString("es-MX", { maximumFractionDigits: 2 })}${unit ? ` ${unit}` : ""}`;
}

function formatStepIngredient(item: any) {
  const sourceLabel =
    item.sourceKind === "BASE_BEVERAGE"
      ? `Bebida base tipo ${item.sourceProductionType || "-"}`
      : item.rawMaterialName || "Insumo";
  const quantity = item.quantity != null ? Number(item.quantity).toLocaleString("es-MX") : "-";
  const unit = item.rawMaterialUnit || "";
  const location = item.defaultLocationName ? ` | ${item.defaultLocationName}` : "";
  return `${sourceLabel}: ${quantity} ${unit}${location}`.trim();
}

function resolveLatestBrixForProduction(production: any) {
  const parameters = Array.isArray(production?.parameters) ? production.parameters : [];
  const latestParameter = [...parameters]
    .filter((entry: any) => entry?.brix != null)
    .sort((a: any, b: any) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime())[0];

  if (latestParameter?.brix != null) return Number(latestParameter.brix);

  const phaseRecords = Array.isArray(production?.secondPhaseRecords) ? production.secondPhaseRecords : [];
  const latestPhase = [...phaseRecords]
    .filter((entry: any) => entry?.brix != null)
    .sort((a: any, b: any) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime())[0];

  return latestPhase?.brix != null ? Number(latestPhase.brix) : null;
}

export default function TabProduccion({ tanks, productions, rawMaterials, locations, formulas, baseBeverageInventory, finalBeverageBlends, userEmail }: any) {
  const TANKS_PAGE_SIZE = 20;
  const safeTanks = Array.isArray(tanks) ? tanks : [];
  const safeProductions = Array.isArray(productions) ? productions : [];
  const safeRM = Array.isArray(rawMaterials) ? rawMaterials : [];
  const safeLocations = Array.isArray(locations) ? locations : [];
  const safeFormulas = Array.isArray(formulas) ? formulas : [];
  const safeBaseBeverageInventory = Array.isArray(baseBeverageInventory) ? baseBeverageInventory : [];

  const [nfcBaseUrl, setNfcBaseUrl] = useState("");
  React.useEffect(() => {
    setNfcBaseUrl(resolvePublicAppUrl(window.location.origin));
  }, []);

  const [showPinModal, setShowPinModal] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [pinSaving, setPinSaving] = useState(false);
  const [pinMsg, setPinMsg] = useState("");

  const [view, setView] = useState<"producciones" | "tanques" | "final">("producciones");
  const [statusFilter, setStatusFilter] = useState<"IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "UPCOMING" | "ALL">("IN_PROGRESS");
  const [tankPage, setTankPage] = useState(1);

  const [showCreateTank, setShowCreateTank] = useState(false);
  const [showCreateProd, setShowCreateProd] = useState(false);
  const [selectedProd, setSelectedProd] = useState<any | null>(null);
  const [prodView, setProdView] = useState<ProdView>("params");
  const [showSecondPhaseModal, setShowSecondPhaseModal] = useState(false);
  const [secondPhaseTarget, setSecondPhaseTarget] = useState<any | null>(null);
  const [showThirdPhaseModal, setShowThirdPhaseModal] = useState(false);
  const [thirdPhaseTarget, setThirdPhaseTarget] = useState<any | null>(null);
  const [newTankName, setNewTankName] = useState("");
  const [newTankCapacity, setNewTankCapacity] = useState("");
  const [tankSaving, setTankSaving] = useState(false);
  const [tankError, setTankError] = useState("");

  const [newProdType, setNewProdType] = useState<string>("");
  const [newProdTank, setNewProdTank] = useState("");
  const [newProdStart, setNewProdStart] = useState(() => new Date().toISOString().slice(0, 16));
  const [newProdInputLiters, setNewProdInputLiters] = useState("50");
  const [newProdNotes, setNewProdNotes] = useState("");
  const [ingredients, setIngredients] = useState<IngredientInput[]>([]);
  const [prodSaving, setProdSaving] = useState(false);
  const [prodError, setProdError] = useState("");

  const [paramPh, setParamPh] = useState("");
  const [paramBrix, setParamBrix] = useState("");
  const [paramTemp, setParamTemp] = useState("");
  const [paramAcid, setParamAcid] = useState("");
  const [paramNotes, setParamNotes] = useState("");
  const [paramDate, setParamDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [paramSaving, setParamSaving] = useState(false);
  const [paramError, setParamError] = useState("");

  const [addRM, setAddRM] = useState("");
  const [addQty, setAddQty] = useState("");
  const [addLoc, setAddLoc] = useState(safeLocations[0]?.id || "");
  const [addNotes, setAddNotes] = useState("");
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState("");

  const [completeLt, setCompleteLt] = useState("");
  const [completeNotes, setCompleteNotes] = useState("");
  const [completeAction, setCompleteAction] = useState<"MAINTAIN" | "UNIFY" | "DISPATCH">("MAINTAIN");
  const [completeSaving, setCompleteSaving] = useState(false);

  const [phase2Condition, setPhase2Condition] = useState("Aceptado");
  const [phase2ReceivedBy, setPhase2ReceivedBy] = useState("");
  const [phase2MeasuredBy, setPhase2MeasuredBy] = useState("");
  const [phase2StartedBy, setPhase2StartedBy] = useState(userEmail || "");
  const [phase2Date, setPhase2Date] = useState(() => new Date().toISOString().slice(0, 16));
  const [phase2Ph, setPhase2Ph] = useState("");
  const [phase2Brix, setPhase2Brix] = useState("");
  const [phase2Temp, setPhase2Temp] = useState("");
  const [phase2Acid, setPhase2Acid] = useState("");
  const [phase2Notes, setPhase2Notes] = useState("");
  const [phase2Saving, setPhase2Saving] = useState(false);
  const [phase2Error, setPhase2Error] = useState("");
  const [phase2Additions, setPhase2Additions] = useState<IngredientInput[]>([]);
  const [phase3Date, setPhase3Date] = useState(() => new Date().toISOString().slice(0, 16));
  const [phase3RemainingLiters, setPhase3RemainingLiters] = useState("");
  const [phase3Notes, setPhase3Notes] = useState("");
  const [phase3Saving, setPhase3Saving] = useState(false);
  const [phase3Error, setPhase3Error] = useState("");
  const [finalBlendName, setFinalBlendName] = useState("");
  const [finalBlendTargetBrix, setFinalBlendTargetBrix] = useState("");
  const [finalBlendNotes, setFinalBlendNotes] = useState("");
  const [finalBlendSaving, setFinalBlendSaving] = useState(false);
  const [finalBlendError, setFinalBlendError] = useState("");
  const [finalBlendRows, setFinalBlendRows] = useState<Array<{
    sourceType: "BASE_LOT" | "FLAVOR_RECIPE";
    sourceId: string;
    liters: string;
  }>>([{ sourceType: "BASE_LOT", sourceId: "", liters: "" }]);

  const acidifierFormulas = useMemo(() => {
    return safeFormulas
      .filter((formula: any) => formula?.isActive && formula?.recipeType !== "FLAVOR")
      .sort((a: any, b: any) => String(a?.name || "").localeCompare(String(b?.name || ""), "es-MX", { sensitivity: "base" }));
  }, [safeFormulas]);

  const formulasByCode = useMemo(() => {
    const map = new Map<string, any>();
    acidifierFormulas.forEach((formula: any) => {
      if (formula?.isActive) {
        map.set(formula.code, formula);
      }
    });
    return map;
  }, [acidifierFormulas]);

  const formulaOptions = acidifierFormulas;
  const flavorFormulaOptions = useMemo(() => {
    return safeFormulas
      .filter((formula: any) => formula?.isActive && formula?.recipeType === "FLAVOR")
      .sort((a: any, b: any) => String(a?.name || "").localeCompare(String(b?.name || ""), "es-MX", { sensitivity: "base" }));
  }, [safeFormulas]);

  const productionById = useMemo(() => {
    const map = new Map<string, any>();
    safeProductions.forEach((production: any) => {
      map.set(production.id, production);
    });
    return map;
  }, [safeProductions]);

  const baseLotOptions = useMemo(() => {
    return safeBaseBeverageInventory
      .filter((row: any) => Number(row?.litersRemaining || 0) > 0 && String(row?.status) !== "UNIFIED")
      .map((row: any) => {
        const production = productionById.get(row.productionId);
        const brix = resolveLatestBrixForProduction(production);
        return {
          id: row.id,
          productionId: row.productionId,
          label: `${row.production?.name || "Lote"}${production?.formula?.name ? ` · ${production.formula.name}` : ""}`,
          litersRemaining: Number(row.litersRemaining || 0),
          brix,
        };
      })
      .filter((row: any) => row.brix != null)
      .sort((a: any, b: any) => String(a.label).localeCompare(String(b.label), "es-MX", { sensitivity: "base" }));
  }, [safeBaseBeverageInventory, productionById]);

  const finalBlendList = Array.isArray(finalBeverageBlends) ? finalBeverageBlends : [];

  const filteredProds = useMemo(() => {
    const baseList =
      statusFilter === "ALL"
        ? safeProductions
        : statusFilter === "UPCOMING"
          ? safeProductions.filter((production: any) => production.status === "IN_PROGRESS")
          : safeProductions.filter((production: any) => production.status === statusFilter);

    const decorated = baseList.map((production: any) => {
      const formula =
        production.formula?.recipeType === "FLAVOR"
          ? null
          : production.formula || formulasByCode.get(production.productType) || null;
      const metrics = getFermentationMetrics(production, formula);
      return { production, formula, metrics };
    });

    if (statusFilter === "UPCOMING") {
      return decorated
        .filter(({ metrics }) => metrics.phase2Date)
        .sort((a, b) => {
          const aValue = a.metrics.remainingDays ?? Number.POSITIVE_INFINITY;
          const bValue = b.metrics.remainingDays ?? Number.POSITIVE_INFINITY;
          return aValue - bValue;
        })
        .map(({ production }) => production);
    }

    return decorated
      .sort((a, b) => {
        const aValue = a.metrics.remainingDays ?? Number.POSITIVE_INFINITY;
        const bValue = b.metrics.remainingDays ?? Number.POSITIVE_INFINITY;
        if (aValue !== bValue) return aValue - bValue;
        return new Date(b.production.startedAt).getTime() - new Date(a.production.startedAt).getTime();
      })
      .map(({ production }) => production);
  }, [safeProductions, statusFilter, formulasByCode]);

  const availableTanks = useMemo(() => {
    return safeTanks.filter((tank: any) => {
      const activeProd = safeProductions.find((p: any) => p.tankId === tank.id && p.status === "IN_PROGRESS");
      const heldInventory = safeBaseBeverageInventory.find((row: any) => row.tank?.id === tank.id && ["HELD", "AVAILABLE", "MIX_PENDING", "DISPATCHED"].includes(String(row.status)));
      return tank.isActive && !activeProd && !heldInventory;
    }).sort((a: any, b: any) => String(a.name || "").localeCompare(String(b.name || ""), "es-MX", { numeric: true, sensitivity: "base" }));
  }, [safeTanks, safeProductions, safeBaseBeverageInventory]);

  const tankTotalPages = Math.max(1, Math.ceil(safeTanks.length / TANKS_PAGE_SIZE));
  const safeTankPage = Math.min(tankPage, tankTotalPages);
  const paginatedTanks = useMemo(() => {
    const start = (safeTankPage - 1) * TANKS_PAGE_SIZE;
    return safeTanks.slice(start, start + TANKS_PAGE_SIZE);
  }, [safeTanks, safeTankPage]);

  const baseInventoryTotals = useMemo(() => {
    return safeBaseBeverageInventory.reduce(
      (acc: { produced: number; remaining: number }, row: any) => {
        acc.produced += Number(row.litersProduced || 0);
        acc.remaining += Number(row.litersRemaining || 0);
        return acc;
      },
      { produced: 0, remaining: 0 }
    );
  }, [safeBaseBeverageInventory]);

  const selectedFormula = (newProdType ? formulasByCode.get(newProdType) : null) || formulaOptions[0] || null;
  const profile = profileFromFormula(selectedFormula, newProdType);
  const selectedTankForNewProd = safeTanks.find((tank: any) => tank.id === newProdTank) || null;
  const generatedProdName = newProdTank
    ? formatProductionName(newProdStart, selectedTankForNewProd?.name, selectedFormula?.code || newProdType || "F1")
    : "";
  const newProdTargetLiters = Number(newProdInputLiters || 0);
  const projectedTeaTotal = Number(selectedFormula?.teaGramsPerLiter || 0) * newProdTargetLiters;
  const projectedSugarTotal = Number(selectedFormula?.sugarGramsPerLiter || 0) * newProdTargetLiters;
  const projectedStarterLiters = newProdTargetLiters * (Number(selectedFormula?.yeastPitchRatePercent || 0) / 100);
  const projectedHotWater = newProdTargetLiters * (Number(selectedFormula?.brewWaterPercent || 0) / 100);
  const projectedColdWater = Math.max(0, newProdTargetLiters - projectedHotWater);
  const projectedBlendItems = Array.isArray(selectedFormula?.blendItems)
    ? selectedFormula.blendItems
        .filter((item: any) => item?.rawMaterialId || item?.freeTextName)
        .map((item: any) => ({
          ...item,
          calculatedQuantity: Number(item.gramsPerLiter || 0) * newProdTargetLiters,
        }))
    : [];
  const currentParamCheck = evaluateProductionParametersWithFormula(selectedProd?.formula, selectedProd?.productType || "A", {
    ph: parseNum(paramPh),
    brix: parseNum(paramBrix),
    temperature: parseNum(paramTemp),
    acidity: parseNum(paramAcid),
  });
  const phase2Check = evaluateProductionParametersWithFormula(secondPhaseTarget?.formula, secondPhaseTarget?.productType || "A", {
    ph: parseNum(phase2Ph),
    brix: parseNum(phase2Brix),
    temperature: parseNum(phase2Temp),
    acidity: parseNum(phase2Acid),
  });
  const selectedPhaseRecords = Array.isArray(selectedProd?.secondPhaseRecords) ? selectedProd.secondPhaseRecords : [];
  const selectedProdPhase2 = selectedPhaseRecords.find((record: any) => Number(record.phase) === 2) || null;
  const selectedProdPhase3 = selectedPhaseRecords.find((record: any) => Number(record.phase) === 3) || null;

  useEffect(() => {
    if ((!newProdType || !formulasByCode.has(newProdType)) && formulaOptions[0]?.code) {
      setNewProdType(formulaOptions[0].code);
    }
  }, [newProdType, formulaOptions]);

  useEffect(() => {
    setIngredients(buildIngredientsFromFormula(selectedFormula, newProdTargetLiters, safeRM, safeLocations[0]?.id || ""));
  }, [selectedFormula, newProdTargetLiters, safeRM, safeLocations]);

  const addIngredientRow = () => {
    setIngredients((prev) => [...prev, { rawMaterialId: "", quantity: 0, locationId: safeLocations[0]?.id || "" }]);
  };

  const removeIngredientRow = (index: number) => {
    setIngredients((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSavePin = async () => {
    setPinSaving(true);
    setPinMsg("");
    const res = await setProduccionPin(newPin);
    setPinSaving(false);
    if (res.error) {
      setPinMsg(res.error);
      return;
    }
    setPinMsg("PIN actualizado");
    setTimeout(() => {
      setShowPinModal(false);
      setNewPin("");
      setPinMsg("");
    }, 1200);
  };

  const handleCreateProd = async () => {
    setProdError("");
    if (!selectedFormula) {
      setProdError("Selecciona una receta");
      return;
    }
    if (!newProdTank) {
      setProdError("Selecciona una cubeta");
      return;
    }
    if (!(newProdTargetLiters > 0)) {
      setProdError("Indica un volumen objetivo válido");
      return;
    }

    const validIngredients = ingredients.filter((item) => item.rawMaterialId && item.quantity > 0);

    setProdSaving(true);
    const res = await createProduction({
      name: generatedProdName,
      productType: newProdType,
      productionFormulaId: selectedFormula?.id,
      tankId: newProdTank,
      startedAt: newProdStart,
      inputLiters: newProdInputLiters.trim() ? Number(newProdInputLiters) : undefined,
      notes: newProdNotes,
      createdBy: userEmail,
      ingredients: validIngredients,
    });
    setProdSaving(false);

    if (res.error) {
      setProdError(res.error);
      return;
    }

    setShowCreateProd(false);
    setNewProdType(formulaOptions[0]?.code || "");
    setNewProdTank("");
    setNewProdStart(new Date().toISOString().slice(0, 16));
    setNewProdInputLiters("50");
    setNewProdNotes("");
    setIngredients([]);
    window.location.reload();
  };

  const handleCreateTank = async () => {
    setTankError("");
    if (!newTankName.trim()) {
      setTankError("Nombre requerido");
      return;
    }

    const formData = new FormData();
    formData.set("name", newTankName.trim());
    if (newTankCapacity.trim()) {
      formData.set("capacityLt", newTankCapacity.trim());
    }

    setTankSaving(true);
    const res = await createTank(formData);
    setTankSaving(false);

    if (res?.error) {
      setTankError(res.error);
      return;
    }

    setShowCreateTank(false);
    setNewTankName("");
    setNewTankCapacity("");
    window.location.reload();
  };

  const handleToggleTankActive = async (tank: any) => {
    const formData = new FormData();
    formData.set("id", tank.id);
    formData.set("name", tank.name);
    formData.set("capacityLt", tank.capacityLt != null ? String(tank.capacityLt) : "");
    formData.set("isActive", String(!tank.isActive));
    await updateTank(formData);
    window.location.reload();
  };

  const handleRecordParam = async () => {
    if (!selectedProd) return;
    setParamError("");
    if (!paramPh && !paramBrix && !paramTemp && !paramAcid) {
      setParamError("Ingresa al menos un parametro");
      return;
    }

    setParamSaving(true);
    const res = await recordProductionParameter({
      productionId: selectedProd.id,
      ph: parseNum(paramPh),
      brix: parseNum(paramBrix),
      temperature: parseNum(paramTemp),
      acidity: parseNum(paramAcid),
      notes: paramNotes,
      recordedBy: userEmail,
      measuredAt: paramDate,
    });
    setParamSaving(false);

    if (res.error) {
      setParamError(res.error);
      return;
    }

    if (!currentParamCheck.ok) {
      setParamError(`Parametros fuera de rango: ${currentParamCheck.failing.map((item) => item.label).join(", ")}`);
    } else {
      setParamError("");
    }

    window.location.reload();
  };

  const handleAddIngredient = async () => {
    if (!selectedProd) return;
    setAddError("");
    if (!addRM || !addQty || Number(addQty) <= 0) {
      setAddError("Selecciona insumo y cantidad");
      return;
    }

    setAddSaving(true);
    const res = await addProductionIngredient({
      productionId: selectedProd.id,
      rawMaterialId: addRM,
      quantity: Number(addQty),
      locationId: addLoc || undefined,
      notes: addNotes,
      addedBy: userEmail,
    });
    setAddSaving(false);

    if (res.error) {
      setAddError(res.error);
      return;
    }

    window.location.reload();
  };

  const handleComplete = async () => {
    if (!selectedProd || !completeLt) return;
    setCompleteSaving(true);
    await completeProduction(selectedProd.id, Number(completeLt), completeNotes, completeAction);
    setCompleteSaving(false);
    window.location.reload();
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Cancelar esta produccion?")) return;
    const reason = prompt("Motivo de cancelación. Ejemplo: merma, contaminación o causa externa.", "");
    await cancelProduction(id, reason || undefined);
    window.location.reload();
  };

  const openSecondPhase = (prod: any) => {
    setSecondPhaseTarget(prod);
    setPhase2Condition("Aceptado");
    setPhase2ReceivedBy("");
    setPhase2MeasuredBy("");
    setPhase2StartedBy(userEmail || "");
    setPhase2Date(new Date().toISOString().slice(0, 16));
    setPhase2Ph("");
    setPhase2Brix("");
    setPhase2Temp("");
    setPhase2Acid("");
    setPhase2Notes("");
    setPhase2Additions([]);
    setPhase2Error("");
    setShowSecondPhaseModal(true);
  };

  const handleSecondPhase = async () => {
    if (!secondPhaseTarget) return;
    setPhase2Error("");
    if (!phase2ReceivedBy.trim() || !phase2MeasuredBy.trim() || !phase2StartedBy.trim()) {
      setPhase2Error("Completa quien recibio, quien midio y quien inicio fase dos");
      return;
    }

    setPhase2Saving(true);
    const res = await createProductionSecondPhase({
      productionId: secondPhaseTarget.id,
      receivedCondition: phase2Condition,
      receivedBy: phase2ReceivedBy,
      measuredBy: phase2MeasuredBy,
      startedBy: phase2StartedBy,
      measuredAt: phase2Date,
      ph: parseNum(phase2Ph),
      brix: parseNum(phase2Brix),
      temperature: parseNum(phase2Temp),
      acidity: parseNum(phase2Acid),
      notes: phase2Notes,
      additions: phase2Additions
        .filter((item) => item.rawMaterialId && item.quantity > 0)
        .map((item) => ({
          rawMaterialId: item.rawMaterialId,
          quantity: item.quantity,
          locationId: item.locationId || undefined,
        })),
    });
    setPhase2Saving(false);

    if (res.error) {
      setPhase2Error(res.error);
      return;
    }

    if (!phase2Check.ok) {
      setPhase2Error(`Fase dos con parametros fuera de rango: ${phase2Check.failing.map((item) => item.label).join(", ")}`);
    } else {
      setPhase2Error("");
    }

    setShowSecondPhaseModal(false);
    window.location.reload();
  };

  const addPhase2IngredientRow = () => {
    setPhase2Additions((prev) => [...prev, { rawMaterialId: "", quantity: 0, locationId: safeLocations[0]?.id || "" }]);
  };

  const removePhase2IngredientRow = (index: number) => {
    setPhase2Additions((prev) => prev.filter((_, idx) => idx !== index));
  };

  const openThirdPhase = (prod: any) => {
    const phase3 = Array.isArray(prod.secondPhaseRecords)
      ? prod.secondPhaseRecords.find((record: any) => Number(record.phase) === 3)
      : null;

    setThirdPhaseTarget(prod);
    setPhase3Date(new Date().toISOString().slice(0, 16));
    setPhase3RemainingLiters(phase3?.remainingLiters != null ? String(Number(phase3.remainingLiters)) : "");
    setPhase3Notes("");
    setPhase3Error("");
    setShowThirdPhaseModal(true);
  };

  const handleThirdPhase = async () => {
    if (!thirdPhaseTarget) return;
    setPhase3Error("");
    if (!phase3RemainingLiters.trim()) {
      setPhase3Error("Indica cuantos litros quedan en el contenedor");
      return;
    }

    setPhase3Saving(true);
    const res = await createProductionThirdPhase({
      productionId: thirdPhaseTarget.id,
      measuredAt: phase3Date,
      remainingLiters: Number(phase3RemainingLiters),
      notes: phase3Notes,
      startedBy: userEmail,
    });
    setPhase3Saving(false);

    if (res.error) {
      setPhase3Error(res.error);
      return;
    }

    setShowThirdPhaseModal(false);
    window.location.reload();
  };

  const finalBlendResolvedRows = finalBlendRows.map((row, index) => {
    if (row.sourceType === "BASE_LOT") {
      const selected = baseLotOptions.find((option: any) => option.id === row.sourceId);
      return {
        key: `final-base-${index}`,
        sourceType: row.sourceType,
        sourceId: row.sourceId,
        liters: Number(row.liters || 0),
        label: selected?.label || "Lote base",
        availableLiters: selected?.litersRemaining ?? null,
        brix: selected?.brix ?? null,
      };
    }

    const selected = flavorFormulaOptions.find((formula: any) => formula.id === row.sourceId);
    return {
      key: `final-flavor-${index}`,
      sourceType: row.sourceType,
      sourceId: row.sourceId,
      liters: Number(row.liters || 0),
      label: selected ? `${selected.name} (${selected.code})` : "Receta sabor",
      availableLiters: null,
      brix: selected?.brixMax != null ? Number(selected.brixMax) : selected?.brixMin != null ? Number(selected.brixMin) : null,
    };
  });

  const finalBlendTotalLiters = finalBlendResolvedRows.reduce((sum, row) => sum + (Number.isFinite(row.liters) ? row.liters : 0), 0);
  const finalBlendWeightedBrix =
    finalBlendTotalLiters > 0
      ? finalBlendResolvedRows.reduce((sum, row) => sum + row.liters * Number(row.brix || 0), 0) / finalBlendTotalLiters
      : 0;
  const finalBlendTargetBrixValue = Number(finalBlendTargetBrix || 0);
  const finalBlendSugarToAddKg = Math.max(finalBlendTargetBrixValue - finalBlendWeightedBrix, 0) * finalBlendTotalLiters * 0.01;

  const addFinalBlendRow = () => {
    setFinalBlendRows((prev) => [...prev, { sourceType: "BASE_LOT", sourceId: "", liters: "" }]);
  };

  const removeFinalBlendRow = (index: number) => {
    setFinalBlendRows((prev) => (prev.length > 1 ? prev.filter((_, rowIndex) => rowIndex !== index) : [{ sourceType: "BASE_LOT", sourceId: "", liters: "" }]));
  };

  const resetFinalBlendForm = () => {
    setFinalBlendName("");
    setFinalBlendTargetBrix("");
    setFinalBlendNotes("");
    setFinalBlendRows([{ sourceType: "BASE_LOT", sourceId: "", liters: "" }]);
    setFinalBlendError("");
  };

  const handleCreateFinalBlend = async () => {
    setFinalBlendError("");
    if (!finalBlendName.trim()) {
      setFinalBlendError("Escribe el nombre de la bebida final");
      return;
    }
    if (!Number.isFinite(finalBlendTargetBrixValue) || finalBlendTargetBrixValue < 0) {
      setFinalBlendError("El brix objetivo no es válido");
      return;
    }

    const preparedRows = finalBlendResolvedRows.filter((row) => row.sourceId && row.liters > 0);
    if (preparedRows.length === 0) {
      setFinalBlendError("Agrega al menos un componente con litros");
      return;
    }

    const insufficientRow = preparedRows.find((row) => row.availableLiters != null && row.liters > Number(row.availableLiters));
    if (insufficientRow) {
      setFinalBlendError(`Uno de los lotes base excede los litros disponibles: ${insufficientRow.label}`);
      return;
    }

    const missingBrixRow = preparedRows.find((row) => row.brix == null);
    if (missingBrixRow) {
      setFinalBlendError(`Falta brix en uno de los componentes: ${missingBrixRow.label}`);
      return;
    }

    setFinalBlendSaving(true);
    const result = await createFinalBeverageBlend({
      name: finalBlendName.trim(),
      targetBrix: finalBlendTargetBrixValue,
      notes: finalBlendNotes.trim() || undefined,
      createdBy: userEmail,
      components: preparedRows.map((row) => ({
        sourceType: row.sourceType,
        baseBeverageInventoryId: row.sourceType === "BASE_LOT" ? row.sourceId : undefined,
        productionFormulaId: row.sourceType === "FLAVOR_RECIPE" ? row.sourceId : undefined,
        liters: row.liters,
      })),
    });
    setFinalBlendSaving(false);

    if (!result.success) {
      setFinalBlendError(result.error || "No se pudo crear la bebida final");
      return;
    }

    resetFinalBlendForm();
    window.location.reload();
  };

  const handleCancelFinalBlend = async (blendId: string) => {
    const confirmed = window.confirm("¿Cancelar esta bebida final y devolver los litros de bebida base?");
    if (!confirmed) return;
    const result = await cancelFinalBeverageBlend(blendId);
    if (!result.success) {
      window.alert(result.error || "No se pudo cancelar la bebida final");
      return;
    }
    window.location.reload();
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-slate-950">Produccion de bebida base</h2>
        <div className="flex gap-2">
          <button onClick={() => setView("producciones")} className={tabClass(view === "producciones")}>Lotes</button>
          <button onClick={() => setView("final")} className={tabClass(view === "final")}>Bebida final</button>
          <button onClick={() => setView("tanques")} className={tabClass(view === "tanques")}>Cubetas</button>
          <button onClick={() => setShowPinModal(true)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">PIN NFC</button>
        </div>
      </div>

      {view === "producciones" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {(["IN_PROGRESS", "UPCOMING", "COMPLETED", "CANCELLED", "ALL"] as const).map((status) => (
              <button key={status} onClick={() => setStatusFilter(status)} className={filterClass(statusFilter === status)}>
                {status === "ALL" ? "Todos" : status === "IN_PROGRESS" ? "En proceso" : status === "UPCOMING" ? "Próximos a salir" : status === "COMPLETED" ? "Completados" : "Cancelados"}
              </button>
            ))}
            <button onClick={() => setShowCreateProd(true)} className="ml-auto rounded-lg bg-slate-950 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800">
              Nueva produccion
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Inventario bebida base</p>
              <p className="mt-2 text-2xl font-black text-slate-950">{safeBaseBeverageInventory.length}</p>
              <p className="text-xs text-slate-500">lotes listos</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Litros producidos</p>
              <p className="mt-2 text-2xl font-black text-slate-950">{baseInventoryTotals.produced.toLocaleString("es-MX")}</p>
              <p className="text-xs text-slate-500">litros terminados</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Litros remanentes</p>
              <p className="mt-2 text-2xl font-black text-slate-950">{baseInventoryTotals.remaining.toLocaleString("es-MX")}</p>
              <p className="text-xs text-slate-500">segun fase 3</p>
            </div>
          </div>

          <div className="space-y-3">
            {filteredProds.length === 0 && <p className="py-10 text-center text-sm italic text-slate-400">Sin lotes en este estado</p>}
            {filteredProds.map((prod: any) => {
              const formulaForProd = prod.formula || formulasByCode.get(prod.productType) || null;
              const profileForProdResolved = profileFromFormula(formulaForProd, prod.productType);
              const productionAdditions = Array.isArray(prod.additions) ? prod.additions : [];
              const phase2AdditionsForProd = productionAdditions.filter((addition: any) => isPhase2Addition(addition));
              const lastParam = prod.parameters?.length
                ? [...prod.parameters].sort((a: any, b: any) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime())[0]
                : null;
              const lastCheck = lastParam
                ? evaluateProductionParametersWithFormula(formulaForProd, prod.productType, {
                    ph: lastParam.ph != null ? Number(lastParam.ph) : undefined,
                    brix: lastParam.brix != null ? Number(lastParam.brix) : undefined,
                    temperature: lastParam.temperature != null ? Number(lastParam.temperature) : undefined,
                    acidity: lastParam.acidity != null ? Number(lastParam.acidity) : undefined,
                  })
                : null;
              const phaseRecords = Array.isArray(prod.secondPhaseRecords) ? prod.secondPhaseRecords : [];
              const phase2 = phaseRecords.find((record: any) => Number(record.phase) === 2) || null;
              const phase3 = phaseRecords.find((record: any) => Number(record.phase) === 3) || null;
              const enteredLiters = prod.inputLiters != null ? Number(prod.inputLiters) : null;
              const producedLiters = prod.litersProduced != null ? Number(prod.litersProduced) : null;
              const remainingLiters = phase3?.remainingLiters != null ? Number(phase3.remainingLiters) : null;
              const processLoss = enteredLiters != null && producedLiters != null ? Math.max(enteredLiters - producedLiters, 0) : null;
              const phase2VolumeBase = enteredLiters;
              const outputLoss = phase2VolumeBase != null && producedLiters != null ? Math.max(phase2VolumeBase - producedLiters, 0) : null;
              const fermentationMetrics = getFermentationMetrics(prod, formulaForProd);
              const fermentationStatus = getFermentationVisualStatus(prod, formulaForProd);
              const fermentationBorder = getFermentationVisualClasses(fermentationStatus);

              return (
                <div key={prod.id} className={`rounded-xl border bg-white p-5 shadow-sm ${fermentationBorder}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-black text-slate-950">{prod.name}</h3>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-slate-700">Tipo {prod.productType}</span>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.25em] ${prod.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700" : prod.status === "COMPLETED" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                          {prod.status === "IN_PROGRESS" ? "En proceso" : prod.status === "COMPLETED" ? "Completado" : "Cancelado"}
                        </span>
                        {formulaForProd && (
                          <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-violet-700">
                            {formulaForProd.name}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span>Cubeta: {prod.tank?.name || "-"}</span>
                        <span>Inicio: {fmtDate(prod.startedAt)}</span>
                        <span>Duracion objetivo: {formatFormulaDuration(profileForProdResolved)}</span>
                        {enteredLiters != null && <span>Entrada: {enteredLiters} Lt</span>}
                        {producedLiters != null && <span>Salida: {producedLiters} Lt</span>}
                      </div>
                      <p className="max-w-3xl text-sm text-slate-600">{profileForProdResolved.formulaSummary}</p>
                      <details className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <summary className="cursor-pointer list-none text-xs font-black uppercase tracking-[0.25em] text-slate-500">
                          Ver detalle tecnico
                        </summary>
                        <div className="mt-4 space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {prod.ingredients?.map((ing: any) => (
                          <span key={ing.id} className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                            {ing.rawMaterial?.name} {Number(ing.quantity)} {ing.rawMaterial?.unit}
                          </span>
                        ))}
                        {(!prod.ingredients || prod.ingredients.length === 0) && (
                          <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700">Sin insumos iniciales registrados</span>
                        )}
                      </div>
                      {phase2AdditionsForProd.length > 0 && (
                        <div className="rounded-xl border border-violet-200 bg-violet-50 p-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-violet-500">Adiciones de fase 2</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {phase2AdditionsForProd.map((addition: any) => (
                              <span key={addition.id} className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-violet-700">
                                {addition.rawMaterial?.name} {Number(addition.quantity)} {addition.rawMaterial?.unit}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                        {(Object.entries(profileForProdResolved.parameters) as [ParameterKey, any][]).map(([key, range]) => (
                          <div key={key} className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                            <p className="font-black uppercase tracking-[0.2em] text-slate-400">{range.label}</p>
                            <p>{range.min} - {range.max}</p>
                          </div>
                        ))}
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                        <div className={`rounded-lg border px-3 py-2 text-xs ${
                          fermentationStatus === "READY"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : fermentationStatus === "IN_PROGRESS"
                              ? "border-amber-200 bg-amber-50 text-amber-700"
                              : fermentationStatus === "AWAITING_COMPLETION"
                                ? "border-rose-200 bg-rose-50 text-rose-700"
                                : "border-slate-200 bg-slate-50 text-slate-600"
                        }`}>
                          <p className="font-black uppercase tracking-[0.2em] text-current/70">Fermentación</p>
                          <p>
                            {fermentationStatus === "PENDING_PHASE2"
                              ? "Esperando fase 2"
                              : fermentationStatus === "IN_PROGRESS"
                                ? "En proceso"
                                : fermentationStatus === "READY"
                                  ? "Lista"
                                  : fermentationStatus === "AWAITING_COMPLETION"
                                    ? "Pendiente de completar"
                                    : fermentationStatus === "COMPLETED"
                                      ? "Finalizada"
                                      : "Cancelada"}
                          </p>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                          <p className="font-black uppercase tracking-[0.2em] text-slate-400">Días transcurridos</p>
                          <p>{fermentationMetrics.phase2Date ? formatDayCounter(fermentationMetrics.elapsedDays, "elapsed") : "-"}</p>
                        </div>
                        <div className={`rounded-lg border px-3 py-2 text-xs ${
                          fermentationStatus === "READY"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : fermentationStatus === "AWAITING_COMPLETION"
                              ? "border-rose-200 bg-rose-50 text-rose-700"
                              : "border-slate-200 bg-slate-50 text-slate-600"
                        }`}>
                          <p className="font-black uppercase tracking-[0.2em] text-current/70">Días restantes</p>
                          <p>
                            {fermentationStatus === "AWAITING_COMPLETION"
                              ? "Proceso listo, falta completar"
                              : fermentationMetrics.phase2Date
                                ? fermentationMetrics.isReady
                                  ? "0 día(s)"
                                  : formatDayCounter(fermentationMetrics.remainingDays, "remaining")
                                : "-"}
                          </p>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                          <p className="font-black uppercase tracking-[0.2em] text-slate-400">Salida estimada</p>
                          <p>{fermentationMetrics.readyAt ? fmtDate(fermentationMetrics.readyAt) : "-"}</p>
                        </div>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                          <p className="font-black uppercase tracking-[0.2em] text-slate-400">Fase 1</p>
                          <p>Entrada: {enteredLiters != null ? `${enteredLiters} Lt` : "-"}</p>
                        </div>
                        <div className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-700">
                          <p className="font-black uppercase tracking-[0.2em] text-violet-400">Fase 2</p>
                          <p>{phase2 ? fmtDate(phase2.measuredAt) : "Pendiente"}</p>
                          {enteredLiters != null && <p>Objetivo: {enteredLiters} Lt</p>}
                        </div>
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                          <p className="font-black uppercase tracking-[0.2em] text-emerald-400">Fase 3</p>
                          <p>{remainingLiters != null ? `${remainingLiters} Lt restantes` : "Pendiente"}</p>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                          <p className="font-black uppercase tracking-[0.2em] text-slate-400">Resultado</p>
                          <p>{producedLiters != null ? `${producedLiters} Lt` : "-"}</p>
                          {outputLoss != null && <p>Merma: {outputLoss} Lt</p>}
                          {processLoss != null && <p>Diferencia total: {processLoss} Lt</p>}
                        </div>
                      </div>
                      {lastParam && (
                        <div className={`rounded-lg border px-3 py-2 text-xs ${lastCheck && !lastCheck.ok ? "border-amber-200 bg-amber-50 text-amber-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                          Ultima medicion: {fmtDate(lastParam.measuredAt)}
                          {lastCheck && !lastCheck.ok ? ` | Fuera de rango: ${lastCheck.failing.map((item) => item.label).join(", ")}` : " | Dentro de rango"}
                        </div>
                      )}
                      {phase2 && (
                        <div className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-700">
                          Fase dos iniciada por {phase2.startedBy || "-"} | Recibió: {phase2.receivedBy || "-"} | Midió: {phase2.measuredBy || "-"} | Estado recibido: {phase2.receivedCondition || "-"}
                        </div>
                      )}
                      {phase3 && (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                          Fase tres registrada el {fmtDate(phase3.measuredAt)} | Litros restantes en contenedor: {phase3.remainingLiters != null ? Number(phase3.remainingLiters) : "-"} Lt
                        </div>
                      )}
                        </div>
                      </details>
                    </div>

                    <div className="flex min-w-[170px] flex-col gap-2">
                      {prod.status === "IN_PROGRESS" && (
                        <>
                          <button onClick={() => { setSelectedProd(prod); setProdView("params"); }} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700">Parametros</button>
                          <button onClick={() => { setSelectedProd(prod); setProdView("additions"); }} className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-white hover:bg-amber-600">Agregar insumo</button>
                          {!phase2 && (
                            <button onClick={() => openSecondPhase(prod)} className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white hover:bg-violet-700">Iniciar segunda fase</button>
                          )}
                          {phase2 && !phase3 && (
                            <button onClick={() => openThirdPhase(prod)} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700">Iniciar fase 3: extraccion</button>
                          )}
                          {phase3 && (
                            <button
                              onClick={() => {
                                setSelectedProd(prod);
                                setProdView("complete");
                                setCompleteLt(phase3?.remainingLiters != null ? String(Number(phase3.remainingLiters)) : "");
                                setCompleteAction("MAINTAIN");
                                setCompleteNotes("");
                              }}
                              className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
                            >
                              Completar
                            </button>
                          )}
                          <button onClick={() => handleCancel(prod.id)} className="rounded-lg bg-rose-100 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-200">Cancelar</button>
                        </>
                      )}
                      {prod.status !== "IN_PROGRESS" && (
                        <button onClick={() => { setSelectedProd(prod); setProdView("params"); }} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Ver detalle</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === "final" && (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Mezclas finales</p>
              <p className="mt-2 text-2xl font-black text-slate-950">{finalBlendList.length}</p>
              <p className="text-xs text-slate-500">registros creados</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Lotes base con brix</p>
              <p className="mt-2 text-2xl font-black text-slate-950">{baseLotOptions.length}</p>
              <p className="text-xs text-slate-500">disponibles para combinar</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Recetas sabor</p>
              <p className="mt-2 text-2xl font-black text-slate-950">{flavorFormulaOptions.length}</p>
              <p className="text-xs text-slate-500">con brix objetivo</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Azúcar estimada</p>
              <p className="mt-2 text-2xl font-black text-slate-950">{finalBlendSugarToAddKg.toLocaleString("es-MX", { maximumFractionDigits: 2 })}</p>
              <p className="text-xs text-slate-500">kg para esta mezcla</p>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_1.05fr]">
            <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Proceso</p>
              <h3 className="mt-2 text-2xl font-black text-slate-950">Bebida final</h3>
              <p className="mt-2 text-sm text-slate-500">
                Combina lotes de bebida base y recetas sabor para calcular el brix ponderado y la azúcar estimada que se necesita agregar antes del envasado.
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Field label="Nombre de la mezcla">
                  <input value={finalBlendName} onChange={(e) => setFinalBlendName(e.target.value)} className="w-full rounded-lg border p-2 text-sm" />
                </Field>
                <Field label="Brix objetivo final">
                  <input type="number" step="0.01" value={finalBlendTargetBrix} onChange={(e) => setFinalBlendTargetBrix(e.target.value)} className="w-full rounded-lg border p-2 text-sm text-center" />
                </Field>
              </div>

              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-slate-950">Componentes de la bebida final</p>
                    <p className="mt-1 text-xs text-slate-500">Captura cuántos litros vas a usar de cada lote base o receta sabor.</p>
                  </div>
                  <button onClick={addFinalBlendRow} className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800">
                    Agregar componente
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {finalBlendRows.map((row, index) => {
                    const resolved = finalBlendResolvedRows[index];
                    return (
                      <div key={`final-row-${index}`} className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="grid gap-3 md:grid-cols-[150px_1fr_120px_120px_auto]">
                          <Field label="Tipo">
                            <select
                              value={row.sourceType}
                              onChange={(e) =>
                                setFinalBlendRows((prev) =>
                                  prev.map((entry, rowIndex) =>
                                    rowIndex === index
                                      ? { sourceType: e.target.value as "BASE_LOT" | "FLAVOR_RECIPE", sourceId: "", liters: entry.liters }
                                      : entry,
                                  ),
                                )
                              }
                              className="w-full rounded-lg border p-2 text-sm"
                            >
                              <option value="BASE_LOT">Lote base</option>
                              <option value="FLAVOR_RECIPE">Receta sabor</option>
                            </select>
                          </Field>
                          <Field label={row.sourceType === "BASE_LOT" ? "Fuente base" : "Receta sabor"}>
                            <select
                              value={row.sourceId}
                              onChange={(e) =>
                                setFinalBlendRows((prev) =>
                                  prev.map((entry, rowIndex) => (rowIndex === index ? { ...entry, sourceId: e.target.value } : entry)),
                                )
                              }
                              className="w-full rounded-lg border p-2 text-sm"
                            >
                              <option value="">Selecciona</option>
                              {(row.sourceType === "BASE_LOT" ? baseLotOptions : flavorFormulaOptions).map((option: any) => (
                                <option key={option.id} value={option.id}>
                                  {row.sourceType === "BASE_LOT" ? `${option.label} · ${Number(option.litersRemaining || 0).toLocaleString("es-MX")} Lt` : `${option.name} (${option.code})`}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Field label="Litros">
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              value={row.liters}
                              onChange={(e) =>
                                setFinalBlendRows((prev) =>
                                  prev.map((entry, rowIndex) => (rowIndex === index ? { ...entry, liters: e.target.value } : entry)),
                                )
                              }
                              className="w-full rounded-lg border p-2 text-sm text-center"
                            />
                          </Field>
                          <Field label="Brix">
                            <input value={resolved?.brix != null ? Number(resolved.brix).toLocaleString("es-MX", { maximumFractionDigits: 2 }) : "-"} readOnly className="w-full rounded-lg border bg-slate-50 p-2 text-sm text-center text-slate-600" />
                          </Field>
                          <div className="flex items-end">
                            <button onClick={() => removeFinalBlendRow(index)} className="rounded-lg bg-rose-100 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-200">
                              Quitar
                            </button>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                          <span>Fuente: {resolved?.label || "-"}</span>
                          {resolved?.availableLiters != null && <span>Disponible: {Number(resolved.availableLiters).toLocaleString("es-MX")} Lt</span>}
                          <span>Aporte de brix: {resolved?.brix != null ? Number(resolved.brix).toLocaleString("es-MX", { maximumFractionDigits: 2 }) : "-"}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <CalcChip label="Litros totales" value={formatBatchQuantity(finalBlendTotalLiters, "L")} />
                <CalcChip label="Brix ponderado" value={finalBlendWeightedBrix.toLocaleString("es-MX", { maximumFractionDigits: 3 })} />
                <CalcChip label="Azúcar estimada" value={formatBatchQuantity(finalBlendSugarToAddKg, "kg")} />
              </div>

              <Field label="Notas">
                <textarea value={finalBlendNotes} onChange={(e) => setFinalBlendNotes(e.target.value)} rows={3} className="w-full rounded-lg border p-2 text-sm" />
              </Field>

              {finalBlendError && <p className="mt-3 text-sm font-semibold text-rose-600">{finalBlendError}</p>}

              <div className="mt-4 flex gap-3">
                <button onClick={resetFinalBlendForm} className="flex-1 rounded-lg border py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">
                  Limpiar
                </button>
                <button onClick={handleCreateFinalBlend} disabled={finalBlendSaving} className="flex-1 rounded-lg bg-slate-950 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:bg-slate-300">
                  {finalBlendSaving ? "Guardando..." : "Crear bebida final"}
                </button>
              </div>
            </section>

            <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Registro</p>
              <h3 className="mt-2 text-2xl font-black text-slate-950">Mezclas creadas</h3>
              <div className="mt-5 space-y-4">
                {finalBlendList.length === 0 && (
                  <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">
                    Aún no hay bebidas finales registradas.
                  </p>
                )}
                {finalBlendList.map((blend: any) => (
                  <article key={blend.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-black text-slate-950">{blend.name}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {fmtDate(blend.createdAt)} · {blend.createdBy || "Sin usuario"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${String(blend.status) === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                          {String(blend.status) === "ACTIVE" ? "Activa" : "Cancelada"}
                        </span>
                        {String(blend.status) === "ACTIVE" && (
                          <button onClick={() => handleCancelFinalBlend(blend.id)} className="rounded-lg bg-rose-100 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-200">
                            Cancelar
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-4">
                      <CalcChip label="Litros" value={formatBatchQuantity(Number(blend.totalLiters || 0), "L")} />
                      <CalcChip label="Brix mezcla" value={Number(blend.weightedBrix || 0).toLocaleString("es-MX", { maximumFractionDigits: 3 })} />
                      <CalcChip label="Brix objetivo" value={Number(blend.targetBrix || 0).toLocaleString("es-MX", { maximumFractionDigits: 3 })} />
                      <CalcChip label="Azúcar" value={formatBatchQuantity(Number(blend.sugarToAddKg || 0), "kg")} />
                    </div>

                    <div className="mt-4 space-y-2">
                      {(blend.components || []).map((component: any) => (
                        <div key={component.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 text-sm">
                          <div>
                            <p className="font-bold text-slate-900">{component.sourceLabel}</p>
                            <p className="text-xs text-slate-500">
                              {component.sourceType === "BASE_LOT" ? "Lote base" : "Receta sabor"} · Brix {Number(component.brixSnapshot || 0).toLocaleString("es-MX", { maximumFractionDigits: 3 })}
                            </p>
                          </div>
                          <p className="font-black text-slate-950">{formatBatchQuantity(Number(component.liters || 0), "L")}</p>
                        </div>
                      ))}
                    </div>

                    {blend.notes && (
                      <p className="mt-4 text-sm text-slate-600">{blend.notes}</p>
                    )}
                  </article>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}

      {view === "tanques" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-slate-500">
              Mostrando {(safeTankPage - 1) * TANKS_PAGE_SIZE + 1}-{Math.min(safeTankPage * TANKS_PAGE_SIZE, safeTanks.length)} de {safeTanks.length} cubetas
            </p>
            <button onClick={() => setShowCreateTank(true)} className="rounded-lg bg-slate-950 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800">Nueva cubeta</button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {paginatedTanks.map((tank: any) => {
              const activeProd = safeProductions.find((p: any) => p.tankId === tank.id && p.status === "IN_PROGRESS");
              const heldInventory = safeBaseBeverageInventory.find((row: any) => row.tank?.id === tank.id && ["HELD", "AVAILABLE", "MIX_PENDING", "DISPATCHED"].includes(String(row.status)));
              const status = getContainerStatus(tank, activeProd || heldInventory);
              return (
                <div key={tank.id} className={`rounded-xl border bg-white p-4 ${!tank.isActive ? "opacity-60" : ""}`}>
                  <div className="flex items-center justify-between">
                    <p className="font-black text-slate-950">{tank.name}</p>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${getContainerStatusClasses(status)}`}>
                      {getContainerStatusLabel(status)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">Capacidad: {tank.capacityLt != null ? Number(tank.capacityLt) : "-"} Lt</p>
                  {nfcBaseUrl && (
                    <div className="mt-3 flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">QR de cubeta</p>
                        <p className="mt-2 truncate text-[11px] text-slate-500">{nfcBaseUrl}/cubeta/{tank.id}</p>
                      </div>
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`${nfcBaseUrl}/cubeta/${tank.id}`)}`}
                        alt={`QR de ${tank.name}`}
                        className="h-16 w-16 rounded-lg border border-white bg-white"
                      />
                    </div>
                  )}
                  <p className="mt-2 text-xs text-slate-500">{activeProd ? `Proceso activo: ${activeProd.name}` : tank.isActive ? "Lista para usarse" : "Fuera de operación"}</p>
                  <button
                    onClick={() => handleToggleTankActive(tank)}
                    className="mt-3 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                      {tank.isActive ? "Desactivar" : "Activar"}
                  </button>
                  <a
                    href={`/cubeta/${tank.id}/etiqueta`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
                  >
                    Imprimir QR
                  </a>
                </div>
              );
            })}
          </div>
          {tankTotalPages > 1 && (
            <div className="flex items-center justify-between">
              <button
                onClick={() => setTankPage((prev) => Math.max(1, prev - 1))}
                disabled={safeTankPage === 1}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Anterior
              </button>
              <p className="text-xs font-semibold text-slate-500">
                Página {safeTankPage} de {tankTotalPages}
              </p>
              <button
                onClick={() => setTankPage((prev) => Math.min(tankTotalPages, prev + 1))}
                disabled={safeTankPage === tankTotalPages}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      )}

      {showCreateProd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="space-y-5 p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-slate-950">Nueva produccion</h3>
                <button onClick={() => setShowCreateProd(false)} className="text-xl text-slate-400 hover:text-slate-700">x</button>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Nombre del proceso">
                      <input
                        value={generatedProdName}
                        readOnly
                        placeholder="Selecciona fecha, cubeta y receta"
                        className="w-full rounded-lg border bg-slate-50 p-2 text-sm text-slate-600"
                      />
                    </Field>
                    <Field label="Receta">
                      <select value={newProdType} onChange={(e) => setNewProdType(e.target.value)} className="w-full rounded-lg border p-2 text-sm">
                        <option value="">Selecciona</option>
                        {formulaOptions.map((formula: any) => (
                          <option key={formula.id} value={formula.code}>
                            {formula.name} ({formula.code})
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Cubeta">
                      <select value={newProdTank} onChange={(e) => setNewProdTank(e.target.value)} className="w-full rounded-lg border p-2 text-sm">
                        <option value="">Selecciona</option>
                        {availableTanks.map((tank: any) => (
                          <option key={tank.id} value={tank.id}>{tank.name}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Inicio">
                      <input type="datetime-local" value={newProdStart} onChange={(e) => setNewProdStart(e.target.value)} className="w-full rounded-lg border p-2 text-sm" />
                    </Field>
                    <Field label="Volumen objetivo (L)">
                      <input type="number" min="0" step="0.1" value={newProdInputLiters} onChange={(e) => setNewProdInputLiters(e.target.value)} className="w-full rounded-lg border p-2 text-sm text-center" />
                    </Field>
                  </div>
                  <p className="text-xs text-slate-500">
                    El nombre se genera automáticamente con este formato: dia-mes-año-numeroTanque-tipoProceso.
                  </p>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-slate-900">Cálculo automático de receta</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Al elegir la receta y el volumen objetivo, el sistema calcula cuánto se necesitará de cada cosa.
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
                        {newProdTargetLiters > 0 ? `${newProdTargetLiters.toLocaleString("es-MX")} L` : "Sin volumen"}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      <CalcChip label="Té" value={formatBatchQuantity(projectedTeaTotal, "g")} />
                      <CalcChip label="Azúcar" value={formatBatchQuantity(projectedSugarTotal, "g")} />
                      <CalcChip label="Cultivo inicial" value={formatBatchQuantity(projectedStarterLiters, "L")} />
                      <CalcChip label="Agua caliente" value={formatBatchQuantity(projectedHotWater, "L")} />
                      <CalcChip label="Agua fría" value={formatBatchQuantity(projectedColdWater, "L")} />
                      <CalcChip label="Fermentación" value={selectedFormula?.durationDays ? `${selectedFormula.durationDays} días` : "-"} />
                    </div>

                    <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-white p-4">
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Desglose del blend</p>
                      <div className="mt-3 space-y-2">
                        {projectedBlendItems.length > 0 ? (
                          projectedBlendItems.map((item: any, index: number) => (
                            <div key={`${item.id || index}-blend-preview`} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                              <div>
                                <p className="font-bold text-slate-900">
                                  {item.rawMaterialName || item.freeTextName || `Componente ${index + 1}`}
                                </p>
                                <p className="text-xs text-slate-500">{Number(item.sharePercent || 0).toLocaleString("es-MX")} % del té total</p>
                              </div>
                              <p className="font-black text-slate-950">{formatBatchQuantity(Number(item.calculatedQuantity || 0), item.unit || "g")}</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs italic text-slate-400">La receta no tiene ingredientes de blend ligados al inventario.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-black text-slate-900">Formula inicial</p>
                      <div className="flex items-center gap-3">
                        <button onClick={() => setIngredients(buildIngredientsFromFormula(selectedFormula, newProdTargetLiters, safeRM, safeLocations[0]?.id || ""))} className="text-xs font-bold text-violet-700 hover:underline">Recargar receta</button>
                        <button onClick={addIngredientRow} className="text-xs font-bold text-blue-700 hover:underline">Agregar insumo</button>
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {selectedFormula
                        ? `Se aplicará ${selectedFormula.name} como base del lote y el volumen objetivo recalcula los insumos antes de guardar.`
                        : "No hay una receta activa seleccionada. Puedes capturar los insumos manualmente."}
                    </p>
                    <details className="mt-4 rounded-xl border border-violet-200 bg-white p-4">
                      <summary className="cursor-pointer list-none text-sm font-black text-violet-950">
                        Ver receta y parámetros
                      </summary>
                      <div className="mt-4">
                        {selectedFormula?.steps?.length ? (
                          <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-black text-violet-950">Checklist de preparación</p>
                                <p className="mt-1 text-xs text-violet-700">
                                  Receta base por {selectedFormula.targetLiters != null ? Number(selectedFormula.targetLiters).toLocaleString("es-MX") : "-"} Lt
                                </p>
                              </div>
                            </div>
                            <div className="mt-4 space-y-3">
                              {selectedFormula.steps.map((step: any, index: number) => (
                                <div key={step.id || `${selectedFormula.id}-step-${index}`} className="rounded-2xl border border-violet-100 bg-white p-4">
                                  <div className="flex items-start gap-3">
                                    <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-violet-400 text-[11px] font-black text-violet-700">
                                      {index + 1}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-black text-violet-950">{step.title || `Paso ${index + 1}`}</p>
                                      {step.instructions && (
                                        <p className="mt-1 text-sm text-violet-900">{step.instructions}</p>
                                      )}
                                      <div className="mt-3 space-y-1">
                                        {step.items?.length ? step.items.map((item: any, itemIndex: number) => (
                                          <div key={`${step.id || index}-item-${itemIndex}`} className="flex items-start gap-2 text-xs text-violet-800">
                                            <span className="mt-1 inline-block h-3 w-3 rounded-sm border border-violet-400 bg-white" />
                                            <span>{formatStepIngredient(item)}</span>
                                          </div>
                                        )) : (
                                          <p className="text-xs italic text-violet-700">Sin insumos definidos para este paso.</p>
                                        )}
                                      </div>
                                      {step.resultLiters != null && (
                                        <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-violet-700">
                                          Resultado esperado: {Number(step.resultLiters).toLocaleString("es-MX")} Lt
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </details>
                    <div className="mt-4 space-y-2">
                      {ingredients.map((ing, index) => (
                        <div key={index} className="flex gap-2">
                          <select
                            value={ing.rawMaterialId}
                            onChange={(e) => setIngredients((prev) => prev.map((row, idx) => idx === index ? { ...row, rawMaterialId: e.target.value } : row))}
                            className="flex-1 rounded-lg border p-2 text-xs"
                          >
                            <option value="">Insumo</option>
                            {safeRM.filter((rm: any) => !rm.isArchived).map((rm: any) => (
                              <option key={rm.id} value={rm.id}>{rm.name} ({rm.unit})</option>
                            ))}
                          </select>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={ing.quantity || ""}
                            onChange={(e) => setIngredients((prev) => prev.map((row, idx) => idx === index ? { ...row, quantity: Number(e.target.value) } : row))}
                            className="w-24 rounded-lg border p-2 text-xs text-center"
                            placeholder="Cant."
                          />
                          {safeLocations.length > 0 && (
                            <select
                              value={ing.locationId}
                              onChange={(e) => setIngredients((prev) => prev.map((row, idx) => idx === index ? { ...row, locationId: e.target.value } : row))}
                              className="w-36 rounded-lg border p-2 text-xs"
                            >
                              {safeLocations.map((loc: any) => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                            </select>
                          )}
                          <button onClick={() => removeIngredientRow(index)} className="rounded-lg px-2 text-red-500 hover:bg-red-50">x</button>
                        </div>
                      ))}
                      {ingredients.length === 0 && <p className="text-xs italic text-slate-400">Sin insumos cargados aun</p>}
                    </div>
                  </div>

                  <Field label="Notas">
                    <textarea value={newProdNotes} onChange={(e) => setNewProdNotes(e.target.value)} rows={3} className="w-full rounded-lg border p-2 text-sm" />
                  </Field>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-950 p-5 text-white">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">Perfil {profile.type}</p>
                  <h4 className="mt-2 text-2xl font-black">{profile.title}</h4>
                  <p className="mt-3 text-sm text-slate-300">{profile.formulaSummary}</p>
                  <div className="mt-4 rounded-xl bg-white/10 p-3 text-sm">
                    Duracion estimada: <span className="font-black">{formatFormulaDuration(profile)}</span>
                  </div>
                  <div className="mt-4 space-y-2">
                    {(Object.entries(profile.parameters) as [ParameterKey, any][]).map(([key, range]) => (
                      <div key={key} className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-300">{range.label}</p>
                        <p className="mt-1 text-sm">Objetivo: {range.min} a {range.max}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {prodError && <p className="text-sm font-semibold text-rose-600">{prodError}</p>}

              <div className="flex gap-3">
                <button onClick={() => setShowCreateProd(false)} className="flex-1 rounded-lg border py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
                <button onClick={handleCreateProd} disabled={prodSaving} className="flex-1 rounded-lg bg-slate-950 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:bg-slate-300">
                  {prodSaving ? "Guardando..." : "Iniciar produccion"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreateTank && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
            <div className="space-y-4 p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-950">Nueva cubeta</h3>
                <button type="button" onClick={() => setShowCreateTank(false)} className="text-xl text-slate-400 hover:text-slate-700">x</button>
              </div>
              <Field label="Nombre">
                <input value={newTankName} onChange={(e) => setNewTankName(e.target.value)} required className="w-full rounded-lg border p-2 text-sm" />
              </Field>
              <Field label="Capacidad en litros">
                <input value={newTankCapacity} onChange={(e) => setNewTankCapacity(e.target.value)} type="number" min="0" step="0.1" className="w-full rounded-lg border p-2 text-sm" />
              </Field>
              {tankError && <p className="text-xs font-semibold text-rose-600">{tankError}</p>}
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowCreateTank(false)} className="flex-1 rounded-lg border py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
                <button type="button" onClick={handleCreateTank} disabled={tankSaving} className="flex-1 rounded-lg bg-slate-950 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:bg-slate-300">
                  {tankSaving ? "Creando..." : "Crear"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedProd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="space-y-4 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-950">{selectedProd.name}</h3>
                  <p className="text-xs text-slate-500">Tipo {selectedProd.productType} | Cubeta {selectedProd.tank?.name || "-"}</p>
                </div>
                <button onClick={() => setSelectedProd(null)} className="text-xl text-slate-400 hover:text-slate-700">x</button>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-xl bg-slate-50 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Fase 1</p>
                  <p className="mt-2 text-sm font-bold text-slate-900">{selectedProd.inputLiters != null ? `${Number(selectedProd.inputLiters)} Lt` : "-"}</p>
                </div>
                <div className="rounded-xl bg-violet-50 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-violet-400">Fase 2</p>
                  <p className="mt-2 text-sm font-bold text-violet-900">{selectedProdPhase2 ? fmtDate(selectedProdPhase2.measuredAt) : "Pendiente"}</p>
                </div>
                <div className="rounded-xl bg-emerald-50 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-400">Fase 3</p>
                  <p className="mt-2 text-sm font-bold text-emerald-900">{selectedProdPhase3?.remainingLiters != null ? `${Number(selectedProdPhase3.remainingLiters)} Lt` : "Pendiente"}</p>
                </div>
                <div className="rounded-xl bg-slate-950 px-4 py-3 text-white">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/60">Salida final</p>
                  <p className="mt-2 text-sm font-bold">{selectedProd.litersProduced != null ? `${Number(selectedProd.litersProduced)} Lt` : "-"}</p>
                </div>
              </div>

              {selectedProd.formula?.steps?.length ? (
                <FormulaStepsChecklist
                  formula={selectedProd.formula}
                  title="Checklist de fórmula"
                  description="Aquí ves qué hacer en cada paso, con qué insumos y el resultado esperado."
                />
              ) : null}

              {selectedProd.status === "IN_PROGRESS" && (
                <div className="flex gap-2 border-b pb-3">
                  <button onClick={() => setProdView("params")} className={subTabClass(prodView === "params")}>Parametros</button>
                  <button onClick={() => setProdView("additions")} className={subTabClass(prodView === "additions")}>Insumos</button>
                  {selectedProdPhase3 && <button onClick={() => { setProdView("complete"); setCompleteAction("MAINTAIN"); }} className={subTabClass(prodView === "complete")}>Completar</button>}
                </div>
              )}

              {prodView === "params" && (
                <div className="space-y-4">
                  {selectedProd.status === "IN_PROGRESS" && (
                    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                      <p className="text-sm font-black text-blue-800">Registrar medicion</p>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <Field label="Fecha y hora">
                          <input type="datetime-local" value={paramDate} onChange={(e) => setParamDate(e.target.value)} className="w-full rounded-lg border p-2 text-xs" />
                        </Field>
                        <div className="grid grid-cols-2 gap-2 md:col-span-1">
                          <MiniField label="pH"><input type="number" step="0.01" value={paramPh} onChange={(e) => setParamPh(e.target.value)} className="w-full rounded-lg border p-2 text-xs text-center" /></MiniField>
                          <MiniField label="Brix"><input type="number" step="0.01" value={paramBrix} onChange={(e) => setParamBrix(e.target.value)} className="w-full rounded-lg border p-2 text-xs text-center" /></MiniField>
                          <MiniField label="Temperatura"><input type="number" step="0.01" value={paramTemp} onChange={(e) => setParamTemp(e.target.value)} className="w-full rounded-lg border p-2 text-xs text-center" /></MiniField>
                          <MiniField label="Acidez"><input type="number" step="0.01" value={paramAcid} onChange={(e) => setParamAcid(e.target.value)} className="w-full rounded-lg border p-2 text-xs text-center" /></MiniField>
                        </div>
                      </div>
                      <Field label="Notas">
                        <input value={paramNotes} onChange={(e) => setParamNotes(e.target.value)} className="w-full rounded-lg border p-2 text-xs" />
                      </Field>
                      {!currentParamCheck.ok && (
                        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                          Parametros fuera de rango: {currentParamCheck.failing.map((item) => `${item.label} (${item.actual})`).join(", ")}
                        </div>
                      )}
                      {paramError && <p className="mt-3 text-xs font-semibold text-rose-600">{paramError}</p>}
                      <button onClick={handleRecordParam} disabled={paramSaving} className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:bg-slate-300">
                        {paramSaving ? "Guardando..." : "Registrar medicion"}
                      </button>
                    </div>
                  )}

                  <div className="overflow-x-auto rounded-xl border">
                    <table className="w-full text-[11px]">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="border px-2 py-2 text-left">Fecha</th>
                          <th className="border px-2 py-2">pH</th>
                          <th className="border px-2 py-2">Brix</th>
                          <th className="border px-2 py-2">Temp</th>
                          <th className="border px-2 py-2">Acidez</th>
                          <th className="border px-2 py-2 text-left">Notas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedProd.parameters?.length ? [...selectedProd.parameters]
                          .sort((a: any, b: any) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime())
                          .map((pm: any) => {
                            const check = evaluateProductionParametersWithFormula(selectedProd.formula, selectedProd.productType, {
                              ph: pm.ph != null ? Number(pm.ph) : undefined,
                              brix: pm.brix != null ? Number(pm.brix) : undefined,
                              temperature: pm.temperature != null ? Number(pm.temperature) : undefined,
                              acidity: pm.acidity != null ? Number(pm.acidity) : undefined,
                            });
                            return (
                              <tr key={pm.id} className={check.ok ? "bg-white" : "bg-amber-50"}>
                                <td className="border px-2 py-2">{fmtDate(pm.measuredAt)}</td>
                                <td className="border px-2 py-2 text-center">{pm.ph != null ? Number(pm.ph) : "-"}</td>
                                <td className="border px-2 py-2 text-center">{pm.brix != null ? Number(pm.brix) : "-"}</td>
                                <td className="border px-2 py-2 text-center">{pm.temperature != null ? Number(pm.temperature) : "-"}</td>
                                <td className="border px-2 py-2 text-center">{pm.acidity != null ? Number(pm.acidity) : "-"}</td>
                                <td className="border px-2 py-2">{pm.notes || (check.ok ? "-" : `Fuera de rango: ${check.failing.map((item) => item.label).join(", ")}`)}</td>
                              </tr>
                            );
                          }) : (
                          <tr><td colSpan={6} className="px-4 py-6 text-center italic text-slate-400">Sin mediciones aun</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {prodView === "additions" && selectedProd.status === "IN_PROGRESS" && (
                <div className="space-y-4">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-black text-slate-900">Insumos iniciales</p>
                      <div className="mt-3 space-y-2">
                        {selectedProd.ingredients?.length ? selectedProd.ingredients.map((ing: any) => (
                          <div key={ing.id} className="rounded-lg bg-white px-3 py-2 text-sm text-slate-600">
                            {ing.rawMaterial?.name} {Number(ing.quantity)} {ing.rawMaterial?.unit}
                          </div>
                        )) : (
                          <p className="text-xs italic text-slate-400">Sin insumos iniciales registrados.</p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
                      <p className="text-sm font-black text-violet-900">Adiciones de fase 2</p>
                      <div className="mt-3 space-y-2">
                        {selectedProd.additions?.filter((addition: any) => isPhase2Addition(addition)).length ? selectedProd.additions
                          .filter((addition: any) => isPhase2Addition(addition))
                          .map((addition: any) => (
                            <div key={addition.id} className="rounded-lg bg-white px-3 py-2 text-sm text-violet-700">
                              <div className="font-semibold">
                                {addition.rawMaterial?.name} {Number(addition.quantity)} {addition.rawMaterial?.unit}
                              </div>
                              <div className="mt-1 text-xs text-violet-500">
                                {addition.location?.name || "Sin ubicacion"} | {fmtDate(addition.addedAt)}
                              </div>
                            </div>
                          )) : (
                          <p className="text-xs italic text-violet-500">Todavia no hay adiciones registradas en fase 2.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <Field label="Insumo">
                    <select value={addRM} onChange={(e) => setAddRM(e.target.value)} className="w-full rounded-lg border p-2 text-sm">
                      <option value="">Selecciona</option>
                      {safeRM.filter((rm: any) => !rm.isArchived).map((rm: any) => (
                        <option key={rm.id} value={rm.id}>{rm.name} ({rm.unit})</option>
                      ))}
                    </select>
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Cantidad">
                      <input type="number" min="0" step="0.01" value={addQty} onChange={(e) => setAddQty(e.target.value)} className="w-full rounded-lg border p-2 text-sm text-center" />
                    </Field>
                    <Field label="Ubicacion">
                      <select value={addLoc} onChange={(e) => setAddLoc(e.target.value)} className="w-full rounded-lg border p-2 text-sm">
                        {safeLocations.map((loc: any) => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                      </select>
                    </Field>
                  </div>
                  <Field label="Notas">
                    <input value={addNotes} onChange={(e) => setAddNotes(e.target.value)} className="w-full rounded-lg border p-2 text-sm" />
                  </Field>
                  {addError && <p className="text-xs font-semibold text-rose-600">{addError}</p>}
                  <button onClick={handleAddIngredient} disabled={addSaving} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-white hover:bg-amber-600 disabled:bg-slate-300">
                    {addSaving ? "Registrando..." : "Registrar insumo"}
                  </button>
                </div>
              )}

              {prodView === "complete" && selectedProd.status === "IN_PROGRESS" && selectedProdPhase3 && (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                  <p className="text-sm font-black text-emerald-800">Finalizar produccion</p>
                  <p className="mt-2 text-xs text-emerald-700">
                    Al finalizar puedes mantener el lote, marcarlo para unificación o darlo de salida. La cubeta seguirá ocupada hasta vaciarla.
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <Field label="Litros producidos">
                      <input type="number" min="0" step="0.1" value={completeLt} onChange={(e) => setCompleteLt(e.target.value)} className="w-full rounded-lg border p-2 text-sm text-center" />
                    </Field>
                    <Field label="Notas finales">
                      <textarea value={completeNotes} onChange={(e) => setCompleteNotes(e.target.value)} rows={2} className="w-full rounded-lg border p-2 text-sm" />
                    </Field>
                  </div>
                  <div className="mt-3 rounded-xl border border-emerald-200 bg-white p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Destino del lote</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      {[
                        { value: "MAINTAIN", label: "Mantener", desc: "Queda en inventario dentro de la cubeta." },
                        { value: "UNIFY", label: "Unificar", desc: "Queda listo para unificarse con otros del mismo tipo." },
                        { value: "DISPATCH", label: "Dar salida", desc: "Se registra como lote con salida asignada." },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setCompleteAction(option.value as "MAINTAIN" | "UNIFY" | "DISPATCH")}
                          className={`rounded-xl border px-3 py-3 text-left transition ${
                            completeAction === option.value ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-600"
                          }`}
                        >
                          <p className="text-sm font-black">{option.label}</p>
                          <p className="mt-1 text-[11px]">{option.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                  <button onClick={handleComplete} disabled={completeSaving || !completeLt} className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:bg-slate-300">
                    {completeSaving ? "Guardando..." : completeAction === "UNIFY" ? "Finalizar y marcar para unificación" : completeAction === "DISPATCH" ? "Finalizar y dar salida" : "Finalizar y mantener"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showSecondPhaseModal && secondPhaseTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="space-y-4 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-950">Iniciar segunda fase</h3>
                  <p className="text-xs text-slate-500">{secondPhaseTarget.name} | Tipo {secondPhaseTarget.productType}</p>
                </div>
                <button onClick={() => setShowSecondPhaseModal(false)} className="text-xl text-slate-400 hover:text-slate-700">x</button>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Como se recibio el producto">
                  <select value={phase2Condition} onChange={(e) => setPhase2Condition(e.target.value)} className="w-full rounded-lg border p-2 text-sm">
                    <option value="Aceptado">Aceptado</option>
                    <option value="Observado">Observado</option>
                    <option value="Requiere ajuste">Requiere ajuste</option>
                  </select>
                </Field>
                <Field label="Fecha y hora de lectura">
                  <input type="datetime-local" value={phase2Date} onChange={(e) => setPhase2Date(e.target.value)} className="w-full rounded-lg border p-2 text-sm" />
                </Field>
                <Field label="Quien recibio">
                  <input value={phase2ReceivedBy} onChange={(e) => setPhase2ReceivedBy(e.target.value)} className="w-full rounded-lg border p-2 text-sm" />
                </Field>
                <Field label="Quien tomo parametros">
                  <input value={phase2MeasuredBy} onChange={(e) => setPhase2MeasuredBy(e.target.value)} className="w-full rounded-lg border p-2 text-sm" />
                </Field>
                <Field label="Quien inicio fase dos">
                  <input value={phase2StartedBy} onChange={(e) => setPhase2StartedBy(e.target.value)} className="w-full rounded-lg border p-2 text-sm" />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <MiniField label="pH"><input type="number" step="0.01" value={phase2Ph} onChange={(e) => setPhase2Ph(e.target.value)} className="w-full rounded-lg border p-2 text-xs text-center" /></MiniField>
                <MiniField label="Brix"><input type="number" step="0.01" value={phase2Brix} onChange={(e) => setPhase2Brix(e.target.value)} className="w-full rounded-lg border p-2 text-xs text-center" /></MiniField>
                <MiniField label="Temperatura"><input type="number" step="0.01" value={phase2Temp} onChange={(e) => setPhase2Temp(e.target.value)} className="w-full rounded-lg border p-2 text-xs text-center" /></MiniField>
                <MiniField label="Acidez"><input type="number" step="0.01" value={phase2Acid} onChange={(e) => setPhase2Acid(e.target.value)} className="w-full rounded-lg border p-2 text-xs text-center" /></MiniField>
              </div>

              {!phase2Check.ok && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                  Parametros fuera de rango para fase dos: {phase2Check.failing.map((item) => `${item.label} (${item.actual})`).join(", ")}
                </div>
              )}

              <div className="rounded-xl border border-violet-100 bg-violet-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-violet-900">Insumos adicionales de fase 2</p>
                    <p className="text-xs text-violet-700">Aqui puedes agregar productos extra que entren justo al iniciar esta fase.</p>
                  </div>
                  <button onClick={addPhase2IngredientRow} type="button" className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-violet-700 hover:bg-violet-100">
                    Agregar producto
                  </button>
                </div>

                <div className="mt-4 space-y-2">
                  {phase2Additions.map((ing, index) => (
                    <div key={index} className="flex flex-wrap gap-2">
                      <select
                        value={ing.rawMaterialId}
                        onChange={(e) => setPhase2Additions((prev) => prev.map((row, idx) => idx === index ? { ...row, rawMaterialId: e.target.value } : row))}
                        className="min-w-[220px] flex-1 rounded-lg border p-2 text-xs"
                      >
                        <option value="">Producto / insumo</option>
                        {safeRM.filter((rm: any) => !rm.isArchived).map((rm: any) => (
                          <option key={rm.id} value={rm.id}>{rm.name} ({rm.unit})</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={ing.quantity || ""}
                        onChange={(e) => setPhase2Additions((prev) => prev.map((row, idx) => idx === index ? { ...row, quantity: Number(e.target.value) } : row))}
                        className="w-28 rounded-lg border p-2 text-xs text-center"
                        placeholder="Cantidad"
                      />
                      <select
                        value={ing.locationId}
                        onChange={(e) => setPhase2Additions((prev) => prev.map((row, idx) => idx === index ? { ...row, locationId: e.target.value } : row))}
                        className="min-w-[180px] rounded-lg border p-2 text-xs"
                      >
                        <option value="">Ubicacion</option>
                        {safeLocations.map((loc: any) => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                      </select>
                      <button onClick={() => removePhase2IngredientRow(index)} type="button" className="rounded-lg px-3 text-rose-600 hover:bg-rose-100">
                        x
                      </button>
                    </div>
                  ))}
                  {phase2Additions.length === 0 && (
                    <p className="text-xs italic text-violet-700/80">No hay productos adicionales capturados para esta fase.</p>
                  )}
                </div>
              </div>

              <Field label="Notas">
                <textarea value={phase2Notes} onChange={(e) => setPhase2Notes(e.target.value)} rows={3} className="w-full rounded-lg border p-2 text-sm" />
              </Field>

              {phase2Error && <p className="text-sm font-semibold text-rose-600">{phase2Error}</p>}

              <div className="flex gap-3">
                <button onClick={() => setShowSecondPhaseModal(false)} className="flex-1 rounded-lg border py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
                <button onClick={handleSecondPhase} disabled={phase2Saving} className="flex-1 rounded-lg bg-violet-600 py-2 text-sm font-bold text-white hover:bg-violet-700 disabled:bg-slate-300">
                  {phase2Saving ? "Guardando..." : "Guardar fase dos"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showThirdPhaseModal && thirdPhaseTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="space-y-4 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-950">Iniciar fase 3: extraccion</h3>
                  <p className="text-xs text-slate-500">{thirdPhaseTarget.name} | Tipo {thirdPhaseTarget.productType}</p>
                </div>
                <button onClick={() => setShowThirdPhaseModal(false)} className="text-xl text-slate-400 hover:text-slate-700">x</button>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Fecha y hora de extraccion">
                  <input type="datetime-local" value={phase3Date} onChange={(e) => setPhase3Date(e.target.value)} className="w-full rounded-lg border p-2 text-sm" />
                </Field>
                <Field label="Litros que quedan en el contenedor">
                  <input type="number" min="0" step="0.1" value={phase3RemainingLiters} onChange={(e) => setPhase3RemainingLiters(e.target.value)} className="w-full rounded-lg border p-2 text-sm text-center" />
                </Field>
              </div>

              <Field label="Notas">
                <textarea value={phase3Notes} onChange={(e) => setPhase3Notes(e.target.value)} rows={3} className="w-full rounded-lg border p-2 text-sm" />
              </Field>

              {phase3Error && <p className="text-sm font-semibold text-rose-600">{phase3Error}</p>}

              <div className="flex gap-3">
                <button onClick={() => setShowThirdPhaseModal(false)} className="flex-1 rounded-lg border py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
                <button onClick={handleThirdPhase} disabled={phase3Saving} className="flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:bg-slate-300">
                  {phase3Saving ? "Guardando..." : "Guardar fase 3"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-950">PIN de registro NFC</h3>
              <button onClick={() => setShowPinModal(false)} className="text-xl text-slate-400 hover:text-slate-700">x</button>
            </div>
            <Field label="Nuevo PIN">
              <input type="password" value={newPin} onChange={(e) => setNewPin(e.target.value)} className="w-full rounded-lg border p-3 text-center text-lg font-bold tracking-[0.4em]" />
            </Field>
            {pinMsg && <p className={`text-sm font-semibold ${pinMsg.toLowerCase().includes("actualizado") ? "text-emerald-600" : "text-rose-600"}`}>{pinMsg}</p>}
            <div className="mt-4 flex gap-3">
              <button onClick={() => setShowPinModal(false)} className="flex-1 rounded-lg border py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
              <button onClick={handleSavePin} disabled={pinSaving || newPin.length < 4} className="flex-1 rounded-lg bg-slate-950 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:bg-slate-300">
                {pinSaving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function isPhase2Addition(addition: any) {
  return typeof addition?.notes === "string" && addition.notes.toLowerCase().startsWith("fase 2");
}

function FormulaStepsChecklist({
  formula,
  title,
  description,
}: {
  formula: any;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-violet-950">{title}</p>
          <p className="mt-1 text-xs text-violet-700">{description}</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-violet-700">
          {formula?.targetLiters != null ? `${Number(formula.targetLiters).toLocaleString("es-MX")} Lt` : "Sin litros objetivo"}
        </span>
      </div>
      <div className="mt-4 space-y-3">
        {formula.steps.map((step: any, index: number) => (
          <div key={step.id || `${formula.id}-step-${index}`} className="rounded-2xl border border-violet-100 bg-white p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-violet-400 text-[11px] font-black text-violet-700">
                {index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-violet-950">{step.title || `Paso ${index + 1}`}</p>
                {step.instructions && <p className="mt-1 text-sm text-violet-900">{step.instructions}</p>}
                <div className="mt-3 space-y-1">
                  {step.items?.length ? step.items.map((item: any, itemIndex: number) => (
                    <div key={`${step.id || index}-item-${itemIndex}`} className="flex items-start gap-2 text-xs text-violet-800">
                      <span className="mt-1 inline-block h-3 w-3 rounded-sm border border-violet-400 bg-white" />
                      <span>{formatStepIngredient(item)}</span>
                    </div>
                  )) : (
                    <p className="text-xs italic text-violet-700">Sin insumos definidos para este paso.</p>
                  )}
                </div>
                {step.resultLiters != null && (
                  <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-violet-700">
                    Resultado esperado: {Number(step.resultLiters).toLocaleString("es-MX")} Lt
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold text-slate-600">{label}</label>
      {children}
    </div>
  );
}

function MiniField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{label}</label>
      {children}
    </div>
  );
}

function CalcChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}

function tabClass(active: boolean) {
  return active
    ? "rounded-lg bg-slate-950 px-4 py-2 text-xs font-bold text-white"
    : "rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50";
}

function filterClass(active: boolean) {
  return active
    ? "rounded-lg bg-slate-950 px-3 py-1.5 text-[11px] font-bold text-white"
    : "rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-500 hover:bg-slate-50";
}

function subTabClass(active: boolean) {
  return active
    ? "rounded-lg bg-slate-950 px-3 py-1.5 text-[11px] font-bold text-white"
    : "rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50";
}
