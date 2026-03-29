import { useEffect, useMemo, useRef, useState } from "react";
import {
  Eye,
  EyeOff,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import { ItemModelPreview } from "@/islands/sanctuary/ItemModelPreview";
import { useGsapReveal } from "@/islands/sanctuary/useGsapReveal";
import {
  avatarOptions,
  getRenderableCurrentProfile,
  useSanctuaryStore,
} from "@/lib/sanctuary/store";
import {
  createMissionId,
  formatMissionDuration,
  getDefaultMissionDefinitions,
  getMissionRewardLabel,
  loadMissionDefinitions,
  resetMissionDefinitionsOnServer,
  saveMissionDefinitionsToServer,
  syncMissionDefinitionsFromServer,
  type MissionDefinition,
  type MissionReward,
  type MissionRoomKind,
} from "@/lib/sanctuary/missions";
import type { WardrobeField } from "@/lib/sanctuary/wardrobe";

const roomKindLabels: Record<MissionRoomKind, string> = {
  any: "Cualquier sala",
  solo: "Sala privada personal",
  public: "Biblioteca pública",
  private: "Sala compartida privada",
};

const wardrobeFieldLabels: Record<WardrobeField, string> = {
  upper: "Parte superior",
  lower: "Parte inferior",
  socks: "Calcetines",
  accessory: "Accesorios",
};

function createBlankMission(): MissionDefinition {
  return {
    id: createMissionId(),
    title: "Nueva misión",
    description: "",
    requiredFocusSeconds: 60 * 60,
    requiredSessions: 1,
    roomKind: "any",
    reward: {
      type: "none",
    },
    enabled: true,
  };
}

function getRewardField(reward: MissionReward): WardrobeField {
  return reward.type === "wardrobe" ? reward.field : "upper";
}

function getRewardValue(reward: MissionReward): string {
  if (reward.type !== "wardrobe") {
    return avatarOptions.upper[0]?.value ?? "shirt-01-longsleeve";
  }

  return reward.value;
}

export function MissionEditor() {
  const sanctuary = useSanctuaryStore();
  const avatar = getRenderableCurrentProfile(sanctuary).avatar;
  const [missions, setMissions] = useState<MissionDefinition[]>(() =>
    loadMissionDefinitions(),
  );
  const [savedMessage, setSavedMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useGsapReveal(rootRef);

  useEffect(() => {
    let cancelled = false;

    async function loadServerMissions() {
      setLoading(true);
      try {
        const nextMissions = await syncMissionDefinitionsFromServer();
        if (!cancelled) {
          setMissions(nextMissions);
        }
      } catch {
        if (!cancelled) {
          setMissions(loadMissionDefinitions());
          setSavedMessage("No se pudo leer la VPS, muestro la caché local.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadServerMissions();

    return () => {
      cancelled = true;
    };
  }, []);

  const totalRequiredFocus = useMemo(
    () =>
      missions.reduce(
        (sum, mission) =>
          mission.enabled
            ? sum + Math.max(0, mission.requiredFocusSeconds)
            : sum,
        0,
      ),
    [missions],
  );

  function updateMission(
    missionId: string,
    updater: (mission: MissionDefinition) => MissionDefinition,
  ) {
    setMissions((current) =>
      current.map((mission) =>
        mission.id === missionId ? updater(mission) : mission,
      ),
    );
    setSavedMessage("");
  }

  function addMission() {
    setMissions((current) => [...current, createBlankMission()]);
    setSavedMessage("Nueva misión en borrador.");
  }

  function removeMission(missionId: string) {
    setMissions((current) =>
      current.filter((mission) => mission.id !== missionId),
    );
    setSavedMessage("Misión eliminada del borrador.");
  }

  async function handleSave() {
    setSaving(true);
    try {
      const nextMissions = await saveMissionDefinitionsToServer(missions);
      setMissions(nextMissions);
      setSavedMessage("Misiones guardadas en la VPS.");
    } catch {
      setSavedMessage("No se pudieron guardar las misiones en la VPS.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setSaving(true);
    try {
      const nextMissions = await resetMissionDefinitionsOnServer();
      setMissions(nextMissions);
      setSavedMessage("Misiones restauradas.");
    } catch {
      setMissions(getDefaultMissionDefinitions());
      setSavedMessage("No se pudo restaurar desde la VPS.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div ref={rootRef} className="space-y-6">
      <section className="gsap-rise grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="border border-outline-variant bg-[radial-gradient(circle_at_20%_18%,rgba(105,188,255,0.12),transparent_34%),linear-gradient(180deg,#201714_0%,#17110f_100%)] px-6 py-8 sm:px-8">
          <p className="font-headline text-[10px] font-bold uppercase tracking-[0.24em] text-outline">
            Editor de misiones
          </p>
          <h1 className="mt-2 font-headline text-3xl font-black uppercase tracking-tight text-on-surface">
            Recompensas y requisitos globales
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-on-surface-variant">
            Desde aquí defines las misiones del santuario, cuánto tiempo piden,
            cuántas sesiones exigen, qué prenda entregan y si deben estar
            activas en la VPS.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <article className="border border-outline-variant bg-surface-container/70 p-4">
              <p className="font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-outline">
                Misiones totales
              </p>
              <p className="mt-3 font-headline text-2xl font-black uppercase tracking-tight text-primary">
                {missions.length}
              </p>
            </article>
            <article className="border border-outline-variant bg-surface-container/70 p-4">
              <p className="font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-outline">
                Activas
              </p>
              <p className="mt-3 font-headline text-2xl font-black uppercase tracking-tight text-secondary">
                {missions.filter((mission) => mission.enabled).length}
              </p>
            </article>
            <article className="border border-outline-variant bg-surface-container/70 p-4">
              <p className="font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-outline">
                Foco total exigido
              </p>
              <p className="mt-3 font-headline text-2xl font-black uppercase tracking-tight text-tertiary">
                {formatMissionDuration(totalRequiredFocus)}
              </p>
            </article>
          </div>

          <div className="mt-8 flex min-h-[18rem] items-center justify-center overflow-hidden border border-outline-variant bg-surface-container-low">
            <ItemModelPreview
              field="upper"
              value={avatar.upper}
              avatar={avatar}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="gsap-rise border border-outline-variant bg-surface-container p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-outline">
                  Guardado global
                </p>
                <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                  {savedMessage ||
                    (loading
                      ? "Leyendo misiones publicadas desde la VPS..."
                      : "Puedes crear, ocultar o borrar misiones. Nada se aplica hasta guardar en la VPS.")}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={addMission}
                  className="inline-flex items-center gap-2 border border-outline-variant bg-surface-container-low px-4 py-3 font-headline text-xs font-bold uppercase tracking-widest text-on-surface hover:border-secondary"
                >
                  <Plus size={14} />
                  Nueva misión
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={saving}
                  className="inline-flex items-center gap-2 border border-outline-variant bg-surface-container-low px-4 py-3 font-headline text-xs font-bold uppercase tracking-widest text-on-surface hover:border-secondary disabled:opacity-50"
                >
                  <RotateCcw size={14} />
                  Restaurar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 border-b-[3px] border-on-primary-fixed-variant bg-primary px-4 py-3 font-headline text-xs font-bold uppercase tracking-widest text-on-primary disabled:opacity-50"
                >
                  <Save size={14} />
                  {saving ? "Guardando..." : "Guardar en la VPS"}
                </button>
              </div>
            </div>
          </div>

          <div className="gsap-rise border border-outline-variant bg-surface-container p-5">
            <div className="flex items-start gap-3">
              <Sparkles size={18} className="mt-0.5 shrink-0 text-tertiary" />
              <div>
                <p className="font-headline text-[10px] font-bold uppercase tracking-[0.24em] text-outline">
                  Consejo
                </p>
                <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                  Si una misión entrega una pieza rara, compensa su tiempo con
                  el ritmo del armario. Ahora puedes dejarla oculta sin perderla
                  y activarla después cuando encaje mejor.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="gsap-rise space-y-4">
        {missions.map((mission, index) => {
          const rewardField = getRewardField(mission.reward);
          const rewardOptions = avatarOptions[rewardField];
          const rewardValue = getRewardValue(mission.reward);

          return (
            <article
              key={mission.id}
              className="border border-outline-variant bg-surface-container p-4 sm:p-5"
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant pb-4">
                <div>
                  <p className="font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-outline">
                    Misión {index + 1}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                    {getMissionRewardLabel(mission.reward)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      updateMission(mission.id, (current) => ({
                        ...current,
                        enabled: !current.enabled,
                      }))
                    }
                    className={`inline-flex items-center gap-2 border px-4 py-3 font-headline text-xs font-bold uppercase tracking-widest ${
                      mission.enabled
                        ? "border-primary bg-primary/12 text-primary"
                        : "border-outline-variant bg-surface text-outline"
                    }`}
                  >
                    {mission.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
                    {mission.enabled ? "Activa" : "Oculta"}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeMission(mission.id)}
                    className="inline-flex items-center gap-2 border border-error/40 bg-error/10 px-4 py-3 font-headline text-xs font-bold uppercase tracking-widest text-error hover:border-error"
                  >
                    <Trash2 size={14} />
                    Eliminar
                  </button>
                </div>
              </div>

              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-xs uppercase tracking-[0.18em] text-outline">
                      Título
                    </span>
                    <input
                      type="text"
                      value={mission.title}
                      onChange={(event) =>
                        updateMission(mission.id, (current) => ({
                          ...current,
                          title: event.target.value,
                        }))
                      }
                      className="mt-2 w-full border border-outline-variant bg-surface-container-low px-3 py-3 text-sm text-on-surface"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs uppercase tracking-[0.18em] text-outline">
                      Tipo de sala
                    </span>
                    <select
                      value={mission.roomKind}
                      onChange={(event) =>
                        updateMission(mission.id, (current) => ({
                          ...current,
                          roomKind: event.target.value as MissionRoomKind,
                        }))
                      }
                      className="mt-2 w-full border border-outline-variant bg-surface-container-low px-3 py-3 text-sm text-on-surface"
                    >
                      {Object.entries(roomKindLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block sm:col-span-2">
                    <span className="text-xs uppercase tracking-[0.18em] text-outline">
                      Descripción
                    </span>
                    <textarea
                      value={mission.description}
                      onChange={(event) =>
                        updateMission(mission.id, (current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                      rows={3}
                      className="mt-2 w-full border border-outline-variant bg-surface-container-low px-3 py-3 text-sm text-on-surface"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs uppercase tracking-[0.18em] text-outline">
                      Minutos de foco
                    </span>
                    <input
                      type="number"
                      min={15}
                      step={15}
                      value={Math.round(mission.requiredFocusSeconds / 60)}
                      onChange={(event) =>
                        updateMission(mission.id, (current) => ({
                          ...current,
                          requiredFocusSeconds:
                            Math.max(15, Number(event.target.value) || 15) * 60,
                        }))
                      }
                      className="mt-2 w-full border border-outline-variant bg-surface-container-low px-3 py-3 text-sm text-on-surface"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs uppercase tracking-[0.18em] text-outline">
                      Sesiones necesarias
                    </span>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={mission.requiredSessions}
                      onChange={(event) =>
                        updateMission(mission.id, (current) => ({
                          ...current,
                          requiredSessions: Math.max(
                            1,
                            Number(event.target.value) || 1,
                          ),
                        }))
                      }
                      className="mt-2 w-full border border-outline-variant bg-surface-container-low px-3 py-3 text-sm text-on-surface"
                    />
                  </label>
                </div>

                <div className="space-y-4">
                  <div className="border border-outline-variant bg-surface-container-low p-4">
                    <p className="font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-outline">
                      Recompensa
                    </p>
                    <div className="mt-4 grid gap-3">
                      <label className="block">
                        <span className="text-xs uppercase tracking-[0.18em] text-outline">
                          Tipo
                        </span>
                        <select
                          value={mission.reward.type}
                          onChange={(event) =>
                            updateMission(mission.id, (current) => ({
                              ...current,
                              reward:
                                event.target.value === "wardrobe"
                                  ? {
                                      type: "wardrobe",
                                      field: "upper",
                                      value:
                                        avatarOptions.upper[0]?.value ??
                                        "shirt-01-longsleeve",
                                    }
                                  : { type: "none" },
                            }))
                          }
                          className="mt-2 w-full border border-outline-variant bg-surface-container px-3 py-3 text-sm text-on-surface"
                        >
                          <option value="none">Sin recompensa</option>
                          <option value="wardrobe">Prenda del armario</option>
                        </select>
                      </label>

                      {mission.reward.type === "wardrobe" ? (
                        <>
                          <label className="block">
                            <span className="text-xs uppercase tracking-[0.18em] text-outline">
                              Categoría
                            </span>
                            <select
                              value={rewardField}
                              onChange={(event) =>
                                updateMission(mission.id, (current) => ({
                                  ...current,
                                  reward: {
                                    type: "wardrobe",
                                    field: event.target.value as WardrobeField,
                                    value:
                                      avatarOptions[
                                        event.target.value as WardrobeField
                                      ][0]?.value ?? "shirt-01-longsleeve",
                                  },
                                }))
                              }
                              className="mt-2 w-full border border-outline-variant bg-surface-container px-3 py-3 text-sm text-on-surface"
                            >
                              {Object.entries(wardrobeFieldLabels).map(
                                ([value, label]) => (
                                  <option key={value} value={value}>
                                    {label}
                                  </option>
                                ),
                              )}
                            </select>
                          </label>

                          <label className="block">
                            <span className="text-xs uppercase tracking-[0.18em] text-outline">
                              Item
                            </span>
                            <select
                              value={rewardValue}
                              onChange={(event) =>
                                updateMission(mission.id, (current) => ({
                                  ...current,
                                  reward: {
                                    type: "wardrobe",
                                    field: rewardField,
                                    value: event.target.value,
                                  },
                                }))
                              }
                              className="mt-2 w-full border border-outline-variant bg-surface-container px-3 py-3 text-sm text-on-surface"
                            >
                              {rewardOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>

                          <div className="border border-outline-variant bg-surface-container p-3">
                            <div className="flex justify-center">
                              <ItemModelPreview
                                field={rewardField}
                                value={rewardValue}
                                avatar={avatar}
                              />
                            </div>
                            <p className="mt-3 text-xs leading-relaxed text-on-surface-variant">
                              La misión entrega{" "}
                              {getMissionRewardLabel(mission.reward)}.
                            </p>
                          </div>
                        </>
                      ) : (
                        <p className="text-sm leading-relaxed text-on-surface-variant">
                          Esta misión no desbloquea ropa por ahora.
                        </p>
                      )}

                      <div className="border border-outline-variant bg-surface-container p-3">
                        <p className="font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-outline">
                          Resumen
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                          {formatMissionDuration(mission.requiredFocusSeconds)}{" "}
                          · {mission.requiredSessions} sesiones ·{" "}
                          {roomKindLabels[mission.roomKind]} ·{" "}
                          {mission.enabled ? "activa" : "oculta"}.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
