import { useMemo, useState } from "react";
import { Button, EmptyState } from "../../design";
import { Modal, Tabs } from "../../design/components";
import { ApiError } from "../api";
import type { SubjectTree, TopicNode } from "../api";
import { curriculumApi } from "../curriculumApi";
import { KIND_LABEL, gradesOfKind, subjectGrades } from "../gradeStats";
import { gradesApi } from "../gradesApi";
import type { Grade, GradeKind } from "../gradesApi";
import { formatShortDate, parseApiDate } from "../stats";

const num = (v: string) => Number(v.trim().replace(",", "."));
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
const TABS: GradeKind[] = ["sor", "soch", "other"];
const NEW = "__new__";          // значение в списках: «создать свою»
const MAX_NAME = 100;

interface Form {
  subtopicId: string; score: string; max: string; title: string;
  topicId: string; newTopic: string; newSub: string;
}
const emptyForm: Form = { subtopicId: "", score: "", max: "10", title: "", topicId: "", newTopic: "", newSub: "" };

export default function GradesModal({ subject, grades, onClose, onChanged }: {
  subject: SubjectTree; grades: Grade[]; onClose: () => void; onChanged: () => Promise<void>;
}) {
  const [tab, setTab] = useState<GradeKind>("sor");
  const [editing, setEditing] = useState<Grade | "new" | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const subtopics = useMemo(
    () => subject.topics.map(t => ({ topic: t.name, items: t.subtopics.map(s => ({ id: s.id, name: s.name })) })),
    [subject],
  );
  const subName = (id: number | null) =>
    subtopics.flatMap(t => t.items).find(s => s.id === id)?.name ?? null;

  const stats = subjectGrades(grades, subject.id);
  const list = gradesOfKind(grades, subject.id, tab);
  const editingGrade = editing !== null && editing !== "new" ? editing : null;
  const creatingOwn = editing === "new" && form.subtopicId === NEW;

  function openNew() {
    const firstTopic = subject.topics[0];
    setForm({ ...emptyForm, topicId: firstTopic ? String(firstTopic.id) : NEW });
    setError(""); setEditing("new");
  }
  function openEdit(g: Grade) {
    setForm({ ...emptyForm, subtopicId: g.subtopic_id ? String(g.subtopic_id) : "", score: fmt(g.score), max: fmt(g.max_score), title: g.title });
    setError(""); setEditing(g);
  }
  function validate(): string {
    const s = num(form.score), m = num(form.max);
    if (form.score.trim() === "" || Number.isNaN(s)) return "Введите набранные баллы";
    if (form.max.trim() === "" || Number.isNaN(m) || m <= 0) return "Максимум должен быть больше нуля";
    if (s < 0 || s > m) return "Баллы должны быть от 0 до максимума";
    if (editing === "new") {
      if (form.subtopicId === NEW) {
        if (!form.newSub.trim()) return "Напишите название своей подтемы";
        if (form.newSub.trim().length > MAX_NAME) return `Название подтемы не длиннее ${MAX_NAME} символов`;
        if (form.topicId === NEW) {
          if (!form.newTopic.trim()) return "Напишите название темы";
          if (form.newTopic.trim().length > MAX_NAME) return `Название темы не длиннее ${MAX_NAME} символов`;
        }
      } else if (tab !== "other" && !form.subtopicId) {
        return "Выберите подтему";
      }
    }
    return "";
  }

  async function save() {
    const problem = validate();
    if (problem) { setError(problem); return; }
    setBusy(true); setError("");
    let created = false;   // что-то создали на сервере: если дальше сбой, обновим данные, чтобы повтор не дублировал

    /** Находит или создаёт тему и подтему, возвращает id подтемы. */
    async function resolveOwnSubtopic(): Promise<number> {
      const subTitle = form.newSub.trim();
      let topic: TopicNode | undefined;
      if (form.topicId === NEW) {
        const topicTitle = form.newTopic.trim();
        topic = subject.topics.find(t => same(t.name, topicTitle));
        if (!topic) {
          const tree = await curriculumApi.addTopic(subject.id, topicTitle);
          created = true;
          topic = tree.topics.find(t => t.name === topicTitle);
        }
      } else {
        topic = subject.topics.find(t => String(t.id) === form.topicId);
      }
      if (!topic) throw new ApiError(0, "Тема не найдена. Закройте окно и откройте его снова.");
      const found = topic.subtopics.find(s => same(s.name, subTitle));
      if (found) return found.id;
      const sub = await curriculumApi.addSubtopic(topic.id, subTitle);
      created = true;
      return sub.id;
    }

    try {
      const score = num(form.score), max = num(form.max);
      if (editing === "new") {
        let sid: number | null = null;
        let ownName = "";
        if (form.subtopicId === NEW) {
          sid = await resolveOwnSubtopic();
          ownName = form.newSub.trim();
        } else if (form.subtopicId) {
          sid = Number(form.subtopicId);
        }
        await gradesApi.add({
          subject_id: subject.id, subtopic_id: sid, kind: tab, score, max_score: max,
          title: form.title.trim() || ownName || subName(sid) || KIND_LABEL[tab],
        });
      } else if (editingGrade) {
        await gradesApi.update(editingGrade.id, { score, max_score: max, title: form.title.trim() || editingGrade.title });
      }
      await onChanged();
      setEditing(null);
    } catch (e) {
      if (created) await onChanged().catch(() => undefined);
      setError(e instanceof ApiError ? e.message : "Не удалось сохранить. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!editingGrade || !window.confirm("Удалить эту оценку?")) return;
    setBusy(true); setError("");
    try {
      await gradesApi.remove(editingGrade.id);
      await onChanged();
      setEditing(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось удалить");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={`Оценки: ${subject.name}`}
           footer={<Button variant="secondary" onClick={onClose}>Закрыть</Button>}>
      <div className="pf-total">
        <div className="cg-muted" style={{ fontSize: "var(--fs-xs)" }}>Процент по вашим оценкам</div>
        <strong>{stats.overall === null ? "—" : `${stats.overall}%`}</strong>
        <span className="cg-muted"> · СОР {stats.sor === null ? "—" : `${stats.sor}%`} · СОЧ {stats.soch === null ? "—" : `${stats.soch}%`}</span>
      </div>

      <div className="pf-tabs">
        <Tabs tabs={TABS.map(k => ({ id: k, label: KIND_LABEL[k] }))} active={tab}
              onChange={id => { setTab(id as GradeKind); setEditing(null); setError(""); }} />
      </div>

      {list.length === 0 ? (
        <EmptyState icon="📝" title={`${KIND_LABEL[tab]}: оценок пока нет`}
                    description={tab === "other" ? "Здесь можно хранить прочие оценки." : "Добавьте подтему и набранные баллы."} />
      ) : (
        <div className="pf-rows">
          {list.map(g => (
            <button key={g.id} type="button" className="pf-row" onClick={() => openEdit(g)}>
              <span>
                {subName(g.subtopic_id) ?? (g.title || "Оценка")}
                <span className="pf-row__meta">{formatShortDate(parseApiDate(g.date))}</span>
              </span>
              <span className="pf-row__score">{fmt(g.score)}/{fmt(g.max_score)} · {Math.round(g.percent)}% ›</span>
            </button>
          ))}
        </div>
      )}

      {editing === null ? (
        <Button variant="gradient" onClick={openNew}>Добавить оценку ({KIND_LABEL[tab]})</Button>
      ) : (
        <div className="pf-form">
          <strong>{editing === "new" ? `Новая оценка: ${KIND_LABEL[tab]}` : "Изменить оценку"}</strong>
          <label className="pf-field">
            {tab === "other" ? "Подтема (необязательно)" : "Подтема, по которой был " + KIND_LABEL[tab]}
            <select value={form.subtopicId} disabled={editing !== "new"}
                    onChange={e => setForm({ ...form, subtopicId: e.target.value })}>
              <option value="">{tab === "other" ? "Без подтемы" : "Выберите подтему…"}</option>
              {editing === "new" && <option value={NEW}>+ Своя подтема…</option>}
              {subtopics.map(t => (
                <optgroup key={t.topic} label={t.topic}>
                  {t.items.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </optgroup>
              ))}
            </select>
          </label>

          {creatingOwn && (
            <>
              <label className="pf-field">Тема, в которую добавить подтему
                <select value={form.topicId} onChange={e => setForm({ ...form, topicId: e.target.value })}>
                  {subject.topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  <option value={NEW}>+ Новая тема…</option>
                </select>
              </label>
              {form.topicId === NEW && (
                <label className="pf-field">Название темы
                  <input maxLength={MAX_NAME} value={form.newTopic} placeholder="Например: Динамика"
                         onChange={e => setForm({ ...form, newTopic: e.target.value })} />
                </label>
              )}
              <label className="pf-field">Название подтемы
                <input maxLength={MAX_NAME} value={form.newSub} placeholder="Например: Закон Ньютона"
                       onChange={e => setForm({ ...form, newSub: e.target.value })} />
              </label>
              <p className="cg-muted" style={{ margin: 0, fontSize: "var(--fs-xs)" }}>
                Подтема появится в профиле, и ИИ увидит оценку по ней. Освоение будет «не оценено», пока вы не пройдёте тест.
              </p>
            </>
          )}

          <div className="pf-fieldrow">
            <label className="pf-field">Набрано баллов
              <input inputMode="decimal" value={form.score} onChange={e => setForm({ ...form, score: e.target.value })} />
            </label>
            <span className="cg-muted" style={{ paddingBottom: 10 }}>из</span>
            <label className="pf-field">Максимум
              <input inputMode="decimal" value={form.max} onChange={e => setForm({ ...form, max: e.target.value })} />
            </label>
          </div>
          <label className="pf-field">Название (необязательно)
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          </label>
          {error && <p className="pf-error" role="alert">{error}</p>}
          <div className="cg-row">
            <Button variant="gradient" loading={busy} onClick={() => void save()}>Сохранить</Button>
            <Button variant="ghost" disabled={busy} onClick={() => { setEditing(null); setError(""); }}>Отмена</Button>
            {editingGrade && <Button variant="danger" size="sm" disabled={busy} onClick={() => void remove()}>Удалить</Button>}
          </div>
        </div>
      )}
      {editing === null && error && <p className="pf-error" role="alert">{error}</p>}
    </Modal>
  );
}