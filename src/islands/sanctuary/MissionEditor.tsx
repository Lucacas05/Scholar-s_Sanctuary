import { useEffect, useMemo, useRef, useState } from "react";
import {
  Eye,
  EyeOff,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  Trophy,
} from "lucide-react";
import { ItemModelPreview } from "@/islands/sanctuary/ItemModelPreview";
import { Spinner } from "@/islands/sanctuary/Spinner";
import { useGsapReveal } from "@/islands/sanctuary/useGsapReveal";
import {
  createAchievementId,
  getDefaultAchievementDefinitions,
  loadAchievementDefinitions,
  resetAchievementDefinitionsOnServer,
  saveAchievementDefinitionsToServer,
  syncAchievementDefinitionsFromServer,
  type AchievementDefinition,
  type AchievementRuleType,
} from "@/lib/sanctuary/achievements";
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

const achievementRuleLabels: Record<AchievementRuleType, string> = {
  "sessions-total": "Sesiones totales",
  "focus-total": "Tiempo de foco",
  "social-sessions": "Sesiones compartidas",
  "streak-days": "Racha de días",
  "archive-days": "Días activos",
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

function createBlankAchievement(): AchievementDefinition {
  return {
    id: createAchievementId(),
    title: "Nuevo hito",
    description: "",
    rule: {
      type: "sessions-total",
      value: 1,
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

function formatAchievementTarget(achievement: AchievementDefinition) {
  if (achievement.rule.type === "focus-total") {
    return formatMissionDuration(achievement.rule.value);
  }

  if (
    achievement.rule.type === "streak-days" ||
    achievement.rule.type === "archive-days"
  ) {
    return `${achievement.rule.value} días`;
  }

  return `${achievement.rule.value}`;
}

function describeAchievement(achievement: AchievementDefinition) {
  const target = formatAchievementTarget(achievement);

  switch (achievement.rule.type) {
    case "sessions-total":
      return `Se abrirá al completar ${target} sesiones totales.`;
    case "focus-total":
      return `Se abrirá al acumular ${target} de foco persistido.`;
    case "social-sessions":
      return `Se abrirá al cerrar ${target} sesiones en espacios compartidos.`;
    case "streak-days":
      return `Se abrirá al sostener una racha de ${target}.`;
    case "archive-days":
      return `Se abrirá al registrar actividad en ${target} distintos.`;
  }
}

function getAchievementInputStep(type: AchievementRuleType) {
  return type === "focus-total" ? 15 : 1;
}

function getAchievementInputMin(type: AchievementRuleType) {
  return type === "focus-total" ? 15 : 1;
}

function getAchievementInputValue(achievement: AchievementDefinition) {
  return achievement.rule.type === "focus-total"
    ? Math.round(achievement.rule.value / 60)
    : achievement.rule.value;
}

function normalizeAchievementInputValue(
  type: AchievementRuleType,
  rawValue: string,
) {
  const base = Math.max(1, Number(rawValue) || 1);
  return type === "focus-total" ? Math.max(15, base) * 60 : Math.round(base);
}

export function MissionEditor() {
  const sanctuary = useSanctuaryStore();
  const avatar = getRenderableCurrentProfile(sanctuary).avatar;
  const [missions, setMissions] = useState<MissionDefinition[]>(() =>
    loadMissionDefinitions(),
  );
  const [achievements, setAchievements] = useState<AchievementDefinition[]>(
    () => loadAchievementDefinitions(),
  );
  const [missionMessage, setMissionMessage] = useState("");
  const [achievementMessage, setAchievementMessage] = useState("");
  const [loadingMissions, setLoadingMissions] = useState(false);
  const [loadingAchievements, setLoadingAchievements] = useState(false);
  const [savingMissions, setSavingMissions] = useState(false);
  const [savingAchievements, setSavingAchievements] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useGsapReveal(rootRef);

  useEffect(() => {
    let cancelled = false;

    async function loadServerMissions() {
      setLoadingMissions(true);
      try {
        const nextMissions = await syncMissionDefinitionsFromServer();
        if (!cancelled) {
          setMissions(nextMissions);
        }
      } catch {
        if (!cancelled) {
          setMissions(loadMissionDefinitions());
          setMissionMessage("No se pudo leer la VPS, muestro la caché local.");
        }
      } finally {
        if (!cancelled) {
          setLoadingMissions(false);
        }
      }
    }

    async function loadServerAchievements() {
      setLoadingAchievements(true);
      try {
        const nextAchievements = await syncAchievementDefinitionsFromServer();
        if (!cancelled) {
          setAchievements(nextAchievements);
        }
      } catch {
        if (!cancelled) {
          setAchievements(loadAchievementDefinitions());
          setAchievementMessage(
            "No se pudieron leer los hitos de la VPS, muestro la caché local.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingAchievements(false);
        }
      }
    }

    void Promise.all([loadServerMissions(), loadServerAchievements()]);

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
  const activeAchievements = useMemo(
    () => achievements.filter((achievement) => achievement.enabled).length,
    [achievements],
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
    setMissionMessage("");
  }

  function updateAchievement(
    achievementId: string,
    updater: (achievement: AchievementDefinition) => AchievementDefinition,
  ) {
    setAchievements((current) =>
      current.map((achievement) =>
        achievement.id === achievementId ? updater(achievement) : achievement,
      ),
    );
    setAchievementMessage("");
  }

  function addMission() {
    setMissions((current) => [...current, createBlankMission()]);
    setMissionMessage("Nueva misión en borrador.");
  }

  function addAchievement() {
    setAchievements((current) => [...current, createBlankAchievement()]);
    setAchievementMessage("Nuevo hito en borrador.");
  }

  function removeMission(missionId: string) {
    setMissions((current) =>
      current.filter((mission) => mission.id !== missionId),
    );
    setMissionMessage("Misión eliminada del borrador.");
  }

  function removeAchievement(achievementId: string) {
    setAchievements((current) =>
      current.filter((achievement) => achievement.id !== achievementId),
    );
    setAchievementMessage("Hito eliminado del borrador.");
  }

  async function handleSaveMissions() {
    setSavingMissions(true);
    try {
      const nextMissions = await saveMissionDefinitionsToServer(missions);
      setMissions(nextMissions);
      setMissionMessage("Misiones guardadas en la VPS.");
    } catch {
      setMissionMessage("No se pudieron guardar las misiones en la VPS.");
    } finally {
      setSavingMissions(false);
    }
  }

  async function handleResetMissions() {
    setSavingMissions(true);
    try {
      const nextMissions = await resetMissionDefinitionsOnServer();
      setMissions(nextMissions);
      setMissionMessage("Misiones restauradas.");
    } catch {
      setMissions(getDefaultMissionDefinitions());
      setMissionMessage("No se pudo restaurar desde la VPS.");
    } finally {
      setSavingMissions(false);
    }
  }

  async function handleSaveAchievements() {
    setSavingAchievements(true);
    try {
      const nextAchievements =
        await saveAchievementDefinitionsToServer(achievements);
      setAchievements(nextAchievements);
      setAchievementMessage("Hitos guardados en la VPS.");
    } catch {
      setAchievementMessage("No se pudieron guardar los hitos en la VPS.");
    } finally {
      setSavingAchievements(false);
    }
  }

  async function handleResetAchievements() {
    setSavingAchievements(true);
    try {
      const nextAchievements = await resetAchievementDefinitionsOnServer();
      setAchievements(nextAchievements);
      setAchievementMessage("Hitos restaurados.");
    } catch {
      setAchievements(getDefaultAchievementDefinitions());
      setAchievementMessage("No se pudieron restaurar los hitos desde la VPS.");
    } finally {
      setSavingAchievements(false);
    }
  }

  return (
    <div ref={rootRef} className="space-y-8">
      <section className="gsap-rise grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="border border-outline-variant bg-[radial-gradient(circle_at_20%_18%,rgba(105,188,255,0.12),transparent_34%),linear-gradient(180deg,#201714_0%,#17110f_100%)] px-6 py-8 sm:px-8">
          <p className="font-headline text-[10px] font-bold uppercase tracking-[0.24em] text-outline">
            Editor de progreso
          </p>
          <h1 className="mt-2 font-headline text-3xl font-black uppercase tracking-tight text-on-surface">
            Misiones e hitos globales
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-on-surface-variant">
            Desde aquí defines lo que se publica en la VPS: misiones con
            recompensas, hitos del santuario que salen en Crónicas y el ritmo
            real de desbloqueo para cada cuenta.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-4">
            <article className="border border-outline-variant bg-surface-container/70 p-4">
              <p className="font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-outline">
                Misiones
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
                Hitos visibles
              </p>
              <p className="mt-3 font-headline text-2xl font-black uppercase tracking-tight text-tertiary">
                {activeAchievements}
              </p>
            </article>
            <article className="border border-outline-variant bg-surface-container/70 p-4">
              <p className="font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-outline">
                Foco exigido
              </p>
              <p className="mt-3 font-headline text-2xl font-black uppercase tracking-tight text-primary">
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
            <div className="flex items-start gap-3">
              <Sparkles size={18} className="mt-0.5 shrink-0 text-tertiary" />
              <div>
                <p className="font-headline text-[10px] font-bold uppercase tracking-[0.24em] text-outline">
                  Cómo se aplica
                </p>
                <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                  Cada bloque guarda su propia publicación en la VPS. Las
                  misiones controlan recompensas y requisitos. Los hitos salen
                  en Crónicas, notificaciones y resumen del santuario.
                </p>
              </div>
            </div>
          </div>

          <div className="gsap-rise border border-outline-variant bg-surface-container p-5">
            <div className="flex items-start gap-3">
              <Trophy size={18} className="mt-0.5 shrink-0 text-secondary" />
              <div>
                <p className="font-headline text-[10px] font-bold uppercase tracking-[0.24em] text-outline">
                  Consejo
                </p>
                <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                  Si no quieres mostrar un elemento todavía, déjalo oculto en
                  vez de borrarlo. Así puedes reactivarlo luego sin rehacer la
                  configuración completa.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="gsap-rise space-y-4">
        <div className="border border-outline-variant bg-surface-container p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-outline">
                Misiones publicadas
              </p>
              {loadingMissions && !missionMessage ? (
                <div className="mt-2">
                  <Spinner
                    label="Leyendo misiones publicadas desde la VPS…"
                    size="sm"
                  />
                </div>
              ) : (
                <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                  {missionMessage ||
                    "Aquí decides qué misión existe, qué recompensa entrega y si debe quedar visible en la web."}
                </p>
              )}
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
                onClick={handleResetMissions}
                disabled={savingMissions}
                className="inline-flex items-center gap-2 border border-outline-variant bg-surface-container-low px-4 py-3 font-headline text-xs font-bold uppercase tracking-widest text-on-surface hover:border-secondary disabled:opacity-50"
              >
                <RotateCcw size={14} />
                Restaurar
              </button>
              <button
                type="button"
                onClick={handleSaveMissions}
                disabled={savingMissions}
                className="inline-flex items-center gap-2 border-b-[3px] border-on-primary-fixed-variant bg-primary px-4 py-3 font-headline text-xs font-bold uppercase tracking-widest text-on-primary disabled:opacity-50"
              >
                <Save size={14} />
                {savingMissions ? "Guardando..." : "Guardar misiones"}
              </button>
            </div>
          </div>
        </div>

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

      <section className="gsap-rise space-y-4">
        <div className="border border-outline-variant bg-surface-container p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-outline">
                Hitos del santuario
              </p>
              {loadingAchievements && !achievementMessage ? (
                <div className="mt-2">
                  <Spinner
                    label="Leyendo hitos publicados desde la VPS…"
                    size="sm"
                  />
                </div>
              ) : (
                <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                  {achievementMessage ||
                    "Estos hitos son los que salen en Crónicas y se desbloquean automáticamente según el progreso real de estudio."}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={addAchievement}
                className="inline-flex items-center gap-2 border border-outline-variant bg-surface-container-low px-4 py-3 font-headline text-xs font-bold uppercase tracking-widest text-on-surface hover:border-secondary"
              >
                <Plus size={14} />
                Nuevo hito
              </button>
              <button
                type="button"
                onClick={handleResetAchievements}
                disabled={savingAchievements}
                className="inline-flex items-center gap-2 border border-outline-variant bg-surface-container-low px-4 py-3 font-headline text-xs font-bold uppercase tracking-widest text-on-surface hover:border-secondary disabled:opacity-50"
              >
                <RotateCcw size={14} />
                Restaurar
              </button>
              <button
                type="button"
                onClick={handleSaveAchievements}
                disabled={savingAchievements}
                className="inline-flex items-center gap-2 border-b-[3px] border-on-primary-fixed-variant bg-primary px-4 py-3 font-headline text-xs font-bold uppercase tracking-widest text-on-primary disabled:opacity-50"
              >
                <Save size={14} />
                {savingAchievements ? "Guardando..." : "Guardar hitos"}
              </button>
            </div>
          </div>
        </div>

        {achievements.map((achievement, index) => (
          <article
            key={achievement.id}
            className="border border-outline-variant bg-surface-container p-4 sm:p-5"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant pb-4">
              <div>
                <p className="font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-outline">
                  Hito {index + 1}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                  {describeAchievement(achievement)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    updateAchievement(achievement.id, (current) => ({
                      ...current,
                      enabled: !current.enabled,
                    }))
                  }
                  className={`inline-flex items-center gap-2 border px-4 py-3 font-headline text-xs font-bold uppercase tracking-widest ${
                    achievement.enabled
                      ? "border-primary bg-primary/12 text-primary"
                      : "border-outline-variant bg-surface text-outline"
                  }`}
                >
                  {achievement.enabled ? (
                    <Eye size={14} />
                  ) : (
                    <EyeOff size={14} />
                  )}
                  {achievement.enabled ? "Visible" : "Oculto"}
                </button>
                <button
                  type="button"
                  onClick={() => removeAchievement(achievement.id)}
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
                    value={achievement.title}
                    onChange={(event) =>
                      updateAchievement(achievement.id, (current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    className="mt-2 w-full border border-outline-variant bg-surface-container-low px-3 py-3 text-sm text-on-surface"
                  />
                </label>

                <label className="block">
                  <span className="text-xs uppercase tracking-[0.18em] text-outline">
                    Regla
                  </span>
                  <select
                    value={achievement.rule.type}
                    onChange={(event) =>
                      updateAchievement(achievement.id, (current) => ({
                        ...current,
                        rule: {
                          type: event.target.value as AchievementRuleType,
                          value:
                            event.target.value === "focus-total" ? 15 * 60 : 1,
                        },
                      }))
                    }
                    className="mt-2 w-full border border-outline-variant bg-surface-container-low px-3 py-3 text-sm text-on-surface"
                  >
                    {Object.entries(achievementRuleLabels).map(
                      ([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label className="block sm:col-span-2">
                  <span className="text-xs uppercase tracking-[0.18em] text-outline">
                    Descripción
                  </span>
                  <textarea
                    value={achievement.description}
                    onChange={(event) =>
                      updateAchievement(achievement.id, (current) => ({
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
                    Objetivo
                  </span>
                  <input
                    type="number"
                    min={getAchievementInputMin(achievement.rule.type)}
                    step={getAchievementInputStep(achievement.rule.type)}
                    value={getAchievementInputValue(achievement)}
                    onChange={(event) =>
                      updateAchievement(achievement.id, (current) => ({
                        ...current,
                        rule: {
                          ...current.rule,
                          value: normalizeAchievementInputValue(
                            current.rule.type,
                            event.target.value,
                          ),
                        },
                      }))
                    }
                    className="mt-2 w-full border border-outline-variant bg-surface-container-low px-3 py-3 text-sm text-on-surface"
                  />
                </label>
              </div>

              <div className="space-y-4">
                <div className="border border-outline-variant bg-surface-container-low p-4">
                  <p className="font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-outline">
                    Cómo se desbloquea
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
                    {describeAchievement(achievement)}
                  </p>
                </div>

                <div className="border border-outline-variant bg-surface-container p-3">
                  <p className="font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-outline">
                    Resumen
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                    {achievementRuleLabels[achievement.rule.type]} ·{" "}
                    {formatAchievementTarget(achievement)} ·{" "}
                    {achievement.enabled ? "visible" : "oculto"}.
                  </p>
                </div>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
