"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addProductionIngredient,
  cancelFinalBeverageBlend,
  cancelProduction,
  completeProduction,
  createProduction,
  createFinalBeverageBlend,
  recordProductionParameter,
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
type RecipeBoardFilter = "ALL" | "ACIDIFIER" | "SCOOBY" | "FLAVOR";
type FermentationStatusFilter = "ALL" | "IN_PROGRESS" | "COMPLETED";

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
  batchLiters: number,
  rawMaterials: any[],
  defaultLocationId?: string,
): IngredientInput[] {
  if (!formula || !(batchLiters > 0)) return [];

  const rows: IngredientInput[] = [];
  const blendItems = Array.isArray(formula.blendItems) ? formula.blendItems : [];
  const flavorItems = Array.isArray(formula.flavorIngredients) ? formula.flavorIngredients : [];

  blendItems.forEach((item) => {
    if (!item.rawMaterialId) return;
    const quantity = Number(item.gramsPerLiter || 0) * batchLiters;
    if (!(quantity > 0)) return;
    rows.push({
      rawMaterialId: item.rawMaterialId,
      quantity,
      locationId: defaultLocationId || "",
    });
  });

  flavorItems.forEach((item) => {
    if (!item.rawMaterialId) return;
    const quantity = Number(item.quantity || 0) * batchLiters;
    if (!(quantity > 0)) return;
    rows.push({
      rawMaterialId: item.rawMaterialId,
      quantity,
      locationId: defaultLocationId || "",
    });
  });

  const sugarMaterial = findRawMaterialByKeywords(rawMaterials, ["azúcar", "azucar", "sugar"]);
  const sugarQuantity = Number(formula.sugarGramsPerLiter || 0) * batchLiters;
  if (sugarMaterial?.id && sugarQuantity > 0) {
    rows.push({
      rawMaterialId: sugarMaterial.id,
      quantity: sugarQuantity,
      locationId: defaultLocationId || "",
    });
  }

  const waterMaterial = findRawMaterialByKeywords(rawMaterials, ["agua", "water"]);
  const hotWaterQuantity = batchLiters * (Number(formula.brewWaterPercent || 0) / 100);
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

function formatFinalBlendProductionName(dateValue: string, flavorName?: string | null) {
  const date = dateValue ? new Date(dateValue) : null;
  const formattedDate =
    date && !Number.isNaN(date.getTime())
      ? date.toLocaleString("es-MX", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";
  const flavor = flavorName?.trim() || "Sin sabor";
  return formattedDate ? `${formattedDate} - ${flavor}` : flavor;
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

function resolveRawMaterialAvailableQuantity(rawMaterial: any, locationId?: string) {
  const stocks = Array.isArray(rawMaterial?.stocks) ? rawMaterial.stocks : [];
  if (locationId) {
    const locationStock = stocks.find((stock: any) => String(stock.locationId || stock.location?.id || "") === String(locationId));
    return Number(locationStock?.quantity ?? 0);
  }
  return stocks.reduce((sum: number, stock: any) => sum + Number(stock.quantity ?? 0), 0);
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

export default function TabProduccion({
  tanks,
  storageTanks,
  productions,
  rawMaterials,
  locations,
  formulas,
  flavors,
  baseBeverageInventory,
  finalBeverageBlends,
  userEmail,
}: any) {
  const FERMENTATION_PAGE_SIZE = 25;
  const router = useRouter();
  const safeTanks = Array.isArray(tanks) ? tanks : [];
  const safeStorageTanks = Array.isArray(storageTanks) ? storageTanks : [];
  const safeProductions = Array.isArray(productions) ? productions : [];
  const safeRM = Array.isArray(rawMaterials) ? rawMaterials : [];
  const safeLocations = Array.isArray(locations) ? locations : [];
  const safeFormulas = Array.isArray(formulas) ? formulas : [];
  const safeBaseBeverageInventory = Array.isArray(baseBeverageInventory) ? baseBeverageInventory : [];

  const [nfcBaseUrl, setNfcBaseUrl] = useState("");
  React.useEffect(() => {
    setNfcBaseUrl(resolvePublicAppUrl(window.location.origin));
  }, []);

  const [view, setView] = useState<"producciones" | "final">("producciones");
  const [recipeFilter, setRecipeFilter] = useState<RecipeBoardFilter>("ALL");
  const [fermentationStatusFilter, setFermentationStatusFilter] = useState<FermentationStatusFilter>("ALL");
  const [fermentationSearch, setFermentationSearch] = useState("");
  const [fermentationStartDate, setFermentationStartDate] = useState("");
  const [fermentationEndDate, setFermentationEndDate] = useState("");
  const [fermentationPage, setFermentationPage] = useState(1);
  const [showCreateProd, setShowCreateProd] = useState(false);
  const [selectedProd, setSelectedProd] = useState<any | null>(null);
  const [selectedFormulaLotId, setSelectedFormulaLotId] = useState("");
  const [prodView, setProdView] = useState<ProdView>("params");
  const [showSecondPhaseModal, setShowSecondPhaseModal] = useState(false);
  const [secondPhaseTarget, setSecondPhaseTarget] = useState<any | null>(null);
  const [showThirdPhaseModal, setShowThirdPhaseModal] = useState(false);
  const [thirdPhaseTarget, setThirdPhaseTarget] = useState<any | null>(null);

  const [newProdType, setNewProdType] = useState<string>("");
  const [newProdTank, setNewProdTank] = useState("");
  const [newProdStart, setNewProdStart] = useState(() => new Date().toISOString().slice(0, 16));
  const [newProdStartedLiters, setNewProdStartedLiters] = useState("");
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

  const [completeNotes, setCompleteNotes] = useState("");
  const [completeSaving, setCompleteSaving] = useState(false);
  const [completeError, setCompleteError] = useState("");
  const [completionDestination, setCompletionDestination] = useState<"BUCKET" | "STORAGE_TANK">("BUCKET");
  const [completeAllocations, setCompleteAllocations] = useState<Array<{ storageTankId: string; liters: string }>>([]);

  const [phase2Condition, setPhase2Condition] = useState("Aceptado");
  const [phase2ReceivedBy, setPhase2ReceivedBy] = useState("");
  const [phase2MeasuredBy, setPhase2MeasuredBy] = useState("");
  const [phase2StartedBy, setPhase2StartedBy] = useState(userEmail || "");
  const [phase2Date, setPhase2Date] = useState(() => new Date().toISOString().slice(0, 16));
  const [phase2ReceivedLiters, setPhase2ReceivedLiters] = useState("");
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
  const [phase3Ph, setPhase3Ph] = useState("");
  const [phase3Brix, setPhase3Brix] = useState("");
  const [phase3Temp, setPhase3Temp] = useState("");
  const [phase3Acid, setPhase3Acid] = useState("");
  const [phase3Notes, setPhase3Notes] = useState("");
  const [phase3Saving, setPhase3Saving] = useState(false);
  const [phase3Error, setPhase3Error] = useState("");
  const [finalBlendProductionDate, setFinalBlendProductionDate] = useState("");
  const [finalBlendFlavorId, setFinalBlendFlavorId] = useState("");
  const [finalBlendTargetLiters, setFinalBlendTargetLiters] = useState("");
  const [finalBlendTargetBrix, setFinalBlendTargetBrix] = useState("");
  const [finalBlendSugarGramsPerLiter, setFinalBlendSugarGramsPerLiter] = useState("");
  const [finalBlendWaterPercent, setFinalBlendWaterPercent] = useState("");
  const [finalBlendAcidifierPercent, setFinalBlendAcidifierPercent] = useState("");
  const [finalBlendScoobyPercent, setFinalBlendScoobyPercent] = useState("");
  const [finalBlendFlavorPercent, setFinalBlendFlavorPercent] = useState("");
  const [finalBlendSweetTeaBaseLiters, setFinalBlendSweetTeaBaseLiters] = useState("3.6");
  const [finalBlendSweetTeaReferenceLiters, setFinalBlendSweetTeaReferenceLiters] = useState("19");
  const [finalBlendNotes, setFinalBlendNotes] = useState("");
  const [finalBlendSaving, setFinalBlendSaving] = useState(false);
  const [finalBlendError, setFinalBlendError] = useState("");
  const [finalBlendRows, setFinalBlendRows] = useState<Array<{
    sourceType: "BASE_LOT" | "FLAVOR_RECIPE";
    sourceId: string;
    liters: string;
    brixOverride: string;
  }>>([{ sourceType: "BASE_LOT", sourceId: "", liters: "", brixOverride: "" }]);

  const productionFormulaOptions = useMemo(() => {
    return safeFormulas
      .filter((formula: any) => formula?.isActive)
      .sort((a: any, b: any) => String(a?.name || "").localeCompare(String(b?.name || ""), "es-MX", { sensitivity: "base" }));
  }, [safeFormulas]);

  const formulasByCode = useMemo(() => {
    const map = new Map<string, any>();
    productionFormulaOptions.forEach((formula: any) => {
      if (formula?.isActive) {
        map.set(formula.code, formula);
      }
    });
    return map;
  }, [productionFormulaOptions]);

  useEffect(() => {
    setSelectedFormulaLotId("");
    setSelectedProd(null);
    setProdView("params");
    setFermentationPage(1);
  }, [recipeFilter, fermentationStatusFilter, fermentationSearch, fermentationStartDate, fermentationEndDate]);

  const recipeBoardTabs = useMemo(() => {
    const tabs: Array<{ value: RecipeBoardFilter; label: string }> = [
      { value: "ALL", label: "Todos" },
      { value: "ACIDIFIER", label: "Acidificante" },
      { value: "SCOOBY", label: "Scooby" },
      { value: "FLAVOR", label: "Saborizante" },
    ];

    return tabs.map((tab) => ({
      ...tab,
      count:
        tab.value === "ALL"
          ? safeProductions.length
          : safeProductions.filter((production: any) => {
              const formula = production.formula || formulasByCode.get(production.productType) || null;
              return formula?.recipeType === tab.value;
            }).length,
    }));
  }, [safeProductions, formulasByCode]);

  const fermentationRows = useMemo(() => {
    const searchTerm = fermentationSearch.trim().toLowerCase();
    const startDate = fermentationStartDate ? new Date(`${fermentationStartDate}T00:00:00`) : null;
    const endDate = fermentationEndDate ? new Date(`${fermentationEndDate}T23:59:59.999`) : null;

    return safeProductions
      .map((production: any) => {
        const formula = production.formula || formulasByCode.get(production.productType) || null;
        const metrics = getFermentationMetrics(production, formula);
        return { production, formula, metrics };
      })
      .filter(({ production, formula }) => {
        const recipeMatches = recipeFilter === "ALL" ? true : formula?.recipeType === recipeFilter;
        const statusMatches =
          fermentationStatusFilter === "ALL" ? true : String(production.status) === fermentationStatusFilter;
        const searchMatches =
          !searchTerm ||
          String(production.name || "").toLowerCase().includes(searchTerm) ||
          String(production.tank?.name || "").toLowerCase().includes(searchTerm);
        const startedAt = new Date(production.startedAt);
        const startMatches = !startDate || startedAt >= startDate;
        const endMatches = !endDate || startedAt <= endDate;
        return recipeMatches && statusMatches && searchMatches && startMatches && endMatches;
      })
      .sort((a, b) => {
        const aValue = a.metrics.remainingDays ?? Number.POSITIVE_INFINITY;
        const bValue = b.metrics.remainingDays ?? Number.POSITIVE_INFINITY;
        if (aValue !== bValue) return aValue - bValue;
        return new Date(b.production.startedAt).getTime() - new Date(a.production.startedAt).getTime();
      });
  }, [
    safeProductions,
    formulasByCode,
    recipeFilter,
    fermentationStatusFilter,
    fermentationSearch,
    fermentationStartDate,
    fermentationEndDate,
  ]);

  const fermentationTotalPages = Math.max(1, Math.ceil(fermentationRows.length / FERMENTATION_PAGE_SIZE));
  const safeFermentationPage = Math.min(fermentationPage, fermentationTotalPages);
  const paginatedFermentationRows = useMemo(() => {
    const start = (safeFermentationPage - 1) * FERMENTATION_PAGE_SIZE;
    return fermentationRows.slice(start, start + FERMENTATION_PAGE_SIZE);
  }, [fermentationRows, safeFermentationPage]);

  useEffect(() => {
    const firstLot = fermentationRows[0];
    if (!firstLot) {
      setSelectedFormulaLotId("");
      return;
    }

    if (!selectedFormulaLotId || !fermentationRows.some((lot) => lot.production.id === selectedFormulaLotId)) {
      setSelectedFormulaLotId(firstLot.production.id);
    }
  }, [fermentationRows, selectedFormulaLotId]);

  const selectedFormulaLot = useMemo(() => {
    return fermentationRows.find((lot) => lot.production.id === selectedFormulaLotId) || fermentationRows[0] || null;
  }, [fermentationRows, selectedFormulaLotId]);

  const formulaOptions = productionFormulaOptions;
  const formulaStorageAvailability = useMemo(() => {
    const map = new Map<string, { liters: number; tanks: Array<{ id: string; name: string; liters: number }> }>();

    safeStorageTanks.forEach((tank: any) => {
      const tankEntries = Array.isArray(tank.entries) ? tank.entries : [];
      tankEntries.forEach((entry: any) => {
        const formulaId = String(entry?.productionFormulaId || "").trim();
        const remaining = Number((entry?.litersRemaining ?? entry?.litersAdded) || 0);
        if (!formulaId || !(remaining > 0)) return;

        const current = map.get(formulaId) || { liters: 0, tanks: [] };
        const tankMatch = current.tanks.find((item) => item.id === tank.id);
        if (tankMatch) {
          tankMatch.liters += remaining;
        } else {
          current.tanks.push({ id: tank.id, name: tank.name, liters: remaining });
        }
        current.liters += remaining;
        map.set(formulaId, current);
      });
    });

    return map;
  }, [safeStorageTanks]);

  const flavorFormulaOptions = useMemo(() => {
    return safeFormulas
      .filter((formula: any) => formula?.isActive && formula?.recipeType === "FLAVOR")
      .map((formula: any) => ({
        ...formula,
        availableLiters: Number(formulaStorageAvailability.get(formula.id)?.liters || 0),
      }))
      .filter((formula: any) => Number(formula.availableLiters || 0) > 0)
      .sort((a: any, b: any) => String(a?.name || "").localeCompare(String(b?.name || ""), "es-MX", { sensitivity: "base" }));
  }, [safeFormulas, formulaStorageAvailability]);

  const productionById = useMemo(() => {
    const map = new Map<string, any>();
    safeProductions.forEach((production: any) => {
      map.set(production.id, production);
    });
    return map;
  }, [safeProductions]);

  const baseLotOptions = useMemo(() => {
    const isBaseFormulaType = (recipeType: string | null | undefined) =>
      recipeType === "ACIDIFIER" || recipeType === "SCOOBY";

    const bucketOptions = safeBaseBeverageInventory
      .filter((row: any) => Number(row?.litersRemaining || 0) > 0 && String(row?.status) !== "UNIFIED")
      .map((row: any) => {
        const production = productionById.get(row.productionId);
        const brix = resolveLatestBrixForProduction(production);
        return {
          id: row.id,
          sourceType: "BASE_LOT" as const,
          productionId: row.productionId,
          recipeType: production?.formula?.recipeType || null,
          label: `${row.production?.name || "Lote"}${production?.formula?.name ? ` · ${production.formula.name}` : ""} · Cubeta ${row.tank?.name || "-"}`,
          litersRemaining: Number(row.litersRemaining || 0),
          brix,
        };
      });

    const storageOptions = safeStorageTanks.flatMap((tank: any) => {
      const entries = Array.isArray(tank.entries) ? tank.entries : [];
      return entries.map((entry: any) => {
        const production = productionById.get(entry.productionId);
        const brix = resolveLatestBrixForProduction(production);
        const litersRemaining = Number((entry.litersRemaining ?? entry.litersAdded) || 0);
        return {
          id: entry.id,
          sourceType: "STORED_FORMULA" as const,
          productionId: entry.productionId,
          productionFormulaId: entry.productionFormulaId || production?.productionFormulaId || null,
          recipeType: production?.formula?.recipeType || null,
          storageTankId: tank.id,
          label: `${production?.name || entry.formulaLabel || "Lote"}${production?.formula?.name ? ` · ${production.formula.name}` : entry.formulaLabel ? ` · ${entry.formulaLabel}` : ""} · Tanque ${tank.name}`,
          litersRemaining,
          brix,
        };
      });
    });

    return [...bucketOptions, ...storageOptions]
      .filter((row: any) => Number(row.litersRemaining || 0) > 0 && isBaseFormulaType(row.recipeType))
      .sort((a: any, b: any) => String(a.label).localeCompare(String(b.label), "es-MX", { sensitivity: "base" }));
  }, [safeBaseBeverageInventory, safeStorageTanks, productionById]);

  const finalBlendList = Array.isArray(finalBeverageBlends) ? finalBeverageBlends : [];
  const safeFlavors = Array.isArray(flavors) ? flavors : [];
  const storageTankNameById = useMemo(() => {
    const map = new Map<string, string>();
    safeStorageTanks.forEach((tank: any) => {
      if (tank?.id) {
        map.set(String(tank.id), String(tank.name || "Tanque"));
      }
    });
    return map;
  }, [safeStorageTanks]);

  const selectedFinalBlendFlavor = safeFlavors.find((flavor: any) => flavor.id === finalBlendFlavorId) || null;
  const finalBlendProductionName = formatFinalBlendProductionName(finalBlendProductionDate, selectedFinalBlendFlavor?.name);
  const selectedProdFormulaCode = String(selectedProd?.formula?.code || selectedProd?.formulaCode || selectedProd?.productType || "").trim();

  const availableTanks = useMemo(() => {
    return safeTanks.filter((tank: any) => {
      const activeProd = safeProductions.find((p: any) => p.tankId === tank.id && p.status === "IN_PROGRESS");
      const heldInventory = safeBaseBeverageInventory.find((row: any) => row.tank?.id === tank.id && ["HELD", "AVAILABLE", "MIX_PENDING", "DISPATCHED"].includes(String(row.status)));
      return tank.isActive && !activeProd && !heldInventory;
    }).sort((a: any, b: any) => String(a.name || "").localeCompare(String(b.name || ""), "es-MX", { numeric: true, sensitivity: "base" }));
  }, [safeTanks, safeProductions, safeBaseBeverageInventory]);

  const availableStorageTanks = useMemo(() => {
    return safeStorageTanks
      .filter((tank: any) => {
        const capacityLt = tank.capacityLt != null ? Number(tank.capacityLt) : null;
        const currentLiters = Number(tank.currentLiters || 0);
        const freeCapacity = capacityLt != null ? capacityLt - currentLiters : Number.POSITIVE_INFINITY;
        const tankFormulaCode = String(tank.formulaCode || "").trim();
        const isEmpty = currentLiters <= 0 && !tankFormulaCode;
        const sameFormula = selectedProdFormulaCode && tankFormulaCode && tankFormulaCode === selectedProdFormulaCode;
        return tank.isActive !== false && freeCapacity > 0 && (isEmpty || sameFormula);
      })
      .map((tank: any) => {
        const capacityLt = tank.capacityLt != null ? Number(tank.capacityLt) : null;
        const currentLiters = Number(tank.currentLiters || 0);
        const freeCapacity = capacityLt != null ? Math.max(capacityLt - currentLiters, 0) : null;
        return {
          ...tank,
          currentLiters,
          capacityLt,
          freeCapacity,
          formulaLabel: tank.formulaName || tank.formulaCode || null,
        };
      })
      .sort((a: any, b: any) => String(a.name || "").localeCompare(String(b.name || ""), "es-MX", { numeric: true, sensitivity: "base" }));
  }, [safeStorageTanks, selectedProdFormulaCode]);

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
  const selectedTankForNewProd = availableTanks.find((tank: any) => tank.id === newProdTank) || null;
  const generatedProdName = newProdTank
    ? formatProductionName(newProdStart, selectedTankForNewProd?.name, selectedFormula?.code || newProdType || "F1")
    : "";
  const newProdBatchLiters = Number(newProdStartedLiters || 0);
  const projectedTeaTotal = Number(selectedFormula?.teaGramsPerLiter || 0) * newProdBatchLiters;
  const projectedSugarTotal = Number(selectedFormula?.sugarGramsPerLiter || 0) * newProdBatchLiters;
  const projectedStarterLiters = newProdBatchLiters * (Number(selectedFormula?.yeastPitchRatePercent || 0) / 100);
  const projectedHotWater = newProdBatchLiters * (Number(selectedFormula?.brewWaterPercent || 0) / 100);
  const projectedColdWater = Math.max(0, newProdBatchLiters - projectedHotWater);
  const projectedBlendItems = Array.isArray(selectedFormula?.blendItems)
    ? selectedFormula.blendItems
        .filter((item: any) => item?.rawMaterialId || item?.freeTextName)
        .map((item: any) => ({
          ...item,
          calculatedQuantity: Number(item.gramsPerLiter || 0) * newProdBatchLiters,
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
  const selectedProdLatestParam = Array.isArray(selectedProd?.parameters) && selectedProd.parameters.length
    ? [...selectedProd.parameters].sort((a: any, b: any) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime())[0]
    : null;
  const startedLiters = selectedProd?.startedLiters != null ? Number(selectedProd.startedLiters) : null;
  const phase2StartLiters = selectedProdPhase2?.receivedLiters != null ? Number(selectedProdPhase2.receivedLiters) : null;
  const finalLiters = selectedProdPhase3?.remainingLiters != null
    ? Number(selectedProdPhase3.remainingLiters)
    : selectedProd?.litersProduced != null
      ? Number(selectedProd.litersProduced)
      : null;
  const startedToFinalDifference = startedLiters != null && finalLiters != null ? finalLiters - startedLiters : null;
  const startedToFinalPercent = startedLiters != null && startedLiters > 0 && startedToFinalDifference != null ? (startedToFinalDifference / startedLiters) * 100 : null;
  const phase2ToFinalDifference = phase2StartLiters != null && finalLiters != null ? finalLiters - phase2StartLiters : null;
  const phase2ToFinalPercent = phase2StartLiters != null && phase2StartLiters > 0 && phase2ToFinalDifference != null ? (phase2ToFinalDifference / phase2StartLiters) * 100 : null;

  const completionAllocationTotal = completeAllocations.reduce((sum, row) => sum + Number(row.liters || 0), 0);
  const completionRemaining = Math.max(Number(phase3RemainingLiters || 0) - completionAllocationTotal, 0);
  const stockShortages = useMemo(() => {
    return ingredients
      .filter((item) => item.rawMaterialId && item.quantity > 0)
      .map((item) => {
        const rawMaterial = safeRM.find((rm: any) => rm.id === item.rawMaterialId);
        const available = resolveRawMaterialAvailableQuantity(rawMaterial, item.locationId || safeLocations[0]?.id);
        const shortage = Number(item.quantity) - Number(available);
        return {
          rawMaterialId: item.rawMaterialId,
          name: rawMaterial?.name || "Insumo",
          unit: rawMaterial?.unit || "",
          locationName:
            safeLocations.find((loc: any) => loc.id === item.locationId)?.name ||
            safeLocations[0]?.name ||
            "Sin ubicación",
          required: Number(item.quantity),
          available: Number(available),
          shortage,
        };
      })
      .filter((item) => item.shortage > 0)
      .sort((a, b) => b.shortage - a.shortage);
  }, [ingredients, safeRM, safeLocations]);

  useEffect(() => {
    if ((!newProdType || !formulasByCode.has(newProdType)) && formulaOptions[0]?.code) {
      setNewProdType(formulaOptions[0].code);
    }
  }, [newProdType, formulaOptions]);

  useEffect(() => {
    if (newProdTank && !availableTanks.some((tank: any) => tank.id === newProdTank)) {
      setNewProdTank("");
    }
  }, [availableTanks, newProdTank]);

  useEffect(() => {
    setIngredients(buildIngredientsFromFormula(selectedFormula, newProdBatchLiters, safeRM, safeLocations[0]?.id || ""));
  }, [selectedFormula, newProdBatchLiters, safeRM, safeLocations]);

  useEffect(() => {
    if (view === "final" && !finalBlendProductionDate) {
      setFinalBlendProductionDate(new Date().toISOString().slice(0, 16));
    }
  }, [view, finalBlendProductionDate]);

  const addIngredientRow = () => {
    setIngredients((prev) => [...prev, { rawMaterialId: "", quantity: 0, locationId: safeLocations[0]?.id || "" }]);
  };

  const removeIngredientRow = (index: number) => {
    setIngredients((prev) => prev.filter((_, idx) => idx !== index));
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
    if (!(newProdBatchLiters > 0)) {
      setProdError("Indica los litros iniciales del proceso");
      return;
    }

    const validIngredients = ingredients.filter((item) => item.rawMaterialId && item.quantity > 0);
    if (stockShortages.length > 0) {
      setProdError(
        `No tienes stock suficiente para: ${stockShortages
          .map((item) => `${item.name} (${item.locationName}) faltan ${Math.max(0, item.shortage).toLocaleString("es-MX")} ${item.unit || ""}`.trim())
          .join(", ")}`
      );
      return;
    }

    setProdSaving(true);
    const res = await createProduction({
      name: generatedProdName,
      productType: newProdType,
      productionFormulaId: selectedFormula?.id,
      tankId: newProdTank,
      startedAt: newProdStart,
      startedLiters: newProdStartedLiters.trim() ? Number(newProdStartedLiters) : undefined,
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
    setNewProdStartedLiters("");
    setNewProdNotes("");
    setIngredients([]);
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

  const openCompletePanel = (prod: any) => {
    setSelectedProd(prod);
    setProdView("complete");
    setCompleteError("");
    setCompletionDestination("BUCKET");
    setPhase3Date(new Date().toISOString().slice(0, 16));
    setPhase3RemainingLiters("");
    setPhase3Ph("");
    setPhase3Brix("");
    setPhase3Temp("");
    setPhase3Acid("");
    setPhase3Notes("");
    setCompleteNotes("");
    setCompleteAllocations([]);
  };

  const addCompletionAllocationRow = () => {
    setCompleteAllocations((current) => [...current, { storageTankId: "", liters: "" }]);
  };

  const selectCompletionDestination = (destination: "BUCKET" | "STORAGE_TANK") => {
    setCompletionDestination(destination);
    if (destination === "STORAGE_TANK") {
      setCompleteAllocations((current) => current.length > 0 ? current : [{ storageTankId: availableStorageTanks[0]?.id || "", liters: "" }]);
    }
  };

  const updateCompletionAllocationRow = (index: number, patch: Partial<{ storageTankId: string; liters: string }>) => {
    setCompleteAllocations((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  };

  const removeCompletionAllocationRow = (index: number) => {
    setCompleteAllocations((current) => current.filter((_, rowIndex) => rowIndex !== index));
  };

  const handleComplete = async () => {
    if (!selectedProd) return;
    if (!phase3RemainingLiters.trim()) {
      setCompleteError("Indica los litros finales para cerrar el proceso");
      setProdView("complete");
      return;
    }
    if (!phase3Ph.trim() || !phase3Brix.trim() || !phase3Temp.trim() || !phase3Acid.trim()) {
      setCompleteError("Completa la medición final: pH, Brix, temperatura y acidez");
      setProdView("complete");
      return;
    }

    const finalLotLiters = Number(phase3RemainingLiters || 0);
    const finalPh = Number(phase3Ph);
    const finalBrix = Number(phase3Brix);
    const finalTemperature = Number(phase3Temp);
    const finalAcidity = Number(phase3Acid);
    if (![finalPh, finalBrix, finalTemperature, finalAcidity].every(Number.isFinite)) {
      setCompleteError("La medición final debe tener valores numéricos válidos");
      setProdView("complete");
      return;
    }
    const completionPayload = completeAllocations
      .map((row) => ({ storageTankId: row.storageTankId, liters: Number(row.liters || 0) }))
      .filter((row) => row.storageTankId && row.liters > 0);

    if (completionDestination === "STORAGE_TANK" && completionPayload.length === 0) {
      setCompleteError("Asigna el producto a uno o más tanques de resguardo");
      setProdView("complete");
      return;
    }

    const completionTotal = completionPayload.reduce((sum, row) => sum + row.liters, 0);
    if (completionDestination === "STORAGE_TANK" && completionTotal !== finalLotLiters) {
      setCompleteError("La suma de litros asignados debe ser igual a los litros finales");
      setProdView("complete");
      return;
    }

    setCompleteSaving(true);
    try {
      if (!selectedProdPhase3) {
        const phase3Res = await createProductionThirdPhase({
          productionId: selectedProd.id,
          measuredAt: phase3Date,
          remainingLiters: finalLotLiters,
          ph: finalPh,
          brix: finalBrix,
          temperature: finalTemperature,
          acidity: finalAcidity,
          notes: completeNotes,
          startedBy: userEmail,
        });

        if (!phase3Res.success) {
          setCompleteSaving(false);
          setPhase3Error(phase3Res.error || "No se pudo registrar la fase final");
          setProdView("complete");
          return;
        }
      }

      const result = await completeProduction(
        selectedProd.id,
        finalLotLiters,
        completeNotes,
        completionDestination === "STORAGE_TANK" ? completionPayload : [],
        completionDestination,
      );
      if (result.error) {
        setCompleteSaving(false);
        setCompleteError(result.error);
        setProdView("complete");
        return;
      }
      const allocationSummary = completionPayload
        .map((row) => {
          const tankName = safeStorageTanks.find((tank: any) => tank.id === row.storageTankId)?.name || row.storageTankId;
          return `${tankName}: ${row.liters.toLocaleString("es-MX")} Lt`;
        })
        .join(" | ");

      window.alert(
        completionDestination === "BUCKET"
          ? `Proceso finalizado correctamente.\n\nLote: ${selectedProd.name}\nDestino: Cubeta ${selectedProd.tank?.name || "original"}\nExistencia: ${finalLotLiters.toLocaleString("es-MX")} Lt`
          : `Proceso finalizado y resguardado correctamente.\n\nLote: ${selectedProd.name}\nTanques: ${allocationSummary || "Sin detalle"}\nLitros finales: ${finalLotLiters.toLocaleString("es-MX")} Lt`,
      );
    } finally {
      setCompleteSaving(false);
    }
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
    setPhase2ReceivedLiters("");
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
    if (!phase2ReceivedLiters.trim() || Number(phase2ReceivedLiters) <= 0) {
      setPhase2Error("Indica los litros de arranque de la fase dos");
      return;
    }
    if (!phase2ReceivedBy.trim() || !phase2MeasuredBy.trim() || !phase2StartedBy.trim()) {
      setPhase2Error("Completa quien recibio, quien midio y quien inicio fase dos");
      return;
    }

    setPhase2Saving(true);
    const res = await createProductionSecondPhase({
      productionId: secondPhaseTarget.id,
      receivedCondition: phase2Condition,
      receivedLiters: phase2ReceivedLiters.trim() ? Number(phase2ReceivedLiters) : undefined,
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
    setPhase3Ph(phase3?.ph != null ? String(Number(phase3.ph)) : "");
    setPhase3Brix(phase3?.brix != null ? String(Number(phase3.brix)) : "");
    setPhase3Temp(phase3?.temperature != null ? String(Number(phase3.temperature)) : "");
    setPhase3Acid(phase3?.acidity != null ? String(Number(phase3.acidity)) : "");
    setPhase3Notes("");
    setPhase3Error("");
    setCompletionDestination("BUCKET");
    setCompleteAllocations([]);
    setCompleteError("");
    setProdView("complete");
  };

  const handleThirdPhase = async () => {
    if (!thirdPhaseTarget) return;
    setPhase3Error("");
    if (!phase3RemainingLiters.trim()) {
      setPhase3Error("Indica cuantos litros quedan en el contenedor");
      return;
    }
    if (!phase3Ph.trim() || !phase3Brix.trim() || !phase3Temp.trim() || !phase3Acid.trim()) {
      setPhase3Error("Completa la medición final: pH, Brix, temperatura y acidez");
      return;
    }

    setPhase3Saving(true);
    const res = await createProductionThirdPhase({
      productionId: thirdPhaseTarget.id,
      measuredAt: phase3Date,
      remainingLiters: Number(phase3RemainingLiters),
      ph: Number(phase3Ph),
      brix: Number(phase3Brix),
      temperature: Number(phase3Temp),
      acidity: Number(phase3Acid),
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

  const finalBlendTargetLitersValue = Number(finalBlendTargetLiters || 0);
  const finalBlendTargetBrixValue = Number(finalBlendTargetBrix || 0);
  const finalBlendScoobyLiters = finalBlendTargetLitersValue * (Number(finalBlendScoobyPercent || 0) / 100);
  const finalBlendAcidifierLiters = finalBlendTargetLitersValue * (Number(finalBlendAcidifierPercent || 0) / 100);
  const finalBlendSweetTeaLiters =
    Number(finalBlendSweetTeaReferenceLiters || 0) > 0
      ? (Number(finalBlendSweetTeaBaseLiters || 0) * finalBlendTargetLitersValue) / Number(finalBlendSweetTeaReferenceLiters || 0)
      : 0;
  const resolveFinalBlendLiters = (recipeType: string | null | undefined, fallbackLiters: string) => {
    if (recipeType === "SCOOBY") return finalBlendScoobyLiters;
    if (recipeType === "ACIDIFIER") return finalBlendAcidifierLiters;
    if (recipeType === "FLAVOR") return finalBlendSweetTeaLiters;
    return Number(fallbackLiters || 0);
  };

  const finalBlendResolvedRows = finalBlendRows.map((row, index) => {
    const manualBrix = row.brixOverride.trim() ? Number(row.brixOverride) : null;
    if (row.sourceType === "BASE_LOT") {
      const selected = baseLotOptions.find((option: any) => option.id === row.sourceId);
      const recipeType = selected?.recipeType || null;
      return {
        key: `final-base-${index}`,
        sourceType: selected?.sourceType || "BASE_LOT",
        sourceId: row.sourceId,
        sourceStorageEntryId: selected?.sourceType === "STORED_FORMULA" ? selected.id : null,
        liters: resolveFinalBlendLiters(recipeType, row.liters),
        label: selected?.label || "Lote base",
        recipeType,
        availableLiters: selected?.litersRemaining ?? null,
        brix: manualBrix != null && Number.isFinite(manualBrix) ? manualBrix : selected?.brix ?? null,
      };
    }

    const selected = flavorFormulaOptions.find((formula: any) => formula.id === row.sourceId);
    const recipeBrix = selected?.brixMax != null ? Number(selected.brixMax) : selected?.brixMin != null ? Number(selected.brixMin) : null;
    return {
      key: `final-flavor-${index}`,
      sourceType: row.sourceType,
      sourceId: row.sourceId,
      liters: resolveFinalBlendLiters("FLAVOR", row.liters),
      label: selected ? `${selected.name} (${selected.code})` : "Receta sabor",
      recipeType: "FLAVOR",
      availableLiters: selected?.availableLiters ?? null,
      brix: manualBrix != null && Number.isFinite(manualBrix) ? manualBrix : recipeBrix,
    };
  });

  const finalBlendTotalLiters = finalBlendResolvedRows.reduce((sum, row) => sum + (Number.isFinite(row.liters) ? row.liters : 0), 0);
  const finalBlendWeightedBrix =
    finalBlendTotalLiters > 0
      ? finalBlendResolvedRows.reduce((sum, row) => sum + row.liters * Number(row.brix || 0), 0) / finalBlendTotalLiters
      : 0;
  const finalBlendObjectiveSugarGrams =
    finalBlendTargetLitersValue > 0 && finalBlendTargetBrixValue > 0
      ? finalBlendTargetLitersValue * finalBlendTargetBrixValue * 10
      : 0;
  const finalBlendCalculatedWaterLiters = Math.max(
    finalBlendTargetLitersValue - finalBlendScoobyLiters - finalBlendAcidifierLiters - finalBlendSweetTeaLiters,
    0,
  );
  const finalBlendCalculatedWaterPercent =
    finalBlendTargetLitersValue > 0 ? (finalBlendCalculatedWaterLiters / finalBlendTargetLitersValue) * 100 : 0;
  const finalBlendScoobyBrix = finalBlendResolvedRows.find((row) => row.recipeType === "SCOOBY")?.brix ?? null;
  const finalBlendAcidifierBrix = finalBlendResolvedRows.find((row) => row.recipeType === "ACIDIFIER")?.brix ?? null;
  const finalBlendScoobySugarGrams =
    finalBlendScoobyBrix != null && Number.isFinite(Number(finalBlendScoobyBrix)) ? Number(finalBlendScoobyBrix) * 0.8 * 10 : 0;
  const finalBlendAcidifierSugarGrams =
    finalBlendAcidifierBrix != null && Number.isFinite(Number(finalBlendAcidifierBrix)) ? Number(finalBlendAcidifierBrix) * 0.8 * 10 : 0;
  const finalBlendSweetTeaSugarGrams = Math.max(
    finalBlendObjectiveSugarGrams - finalBlendScoobySugarGrams - finalBlendAcidifierSugarGrams,
    0,
  );
  const finalBlendSugarToAddKg = finalBlendSweetTeaSugarGrams / 1000;

  const addFinalBlendRow = () => {
    setFinalBlendRows((prev) => [...prev, { sourceType: "BASE_LOT", sourceId: "", liters: "", brixOverride: "" }]);
  };

  const removeFinalBlendRow = (index: number) => {
    setFinalBlendRows((prev) => (prev.length > 1 ? prev.filter((_, rowIndex) => rowIndex !== index) : [{ sourceType: "BASE_LOT", sourceId: "", liters: "", brixOverride: "" }]));
  };

  const resetFinalBlendForm = () => {
    setFinalBlendProductionDate(new Date().toISOString().slice(0, 16));
    setFinalBlendFlavorId("");
    setFinalBlendTargetLiters("");
    setFinalBlendTargetBrix("");
    setFinalBlendSugarGramsPerLiter("");
    setFinalBlendWaterPercent("");
    setFinalBlendAcidifierPercent("");
    setFinalBlendScoobyPercent("");
    setFinalBlendFlavorPercent("");
    setFinalBlendSweetTeaBaseLiters("3.6");
    setFinalBlendSweetTeaReferenceLiters("19");
    setFinalBlendNotes("");
    setFinalBlendRows([{ sourceType: "BASE_LOT", sourceId: "", liters: "", brixOverride: "" }]);
    setFinalBlendError("");
  };

  const handleCreateFinalBlend = async () => {
    setFinalBlendError("");
    if (!finalBlendProductionDate.trim()) {
      setFinalBlendError("Indica la fecha de producción");
      return;
    }
    if (!selectedFinalBlendFlavor) {
      setFinalBlendError("Selecciona el sabor de la bebida");
      return;
    }
    if (!Number.isFinite(finalBlendTargetBrixValue) || finalBlendTargetBrixValue < 0) {
      setFinalBlendError("El brix objetivo no es válido");
      return;
    }
    if (!Number.isFinite(finalBlendTargetLitersValue) || finalBlendTargetLitersValue <= 0) {
      setFinalBlendError("Indica los litros objetivos de la bebida final");
      return;
    }

    const preparedRows = finalBlendResolvedRows.filter((row) => row.sourceId && row.liters > 0);
    if (preparedRows.length === 0) {
      setFinalBlendError("Agrega al menos un componente con litros");
      return;
    }

    const insufficientRow = preparedRows.find((row) => row.availableLiters != null && row.liters > Number(row.availableLiters));
    if (insufficientRow) {
      setFinalBlendError(`Uno de los componentes excede los litros disponibles: ${insufficientRow.label}`);
      return;
    }

    const missingBrixRow = preparedRows.find((row) => row.brix == null);
    if (missingBrixRow) {
      setFinalBlendError(`Falta brix en uno de los componentes: ${missingBrixRow.label}`);
      return;
    }

    setFinalBlendSaving(true);
    const result = await createFinalBeverageBlend({
      name: finalBlendProductionName,
      flavorId: finalBlendFlavorId || undefined,
      flavorName: selectedFinalBlendFlavor?.name || undefined,
      targetBrix: finalBlendTargetBrixValue,
      sugarGramsPerLiter: finalBlendObjectiveSugarGrams,
      waterPercent: finalBlendCalculatedWaterPercent,
      acidifierPercent: finalBlendAcidifierPercent ? Number(finalBlendAcidifierPercent) : undefined,
      scoobyPercent: finalBlendScoobyPercent ? Number(finalBlendScoobyPercent) : undefined,
      flavorPercent: finalBlendFlavorPercent ? Number(finalBlendFlavorPercent) : undefined,
      notes: finalBlendNotes.trim() || undefined,
      createdBy: userEmail,
      components: preparedRows.map((row) => ({
        sourceType: row.sourceType,
        baseBeverageInventoryId: row.sourceType === "BASE_LOT" ? row.sourceId : undefined,
        productionFormulaId: row.sourceType === "FLAVOR_RECIPE" ? row.sourceId : undefined,
        sourceStorageEntryId: row.sourceType === "STORED_FORMULA" ? row.sourceStorageEntryId || row.sourceId : undefined,
        liters: row.liters,
        brix: row.brix != null ? Number(row.brix) : undefined,
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
        <h2 className="text-2xl font-black text-slate-950">Fermentados</h2>
        <div className="flex gap-2">
          <button onClick={() => setView("producciones")} className={tabClass(view === "producciones")}>Fórmulas</button>
          <button onClick={() => setView("final")} className={tabClass(view === "final")}>Bebida final</button>
          {view === "producciones" && (
            <button
              type="button"
              onClick={() => setShowCreateProd(true)}
              className="rounded-lg bg-slate-950 px-4 py-2 text-xs font-black text-white hover:bg-slate-800"
            >
              Nuevo proceso
            </button>
          )}
        </div>
      </div>

      {view === "producciones" && (
        <div className="space-y-6">
          <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap gap-3">
              {recipeBoardTabs.map((tab) => {
                const isActive = tab.value === recipeFilter;
                const label = tab.value === "ACIDIFIER" ? "Acidificante" : tab.value === "SCOOBY" ? "Scooby" : tab.value === "FLAVOR" ? "Saborizante" : "Todos";
                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setRecipeFilter(tab.value)}
                    className={`rounded-xl border px-5 py-3 text-sm font-bold transition ${
                      isActive ? "border-slate-950 bg-slate-950 text-white shadow-md" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { value: "ALL" as const, label: "Todos" },
                { value: "IN_PROGRESS" as const, label: "En proceso" },
                { value: "COMPLETED" as const, label: "Completados" },
              ].map((tab) => {
                const isActive = tab.value === fermentationStatusFilter;
                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setFermentationStatusFilter(tab.value)}
                    className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.18em] transition ${
                      isActive
                        ? "border-slate-950 bg-slate-950 text-white shadow-md"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })} 
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <div className="md:col-span-2">
                <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Buscar lote</label>
                <input
                  value={fermentationSearch}
                  onChange={(e) => setFermentationSearch(e.target.value)}
                  placeholder="Ej. lote, cubeta o nombre del proceso"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Fecha inicial</label>
                <input
                  type="date"
                  value={fermentationStartDate}
                  onChange={(e) => setFermentationStartDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Fecha final</label>
                <input
                  type="date"
                  value={fermentationEndDate}
                  onChange={(e) => setFermentationEndDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                />
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
              <div className="grid grid-cols-[1.25fr_0.9fr_0.95fr_0.95fr_0.95fr_0.95fr_0.8fr] gap-3 bg-slate-50 px-4 py-3 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                <span>Lote</span>
                <span>Tipo</span>
                <span>Inicio</span>
                <span>Fin aprox.</span>
                <span>Restante</span>
                <span>Litros</span>
                <span>Estado</span>
              </div>

              <div className="divide-y divide-slate-200 bg-white">
                {paginatedFermentationRows.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-slate-500">
                    No hay procesos para los filtros seleccionados.
                  </div>
                ) : (
                  paginatedFermentationRows.map(({ production, formula, metrics }) => {
                    const phase2Record = Array.isArray(production.secondPhaseRecords)
                      ? production.secondPhaseRecords.find((record: any) => Number(record.phase) === 2)
                      : null;
                    const quantity = production.litersProduced != null
                      ? Number(production.litersProduced)
                      : phase2Record?.receivedLiters != null
                        ? Number(phase2Record.receivedLiters)
                        : production.startedLiters != null
                          ? Number(production.startedLiters)
                          : 0;
                    const fermentationStatus = getFermentationVisualStatus(production, formula);
                    const borderClass = getFermentationVisualClasses(fermentationStatus);
                    const formulaDurationHours = Number(formula?.durationDays || 0) * 24 + Number(formula?.durationHours || 0);
                    const estimatedReadyAt = formulaDurationHours > 0
                      ? new Date(new Date(production.startedAt).getTime() + formulaDurationHours * 60 * 60 * 1000)
                      : null;
                    const remainingHours = estimatedReadyAt ? (estimatedReadyAt.getTime() - Date.now()) / (1000 * 60 * 60) : null;
                    const remainingDays = remainingHours != null ? remainingHours / 24 : null;
                    const remainingColorClass =
                      metrics.phase3 || remainingDays == null
                        ? "text-slate-600"
                        : remainingDays > 20
                          ? "text-slate-500"
                          : remainingDays >= 7
                            ? "text-blue-600"
                            : remainingDays > 0
                              ? "text-emerald-600"
                              : "text-rose-600";
                    const recipeLabel =
                      formula?.recipeType === "FLAVOR"
                        ? "Saborizante"
                        : formula?.recipeType === "SCOOBY"
                          ? "Scooby"
                          : "Acidificante";

                    return (
                      <button
                        key={production.id}
                        type="button"
                        onClick={() => {
                          setSelectedFormulaLotId(production.id);
                          setSelectedProd({ ...production, formula, metrics });
                          setProdView("params");
                        }}
                        className={`grid w-full grid-cols-[1.25fr_0.9fr_0.95fr_0.95fr_0.95fr_0.95fr_0.8fr] gap-3 px-4 py-4 text-left transition hover:bg-slate-50 ${borderClass}`}
                      >
                        <span className="font-black text-slate-950">{production.name}</span>
                        <span className="text-sm text-slate-600">{recipeLabel}</span>
                        <span className="text-sm text-slate-600">{fmtDate(production.startedAt)}</span>
                        <span className="text-sm text-slate-600">{metrics.readyAt ? fmtDate(metrics.readyAt) : "-"}</span>
                        <span className={`text-sm font-bold ${remainingColorClass}`}>
                          {remainingHours != null
                            ? remainingHours > 0
                              ? formatDayCounter(remainingHours / 24, "remaining")
                              : "Listo"
                            : "-"}
                        </span>
                        <span className="text-sm text-slate-600">{quantity ? `${quantity.toLocaleString("es-MX")} Lt` : "-"}</span>
                        <span className="text-sm font-bold text-slate-800">
                          {production.status === "IN_PROGRESS" ? "En proceso" : production.status === "COMPLETED" ? "Completado" : "Cancelado"}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {fermentationRows.length > FERMENTATION_PAGE_SIZE && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-semibold text-slate-500">
                  Mostrando {Math.min((safeFermentationPage - 1) * FERMENTATION_PAGE_SIZE + 1, fermentationRows.length)}-
                  {Math.min(safeFermentationPage * FERMENTATION_PAGE_SIZE, fermentationRows.length)} de {fermentationRows.length} procesos
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFermentationPage((prev) => Math.max(1, prev - 1))}
                    disabled={safeFermentationPage === 1}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <p className="text-xs font-semibold text-slate-500">
                    Página {safeFermentationPage} de {fermentationTotalPages}
                  </p>
                  <button
                    type="button"
                    onClick={() => setFermentationPage((prev) => Math.min(fermentationTotalPages, prev + 1))}
                    disabled={safeFermentationPage === fermentationTotalPages}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}

            <p className="mt-4 text-xs text-slate-500">
              Haz clic en cualquier fila para abrir el modal con parámetros, fases y acciones del proceso.
            </p>
          </section>
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

          <div className="space-y-6">
            <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Proceso</p>
              <h3 className="mt-2 text-2xl font-black text-slate-950">Bebida final</h3>
              <p className="mt-2 text-sm text-slate-500">
                Combina lotes de bebida base y recetas sabor para calcular el brix ponderado y la azúcar estimada que se necesita agregar antes del envasado.
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <Field label="Fecha de producción">
                  <input
                    type="datetime-local"
                    value={finalBlendProductionDate}
                    onChange={(e) => setFinalBlendProductionDate(e.target.value)}
                    className="w-full rounded-lg border p-2 text-sm"
                  />
                </Field>
                <Field label="Sabor vinculado">
                  <select
                    value={finalBlendFlavorId}
                    onChange={(e) => setFinalBlendFlavorId(e.target.value)}
                    className="w-full rounded-lg border p-2 text-sm"
                  >
                    <option value="">Selecciona</option>
                    {safeFlavors.map((flavor: any) => (
                      <option key={flavor.id} value={flavor.id}>
                        {flavor.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Nombre de producción">
                  <input
                    value={finalBlendProductionName}
                    readOnly
                    className="w-full rounded-lg border bg-slate-50 p-2 text-sm font-semibold text-slate-700"
                  />
                </Field>
                <Field label="Litros objetivos">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={finalBlendTargetLiters}
                    onChange={(e) => setFinalBlendTargetLiters(e.target.value)}
                    className="w-full rounded-lg border p-2 text-sm text-center"
                  />
                </Field>
                <Field label="Brix objetivo final">
                  <input type="number" step="0.01" value={finalBlendTargetBrix} onChange={(e) => setFinalBlendTargetBrix(e.target.value)} className="w-full rounded-lg border p-2 text-sm text-center" />
                </Field>
                <Field label="Azúcar objetivo (g)">
                  <input
                    value={finalBlendObjectiveSugarGrams.toLocaleString("es-MX", { maximumFractionDigits: 2 })}
                    readOnly
                    className="w-full rounded-lg border bg-slate-50 p-2 text-sm text-center font-semibold text-slate-700"
                  />
                </Field>
                <Field label="Scoby %">
                  <input
                    type="number"
                    step="0.01"
                    value={finalBlendScoobyPercent}
                    onChange={(e) => setFinalBlendScoobyPercent(e.target.value)}
                    className="w-full rounded-lg border p-2 text-sm text-center"
                  />
                </Field>
                <Field label="Acidificante %">
                  <input
                    type="number"
                    step="0.01"
                    value={finalBlendAcidifierPercent}
                    onChange={(e) => setFinalBlendAcidifierPercent(e.target.value)}
                    className="w-full rounded-lg border p-2 text-sm text-center"
                  />
                </Field>
                <Field label="Té azucarado base (L)">
                  <input
                    type="number"
                    step="0.01"
                    value={finalBlendSweetTeaBaseLiters}
                    onChange={(e) => setFinalBlendSweetTeaBaseLiters(e.target.value)}
                    className="w-full rounded-lg border p-2 text-sm text-center"
                  />
                </Field>
                <Field label="Referencia té (L)">
                  <input
                    type="number"
                    step="0.01"
                    value={finalBlendSweetTeaReferenceLiters}
                    onChange={(e) => setFinalBlendSweetTeaReferenceLiters(e.target.value)}
                    className="w-full rounded-lg border p-2 text-sm text-center"
                  />
                </Field>
              </div>

              {selectedFinalBlendFlavor && (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  Blend ligado a <strong className="text-slate-950">{selectedFinalBlendFlavor.name}</strong>.
                </div>
              )}

              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-amber-950">Cálculo de azúcar</p>
                    <p className="mt-1 text-xs text-amber-800">
                      El objetivo usa litros por brix. Scoby y acidificante usan brix x 0.8 x 10. El té azucarado completa el azúcar faltante.
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">
                    Objetivo {finalBlendObjectiveSugarGrams.toLocaleString("es-MX", { maximumFractionDigits: 1 })} g
                  </span>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">
                      <tr>
                        <th className="px-3 py-2">Componente</th>
                        <th className="px-3 py-2">%</th>
                        <th className="px-3 py-2">Litros</th>
                        <th className="px-3 py-2">Brix</th>
                        <th className="px-3 py-2">Azúcar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-200">
                      <BlendCalcRow label="Scoby" percent={Number(finalBlendScoobyPercent || 0)} liters={finalBlendScoobyLiters} brix={finalBlendScoobyBrix} sugarGrams={finalBlendScoobySugarGrams} />
                      <BlendCalcRow label="Acidificante" percent={Number(finalBlendAcidifierPercent || 0)} liters={finalBlendAcidifierLiters} brix={finalBlendAcidifierBrix} sugarGrams={finalBlendAcidifierSugarGrams} />
                      <BlendCalcRow label="Té azucarado" percent={finalBlendTargetLitersValue > 0 ? (finalBlendSweetTeaLiters / finalBlendTargetLitersValue) * 100 : 0} liters={finalBlendSweetTeaLiters} brix={null} sugarGrams={finalBlendSweetTeaSugarGrams} />
                      <BlendCalcRow label="Agua" percent={finalBlendCalculatedWaterPercent} liters={finalBlendCalculatedWaterLiters} brix={null} sugarGrams={0} />
                    </tbody>
                    <tfoot className="border-t border-amber-300 font-black text-amber-950">
                      <tr>
                        <td className="px-3 py-3">Total</td>
                        <td className="px-3 py-3">100%</td>
                        <td className="px-3 py-3">{finalBlendTargetLitersValue.toLocaleString("es-MX", { maximumFractionDigits: 2 })} L</td>
                        <td className="px-3 py-3">Objetivo {finalBlendTargetBrixValue.toLocaleString("es-MX", { maximumFractionDigits: 2 })}</td>
                        <td className="px-3 py-3">{finalBlendObjectiveSugarGrams.toLocaleString("es-MX", { maximumFractionDigits: 2 })} g</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-slate-950">Componentes de la bebida final</p>
                    <p className="mt-1 text-xs text-slate-500">Selecciona de qué lote o tanque saldrá cada componente. Los litros se calculan automáticamente con los porcentajes.</p>
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
                                      ? { sourceType: e.target.value as "BASE_LOT" | "FLAVOR_RECIPE", sourceId: "", liters: "", brixOverride: entry.brixOverride }
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
                                  {row.sourceType === "BASE_LOT"
                                    ? `${option.label} · ${Number(option.litersRemaining || 0).toLocaleString("es-MX")} Lt${option.brix == null ? " · falta Brix" : ""}`
                                    : `${option.name} (${option.code}) · ${Number(option.availableLiters || 0).toLocaleString("es-MX")} Lt`}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Field label="Litros">
                            <input
                              value={resolved?.liters != null ? Number(resolved.liters || 0).toLocaleString("es-MX", { maximumFractionDigits: 2 }) : "0"}
                              readOnly
                              className="w-full rounded-lg border bg-slate-50 p-2 text-sm text-center font-semibold text-slate-700"
                            />
                          </Field>
                          <Field label="Brix">
                            <input
                              type="number"
                              step="0.01"
                              value={row.brixOverride}
                              placeholder={resolved?.brix != null ? Number(resolved.brix).toLocaleString("es-MX", { maximumFractionDigits: 2 }) : "Brix"}
                              onChange={(e) =>
                                setFinalBlendRows((prev) =>
                                  prev.map((entry, rowIndex) => (rowIndex === index ? { ...entry, brixOverride: e.target.value } : entry)),
                                )
                              }
                              className="w-full rounded-lg border p-2 text-sm text-center"
                            />
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
                          <span>Litros calculados: {Number(resolved?.liters || 0).toLocaleString("es-MX", { maximumFractionDigits: 2 })} Lt</span>
                          <span>Aporte de brix: {resolved?.brix != null ? Number(resolved.brix).toLocaleString("es-MX", { maximumFractionDigits: 2 }) : "falta lectura"}</span>
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

                    <div className="mt-4 grid gap-2 md:grid-cols-2 lg:grid-cols-3 text-xs text-slate-500">
                      <span>Sabor: {blend.flavorName || "-"}</span>
                      <span>Azúcar g/L: {blend.sugarGramsPerLiter != null ? Number(blend.sugarGramsPerLiter).toLocaleString("es-MX", { maximumFractionDigits: 2 }) : "-"}</span>
                      <span>Agua %: {blend.waterPercent != null ? Number(blend.waterPercent).toLocaleString("es-MX", { maximumFractionDigits: 2 }) : "-"}</span>
                      <span>Acidificante %: {blend.acidifierPercent != null ? Number(blend.acidifierPercent).toLocaleString("es-MX", { maximumFractionDigits: 2 }) : "-"}</span>
                      <span>Scooby %: {blend.scoobyPercent != null ? Number(blend.scoobyPercent).toLocaleString("es-MX", { maximumFractionDigits: 2 }) : "-"}</span>
                      <span>Saborizante %: {blend.flavorPercent != null ? Number(blend.flavorPercent).toLocaleString("es-MX", { maximumFractionDigits: 2 }) : "-"}</span>
                    </div>

                        <div className="mt-4 space-y-2">
                          {(blend.components || []).map((component: any) => (
                            <div key={component.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 text-sm">
                              <div>
                                <p className="font-bold text-slate-900">{component.sourceLabel}</p>
                                <p className="text-xs text-slate-500">
                                  {component.sourceType === "BASE_LOT"
                                    ? "Lote base"
                                    : `Tanque de resguardo · ${storageTankNameById.get(String(component.sourceStorageTankId || "")) || "Sin tanque"}`}
                                  {" · "}Brix {Number(component.brixSnapshot || 0).toLocaleString("es-MX", { maximumFractionDigits: 3 })}
                                </p>
                                {component.sourceType !== "BASE_LOT" && component.sourceStorageEntryId && (
                                  <p className="mt-1 text-[11px] text-slate-400">
                                    Entrada: {String(component.sourceStorageEntryId).slice(0, 8)} · Consumo trazable por tanque
                                  </p>
                                )}
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

      {showCreateProd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="space-y-5 p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-slate-950">Nueva produccion</h3>
                <button onClick={() => setShowCreateProd(false)} className="text-xl text-slate-400 hover:text-slate-700">x</button>
              </div>

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
                  <Field label="Litros iniciales (L)">
                    <input type="number" min="0" step="0.1" value={newProdStartedLiters} onChange={(e) => setNewProdStartedLiters(e.target.value)} className="w-full rounded-lg border p-2 text-sm text-center" />
                  </Field>
                </div>
                <p className="text-xs text-slate-500">
                  El nombre se genera automáticamente con este formato: dia-mes-año-numeroCubeta-tipoProceso.
                </p>
                <p className="text-xs text-slate-500">
                  Los litros iniciales sirven para calcular insumos y comparar la merma o ganancia al cierre.
                </p>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-black text-slate-900">Formula inicial</p>
                    <button onClick={addIngredientRow} className="text-xs font-bold text-blue-700 hover:underline">Agregar insumo</button>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Puedes capturar los insumos manualmente para este proceso.
                  </p>
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

              {stockShortages.length > 0 && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                  <p className="text-sm font-black text-rose-800">Stock insuficiente para iniciar este proceso</p>
                  <p className="mt-1 text-xs text-rose-700">Corrige estas cantidades o cambia la ubicación antes de guardar:</p>
                  <div className="mt-3 space-y-2">
                    {stockShortages.map((item) => (
                      <div key={`${item.rawMaterialId}-${item.locationName}`} className="rounded-lg bg-white px-3 py-2 text-xs text-rose-700">
                        <span className="font-bold">{item.name}</span> en <span className="font-bold">{item.locationName}</span>: necesitas {item.required.toLocaleString("es-MX")} {item.unit || ""}, tienes {item.available.toLocaleString("es-MX")} {item.unit || ""}, faltan {Math.max(0, item.shortage).toLocaleString("es-MX")} {item.unit || ""}.
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {prodError && <p className="text-sm font-semibold text-rose-600">{prodError}</p>}

              <div className="flex gap-3">
                <button onClick={() => setShowCreateProd(false)} className="flex-1 rounded-lg border py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
                <button onClick={handleCreateProd} disabled={prodSaving || stockShortages.length > 0} className="flex-1 rounded-lg bg-slate-950 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:bg-slate-300">
                  {prodSaving ? "Guardando..." : "Iniciar produccion"}
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
                  <h3 className="text-lg font-black text-slate-950 font-sans" style={{ fontFamily: "var(--font-admin)" }}>
                    {selectedProd.name}
                  </h3>
                  <p className="text-xs text-slate-500">Tipo {selectedProd.productType} | Cubeta {selectedProd.tank?.name || "-"}</p>
                </div>
                <button onClick={() => setSelectedProd(null)} className="text-xl text-slate-400 hover:text-slate-700">x</button>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-xl bg-slate-50 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Inicio real</p>
                  <p className="mt-2 text-sm font-bold text-slate-900">{startedLiters != null ? `${startedLiters} Lt` : "-"}</p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {selectedProdLatestParam ? `pH ${selectedProdLatestParam.ph ?? "-"} · Brix ${selectedProdLatestParam.brix ?? "-"} · Temp ${selectedProdLatestParam.temperature ?? "-"}` : "Sin mediciones registradas"}
                  </p>
                </div>
                <div className="rounded-xl bg-violet-50 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-violet-400">Inicio fase 2</p>
                  <p className="mt-2 text-sm font-bold text-violet-900">{phase2StartLiters != null ? `${phase2StartLiters} Lt` : "-"}</p>
                  <p className="mt-1 text-[11px] text-violet-700">
                    {selectedProdPhase2 ? `Fase 2 ${fmtDate(selectedProdPhase2.measuredAt)}` : "Aún no hay lectura de fase 2"}
                  </p>
                </div>
                <div className="rounded-xl bg-emerald-50 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-400">Cierre final</p>
                  <p className="mt-2 text-sm font-bold text-emerald-900">{finalLiters != null ? `${finalLiters} Lt` : "Pendiente"}</p>
                  <p className="mt-1 text-[11px] text-emerald-700">
                    {selectedProdPhase3
                      ? `pH ${selectedProdPhase3.ph ?? "-"} · Brix ${selectedProdPhase3.brix ?? "-"} · Temp ${selectedProdPhase3.temperature ?? "-"}`
                      : "Aún no hay lectura de fase 3"}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-950 px-4 py-3 text-white">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/60">Merma</p>
                  <p className="mt-2 text-sm font-bold">
                    {phase2ToFinalDifference != null ? `${phase2ToFinalDifference >= 0 ? "+" : ""}${phase2ToFinalDifference.toFixed(2)} Lt` : "-"}
                  </p>
                  <p className="mt-1 text-[11px] text-white/70">
                    {phase2ToFinalPercent != null ? `${phase2ToFinalPercent >= 0 ? "+" : ""}${phase2ToFinalPercent.toFixed(2)}% vs fase 2` : "Sin cálculo"}
                  </p>
                </div>
              </div>

              {selectedProd.status === "IN_PROGRESS" && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-violet-100 bg-violet-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-black text-violet-900">Segunda fase</p>
                    <p className="text-xs text-violet-700">
                      La segunda fase se inicia desde aquí, después de seleccionar el proceso en la lista.
                    </p>
                  </div>
                  {!selectedProdPhase2 ? (
                    <button
                      type="button"
                      onClick={() => openSecondPhase(selectedProd)}
                      className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-700"
                    >
                      Iniciar segunda fase
                    </button>
                  ) : (
                    <span className="rounded-full bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-700">
                      Segunda fase ya registrada
                    </span>
                  )}
                </div>
              )}

              {selectedProd.status === "COMPLETED" && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-black text-emerald-900">Proceso completado</p>
                    <p className="text-xs text-emerald-700">
                      Este lote ya pasó a inventario. Desde ahí puedes asignarle un tanque de resguardo, unificarlo o darle salida.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push("/admin/inventory/base-beverage")}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                  >
                    Ir al inventario
                  </button>
                </div>
              )}

              {selectedProdPhase2 && (
                <div className="rounded-xl border border-violet-100 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                  <p className="text-sm font-black text-violet-900">Resumen de fase 2</p>
                  <p className="text-xs text-violet-700">{fmtDate(selectedProdPhase2.measuredAt)}</p>
                </div>
                <span className="rounded-full bg-violet-100 px-3 py-1 text-[11px] font-bold text-violet-700">
                  Registrada
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <div className="rounded-lg bg-violet-50 px-3 py-2 text-xs">
                      <p className="font-black text-violet-900">Condición recibida</p>
                      <p className="mt-1 text-violet-800">{selectedProdPhase2.receivedCondition || "-"}</p>
                    </div>
                    <div className="rounded-lg bg-violet-50 px-3 py-2 text-xs">
                      <p className="font-black text-violet-900">Litros iniciales</p>
                      <p className="mt-1 text-violet-800">{selectedProdPhase2.receivedLiters != null ? `${Number(selectedProdPhase2.receivedLiters)} Lt` : "-"}</p>
                    </div>
                    <div className="rounded-lg bg-violet-50 px-3 py-2 text-xs">
                      <p className="font-black text-violet-900">Recibió</p>
                      <p className="mt-1 text-violet-800">{selectedProdPhase2.receivedBy || "-"}</p>
                    </div>
                    <div className="rounded-lg bg-violet-50 px-3 py-2 text-xs">
                      <p className="font-black text-violet-900">Tomó parámetros</p>
                      <p className="mt-1 text-violet-800">{selectedProdPhase2.measuredBy || "-"}</p>
                    </div>
                    <div className="rounded-lg bg-violet-50 px-3 py-2 text-xs">
                      <p className="font-black text-violet-900">Inició fase 2</p>
                      <p className="mt-1 text-violet-800">{selectedProdPhase2.startedBy || "-"}</p>
                    </div>
                    <div className="rounded-lg bg-violet-50 px-3 py-2 text-xs">
                      <p className="font-black text-violet-900">pH</p>
                      <p className="mt-1 text-violet-800">{selectedProdPhase2.ph != null ? Number(selectedProdPhase2.ph) : "-"}</p>
                    </div>
                    <div className="rounded-lg bg-violet-50 px-3 py-2 text-xs">
                      <p className="font-black text-violet-900">Brix</p>
                      <p className="mt-1 text-violet-800">{selectedProdPhase2.brix != null ? Number(selectedProdPhase2.brix) : "-"}</p>
                    </div>
                    <div className="rounded-lg bg-violet-50 px-3 py-2 text-xs">
                      <p className="font-black text-violet-900">Temperatura</p>
                      <p className="mt-1 text-violet-800">{selectedProdPhase2.temperature != null ? Number(selectedProdPhase2.temperature) : "-"}</p>
                    </div>
                    <div className="rounded-lg bg-violet-50 px-3 py-2 text-xs">
                      <p className="font-black text-violet-900">Acidez</p>
                      <p className="mt-1 text-violet-800">{selectedProdPhase2.acidity != null ? Number(selectedProdPhase2.acidity) : "-"}</p>
                    </div>
                  </div>
                  {selectedProdPhase2.notes && (
                    <div className="mt-3 rounded-lg bg-violet-50 px-3 py-2 text-xs">
                      <p className="font-black text-violet-900">Notas</p>
                      <p className="mt-1 text-violet-800">{selectedProdPhase2.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {selectedProd.status === "IN_PROGRESS" && (
                <div className="flex gap-2 border-b pb-3">
                  <button onClick={() => setProdView("params")} className={subTabClass(prodView === "params")}>Parametros</button>
                  <button onClick={() => setProdView("additions")} className={subTabClass(prodView === "additions")}>Insumos</button>
                  {selectedProdPhase2 && !selectedProdPhase3 && (
                    <button
                      type="button"
                      onClick={() => openThirdPhase(selectedProd)}
                      className={subTabClass(false)}
                    >
                      Finalizar proceso
                    </button>
                  )}
                  {selectedProdPhase3 && (
                    <button onClick={() => openCompletePanel(selectedProd)} className={subTabClass(prodView === "complete")}>Completar</button>
                  )}
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

              {prodView === "complete" && selectedProd.status === "IN_PROGRESS" && selectedProdPhase2 && (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                  <p className="text-sm font-black text-emerald-800">Finalizar producción</p>
                  <p className="mt-2 text-xs text-emerald-700">
                    Aquí registras el cierre del proceso y eliges si la existencia queda en la cubeta o se resguarda en uno o varios tanques compatibles.
                  </p>
                    <div className="mt-3 rounded-xl border border-emerald-200 bg-white p-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Destino del producto terminado</p>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => selectCompletionDestination("BUCKET")}
                          className={`rounded-xl border px-4 py-3 text-left text-sm font-bold transition ${completionDestination === "BUCKET" ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                        >
                          Dejar en cubeta
                          <span className="mt-1 block text-xs font-normal">La existencia queda vinculada a {selectedProd.tank?.name || "la cubeta original"}.</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => selectCompletionDestination("STORAGE_TANK")}
                          className={`rounded-xl border px-4 py-3 text-left text-sm font-bold transition ${completionDestination === "STORAGE_TANK" ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                        >
                          Resguardar en tanque
                          <span className="mt-1 block text-xs font-normal">Reparte la existencia entre tanques compatibles.</span>
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 rounded-xl border border-emerald-200 bg-white p-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Comparación</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-lg bg-emerald-50 px-3 py-2 text-xs">
                        <p className="font-black text-emerald-900">Inicio real</p>
                        <p className="mt-1 text-emerald-800">{startedLiters != null ? `${startedLiters} Lt` : "-"}</p>
                      </div>
                      <div className="rounded-lg bg-emerald-50 px-3 py-2 text-xs">
                        <p className="font-black text-emerald-900">Inicio fase 2</p>
                        <p className="mt-1 text-emerald-800">{phase2StartLiters != null ? `${phase2StartLiters} Lt` : "-"}</p>
                      </div>
                      <div className="rounded-lg bg-emerald-50 px-3 py-2 text-xs">
                        <p className="font-black text-emerald-900">Litros finales</p>
                        <p className="mt-1 text-emerald-800">{finalLiters != null ? `${finalLiters} Lt` : "-"}</p>
                      </div>
                      <div className="rounded-lg bg-emerald-50 px-3 py-2 text-xs">
                        <p className="font-black text-emerald-900">Merma</p>
                        <p className="mt-1 text-emerald-800">
                          {phase2ToFinalDifference != null ? `${phase2ToFinalDifference >= 0 ? "+" : ""}${phase2ToFinalDifference.toFixed(2)} Lt` : "-"}
                        </p>
                        <p className="mt-1 text-[11px] text-emerald-700">
                          {phase2ToFinalPercent != null ? `${phase2ToFinalPercent >= 0 ? "+" : ""}${phase2ToFinalPercent.toFixed(2)}% vs fase 2` : ""}
                        </p>
                      </div>
                    </div>
                    {phase2StartLiters != null && phase2ToFinalDifference != null && (
                      <p className="mt-2 text-xs text-emerald-700">
                        Diferencia vs inicio fase 2: {phase2ToFinalDifference >= 0 ? "+" : ""}{phase2ToFinalDifference.toFixed(2)} Lt
                      </p>
                    )}
                    {startedToFinalDifference != null && (
                      <p className="mt-1 text-xs text-emerald-700">
                        Diferencia vs litros iniciales: {startedToFinalDifference >= 0 ? "+" : ""}{startedToFinalDifference.toFixed(2)} Lt
                        {startedToFinalPercent != null ? ` (${startedToFinalPercent >= 0 ? "+" : ""}${startedToFinalPercent.toFixed(2)}%)` : ""}
                      </p>
                    )}
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <Field label="Litros finales">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={phase3RemainingLiters}
                        onChange={(e) => setPhase3RemainingLiters(e.target.value)}
                        className="w-full rounded-lg border p-2 text-sm text-center"
                      />
                    </Field>
                    <Field label="Brix final">
                      <input
                        type="number"
                        step="0.01"
                        value={phase3Brix}
                        onChange={(e) => setPhase3Brix(e.target.value)}
                        className="w-full rounded-lg border p-2 text-sm text-center"
                      />
                    </Field>
                    <Field label="Temperatura final °C">
                      <input
                        type="number"
                        step="0.01"
                        value={phase3Temp}
                        onChange={(e) => setPhase3Temp(e.target.value)}
                        className="w-full rounded-lg border p-2 text-sm text-center"
                      />
                    </Field>
                    <Field label="pH final">
                      <input
                        type="number"
                        step="0.01"
                        value={phase3Ph}
                        onChange={(e) => setPhase3Ph(e.target.value)}
                        className="w-full rounded-lg border p-2 text-sm text-center"
                      />
                    </Field>
                    <Field label="Acidez final">
                      <input
                        type="number"
                        step="0.01"
                        value={phase3Acid}
                        onChange={(e) => setPhase3Acid(e.target.value)}
                        className="w-full rounded-lg border p-2 text-sm text-center"
                      />
                    </Field>
                    <Field label="Notas finales">
                      <textarea value={completeNotes} onChange={(e) => setCompleteNotes(e.target.value)} rows={2} className="w-full rounded-lg border p-2 text-sm" />
                    </Field>
                    <Field label="Fecha de cierre">
                      <input type="datetime-local" value={phase3Date} onChange={(e) => setPhase3Date(e.target.value)} className="w-full rounded-lg border p-2 text-sm" />
                    </Field>
                  </div>
                    {completionDestination === "STORAGE_TANK" && <div className="mt-3 rounded-xl border border-emerald-200 bg-white p-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Resguardo en tanques</p>
                          <p className="mt-1 text-xs text-slate-500">
                          Reparte los litros finales entre uno o varios tanques. La existencia real queda en resguardo dentro de ellos.
                          </p>
                        </div>
                      <button
                        type="button"
                        onClick={addCompletionAllocationRow}
                        className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-emerald-800 hover:bg-emerald-100"
                      >
                        Agregar tanque
                      </button>
                    </div>

                    <div className="mt-4 space-y-3">
                      {completeAllocations.map((row, index) => {
                        const tank = availableStorageTanks.find((item: any) => item.id === row.storageTankId) || null;
                        const litersValue = Number(row.liters || 0);
                        const freeCapacity = tank?.freeCapacity != null ? Number(tank.freeCapacity) : null;
                        const overCapacity = freeCapacity != null && litersValue > freeCapacity;

                        return (
                          <div key={`completion-allocation-${index}`} className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3">
                            <div className="grid gap-3 md:grid-cols-[1.3fr_0.7fr_auto]">
                              <div>
                                <label className="mb-1 block text-xs font-black uppercase tracking-[0.25em] text-slate-400">Tanque</label>
                                <select
                                  value={row.storageTankId}
                                  onChange={(event) => updateCompletionAllocationRow(index, { storageTankId: event.target.value })}
                                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                                >
                                  <option value="">Selecciona tanque</option>
                                  {availableStorageTanks.map((item: any) => (
                                    <option key={item.id} value={item.id}>
                                      {item.name}
                                      {item.capacityLt != null
                                        ? ` · Libre ${Number(item.freeCapacity || 0).toLocaleString("es-MX")}/${Number(item.capacityLt).toLocaleString("es-MX")} Lt`
                                        : " · Sin límite"}
                                      {item.formulaLabel ? ` · ${item.formulaLabel}` : " · Vacío"}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="mb-1 block text-xs font-black uppercase tracking-[0.25em] text-slate-400">Litros</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.1"
                                  value={row.liters}
                                  onChange={(event) => updateCompletionAllocationRow(index, { liters: event.target.value })}
                                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-center"
                                />
                              </div>

                              <div className="flex items-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => removeCompletionAllocationRow(index)}
                                  className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-black uppercase tracking-[0.2em] text-rose-700 hover:bg-rose-100"
                                >
                                  Quitar
                                </button>
                              </div>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                              <span>
                                {tank?.name || "Sin tanque"}
                                {tank?.capacityLt != null ? ` · Disponible ${Number(tank.freeCapacity || 0).toLocaleString("es-MX")} Lt` : ""}
                                {tank?.formulaLabel ? ` · ${tank.formulaLabel}` : " · Vacío"}
                              </span>
                              {overCapacity && <span className="font-bold text-rose-600">Excede la capacidad disponible</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs font-semibold text-slate-500">
                        Restante por asignar: {completionRemaining.toLocaleString("es-MX")} Lt
                      </p>
                      <p className="text-xs font-semibold text-slate-500">
                        Asignado: {completionAllocationTotal.toLocaleString("es-MX")} Lt
                      </p>
                    </div>
                  </div>}
                  {completeError && <p className="mt-3 text-sm font-semibold text-rose-600">{completeError}</p>}
                  <button
                    onClick={handleComplete}
                    disabled={
                      completeSaving ||
                      !phase3RemainingLiters.trim() ||
                      !phase3Ph.trim() ||
                      !phase3Brix.trim() ||
                      !phase3Temp.trim() ||
                      !phase3Acid.trim() ||
                      (completionDestination === "STORAGE_TANK" && completionRemaining !== 0)
                    }
                    className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:bg-slate-300"
                  >
                    {completeSaving ? "Guardando..." : completionDestination === "BUCKET" ? "Finalizar en cubeta" : "Finalizar y resguardar"}
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
                <Field label="Litros de arranque fase 2">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={phase2ReceivedLiters}
                    onChange={(e) => setPhase2ReceivedLiters(e.target.value)}
                    className="w-full rounded-lg border p-2 text-sm text-center"
                  />
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
                <MiniField label="Brix final">
                  <input type="number" step="0.01" value={phase3Brix} onChange={(e) => setPhase3Brix(e.target.value)} className="w-full rounded-lg border p-2 text-xs text-center" />
                </MiniField>
                <MiniField label="Temperatura final">
                  <input type="number" step="0.01" value={phase3Temp} onChange={(e) => setPhase3Temp(e.target.value)} className="w-full rounded-lg border p-2 text-xs text-center" />
                </MiniField>
                <MiniField label="pH final">
                  <input type="number" step="0.01" value={phase3Ph} onChange={(e) => setPhase3Ph(e.target.value)} className="w-full rounded-lg border p-2 text-xs text-center" />
                </MiniField>
                <MiniField label="Acidez final">
                  <input type="number" step="0.01" value={phase3Acid} onChange={(e) => setPhase3Acid(e.target.value)} className="w-full rounded-lg border p-2 text-xs text-center" />
                </MiniField>
              </div>

              <Field label="Notas">
                <textarea value={phase3Notes} onChange={(e) => setPhase3Notes(e.target.value)} rows={3} className="w-full rounded-lg border p-2 text-sm" />
              </Field>

              {phase3Error && <p className="text-sm font-semibold text-rose-600">{phase3Error}</p>}

              <div className="flex gap-3">
                <button onClick={() => setShowThirdPhaseModal(false)} className="flex-1 rounded-lg border py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
                <button
                  onClick={handleThirdPhase}
                  disabled={phase3Saving || !phase3RemainingLiters.trim() || !phase3Ph.trim() || !phase3Brix.trim() || !phase3Temp.trim() || !phase3Acid.trim()}
                  className="flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:bg-slate-300"
                >
                  {phase3Saving ? "Guardando..." : "Guardar fase 3"}
                </button>
              </div>
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

function BlendCalcRow({
  label,
  percent,
  liters,
  brix,
  sugarGrams,
}: {
  label: string;
  percent: number;
  liters: number;
  brix: number | null;
  sugarGrams: number;
}) {
  return (
    <tr className="text-slate-700">
      <td className="px-3 py-2 font-bold text-slate-950">{label}</td>
      <td className="px-3 py-2">{Number(percent || 0).toLocaleString("es-MX", { maximumFractionDigits: 2 })}%</td>
      <td className="px-3 py-2">{Number(liters || 0).toLocaleString("es-MX", { maximumFractionDigits: 2 })} L</td>
      <td className="px-3 py-2">{brix != null ? Number(brix).toLocaleString("es-MX", { maximumFractionDigits: 2 }) : "-"}</td>
      <td className="px-3 py-2">{Number(sugarGrams || 0).toLocaleString("es-MX", { maximumFractionDigits: 2 })} g</td>
    </tr>
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
